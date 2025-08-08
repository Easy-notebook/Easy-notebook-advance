from typing import Dict, Any, Optional
from app.core.config import llm, PredictionAndInferenceAgent
from app.models.BaseAction import BaseAction, event, thinking, after_exec, finnish

class ModelTrainingExecution(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_5_model_implementation_execution",
                         section_id="section_4_model_training_execution",
                         name="Model Training and Evaluation Execution",
                         ability="Execute comprehensive model training and evaluation with integrated features and models, providing final model selection",
                         require_variables=["model_integration_results", "feature_engineering_results"])
    
    @event("start")
    def start(self):
        return self.new_section("Model Training and Evaluation Execution") \
            .add_text("Executing comprehensive model training pipeline with integrated features and models") \
            .add_text("Performing training, evaluation, and final model selection based on consolidated methodology") \
            .next_thinking_event(
                event_tag="analyze_training_requirements",
                textArray=["Prediction and Inference Agent analyzing...", "evaluating training requirements..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @thinking("analyze_training_requirements")
    def analyze_training_requirements(self):
        try:
            # Get model integration and feature engineering results
            model_integration_results = self.get_variable("model_integration_results", {})
            feature_engineering_results = self.get_variable("feature_engineering_results", {})
            response_variable_analysis = self.get_variable("response_variable_analysis", [])
            target_variable = self.get_variable("target_variable", "target")
            is_classification_task = self.get_variable("is_classification_task", True)
            problem_description = self.get_variable("problem_description", "")
            
            # Validate required inputs
            if not model_integration_results or not model_integration_results.get("integration_successful"):
                return self.conclusion("no_model_integration", {
                    "status": "missing_integration",
                    "message": "No model integration results available from previous steps"
                })
            
            if not feature_engineering_results or not feature_engineering_results.get("processing_successful"):
                return self.conclusion("no_feature_results", {
                    "status": "missing_features", 
                    "message": "No feature engineering results available from previous steps"
                })
            
            # Analyze training requirements
            training_context = {
                "models_registered": model_integration_results.get("models_registered", 0),
                "model_names": model_integration_results.get("model_names", []),
                "processed_features": feature_engineering_results.get("processed_features", 0),
                "samples": feature_engineering_results.get("samples", 0),
                "target_variable": target_variable,
                "is_classification": is_classification_task,
                "cv_folds": model_integration_results.get("cv_folds", 5),
                "primary_metric": model_integration_results.get("primary_metric", "accuracy" if is_classification_task else "neg_mean_squared_error")
            }
            
            return self.conclusion("training_requirements_analyzed", training_context)
            
        except Exception as e:
            # Error fallback
            return self.conclusion("training_requirements_analyzed", {
                "models_registered": 0,
                "model_names": [],
                "processed_features": 0,
                "samples": 0,
                "target_variable": "target",
                "is_classification": True,
                "cv_folds": 5,
                "primary_metric": "accuracy",
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    @finnish("training_requirements_analyzed")
    def training_requirements_analyzed(self):
        training_context = self.get_thinking("training_requirements_analyzed")
        models_registered = training_context.get("models_registered", 0)
        model_names = training_context.get("model_names", [])
        processed_features = training_context.get("processed_features", 0)
        samples = training_context.get("samples", 0)
        target_variable = training_context.get("target_variable", "target")
        is_classification = training_context.get("is_classification", True)
        cv_folds = training_context.get("cv_folds", 5)
        
        # Display training setup status
        self.add_text("✅ **Training Requirements Analysis Completed**")
        self.add_text(f"**Target Variable**: {target_variable}")
        self.add_text(f"**Problem Type**: {'Classification' if is_classification else 'Regression'}")
        self.add_text(f"**Models Ready**: {models_registered} ML algorithms")
        self.add_text(f"**Dataset Ready**: {processed_features} features, {samples:,} samples")
        self.add_text(f"**Cross-Validation**: {cv_folds}-fold strategy")
        
        if isinstance(model_names, list) and len(model_names) > 0:
            models_text = ", ".join(model_names[:4])
            self.add_text(f"**Model Candidates**: {models_text}{'...' if len(model_names) > 4 else ''}")
        
        # Continue to training strategy generation
        return self.add_text("Proceeding with training and evaluation strategy generation...") \
            .next_thinking_event(
                event_tag="generate_training_strategy",
                textArray=["Prediction and Inference Agent strategizing...", "generating training evaluation strategy..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @finnish("no_model_integration")
    def no_model_integration(self):
        result = self.get_thinking("no_model_integration")
        message = result.get("message", "No model integration available")
        
        # Generate basic model setup
        basic_models = self._generate_basic_model_setup()
        self.add_variable("model_integration_results", basic_models)
        
        return self.add_text(f"⚠️ **Warning**: {message}") \
            .add_text("**Alternative Approach**: Using basic model setup") \
            .add_text("Generated standard ML model configuration") \
            .next_event("generate_training_strategy") \
            .end_event()
    
    @finnish("no_feature_results")
    def no_feature_results(self):
        result = self.get_thinking("no_feature_results")
        message = result.get("message", "No feature engineering results available")
        
        # Generate basic feature setup
        basic_features = self._generate_basic_feature_setup()
        self.add_variable("feature_engineering_results", basic_features)
        
        return self.add_text(f"⚠️ **Warning**: {message}") \
            .add_text("**Alternative Approach**: Using basic feature processing") \
            .add_text("Generated standard feature pipeline") \
            .next_event("generate_training_strategy") \
            .end_event()
    
    def _generate_basic_model_setup(self):
        """Generate basic model setup as fallback"""
        return {
            "models_registered": 2,
            "model_names": ["Random Forest", "Logistic Regression"],
            "cv_folds": 5,
            "primary_metric": "accuracy",
            "integration_successful": True
        }
    
    def _generate_basic_feature_setup(self):
        """Generate basic feature setup as fallback"""
        return {
            "processed_features": 10,
            "samples": 1000,
            "processing_successful": True,
            "target_variable": "target"
        }
    
    @thinking("generate_training_strategy")
    def generate_training_strategy(self):
        try:
            # Get comprehensive context for training strategy
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            eda_summary = self.get_variable("comprehensive_eda_summary", self.get_variable("eda_summary", ""))
            feature_engineering_methods = self.get_variable("feature_engineering_methods", [])
            model_methods = self.get_variable("model_methods", [])
            
            # Initialize prediction agent for training strategy
            prediction_agent = PredictionAndInferenceAgent(
                problem_description=problem_description,
                context_description=context_description,
                eda_summary=eda_summary,
                llm=llm
            )
            
            # Generate comprehensive training strategy
            training_strategy = prediction_agent.generate_training_evaluation_strategy_cli(
                feature_methods=feature_engineering_methods,
                modeling_methods=model_methods
            )
            
            # Validate training strategy
            if not training_strategy or not isinstance(training_strategy, list):
                # Generate fallback strategy
                fallback_strategy = self._generate_fallback_training_strategy()
                training_strategy = fallback_strategy
            
            return self.conclusion("training_strategy_generated", {
                "training_strategy": training_strategy,
                "total_phases": len(training_strategy) if isinstance(training_strategy, list) else 0,
                "status": "success" if isinstance(training_strategy, list) and len(training_strategy) > 0 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic strategy
            basic_strategy = self._generate_basic_training_strategy(str(e))
            return self.conclusion("training_strategy_generated", {
                "training_strategy": basic_strategy,
                "total_phases": len(basic_strategy),
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_training_strategy(self):
        """Generate fallback training strategy when agent fails"""
        return [
            {
                "phase": "Data Preparation and Validation",
                "description": "Load and validate processed features and target variable",
                "key_activities": "Data loading, feature validation, target preparation",
                "estimated_time": "30 minutes",
                "success_criteria": "Clean dataset ready for training"
            },
            {
                "phase": "Model Training and Cross-Validation",
                "description": "Train all models with cross-validation",
                "key_activities": "Model training, hyperparameter tuning, CV evaluation", 
                "estimated_time": "2-4 hours",
                "success_criteria": "All models trained and cross-validated"
            },
            {
                "phase": "Model Evaluation and Comparison",
                "description": "Compare model performance and select best model",
                "key_activities": "Performance analysis, model comparison, final selection",
                "estimated_time": "1 hour",
                "success_criteria": "Best model selected with justification"
            }
        ]
    
    def _generate_basic_training_strategy(self, error_msg):
        """Generate basic training strategy when processing fails"""
        return [{
            "phase": "Basic Model Training",
            "description": f"Standard model training approach (fallback due to error: {error_msg})",
            "key_activities": "Train models, evaluate performance, select best",
            "estimated_time": "2 hours",
            "success_criteria": "Working model with acceptable performance"
        }]
    
    @finnish("training_strategy_generated")
    def training_strategy_generated(self):
        strategy_result = self.get_thinking("training_strategy_generated")
        training_strategy = strategy_result.get("training_strategy", [])
        total_phases = strategy_result.get("total_phases", 0)
        status = strategy_result.get("status", "unknown")
        
        # Store training strategy
        self.add_variable("training_strategy", training_strategy)
        
        # Display training strategy
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Training and Evaluation Strategy Generated**")
        
        if isinstance(training_strategy, list) and len(training_strategy) > 0:
            # Display strategy in organized format
            strategy_table = self.to_tableh(training_strategy)
            self.add_text("**Comprehensive Training Strategy:**")
            self.add_text(strategy_table)
            
            # Calculate total estimated time
            total_time = 0
            for phase in training_strategy:
                time_str = phase.get("estimated_time", "")
                if "hour" in time_str.lower():
                    import re
                    hours = re.findall(r'\d+', time_str)
                    if hours:
                        total_time += max(int(h) for h in hours)
            
            self.add_text(f"📅 **Training Schedule**: {total_phases} phases, approximately {total_time} hours total")
        else:
            self.add_text("⚠️ No specific training strategy could be generated")
        
        # Continue to code generation
        return self.add_text("Proceeding with model training code generation...") \
            .next_thinking_event(
                event_tag="generate_training_code",
                textArray=["Prediction and Inference Agent implementing...", "generating training execution code..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @thinking("generate_training_code")
    def generate_training_code(self):
        try:
            # Get training context
            training_strategy = self.get_variable("training_strategy", [])
            csv_file_path = self.get_full_csv_path()
            response_variable_analysis = self.get_variable("response_variable_analysis", [])
            target_variable = self.get_variable("target_variable", "target")
            model_integration_code = self.get_variable("model_integration_code", "")
            
            # Initialize prediction agent for code generation
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            eda_summary = self.get_variable("comprehensive_eda_summary", self.get_variable("eda_summary", ""))
            
            prediction_agent = PredictionAndInferenceAgent(
                problem_description=problem_description,
                context_description=context_description,
                eda_summary=eda_summary,
                llm=llm
            )
            
            # Generate comprehensive training code
            training_code = prediction_agent.generate_model_training_code_cli(
                training_strategy=training_strategy,
                csv_file_path=csv_file_path,
                response_variable_analysis=response_variable_analysis
            )
            
            # Validate generated code
            if not training_code or not isinstance(training_code, str):
                # Generate fallback code
                fallback_code = self._generate_fallback_training_code(
                    csv_file_path, target_variable
                )
                training_code = fallback_code
            
            return self.conclusion("training_code_generated", {
                "training_code": training_code,
                "target_variable": target_variable,
                "status": "success" if isinstance(training_code, str) and len(training_code) > 200 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic code
            basic_code = self._generate_basic_training_code(csv_file_path, str(e))
            return self.conclusion("training_code_generated", {
                "training_code": basic_code,
                "target_variable": "target",
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_training_code(self, csv_path, target_var):
        """Generate fallback training code when agent fails"""
        code = f'''import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.preprocessing import StandardScaler, LabelEncoder
import warnings
warnings.filterwarnings('ignore')

print("🚀 Starting Comprehensive Model Training and Evaluation")
print("=" * 70)

# Load the dataset
print("📊 Loading dataset...")
data = pd.read_csv("{csv_path}")
print(f"Dataset shape: {{data.shape}}")
print(f"Columns: {{list(data.columns)}}")

# Identify target variable
target_column = "{target_var}"
if target_column not in data.columns:
    # Try to find target column automatically
    possible_targets = [col for col in data.columns if any(keyword in col.lower() 
                       for keyword in ['target', 'label', 'y', 'class', 'price', 'amount'])]
    if possible_targets:
        target_column = possible_targets[0]
        print(f"⚠️ Target '{target_var}' not found. Using '{{target_column}}' as target.")
    else:
        target_column = data.columns[-1]
        print(f"⚠️ Target '{target_var}' not found. Using last column '{{target_column}}' as target.")

print(f"\\n🎯 Target Variable: {{target_column}}")

# Separate features and target
if target_column in data.columns:
    X = data.drop(target_column, axis=1)
    y = data[target_column]
else:
    raise ValueError(f"Target column '{{target_column}}' not found in dataset")

# Basic preprocessing
print("\\n🔧 Performing basic preprocessing...")

# Handle missing values
missing_counts = X.isnull().sum()
if missing_counts.sum() > 0:
    print(f"   Found {{missing_counts.sum()}} missing values")
    # Fill numeric columns with median
    numeric_cols = X.select_dtypes(include=[np.number]).columns
    X[numeric_cols] = X[numeric_cols].fillna(X[numeric_cols].median())
    
    # Fill categorical columns with mode
    categorical_cols = X.select_dtypes(include=['object', 'category']).columns
    for col in categorical_cols:
        X[col] = X[col].fillna(X[col].mode()[0] if len(X[col].mode()) > 0 else 'Unknown')
    print("   ✅ Missing values handled")

# Encode categorical variables
categorical_cols = X.select_dtypes(include=['object', 'category']).columns
if len(categorical_cols) > 0:
    print(f"   Encoding {{len(categorical_cols)}} categorical columns...")
    for col in categorical_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
    print("   ✅ Categorical encoding completed")

# Scale features
print("   Scaling features...")
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
X = pd.DataFrame(X_scaled, columns=X.columns)
print("   ✅ Feature scaling completed")

# Determine problem type
is_classification = len(y.unique()) <= 20 or y.dtype == 'object'
print(f"\\n📊 Problem Type: {{'Classification' if is_classification else 'Regression'}}")
print(f"   Target unique values: {{y.nunique()}}")

# Prepare target variable for classification
if is_classification and y.dtype == 'object':
    target_encoder = LabelEncoder()
    y = target_encoder.fit_transform(y)
    print("   ✅ Target variable encoded")

# Split the data
print("\\n✂️ Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, 
    stratify=y if is_classification and len(y.unique()) > 1 else None
)

print(f"   Training set: {{X_train.shape[0]}} samples")
print(f"   Test set: {{X_test.shape[0]}} samples")

# Initialize models
print("\\n🤖 Initializing models...")
models = {{}}

if is_classification:
    models["Random Forest"] = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    models["Logistic Regression"] = LogisticRegression(max_iter=1000, random_state=42)
    primary_metric = 'accuracy'
    cv_strategy = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
else:
    models["Random Forest"] = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    models["Linear Regression"] = LinearRegression()
    primary_metric = 'neg_mean_squared_error'
    cv_strategy = KFold(n_splits=5, shuffle=True, random_state=42)

print(f"   Initialized {{len(models)}} models for {{'classification' if is_classification else 'regression'}}")

# Train and evaluate models
print("\\n🏃 Training and evaluating models...")
results = []

for model_name, model in models.items():
    print(f"\\n   Training {{model_name}}...")
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, 
                               cv=cv_strategy, scoring=primary_metric, n_jobs=-1)
    
    # Fit on full training set
    model.fit(X_train, y_train)
    
    # Predictions
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)
    
    if is_classification:
        # Classification metrics
        train_acc = accuracy_score(y_train, train_pred)
        test_acc = accuracy_score(y_test, test_pred)
        
        # Handle binary vs multiclass
        avg_type = 'binary' if len(np.unique(y)) == 2 else 'weighted'
        train_prec = precision_score(y_train, train_pred, average=avg_type, zero_division=0)
        test_prec = precision_score(y_test, test_pred, average=avg_type, zero_division=0)
        train_rec = recall_score(y_train, train_pred, average=avg_type, zero_division=0)
        test_rec = recall_score(y_test, test_pred, average=avg_type, zero_division=0)
        train_f1 = f1_score(y_train, train_pred, average=avg_type, zero_division=0)
        test_f1 = f1_score(y_test, test_pred, average=avg_type, zero_division=0)
        
        result = {{
            "model": model_name,
            "cv_score": cv_scores.mean(),
            "cv_std": cv_scores.std(),
            "train_accuracy": train_acc,
            "test_accuracy": test_acc,
            "train_precision": train_prec,
            "test_precision": test_prec,
            "train_recall": train_rec,
            "test_recall": test_rec,
            "train_f1": train_f1,
            "test_f1": test_f1
        }}
        
        print(f"     ✅ Accuracy: {{test_acc:.4f}}, CV: {{cv_scores.mean():.4f}} ± {{cv_scores.std():.4f}}")
        
    else:
        # Regression metrics
        train_mse = mean_squared_error(y_train, train_pred)
        test_mse = mean_squared_error(y_test, test_pred)
        train_r2 = r2_score(y_train, train_pred)
        test_r2 = r2_score(y_test, test_pred)
        train_mae = mean_absolute_error(y_train, train_pred)
        test_mae = mean_absolute_error(y_test, test_pred)
        
        result = {{
            "model": model_name,
            "cv_score": cv_scores.mean(),
            "cv_std": cv_scores.std(),
            "train_mse": train_mse,
            "test_mse": test_mse,
            "train_r2": train_r2,
            "test_r2": test_r2,
            "train_mae": train_mae,
            "test_mae": test_mae
        }}
        
        print(f"     ✅ R²: {{test_r2:.4f}}, MSE: {{test_mse:.4f}}, CV: {{cv_scores.mean():.4f}} ± {{cv_scores.std():.4f}}")
    
    results.append(result)

# Model comparison and selection
print("\\n" + "=" * 70)
print("🏆 MODEL EVALUATION RESULTS")
print("=" * 70)

results_df = pd.DataFrame(results)
print("\\n📊 Model Performance Summary:")
if is_classification:
    print(results_df[['model', 'cv_score', 'test_accuracy', 'test_precision', 'test_recall', 'test_f1']].round(4))
    # Select best model based on CV score
    best_idx = results_df['cv_score'].idxmax()
else:
    print(results_df[['model', 'cv_score', 'test_r2', 'test_mse', 'test_mae']].round(4))
    # Select best model based on CV score (higher is better for neg_mean_squared_error)
    best_idx = results_df['cv_score'].idxmax()

best_model_name = results_df.loc[best_idx, 'model']
best_cv_score = results_df.loc[best_idx, 'cv_score']

print(f"\\n🥇 **BEST MODEL SELECTED**: {{best_model_name}}")
print(f"   Cross-validation score: {{best_cv_score:.4f}}")

if is_classification:
    best_accuracy = results_df.loc[best_idx, 'test_accuracy']
    print(f"   Test accuracy: {{best_accuracy:.4f}}")
else:
    best_r2 = results_df.loc[best_idx, 'test_r2']
    best_mse = results_df.loc[best_idx, 'test_mse']
    print(f"   Test R²: {{best_r2:.4f}}")
    print(f"   Test MSE: {{best_mse:.4f}}")

# Final training results
training_results = {{
    "best_model": best_model_name,
    "best_cv_score": best_cv_score,
    "all_results": results,
    "problem_type": "classification" if is_classification else "regression",
    "total_models_trained": len(models),
    "dataset_info": {{
        "total_samples": len(data),
        "features": X.shape[1],
        "target_column": target_column,
        "train_samples": len(X_train),
        "test_samples": len(X_test)
    }},
    "training_successful": True
}}

print(f"\\n🎉 Model training and evaluation completed successfully!")
print(f"📈 Trained {{len(models)}} models on {{X.shape[1]}} features")
print(f"🎯 Best performing model: {{best_model_name}}")

training_results'''
        return code
    
    def _generate_basic_training_code(self, csv_path, error_msg):
        """Generate basic training code when processing fails"""
        return f'''# Basic model training (error fallback)
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

print("⚠️ Basic model training due to error: {error_msg}")

# Load dataset
data = pd.read_csv("{csv_path}")
print(f"Dataset loaded: {{data.shape}}")

# Basic setup
X = data.iloc[:, :-1]  # Assume last column is target
y = data.iloc[:, -1]   # Last column as target

# Handle missing values with simple approach
X = X.fillna(X.mean())

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Basic model
model = RandomForestClassifier(n_estimators=50, random_state=42)
model.fit(X_train, y_train)

# Evaluate
pred = model.predict(X_test)
accuracy = accuracy_score(y_test, pred)

print(f"✅ Basic model trained. Accuracy: {{accuracy:.4f}}")

{{"best_model": "Random Forest", "accuracy": accuracy, "training_successful": True}}'''
    
    @finnish("training_code_generated")
    def training_code_generated(self):
        code_result = self.get_thinking("training_code_generated")
        training_code = code_result.get("training_code", "")
        target_variable = code_result.get("target_variable", "target")
        status = code_result.get("status", "unknown")
        
        # Store training code
        self.add_variable("model_training_code", training_code)
        
        # Display and execute code
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Model Training Code Generated**")
        self.add_text(f"**Target Variable**: {target_variable}")
        self.add_text("**Executing comprehensive model training and evaluation:**")
        
        if training_code:
            return self.add_code(training_code) \
                .exe_code_cli(
                    event_tag="training_executed",
                    mark_finnish="Model training and evaluation completed"
                ) \
                .end_event()
        else:
            return self.add_text("⚠️ No training code could be generated") \
                .end_event()
    
    @after_exec("training_executed")
    def training_executed(self):
        training_results = self.get_current_effect()
        self.add_variable("model_training_results", training_results)
        
        # Parse and display training results
        if isinstance(training_results, dict):
            best_model = training_results.get("best_model", "Unknown")
            best_cv_score = training_results.get("best_cv_score", 0)
            total_models = training_results.get("total_models_trained", 0)
            problem_type = training_results.get("problem_type", "unknown")
            success = training_results.get("training_successful", False)
            dataset_info = training_results.get("dataset_info", {})
            
            status_icon = "✅" if success else "⚠️"
            self.add_text(f"{status_icon} **Model Training Execution Results:**")
            self.add_text(f"**Best Model**: {best_model}")
            self.add_text(f"**Cross-Validation Score**: {best_cv_score:.4f}")
            self.add_text(f"**Models Trained**: {total_models}")
            self.add_text(f"**Problem Type**: {problem_type.title()}")
            
            if isinstance(dataset_info, dict):
                features = dataset_info.get("features", "unknown")
                total_samples = dataset_info.get("total_samples", "unknown")
                self.add_text(f"**Dataset**: {total_samples:,} samples, {features} features")
            
            if success:
                self.add_text("🎉 **Model Training Pipeline Completed Successfully!**")
                self.add_text("🏆 **Training Execution Summary:**")
                self.add_text("- Multiple ML models trained and evaluated")
                self.add_text("- Cross-validation performed for robust assessment")
                self.add_text("- Best performing model identified and selected")
                self.add_text("- Comprehensive performance metrics calculated")
            else:
                self.add_text("⚠️ **Training completed with warnings**")
        else:
            self.add_text("✅ **Model Training Pipeline Executed**")
            self.add_text("Training results:")
            self.add_text(str(training_results))
        
        return self.add_text("🚀 **Model Implementation Execution Completed Successfully!**") \
            .add_text("🎯 **Final Model Ready**: Comprehensive ML pipeline executed with best model selected") \
            .add_text("📊 **Next Phase**: Ready for stability validation and robustness testing") \
            .end_event()

async def model_training_and_evaluation_step3(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return ModelTrainingExecution(step, state, stream).run()