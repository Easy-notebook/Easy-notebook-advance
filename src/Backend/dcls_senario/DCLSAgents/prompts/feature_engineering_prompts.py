"""
Feature Engineering Agent Prompts
Comprehensive prompts for advanced feature engineering capabilities.
"""

FEATURE_ENGINEERING_SYSTEM_PROMPT = """
You are an expert Feature Engineering Agent specializing in automated feature generation, intelligent selection, and optimization for machine learning projects.

**Your Expertise:**
- Automated feature generation using mathematical, statistical, and domain-specific methods
- Multi-method feature selection with consensus approaches
- Feature interaction discovery and engineering
- Domain-specific feature engineering strategies
- Performance-aware feature optimization
- Feature validation and quality assessment

**Problem Context:**
Problem: {problem_description}
Context: {context_description}

**Your Approach:**
1. Analyze data characteristics and problem requirements
2. Design comprehensive feature engineering strategies
3. Generate features using automated and domain-specific methods
4. Apply intelligent feature selection with multiple validation methods
5. Discover meaningful feature interactions
6. Validate and optimize feature engineering results

**Output Format:**
Always provide responses in valid JSON format with clear structure, explanations, and actionable recommendations.

**Quality Standards:**
- Prioritize features with high predictive value
- Consider computational efficiency and interpretability
- Ensure robustness across different data conditions
- Provide clear rationale for all recommendations
- Include validation strategies for feature quality assessment
"""

FEATURE_STRATEGY_DESIGN_TEMPLATE = """
Design a comprehensive feature engineering strategy based on the following analysis:

**Problem Context:**
- Problem: {problem_description}
- Context: {context_description}
- Problem Type: {problem_type}

**Data Analysis:**
- Data Info: {data_info}
- Target Variable: {target_variable}
- EDA Insights: {eda_insights}
- Data Characteristics: {data_characteristics}

**Previous Experience:**
{relevant_memory}

**Required Output (JSON):**
{{
    "strategy_overview": {{
        "primary_objectives": ["objective1", "objective2"],
        "success_criteria": ["criteria1", "criteria2"],
        "computational_constraints": "description"
    }},
    "automated_generation": {{
        "mathematical_features": {{
            "methods": ["combinations", "transformations", "aggregations"],
            "priority": "high/medium/low",
            "expected_count": "estimated_number"
        }},
        "statistical_features": {{
            "methods": ["distributions", "moments", "correlations"],
            "priority": "high/medium/low",
            "expected_count": "estimated_number"
        }},
        "temporal_features": {{
            "methods": ["time_components", "lags", "windows"],
            "priority": "high/medium/low",
            "expected_count": "estimated_number"
        }},
        "categorical_features": {{
            "encoding_methods": ["target_encoding", "frequency", "embeddings"],
            "priority": "high/medium/low",
            "expected_count": "estimated_number"
        }}
    }},
    "domain_specific": {{
        "business_logic_features": ["feature_type1", "feature_type2"],
        "industry_patterns": ["pattern1", "pattern2"],
        "expert_knowledge": ["knowledge1", "knowledge2"]
    }},
    "selection_strategy": {{
        "methods": ["statistical", "model_based", "wrapper", "embedded"],
        "consensus_approach": "description",
        "validation_framework": "cross_validation/holdout/bootstrap",
        "performance_metrics": ["metric1", "metric2"]
    }},
    "interaction_discovery": {{
        "interaction_types": ["multiplicative", "additive", "conditional"],
        "discovery_methods": ["automated", "domain_guided", "statistical"],
        "validation_approach": "description"
    }},
    "optimization_plan": {{
        "performance_targets": "description",
        "computational_limits": "description",
        "iterative_improvement": "strategy"
    }},
    "validation_framework": {{
        "quality_metrics": ["metric1", "metric2"],
        "robustness_tests": ["test1", "test2"],
        "interpretability_assessment": "approach"
    }}
}}
"""

AUTOMATED_FEATURE_GENERATION_TEMPLATE = """
Generate automated features based on the strategy and data characteristics:

**Data Information:**
{data_info}

**Feature Engineering Strategy:**
{strategy}

**Problem Context:**
{problem_description}

**Required Output (JSON):**
{{
    "mathematical_features": {{
        "combinations": {{
            "feature_pairs": [["feature1", "feature2", "operation"]],
            "implementation_code": "python_code_string",
            "expected_impact": "high/medium/low"
        }},
        "transformations": {{
            "log_transforms": ["feature1", "feature2"],
            "power_transforms": [["feature", "power"]],
            "normalization": ["feature1", "feature2"],
            "implementation_code": "python_code_string"
        }},
        "aggregations": {{
            "groupby_features": [["group_col", "agg_col", "agg_func"]],
            "rolling_features": [["feature", "window", "function"]],
            "implementation_code": "python_code_string"
        }}
    }},
    "statistical_features": {{
        "distribution_features": {{
            "percentiles": ["feature1", "feature2"],
            "moments": ["skewness", "kurtosis"],
            "implementation_code": "python_code_string"
        }},
        "correlation_features": {{
            "feature_correlations": [["feature1", "feature2"]],
            "target_correlations": ["feature1", "feature2"],
            "implementation_code": "python_code_string"
        }}
    }},
    "categorical_encoding": {{
        "target_encoding": {{
            "features": ["cat_feature1", "cat_feature2"],
            "implementation_code": "python_code_string",
            "validation_strategy": "cross_validation"
        }},
        "frequency_encoding": {{
            "features": ["cat_feature1", "cat_feature2"],
            "implementation_code": "python_code_string"
        }},
        "embedding_features": {{
            "features": ["high_cardinality_feature"],
            "embedding_dim": "dimension",
            "implementation_code": "python_code_string"
        }}
    }},
    "temporal_features": {{
        "time_components": {{
            "features": ["datetime_feature"],
            "components": ["year", "month", "day", "hour", "dayofweek"],
            "implementation_code": "python_code_string"
        }},
        "lag_features": {{
            "features": ["time_series_feature"],
            "lags": [1, 7, 30],
            "implementation_code": "python_code_string"
        }},
        "window_features": {{
            "features": ["time_series_feature"],
            "windows": [7, 30, 90],
            "functions": ["mean", "std", "min", "max"],
            "implementation_code": "python_code_string"
        }}
    }},
    "implementation_plan": {{
        "execution_order": ["step1", "step2", "step3"],
        "memory_considerations": "description",
        "performance_optimization": "strategies",
        "error_handling": "approach"
    }},
    "quality_assessment": {{
        "feature_validation": "validation_approach",
        "impact_estimation": "estimation_method",
        "computational_cost": "cost_analysis"
    }}
}}
"""

FEATURE_SELECTION_OPTIMIZATION_TEMPLATE = """
Optimize feature selection using multiple methods and consensus approach:

**Feature Data:**
{feature_data}

**Target Information:**
{target_info}

**Problem Context:**
{problem_description}

**Required Output (JSON):**
{{
    "selection_methods": {{
        "statistical_tests": {{
            "method": "f_classif/f_regression/chi2",
            "top_k": "number",
            "implementation_code": "python_code_string",
            "expected_features": ["feature1", "feature2"]
        }},
        "mutual_information": {{
            "method": "mutual_info_classif/mutual_info_regression",
            "top_k": "number",
            "implementation_code": "python_code_string",
            "expected_features": ["feature1", "feature2"]
        }},
        "model_based": {{
            "models": ["RandomForest", "LASSO", "ElasticNet"],
            "selection_criteria": "feature_importance/coefficients",
            "implementation_code": "python_code_string",
            "expected_features": ["feature1", "feature2"]
        }},
        "wrapper_methods": {{
            "method": "RFE/RFECV",
            "estimator": "model_type",
            "cv_folds": "number",
            "implementation_code": "python_code_string",
            "expected_features": ["feature1", "feature2"]
        }}
    }},
    "consensus_strategy": {{
        "voting_mechanism": "majority/weighted/ranked",
        "minimum_votes": "threshold",
        "tie_breaking": "strategy",
        "implementation_code": "python_code_string"
    }},
    "correlation_filtering": {{
        "correlation_threshold": "value",
        "removal_strategy": "keep_first/keep_highest_target_corr",
        "implementation_code": "python_code_string"
    }},
    "optimization_criteria": {{
        "primary_metric": "accuracy/f1/roc_auc/rmse/mae",
        "secondary_metrics": ["metric1", "metric2"],
        "computational_constraint": "max_features/max_time",
        "interpretability_weight": "weight"
    }},
    "validation_framework": {{
        "cross_validation": {{
            "method": "kfold/stratified/time_series",
            "folds": "number",
            "implementation_code": "python_code_string"
        }},
        "stability_testing": {{
            "bootstrap_samples": "number",
            "stability_metric": "jaccard/overlap",
            "implementation_code": "python_code_string"
        }}
    }},
    "final_recommendations": {{
        "selected_features": ["feature1", "feature2"],
        "selection_rationale": "explanation",
        "expected_performance": "performance_estimate",
        "next_steps": ["step1", "step2"]
    }}
}}
"""

FEATURE_INTERACTION_DISCOVERY_TEMPLATE = """
Discover meaningful feature interactions and combinations:

**Available Features:**
{feature_list}

**Data Characteristics:**
{data_characteristics}

**Problem Context:**
{problem_description}

**Required Output (JSON):**
{{
    "interaction_types": {{
        "multiplicative": {{
            "feature_pairs": [["feature1", "feature2"]],
            "business_rationale": "explanation",
            "implementation_code": "python_code_string",
            "expected_impact": "high/medium/low"
        }},
        "additive": {{
            "feature_combinations": [["feature1", "feature2", "feature3"]],
            "combination_logic": "explanation",
            "implementation_code": "python_code_string",
            "expected_impact": "high/medium/low"
        }},
        "conditional": {{
            "conditional_features": [["condition_feature", "value_feature", "condition"]],
            "business_logic": "explanation",
            "implementation_code": "python_code_string",
            "expected_impact": "high/medium/low"
        }},
        "ratio_based": {{
            "ratio_features": [["numerator", "denominator"]],
            "business_meaning": "explanation",
            "implementation_code": "python_code_string",
            "expected_impact": "high/medium/low"
        }}
    }},
    "discovery_methods": {{
        "correlation_analysis": {{
            "method": "pearson/spearman/kendall",
            "threshold": "correlation_value",
            "implementation_code": "python_code_string"
        }},
        "mutual_information": {{
            "method": "mutual_info_regression/classification",
            "discretization": "strategy",
            "implementation_code": "python_code_string"
        }},
        "tree_based_interactions": {{
            "model": "RandomForest/XGBoost",
            "interaction_depth": "depth",
            "implementation_code": "python_code_string"
        }}
    }},
    "validation_strategy": {{
        "statistical_significance": {{
            "test": "t_test/chi_square/anova",
            "significance_level": "alpha_value",
            "implementation_code": "python_code_string"
        }},
        "predictive_value": {{
            "baseline_model": "model_type",
            "interaction_model": "model_type",
            "improvement_metric": "metric",
            "implementation_code": "python_code_string"
        }}
    }},
    "implementation_plan": {{
        "priority_order": ["interaction1", "interaction2"],
        "computational_complexity": "analysis",
        "memory_requirements": "estimation",
        "execution_strategy": "parallel/sequential"
    }},
    "business_insights": {{
        "meaningful_interactions": ["interaction1", "interaction2"],
        "domain_knowledge_validation": "approach",
        "interpretability_assessment": "analysis",
        "actionable_insights": ["insight1", "insight2"]
    }}
}}
"""

FEATURE_VALIDATION_TEMPLATE = """
Validate feature engineering results and provide improvement recommendations:

**Feature Engineering Results:**
{feature_results}

**Validation Data:**
{validation_data}

**Problem Context:**
{problem_description}

**Required Output (JSON):**
{{
    "quality_assessment": {{
        "feature_quality_metrics": {{
            "information_gain": "values_or_analysis",
            "correlation_with_target": "values_or_analysis",
            "feature_stability": "values_or_analysis",
            "missing_value_rate": "values_or_analysis"
        }},
        "distribution_analysis": {{
            "normality_tests": "results",
            "outlier_detection": "results",
            "variance_analysis": "results"
        }},
        "multicollinearity_assessment": {{
            "vif_scores": "values_or_analysis",
            "correlation_matrix": "analysis",
            "redundancy_detection": "results"
        }}
    }},
    "performance_validation": {{
        "baseline_performance": {{
            "model": "model_type",
            "metrics": {{"metric1": "value", "metric2": "value"}},
            "cross_validation_scores": "scores"
        }},
        "enhanced_performance": {{
            "model": "model_type",
            "metrics": {{"metric1": "value", "metric2": "value"}},
            "cross_validation_scores": "scores",
            "improvement": "percentage_or_absolute"
        }},
        "feature_importance": {{
            "top_features": ["feature1", "feature2"],
            "importance_scores": "values",
            "importance_method": "method_used"
        }}
    }},
    "robustness_testing": {{
        "data_perturbation": {{
            "noise_sensitivity": "analysis",
            "missing_value_impact": "analysis",
            "outlier_sensitivity": "analysis"
        }},
        "temporal_stability": {{
            "time_based_validation": "results",
            "concept_drift_detection": "analysis",
            "stability_metrics": "values"
        }},
        "cross_domain_validation": {{
            "generalization_ability": "analysis",
            "domain_transfer": "results",
            "adaptation_requirements": "recommendations"
        }}
    }},
    "interpretability_analysis": {{
        "feature_interpretability": {{
            "business_meaning": "analysis",
            "stakeholder_understanding": "assessment",
            "explanation_complexity": "evaluation"
        }},
        "model_interpretability": {{
            "global_explanations": "approach",
            "local_explanations": "approach",
            "feature_interactions": "analysis"
        }}
    }},
    "improvement_recommendations": {{
        "feature_refinement": {{
            "features_to_remove": ["feature1", "feature2"],
            "features_to_modify": ["feature1", "feature2"],
            "new_features_to_create": ["feature1", "feature2"],
            "rationale": "explanation"
        }},
        "selection_optimization": {{
            "alternative_methods": ["method1", "method2"],
            "parameter_tuning": "recommendations",
            "ensemble_approaches": "suggestions"
        }},
        "performance_optimization": {{
            "computational_improvements": "suggestions",
            "memory_optimization": "recommendations",
            "scalability_enhancements": "approaches"
        }}
    }},
    "next_steps": {{
        "immediate_actions": ["action1", "action2"],
        "medium_term_goals": ["goal1", "goal2"],
        "long_term_strategy": "strategy",
        "success_metrics": ["metric1", "metric2"]
    }}
}}
"""
