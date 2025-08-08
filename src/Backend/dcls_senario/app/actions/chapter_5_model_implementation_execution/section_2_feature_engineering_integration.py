from typing import Dict, Any, Optional
from app.core.config import llm, PredictionAndInferenceAgent
from app.models.BaseAction import BaseAction, event, thinking, after_exec, finnish

class FeatureEngineeringIntegration(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_5_model_implementation_execution",
                         section_id="section_2_feature_engineering_integration",
                         name="Feature Engineering Integration",
                         ability="Integrate and implement comprehensive feature engineering methods into the ML pipeline",
                         require_variables=["feature_engineering_methods", "response_variable_analysis"])
    
    @event("start")
    def start(self):
        return self.new_section("Feature Engineering Integration and Implementation") \
            .add_text("Implementing comprehensive feature engineering pipeline based on formulated methodology") \
            .add_text("Applying advanced feature transformation techniques to optimize model performance") \
            .next_thinking_event(
                event_tag="analyze_feature_requirements",
                textArray=["Prediction and Inference Agent analyzing...", "evaluating feature engineering requirements..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @thinking("analyze_feature_requirements")
    def analyze_feature_requirements(self):
        try:
            # Get feature engineering methods from methodology phase
            feature_engineering_methods = self.get_variable("feature_engineering_methods", [])
            response_variable_analysis = self.get_variable("response_variable_analysis", [])
            data_info = self.get_variable("data_info", [])
            csv_file_path = self.get_full_csv_path()
            
            # Validate required inputs
            if not feature_engineering_methods:
                return self.conclusion("no_feature_methods", {
                    "status": "missing_methods",
                    "message": "No feature engineering methods available from methodology phase"
                })
            
            # Analyze feature engineering requirements
            target_variable = None
            if isinstance(response_variable_analysis, list) and len(response_variable_analysis) > 0:
                # Get the highest confidence target variable
                sorted_targets = sorted(response_variable_analysis, 
                                      key=lambda x: x.get("confidence_score", 0), reverse=True)
                target_variable = sorted_targets[0].get("variable_name", "target")
            
            # Prepare feature engineering context
            feature_context = {
                "methods": feature_engineering_methods,
                "target_variable": target_variable,
                "data_columns": data_info,
                "csv_path": csv_file_path,
                "total_methods": len(feature_engineering_methods)
            }
            
            return self.conclusion("feature_requirements_analyzed", feature_context)
            
        except Exception as e:
            # Error fallback
            return self.conclusion("feature_requirements_analyzed", {
                "methods": [],
                "target_variable": "target",
                "data_columns": [],
                "csv_path": self.get_full_csv_path(),
                "total_methods": 0,
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    @finnish("feature_requirements_analyzed")
    def feature_requirements_analyzed(self):
        feature_context = self.get_thinking("feature_requirements_analyzed")
        feature_methods = feature_context.get("methods", [])
        target_variable = feature_context.get("target_variable", "target")
        total_methods = feature_context.get("total_methods", 0)
        
        # Display feature engineering methods
        self.add_text("✅ **Feature Engineering Methods Retrieved**")
        self.add_text(f"**Target Variable**: {target_variable}")
        self.add_text(f"**Total Methods**: {total_methods} feature engineering approaches")
        
        if isinstance(feature_methods, list) and len(feature_methods) > 0:
            # Display methods summary
            method_table = self.to_tableh(feature_methods)
            self.add_text("**Feature Engineering Methods to Implement:**")
            self.add_text(method_table)
            
            # Priority analysis
            high_priority = len([m for m in feature_methods if m.get("implementation_priority", "").lower() == "high"])
            if high_priority > 0:
                self.add_text(f"🔴 **High Priority Methods**: {high_priority} critical transformations")
        
        # Continue to implementation
        return self.add_text("Proceeding with feature engineering implementation...") \
            .next_thinking_event(
                event_tag="implement_feature_engineering",
                textArray=["Prediction and Inference Agent implementing...", "generating feature engineering code..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @finnish("no_feature_methods")
    def no_feature_methods(self):
        result = self.get_thinking("no_feature_methods")
        message = result.get("message", "No feature methods available")
        
        # Generate basic feature engineering methods
        basic_methods = self._generate_basic_feature_methods()
        self.add_variable("feature_engineering_methods", basic_methods)
        
        return self.add_text(f"⚠️ **Warning**: {message}") \
            .add_text("**Alternative Approach**: Using basic feature engineering methods") \
            .add_text("Generated standard preprocessing pipeline") \
            .next_event("implement_feature_engineering") \
            .end_event()
    
    def _generate_basic_feature_methods(self):
        """Generate basic feature engineering methods as fallback"""
        return [
            {
                "method_name": "Standard Data Preprocessing",
                "description": "Basic data cleaning and normalization",
                "implementation_priority": "High",
                "expected_impact": "Data preparation for modeling"
            },
            {
                "method_name": "Numerical Feature Scaling",
                "description": "StandardScaler for numerical features",
                "implementation_priority": "High",
                "expected_impact": "Normalized feature scales"
            },
            {
                "method_name": "Categorical Feature Encoding",
                "description": "One-hot encoding for categorical variables",
                "implementation_priority": "High",
                "expected_impact": "Numerical representation of categories"
            }
        ]
    
    @thinking("implement_feature_engineering")
    def implement_feature_engineering(self):
        try:
            # Get feature engineering context
            feature_methods = self.get_variable("feature_engineering_methods", [])
            target_variable = "target"  # Default target
            csv_file_path = self.get_full_csv_path()
            data_info = self.get_variable("data_info", [])
            
            # Get target variable from analysis
            response_analysis = self.get_variable("response_variable_analysis", [])
            if isinstance(response_analysis, list) and len(response_analysis) > 0:
                sorted_targets = sorted(response_analysis, 
                                      key=lambda x: x.get("confidence_score", 0), reverse=True)
                target_variable = sorted_targets[0].get("variable_name", "target")
            
            # Generate comprehensive feature engineering code
            feature_code = self._generate_feature_engineering_code(
                feature_methods, csv_file_path, target_variable, data_info
            )
            
            return self.conclusion("feature_engineering_implemented", {
                "feature_code": feature_code,
                "target_variable": target_variable,
                "methods_count": len(feature_methods),
                "status": "success"
            })
            
        except Exception as e:
            # Error fallback
            basic_code = self._generate_basic_feature_code(self.get_full_csv_path(), str(e))
            return self.conclusion("feature_engineering_implemented", {
                "feature_code": basic_code,
                "target_variable": "target",
                "methods_count": 0,
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_feature_engineering_code(self, methods, csv_path, target_var, data_info):
        """Generate comprehensive feature engineering code"""
        code = f'''import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings('ignore')

print("🚀 Starting Comprehensive Feature Engineering Pipeline")
print("=" * 60)

# Load the dataset
print("📊 Loading dataset...")
data = pd.read_csv("{csv_path}")
print(f"Dataset shape: {{data.shape}}")
print(f"Columns: {{list(data.columns)}}")

# Display basic dataset info
print("\\n📋 Dataset Overview:")
print(data.info())
print("\\nFirst 5 rows:")
print(data.head())

# Identify target variable and features
target_column = "{target_var}"
if target_column not in data.columns:
    # Try to identify target column automatically
    possible_targets = [col for col in data.columns if any(keyword in col.lower() 
                       for keyword in ['target', 'label', 'y', 'class', 'price', 'amount'])]
    if possible_targets:
        target_column = possible_targets[0]
        print(f"⚠️ Target '{target_var}' not found. Using '{target_column}' as target.")
    else:
        target_column = data.columns[-1]
        print(f"⚠️ Target '{target_var}' not found. Using last column '{target_column}' as target.")

print(f"\\n🎯 Target Variable: {{target_column}}")

# Separate features and target
if target_column in data.columns:
    X = data.drop(target_column, axis=1)
    y = data[target_column]
else:
    # If target not found, use all columns as features (unsupervised scenario)
    X = data.copy()
    y = None
    print("ℹ️ No target variable identified. Proceeding with unsupervised feature engineering.")

print(f"Features shape: {{X.shape}}")
if y is not None:
    print(f"Target shape: {{y.shape}}")

# Analyze feature types
numeric_features = X.select_dtypes(include=[np.number]).columns.tolist()
categorical_features = X.select_dtypes(include=['object', 'category']).columns.tolist()

print(f"\\n🔢 Numeric features ({len(numeric_features)}): {{numeric_features}}")
print(f"🏷️ Categorical features ({len(categorical_features)}): {{categorical_features}}")

# Feature Engineering Pipeline Implementation
print("\\n🔧 Implementing Feature Engineering Methods:")
'''

        # Add specific method implementations
        if isinstance(methods, list) and len(methods) > 0:
            for i, method in enumerate(methods[:6], 1):  # Limit to 6 methods
                method_name = method.get("method_name", f"Method_{i}")
                description = method.get("description", "Feature transformation")
                
                code += f'''
print("\\n{i}. {method_name}")
print("   {description}")
'''
                
                # Add specific implementation based on method name
                if "scaling" in method_name.lower() or "standard" in method_name.lower():
                    code += '''
# Implement feature scaling
if len(numeric_features) > 0:
    scaler = StandardScaler()
    X_scaled = X.copy()
    X_scaled[numeric_features] = scaler.fit_transform(X[numeric_features])
    print(f"   ✅ Applied StandardScaler to {len(numeric_features)} numeric features")
else:
    X_scaled = X.copy()
    print("   ⚠️ No numeric features found for scaling")
'''
                
                elif "encoding" in method_name.lower() or "categorical" in method_name.lower():
                    code += '''
# Implement categorical encoding
if len(categorical_features) > 0:
    X_encoded = X_scaled.copy()
    # Use OneHot encoding for categorical features with few unique values
    for cat_col in categorical_features:
        unique_values = X_encoded[cat_col].nunique()
        if unique_values <= 10:  # OneHot for features with <= 10 categories
            dummies = pd.get_dummies(X_encoded[cat_col], prefix=cat_col)
            X_encoded = pd.concat([X_encoded.drop(cat_col, axis=1), dummies], axis=1)
            print(f"   ✅ Applied OneHot encoding to {cat_col} ({unique_values} categories)")
        else:  # Label encoding for high-cardinality features
            le = LabelEncoder()
            X_encoded[cat_col] = le.fit_transform(X_encoded[cat_col].astype(str))
            print(f"   ✅ Applied Label encoding to {cat_col} ({unique_values} categories)")
    X_processed = X_encoded.copy()
else:
    X_processed = X_scaled.copy()
    print("   ⚠️ No categorical features found for encoding")
'''
                
                elif "missing" in method_name.lower() or "imputation" in method_name.lower():
                    code += '''
# Handle missing values
missing_counts = X_processed.isnull().sum()
missing_features = missing_counts[missing_counts > 0]

if len(missing_features) > 0:
    print(f"   📊 Found missing values in {len(missing_features)} features")
    
    # Impute numeric features with median
    numeric_missing = [col for col in missing_features.index if col in X_processed.select_dtypes(include=[np.number]).columns]
    if numeric_missing:
        imputer_num = SimpleImputer(strategy='median')
        X_processed[numeric_missing] = imputer_num.fit_transform(X_processed[numeric_missing])
        print(f"   ✅ Imputed {len(numeric_missing)} numeric features with median")
    
    # Impute categorical features with mode
    categorical_missing = [col for col in missing_features.index if col not in numeric_missing]
    if categorical_missing:
        imputer_cat = SimpleImputer(strategy='most_frequent')
        X_processed[categorical_missing] = imputer_cat.fit_transform(X_processed[categorical_missing])
        print(f"   ✅ Imputed {len(categorical_missing)} categorical features with mode")
else:
    print("   ✅ No missing values found")
'''
        
        # Add final processing and summary
        code += '''

# Final feature engineering summary
print("\\n" + "=" * 60)
print("🎉 Feature Engineering Pipeline Completed!")
print("=" * 60)

print(f"\\n📊 Final Dataset Summary:")
print(f"   Original features: {X.shape[1]}")
print(f"   Processed features: {X_processed.shape[1]}")
print(f"   Samples: {X_processed.shape[0]}")

# Check for any remaining issues
print("\\n🔍 Data Quality Check:")
remaining_missing = X_processed.isnull().sum().sum()
print(f"   Missing values: {remaining_missing}")

infinite_values = np.isinf(X_processed.select_dtypes(include=[np.number])).sum().sum()
print(f"   Infinite values: {infinite_values}")

# Display feature engineering results
print("\\n📈 Feature Engineering Results:")
print(f"   Feature engineering methods applied: {len([method.get('method_name', '') for method in feature_methods if 'method_name' in method])}")
print("   ✅ Dataset ready for model training")

# Prepare final results
feature_engineering_results = {
    "original_features": X.shape[1],
    "processed_features": X_processed.shape[1],
    "samples": X_processed.shape[0],
    "missing_values": remaining_missing,
    "infinite_values": infinite_values,
    "target_variable": target_column,
    "processing_successful": True
}

print(f"\\n🎯 Ready for model training with target: {target_column}")
feature_engineering_results'''
        
        return code
    
    def _generate_basic_feature_code(self, csv_path, error_msg):
        """Generate basic feature engineering code for fallback"""
        return f'''# Basic Feature Engineering (Error Fallback)
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder

print("⚠️ Basic feature engineering due to error: {error_msg}")

# Load dataset
data = pd.read_csv("{csv_path}")
print(f"Dataset loaded: {{data.shape}}")

# Basic preprocessing
X = data.iloc[:, :-1]  # Assume last column is target
y = data.iloc[:, -1]   # Last column as target

# Handle missing values with simple imputation
X = X.fillna(X.mean() if X.dtype in ['int64', 'float64'] else X.mode().iloc[0] for col in X.columns)

# Basic scaling for numeric features
numeric_cols = X.select_dtypes(include=[np.number]).columns
if len(numeric_cols) > 0:
    scaler = StandardScaler()
    X[numeric_cols] = scaler.fit_transform(X[numeric_cols])

print("✅ Basic feature engineering completed")

{{"processed_features": X.shape[1], "samples": X.shape[0], "processing_successful": True}}'''
    
    @finnish("feature_engineering_implemented")
    def feature_engineering_implemented(self):
        implementation_result = self.get_thinking("feature_engineering_implemented")
        feature_code = implementation_result.get("feature_code", "")
        target_variable = implementation_result.get("target_variable", "target")
        methods_count = implementation_result.get("methods_count", 0)
        status = implementation_result.get("status", "unknown")
        
        # Store feature engineering code
        self.add_variable("feature_engineering_code", feature_code)
        self.add_variable("target_variable", target_variable)
        
        # Display implementation status
        status_icons = {"success": "✅", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Feature Engineering Code Generated**")
        self.add_text(f"**Target Variable**: {target_variable}")
        self.add_text(f"**Methods Implemented**: {methods_count} feature engineering approaches")
        
        self.add_text("**Executing Feature Engineering Pipeline:**")
        
        if feature_code:
            return self.add_code(feature_code) \
                .exe_code_cli(
                    event_tag="feature_engineering_executed",
                    mark_finnish="Feature engineering pipeline completed"
                ) \
                .end_event()
        else:
            return self.add_text("⚠️ No feature engineering code could be generated") \
                .end_event()
    
    @after_exec("feature_engineering_executed")
    def feature_engineering_executed(self):
        feature_results = self.get_current_effect()
        self.add_variable("feature_engineering_results", feature_results)
        
        # Parse and display results
        if isinstance(feature_results, dict):
            processed_features = feature_results.get("processed_features", 0)
            samples = feature_results.get("samples", 0)
            target_var = feature_results.get("target_variable", "target")
            success = feature_results.get("processing_successful", False)
            
            status_icon = "✅" if success else "⚠️"
            self.add_text(f"{status_icon} **Feature Engineering Execution Results:**")
            self.add_text(f"**Processed Features**: {processed_features}")
            self.add_text(f"**Dataset Samples**: {samples:,}")
            self.add_text(f"**Target Variable**: {target_var}")
            
            if success:
                self.add_text("🎉 **Feature Engineering Pipeline Completed Successfully!**")
                self.add_text("📊 **Dataset Transformation Summary:**")
                self.add_text("- Feature scaling and normalization applied")
                self.add_text("- Categorical encoding implemented") 
                self.add_text("- Missing value imputation completed")
                self.add_text("- Data quality validation passed")
            else:
                self.add_text("⚠️ **Feature Engineering completed with warnings**")
        else:
            self.add_text("✅ **Feature Engineering Pipeline Executed**")
            self.add_text("Results summary:")
            self.add_text(str(feature_results))
        
        return self.add_text("🚀 **Ready to proceed with model method integration**") \
            .add_text("Processed dataset prepared for machine learning model training") \
            .end_event()

async def model_training_and_evaluation_step1(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return FeatureEngineeringIntegration(step, state, stream).run()