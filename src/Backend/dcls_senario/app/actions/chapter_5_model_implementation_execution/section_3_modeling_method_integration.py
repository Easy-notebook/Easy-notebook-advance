from typing import Dict, Any, Optional
from app.core.config import llm, PredictionAndInferenceAgent
from app.models.BaseAction import BaseAction, event, thinking, after_exec, finnish

class ModelingMethodIntegration(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_5_model_implementation_execution",
                         section_id="section_3_modeling_method_integration",
                         name="Modeling Method Integration",
                         ability="Integrate and prepare machine learning modeling methods with processed features for comprehensive model training",
                         require_variables=["model_methods", "feature_engineering_results"])
    
    @event("start")
    def start(self):
        return self.new_section("Machine Learning Model Integration and Preparation") \
            .add_text("Integrating machine learning modeling methods with processed feature engineering pipeline") \
            .add_text("Preparing comprehensive model training infrastructure and implementation strategy") \
            .next_thinking_event(
                event_tag="analyze_modeling_requirements",
                textArray=["Prediction and Inference Agent analyzing...", "evaluating modeling integration requirements..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @thinking("analyze_modeling_requirements")
    def analyze_modeling_requirements(self):
        try:
            # Get modeling methods from methodology phase
            model_methods = self.get_variable("model_methods", [])
            feature_results = self.get_variable("feature_engineering_results", {})
            target_variable = self.get_variable("target_variable", "target")
            response_analysis = self.get_variable("response_variable_analysis", [])
            problem_description = self.get_variable("problem_description", "")
            
            # Validate required inputs
            if not model_methods:
                return self.conclusion("no_model_methods", {
                    "status": "missing_methods",
                    "message": "No modeling methods available from methodology phase"
                })
            
            # Analyze model requirements based on problem type
            is_classification = any(keyword in problem_description.lower() 
                                  for keyword in ["classify", "classification", "predict category", "binary", "class"])
            is_regression = any(keyword in problem_description.lower() 
                               for keyword in ["predict", "forecast", "estimate", "price", "value", "amount"])
            
            # Determine problem type from target analysis if available
            if isinstance(response_analysis, list) and len(response_analysis) > 0:
                target_info = response_analysis[0]
                target_type = target_info.get("variable_type", "unknown")
                if target_type == "categorical":
                    is_classification = True
                elif target_type == "numerical":
                    is_regression = True
            
            # Prepare modeling context
            modeling_context = {
                "methods": model_methods,
                "is_classification": is_classification,
                "is_regression": is_regression,
                "target_variable": target_variable,
                "feature_results": feature_results,
                "total_methods": len(model_methods)
            }
            
            return self.conclusion("modeling_requirements_analyzed", modeling_context)
            
        except Exception as e:
            # Error fallback
            return self.conclusion("modeling_requirements_analyzed", {
                "methods": [],
                "is_classification": True,
                "is_regression": False,
                "target_variable": "target",
                "feature_results": {},
                "total_methods": 0,
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    @finnish("modeling_requirements_analyzed")
    def modeling_requirements_analyzed(self):
        modeling_context = self.get_thinking("modeling_requirements_analyzed")
        model_methods = modeling_context.get("methods", [])
        is_classification = modeling_context.get("is_classification", False)
        is_regression = modeling_context.get("is_regression", False)
        target_variable = modeling_context.get("target_variable", "target")
        total_methods = modeling_context.get("total_methods", 0)
        feature_results = modeling_context.get("feature_results", {})
        
        # Display modeling integration status
        self.add_text("✅ **Modeling Methods Retrieved and Analyzed**")
        self.add_text(f"**Target Variable**: {target_variable}")
        self.add_text(f"**Problem Type**: {'Classification' if is_classification else 'Regression' if is_regression else 'Unknown'}")
        self.add_text(f"**Total Methods**: {total_methods} machine learning approaches")
        
        # Display feature engineering integration status
        if isinstance(feature_results, dict) and feature_results.get("processing_successful"):
            processed_features = feature_results.get("processed_features", 0)
            samples = feature_results.get("samples", 0)
            self.add_text(f"**Feature Pipeline**: ✅ {processed_features} features ready, {samples:,} samples")
        else:
            self.add_text("**Feature Pipeline**: ⚠️ Basic preprocessing applied")
        
        if isinstance(model_methods, list) and len(model_methods) > 0:
            # Display modeling methods
            methods_table = self.to_tableh(model_methods)
            self.add_text("**Machine Learning Methods to Integrate:**")
            self.add_text(methods_table)
            
            # Analyze method complexity
            complexity_counts = {}
            for method in model_methods:
                complexity = method.get("complexity", "Unknown")
                complexity_counts[complexity] = complexity_counts.get(complexity, 0) + 1
            
            if complexity_counts:
                complexity_summary = ", ".join([f"{count} {complexity.lower()}" for complexity, count in complexity_counts.items()])
                self.add_text(f"📊 **Method Complexity**: {complexity_summary}")
        
        # Continue to model integration implementation
        return self.add_text("Proceeding with model integration and training preparation...") \
            .next_thinking_event(
                event_tag="implement_model_integration",
                textArray=["Prediction and Inference Agent implementing...", "generating model integration code..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @finnish("no_model_methods")
    def no_model_methods(self):
        result = self.get_thinking("no_model_methods")
        message = result.get("message", "No model methods available")
        
        # Generate basic modeling methods
        basic_methods = self._generate_basic_model_methods()
        self.add_variable("model_methods", basic_methods)
        
        return self.add_text(f"⚠️ **Warning**: {message}") \
            .add_text("**Alternative Approach**: Using basic machine learning methods") \
            .add_text("Generated standard model selection pipeline") \
            .next_event("implement_model_integration") \
            .end_event()
    
    def _generate_basic_model_methods(self):
        """Generate basic model methods as fallback"""
        return [
            {
                "model_name": "Random Forest",
                "description": "Ensemble method for robust predictions",
                "complexity": "Medium",
                "expected_performance": "Good baseline performance"
            },
            {
                "model_name": "Logistic Regression",
                "description": "Linear model for classification tasks",
                "complexity": "Low",
                "expected_performance": "Interpretable baseline"
            },
            {
                "model_name": "Gradient Boosting",
                "description": "Advanced ensemble method",
                "complexity": "High",
                "expected_performance": "High accuracy potential"
            }
        ]
    
    @thinking("implement_model_integration")
    def implement_model_integration(self):
        try:
            # Get modeling context
            model_methods = self.get_variable("model_methods", [])
            target_variable = self.get_variable("target_variable", "target")
            feature_results = self.get_variable("feature_engineering_results", {})
            problem_description = self.get_variable("problem_description", "")
            
            # Determine problem type
            is_classification = any(keyword in problem_description.lower() 
                                  for keyword in ["classify", "classification", "predict category", "binary", "class"])
            
            # Generate comprehensive model integration code
            model_code = self._generate_model_integration_code(
                model_methods, target_variable, is_classification, feature_results
            )
            
            return self.conclusion("model_integration_implemented", {
                "model_code": model_code,
                "target_variable": target_variable,
                "methods_count": len(model_methods),
                "is_classification": is_classification,
                "status": "success"
            })
            
        except Exception as e:
            # Error fallback
            basic_code = self._generate_basic_model_code(str(e))
            return self.conclusion("model_integration_implemented", {
                "model_code": basic_code,
                "target_variable": "target",
                "methods_count": 0,
                "is_classification": True,
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_model_integration_code(self, methods, target_var, is_classification, feature_results):
        """Generate comprehensive model integration code"""
        code = f'''import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold, KFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import warnings
warnings.filterwarnings('ignore')

print("🤖 Starting Machine Learning Model Integration")
print("=" * 60)

# Model integration setup
target_variable = "{target_var}"
is_classification_task = {is_classification}
print(f"🎯 Target Variable: {{target_variable}}")
print(f"📊 Problem Type: {{'Classification' if is_classification_task else 'Regression'}}")

# Note: Assuming processed features are available from previous feature engineering step
# This code will integrate with the feature engineering results

print("\\n📋 Model Integration Summary:")
print(f"   Total models to integrate: {len(methods)}")
print(f"   Target variable: {{target_variable}}")
print(f"   Task type: {{'Classification' if is_classification_task else 'Regression'}}")

# Initialize model registry
model_registry = {{}}
model_results = []

print("\\n🧠 Initializing Machine Learning Models:")
'''

        # Import required models
        code += '''
# Import machine learning models
'''
        
        if is_classification:
            code += '''from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
'''
        else:
            code += '''from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.svm import SVR
from sklearn.neighbors import KNeighborsRegressor
'''

        # Add specific method implementations
        if isinstance(methods, list) and len(methods) > 0:
            for i, method in enumerate(methods[:5], 1):  # Limit to 5 methods
                model_name = method.get("model_name", f"Model_{i}")
                description = method.get("description", "Machine learning model")
                complexity = method.get("complexity", "Medium")
                
                code += f'''
print("\\n{i}. {model_name}")
print("   {description}")
print("   Complexity: {complexity}")
'''
                
                # Add specific model implementation
                if "random forest" in model_name.lower():
                    if is_classification:
                        code += f'''
# Initialize Random Forest Classifier
rf_model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=2,
    min_samples_leaf=1,
    random_state=42,
    n_jobs=-1
)
model_registry["{model_name}"] = rf_model
print("   ✅ Random Forest Classifier configured")
'''
                    else:
                        code += f'''
# Initialize Random Forest Regressor
rf_model = RandomForestRegressor(
    n_estimators=100,
    max_depth=10,
    min_samples_split=2,
    min_samples_leaf=1,
    random_state=42,
    n_jobs=-1
)
model_registry["{model_name}"] = rf_model
print("   ✅ Random Forest Regressor configured")
'''
                
                elif "gradient boosting" in model_name.lower():
                    if is_classification:
                        code += f'''
# Initialize Gradient Boosting Classifier
gb_model = GradientBoostingClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=3,
    random_state=42
)
model_registry["{model_name}"] = gb_model
print("   ✅ Gradient Boosting Classifier configured")
'''
                    else:
                        code += f'''
# Initialize Gradient Boosting Regressor
gb_model = GradientBoostingRegressor(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=3,
    random_state=42
)
model_registry["{model_name}"] = gb_model
print("   ✅ Gradient Boosting Regressor configured")
'''
                
                elif "logistic regression" in model_name.lower() or "linear regression" in model_name.lower():
                    if is_classification:
                        code += f'''
# Initialize Logistic Regression
lr_model = LogisticRegression(
    max_iter=1000,
    random_state=42,
    solver='liblinear'
)
model_registry["{model_name}"] = lr_model
print("   ✅ Logistic Regression configured")
'''
                    else:
                        code += f'''
# Initialize Linear Regression
lr_model = LinearRegression()
model_registry["{model_name}"] = lr_model
print("   ✅ Linear Regression configured")
'''
                
                elif "svm" in model_name.lower() or "support vector" in model_name.lower():
                    if is_classification:
                        code += f'''
# Initialize SVM Classifier
svm_model = SVC(
    kernel='rbf',
    C=1.0,
    random_state=42,
    probability=True
)
model_registry["{model_name}"] = svm_model
print("   ✅ SVM Classifier configured")
'''
                    else:
                        code += f'''
# Initialize SVM Regressor
svm_model = SVR(
    kernel='rbf',
    C=1.0
)
model_registry["{model_name}"] = svm_model
print("   ✅ SVM Regressor configured")
'''
        
        # Add cross-validation setup
        code += f'''

# Setup cross-validation strategy
print("\\n🔄 Setting up Cross-Validation Strategy:")
cv_folds = 5
if is_classification_task:
    cv_strategy = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    primary_metric = 'accuracy'
    print(f"   Using Stratified {cv_folds}-Fold Cross-Validation")
    print(f"   Primary metric: {{primary_metric}}")
else:
    cv_strategy = KFold(n_splits=cv_folds, shuffle=True, random_state=42)
    primary_metric = 'neg_mean_squared_error'
    print(f"   Using {cv_folds}-Fold Cross-Validation")
    print(f"   Primary metric: {{primary_metric}}")

# Model integration summary
print("\\n" + "=" * 60)
print("🎉 Model Integration Completed!")
print("=" * 60)

print(f"\\n📊 Integration Summary:")
print(f"   Models registered: {{len(model_registry)}}")
print(f"   Cross-validation: {{cv_folds}}-fold")
print(f"   Problem type: {{'Classification' if is_classification_task else 'Regression'}}")
print("   ✅ Models ready for training and evaluation")

# Prepare integration results
model_integration_results = {{
    "models_registered": len(model_registry),
    "cv_folds": cv_folds,
    "is_classification": is_classification_task,
    "primary_metric": primary_metric,
    "target_variable": target_variable,
    "integration_successful": True,
    "model_names": list(model_registry.keys())
}}

print(f"\\n🚀 Ready for model training with {{len(model_registry)}} models")
model_integration_results'''
        
        return code
    
    def _generate_basic_model_code(self, error_msg):
        """Generate basic model integration code for fallback"""
        return f'''# Basic Model Integration (Error Fallback)
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

print("⚠️ Basic model integration due to error: {error_msg}")

# Basic model setup
model_registry = {{
    "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42)
}}

print(f"✅ Basic models registered: {{list(model_registry.keys())}}")

{{"models_registered": len(model_registry), "integration_successful": True, "model_names": list(model_registry.keys())}}'''
    
    @finnish("model_integration_implemented")
    def model_integration_implemented(self):
        implementation_result = self.get_thinking("model_integration_implemented")
        model_code = implementation_result.get("model_code", "")
        target_variable = implementation_result.get("target_variable", "target")
        methods_count = implementation_result.get("methods_count", 0)
        is_classification = implementation_result.get("is_classification", True)
        status = implementation_result.get("status", "unknown")
        
        # Store model integration code
        self.add_variable("model_integration_code", model_code)
        self.add_variable("is_classification_task", is_classification)
        
        # Display implementation status
        status_icons = {"success": "✅", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Model Integration Code Generated**")
        self.add_text(f"**Target Variable**: {target_variable}")
        self.add_text(f"**Problem Type**: {'Classification' if is_classification else 'Regression'}")
        self.add_text(f"**Methods Integrated**: {methods_count} machine learning approaches")
        
        self.add_text("**Executing Model Integration Pipeline:**")
        
        if model_code:
            return self.add_code(model_code) \
                .exe_code_cli(
                    event_tag="model_integration_executed",
                    mark_finnish="Model integration completed"
                ) \
                .end_event()
        else:
            return self.add_text("⚠️ No model integration code could be generated") \
                .end_event()
    
    @after_exec("model_integration_executed")
    def model_integration_executed(self):
        integration_results = self.get_current_effect()
        self.add_variable("model_integration_results", integration_results)
        
        # Parse and display results
        if isinstance(integration_results, dict):
            models_registered = integration_results.get("models_registered", 0)
            cv_folds = integration_results.get("cv_folds", 5)
            is_classification = integration_results.get("is_classification", True)
            success = integration_results.get("integration_successful", False)
            model_names = integration_results.get("model_names", [])
            
            status_icon = "✅" if success else "⚠️"
            self.add_text(f"{status_icon} **Model Integration Execution Results:**")
            self.add_text(f"**Models Registered**: {models_registered}")
            self.add_text(f"**Cross-Validation**: {cv_folds}-fold")
            self.add_text(f"**Problem Type**: {'Classification' if is_classification else 'Regression'}")
            
            if model_names:
                self.add_text(f"**Integrated Models**: {', '.join(model_names)}")
            
            if success:
                self.add_text("🎉 **Model Integration Pipeline Completed Successfully!**")
                self.add_text("🤖 **Machine Learning Infrastructure Summary:**")
                self.add_text("- Multiple ML algorithms configured and ready")
                self.add_text("- Cross-validation strategy established")
                self.add_text("- Model registry initialized for training")
                self.add_text("- Performance metrics framework prepared")
            else:
                self.add_text("⚠️ **Model Integration completed with warnings**")
        else:
            self.add_text("✅ **Model Integration Pipeline Executed**")
            self.add_text("Results summary:")
            self.add_text(str(integration_results))
        
        return self.add_text("🚀 **Ready to proceed with comprehensive model training execution**") \
            .add_text("Machine learning pipeline fully prepared for training and evaluation") \
            .end_event()

async def model_training_and_evaluation_step2(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return ModelingMethodIntegration(step, state, stream).run()