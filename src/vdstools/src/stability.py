"""
Stability utilities for evaluating model performance across dataset variations.
Designed for agent-friendly, structured outputs and stable execution.
"""

from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np

from sklearn.model_selection import cross_val_score, StratifiedKFold, KFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    mean_squared_error,
    r2_score,
    mean_absolute_error,
)


def _detect_problem_type(y: pd.Series) -> str:
    if y.dtype == "object":
        return "classification"
    unique = y.nunique(dropna=True)
    # heuristic threshold for classification
    return "classification" if unique <= 20 else "regression"


def evaluate_variations(
    variation_files: List[str],
    target_column: Optional[str] = None,
    problem_type: Optional[str] = None,
    cv_folds: int = 5,
) -> Dict[str, Any]:
    """
    Evaluate model performance across dataset variations.

    Args:
        variation_files: List of CSV file paths (each a dataset variation)
        target_column: Optional target column name (defaults to last column)
        problem_type: Optional explicit type ('classification' | 'regression'). If None, auto-detect per file
        cv_folds: Cross-validation folds

    Returns:
        Structured dict with per-variation results, summary tables and stability score
    """
    results: List[Dict[str, Any]] = []
    per_variation: Dict[str, Any] = {}

    for path in variation_files:
        try:
            df = pd.read_csv(path)
            if df.shape[1] < 2:
                continue

            tgt_col = target_column or df.columns[-1]
            if tgt_col not in df.columns:
                # fallback: last column
                tgt_col = df.columns[-1]

            X = df.drop(columns=[tgt_col])
            y = df[tgt_col]

            # basic preprocessing
            # fill missing
            if X.isnull().sum().sum() > 0:
                num_cols = X.select_dtypes(include=[np.number]).columns
                cat_cols = X.select_dtypes(include=["object", "category"]).columns
                if len(num_cols) > 0:
                    X[num_cols] = X[num_cols].fillna(X[num_cols].median())
                for c in cat_cols:
                    mode_vals = X[c].mode()
                    X[c] = X[c].fillna(mode_vals[0] if len(mode_vals) > 0 else "Unknown")

            # encode
            cat_cols = X.select_dtypes(include=["object", "category"]).columns
            if len(cat_cols) > 0:
                for c in cat_cols:
                    le = LabelEncoder()
                    X[c] = le.fit_transform(X[c].astype(str))

            # scale
            num_cols = X.select_dtypes(include=[np.number]).columns
            if len(num_cols) > 0:
                scaler = StandardScaler()
                X[num_cols] = scaler.fit_transform(X[num_cols])

            # determine problem type
            ptype = problem_type or _detect_problem_type(y)
            if ptype == "classification" and y.dtype == "object":
                y = LabelEncoder().fit_transform(y)

            # models and CV
            if ptype == "classification":
                models = {
                    "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
                    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
                }
                primary_metric = "accuracy"
                cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
            else:
                models = {
                    "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
                    "Linear Regression": LinearRegression(),
                }
                primary_metric = "neg_mean_squared_error"
                cv = KFold(n_splits=cv_folds, shuffle=True, random_state=42)

            variation_name = path.split("/")[-1].replace(".csv", "")

            var_results: List[Dict[str, Any]] = []
            for mname, model in models.items():
                try:
                    scores = cross_val_score(model, X, y, cv=cv, scoring=primary_metric, n_jobs=-1)
                    var_results.append(
                        {
                            "variation": variation_name,
                            "path": path,
                            "model": mname,
                            "cv_mean": float(scores.mean()),
                            "cv_std": float(scores.std()),
                            "cv_scores": scores.tolist(),
                            "samples": int(X.shape[0]),
                            "features": int(X.shape[1]),
                        }
                    )
                except Exception as e:
                    var_results.append(
                        {
                            "variation": variation_name,
                            "path": path,
                            "model": mname,
                            "error": str(e),
                        }
                    )

            # choose best model by cv_mean
            best_cv = max((r for r in var_results if "cv_mean" in r), key=lambda r: r["cv_mean"], default=None)
            per_variation[variation_name] = {
                "path": path,
                "results": var_results,
                "best_cv_mean": float(best_cv["cv_mean"]) if best_cv else None,
                "best_model": best_cv["model"] if best_cv else None,
            }
            results.extend(var_results)

        except Exception as e:
            per_variation[path] = {"error": str(e)}

    # summary
    summary_df = pd.DataFrame([r for r in results if "cv_mean" in r])
    if not summary_df.empty:
        # compute stability over best per variation
        best_means = [v["best_cv_mean"] for v in per_variation.values() if v.get("best_cv_mean") is not None]
        if len(best_means) >= 2:
            var_std = float(np.std(best_means))
            var_mean = float(np.mean(best_means)) if np.mean(best_means) != 0 else 1e-8
            stability_score = float(1 - (var_std / var_mean))
        else:
            stability_score = 0.0

        most_stable = None
        least_stable = None
        try:
            per_var_means = {k: v.get("best_cv_mean") for k, v in per_variation.items() if v.get("best_cv_mean") is not None}
            if per_var_means:
                most_stable = max(per_var_means, key=lambda k: per_var_means[k])
                least_stable = min(per_var_means, key=lambda k: per_var_means[k])
        except Exception:
            pass

        return {
            "evaluation_successful": True,
            "total_variations_tested": int(len(per_variation)),
            "total_evaluations_completed": int(len(summary_df)),
            "overall_stability_score": round(stability_score, 4),
            "most_stable_variation": most_stable,
            "least_stable_variation": least_stable,
            "detailed_results": results,
            "per_variation": per_variation,
        }
    else:
        return {
            "evaluation_successful": False,
            "error": "No successful evaluations completed",
            "detailed_results": results,
            "per_variation": per_variation,
        }


