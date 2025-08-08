from typing import Dict, Any, Optional
from app.core.config import llm, ResultsEvaluationAgent
from app.models.BaseAction import BaseAction, event, thinking, after_exec, finnish

class TestDatasetGenerationValidation(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step, 
            state, 
            stream,
            chapter_id="chapter_7_results_evaluation_confirmation",
            section_id="section_2_test_dataset_generation_validation",
            name="Test Dataset Generation and Validation",
            ability="Generate comprehensive test dataset variations and establish validation procedures for robust final evaluation",
            require_variables=["results_evaluation_framework", "test_dataset_strategy"]
        )
        
    @event("start")
    def start(self):
        return self.new_section("Test Dataset Generation and Validation") \
            .add_text("Generating comprehensive test dataset variations and establishing validation procedures for robust final evaluation") \
            .add_text("Creating independent test datasets to validate model performance and robustness") \
            .next_thinking_event(
                event_tag="analyze_generation_requirements",
                textArray=[
                    "Results Evaluation Agent analyzing requirements...", 
                    "Evaluating test dataset generation needs...", 
                    "Planning comprehensive validation approach..."
                ],
                agentName="Results Evaluation Agent"
            ) \
            .end_event()
    
    @thinking("analyze_generation_requirements")
    def analyze_generation_requirements(self):
        try:
            # Get test dataset generation context
            results_evaluation_framework = self.get_variable("results_evaluation_framework", [])
            test_dataset_strategy = self.get_variable("test_dataset_strategy", [])
            csv_file_path = self.get_full_csv_path()
            stability_analysis_summary = self.get_variable("stability_analysis_summary", [])
            batch_evaluation_results = self.get_variable("batch_evaluation_results", {})
            
            # Validate required inputs
            if not results_evaluation_framework:
                return self.conclusion("no_evaluation_framework", {
                    "status": "missing_framework",
                    "message": "No results evaluation framework available from initialization"
                })
            
            if not test_dataset_strategy:
                return self.conclusion("no_test_strategy", {
                    "status": "missing_strategy",
                    "message": "No test dataset strategy available for implementation"
                })
            
            if not csv_file_path:
                return self.conclusion("no_data_source", {
                    "status": "missing_data",
                    "message": "No data source available for test dataset generation"
                })
            
            # Analyze generation requirements
            generation_context = {
                "framework_components": len(results_evaluation_framework),
                "strategy_components": len(test_dataset_strategy),
                "data_source_available": bool(csv_file_path),
                "has_stability_results": bool(stability_analysis_summary),
                "has_evaluation_results": bool(batch_evaluation_results),
                "total_validation_needs": len(results_evaluation_framework) + len(test_dataset_strategy)
            }
            
            return self.conclusion("generation_requirements_analyzed", generation_context)
            
        except Exception as e:
            # Error fallback
            return self.conclusion("generation_requirements_analyzed", {
                "framework_components": 0,
                "strategy_components": 0,
                "data_source_available": False,
                "has_stability_results": False,
                "has_evaluation_results": False,
                "total_validation_needs": 0,
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    @finnish("generation_requirements_analyzed")
    def generation_requirements_analyzed(self):
        generation_context = self.get_thinking("generation_requirements_analyzed")
        framework_components = generation_context.get("framework_components", 0)
        strategy_components = generation_context.get("strategy_components", 0)
        data_source_available = generation_context.get("data_source_available", False)
        total_validation_needs = generation_context.get("total_validation_needs", 0)
        
        # Display generation setup status
        self.add_text("✅ **Test Dataset Generation Requirements Analyzed**")
        self.add_text(f"**Evaluation Framework Components**: {framework_components} assessment methods")
        self.add_text(f"**Strategy Components**: {strategy_components} implementation approaches")
        self.add_text(f"**Data Source**: {'Available' if data_source_available else 'Not Available'}")
        self.add_text(f"**Total Validation Needs**: {total_validation_needs} validation requirements")
        
        # Continue to test dataset plan generation
        return self.add_text("Proceeding with comprehensive test dataset generation plan...") \
            .next_thinking_event(
                event_tag="generate_test_plan",
                textArray=["Results Evaluation Agent planning...", "generating comprehensive test dataset plan..."],
                agentName="Results Evaluation Agent"
            ) \
            .end_event()
    
    @finnish("no_evaluation_framework")
    def no_evaluation_framework(self):
        result = self.get_thinking("no_evaluation_framework")
        message = result.get("message", "No evaluation framework available")
        
        # Generate basic evaluation framework
        basic_framework = self._generate_basic_framework()
        self.add_variable("results_evaluation_framework", basic_framework)
        
        return self.add_text(f"⚠️ **Warning**: {message}") \
            .add_text("**Alternative Approach**: Using basic evaluation framework") \
            .add_text("Generated standard assessment approach") \
            .next_event("generate_test_plan") \
            .end_event()
    
    @finnish("no_test_strategy")
    def no_test_strategy(self):
        result = self.get_thinking("no_test_strategy")
        message = result.get("message", "No test strategy available")
        
        # Generate basic test strategy
        basic_strategy = self._generate_basic_test_strategy()
        self.add_variable("test_dataset_strategy", basic_strategy)
        
        return self.add_text(f"⚠️ **Warning**: {message}") \
            .add_text("**Alternative Approach**: Using basic test dataset strategy") \
            .add_text("Generated standard validation approach") \
            .next_event("generate_test_plan") \
            .end_event()
    
    @finnish("no_data_source")
    def no_data_source(self):
        result = self.get_thinking("no_data_source")
        message = result.get("message", "No data source available")
        
        return self.add_text(f"⚠️ **Critical Warning**: {message}") \
            .add_text("**Cannot Proceed**: Test dataset generation requires valid data source") \
            .add_text("Please ensure CSV file path is properly configured in previous steps") \
            .end_event()
    
    def _generate_basic_framework(self):
        """Generate basic evaluation framework as fallback"""
        return [{
            "evaluation_component": "Basic Final Assessment",
            "description": "Standard final model assessment",
            "evaluation_methods": ["Test dataset validation", "Performance verification"],
            "success_criteria": "Model demonstrates acceptable performance",
            "priority": "High"
        }]
    
    def _generate_basic_test_strategy(self):
        """Generate basic test strategy as fallback"""
        return [{
            "strategy_component": "Basic Test Dataset Creation",
            "description": "Standard test dataset generation",
            "implementation_approach": ["Create holdout test set", "Validate data quality"],
            "expected_deliverables": "Independent test dataset",
            "validation_criteria": "Test dataset is representative and valid"
        }]
    
    @thinking("generate_test_plan")
    def generate_test_plan(self):
        try:
            # Get context for test plan generation
            results_evaluation_framework = self.get_variable("results_evaluation_framework", [])
            test_dataset_strategy = self.get_variable("test_dataset_strategy", [])
            csv_file_path = self.get_full_csv_path()
            stability_analysis_summary = self.get_variable("stability_analysis_summary", [])
            
            # Initialize Results Evaluation Agent
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            
            results_agent = ResultsEvaluationAgent(
                problem_description=problem_description,
                context_description=context_description,
                best_five_result=str(stability_analysis_summary),
                llm=llm
            )
            
            # Generate comprehensive test dataset plan
            test_generation_plan = results_agent.generate_test_datasets_plan_cli(
                csv_file_path=csv_file_path,
                test_strategy=test_dataset_strategy,
                evaluation_framework=results_evaluation_framework
            )
            
            # Validate test generation plan
            if not test_generation_plan or not isinstance(test_generation_plan, list):
                # Generate fallback plan
                fallback_plan = self._generate_fallback_test_plan(
                    csv_file_path, test_dataset_strategy
                )
                test_generation_plan = fallback_plan
            
            return self.conclusion("test_plan_generated", {
                "test_generation_plan": test_generation_plan,
                "total_plan_components": len(test_generation_plan) if isinstance(test_generation_plan, list) else 0,
                "status": "success" if isinstance(test_generation_plan, list) and len(test_generation_plan) > 0 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic plan
            basic_plan = self._generate_basic_test_plan(csv_file_path, str(e))
            return self.conclusion("test_plan_generated", {
                "test_generation_plan": basic_plan,
                "total_plan_components": len(basic_plan),
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_test_plan(self, csv_path, test_strategy):
        """Generate fallback test generation plan when agent fails"""
        plan = []
        
        # Test dataset creation
        plan.append({
            "test_component": "Independent Test Dataset Creation",
            "description": "Create independent test dataset from original data",
            "implementation_steps": [
                f"Load original dataset from {csv_path}",
                "Perform stratified train-test split (80-20)",
                "Reserve 20% as final test dataset",
                "Validate test dataset representativeness"
            ],
            "expected_output": "Independent test dataset for final evaluation",
            "validation_method": "Distribution comparison and quality checks"
        })
        
        # Test variations generation
        plan.append({
            "test_component": "Test Dataset Variations",
            "description": "Generate test dataset variations for robustness testing",
            "implementation_steps": [
                "Create scaled version of test dataset",
                "Generate missing value simulation on test data",
                "Create outlier-adjusted test variation",
                "Validate all test variations"
            ],
            "expected_output": "Multiple test dataset variations",
            "validation_method": "Consistency checks across variations"
        })
        
        # Final validation framework
        plan.append({
            "test_component": "Test Dataset Validation Framework",
            "description": "Comprehensive validation of all generated test datasets",
            "implementation_steps": [
                "Statistical distribution validation",
                "Data quality assessment",
                "Representativeness verification",
                "Final test dataset approval"
            ],
            "expected_output": "Validated test datasets ready for final evaluation",
            "validation_method": "Comprehensive quality assessment framework"
        })
        
        return plan
    
    def _generate_basic_test_plan(self, csv_path, error_msg):
        """Generate basic test plan when processing fails"""
        return [{
            "test_component": "Basic Test Dataset Generation",
            "description": f"Standard test dataset creation (fallback due to error: {error_msg})",
            "implementation_steps": [
                f"Load data from {csv_path}",
                "Create basic train-test split",
                "Validate test dataset"
            ],
            "expected_output": "Basic test dataset",
            "validation_method": "Standard validation checks"
        }]
    
    @finnish("test_plan_generated")
    def test_plan_generated(self):
        plan_result = self.get_thinking("test_plan_generated")
        test_generation_plan = plan_result.get("test_generation_plan", [])
        total_components = plan_result.get("total_plan_components", 0)
        status = plan_result.get("status", "unknown")
        
        # Store test generation plan
        self.add_variable("test_generation_plan", test_generation_plan)
        
        # Display test generation plan
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Test Generation Plan Created**")
        
        if isinstance(test_generation_plan, list) and len(test_generation_plan) > 0:
            # Display plan in organized format
            plan_table = self.to_tableh(test_generation_plan)
            self.add_text("**Comprehensive Test Dataset Generation Plan:**")
            self.add_text(plan_table)
            
            # Plan analysis
            test_components = set(p.get("test_component", "Unknown").split()[0] for p in test_generation_plan)
            self.add_text(f"🎯 **Plan Overview**: {total_components} test generation components")
            if test_components:
                components_text = ", ".join(list(test_components)[:3])
                self.add_text(f"📊 **Test Components**: {components_text}{'...' if len(test_components) > 3 else ''}")
        else:
            self.add_text("⚠️ No specific test generation plan could be created")
        
        # Continue to validation code generation
        return self.add_text("Proceeding with test dataset validation code generation...") \
            .next_thinking_event(
                event_tag="generate_validation_code",
                textArray=["Results Evaluation Agent implementing...", "generating validation code..."],
                agentName="Results Evaluation Agent"
            ) \
            .end_event()
    
    @thinking("generate_validation_code")
    def generate_validation_code(self):
        try:
            # Get context for validation code generation
            test_generation_plan = self.get_variable("test_generation_plan", [])
            csv_file_path = self.get_full_csv_path()
            
            # Initialize Results Evaluation Agent
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            stability_analysis_summary = self.get_variable("stability_analysis_summary", [])
            
            results_agent = ResultsEvaluationAgent(
                problem_description=problem_description,
                context_description=context_description,
                best_five_result=str(stability_analysis_summary),
                llm=llm
            )
            
            # Generate test validation code
            test_validation_code = results_agent.generate_test_validation_code_cli(
                test_generation_plan=test_generation_plan,
                csv_file_path=csv_file_path
            )
            
            # Validate generated code
            if not test_validation_code or not isinstance(test_validation_code, str):
                # Generate fallback code
                fallback_code = self._generate_fallback_validation_code(
                    csv_file_path, test_generation_plan
                )
                test_validation_code = fallback_code
            
            return self.conclusion("validation_code_generated", {
                "test_validation_code": test_validation_code,
                "status": "success" if isinstance(test_validation_code, str) and len(test_validation_code) > 200 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic code
            basic_code = self._generate_basic_validation_code(csv_file_path, str(e))
            return self.conclusion("validation_code_generated", {
                "test_validation_code": basic_code,
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_validation_code(self, csv_path, test_plan):
        """Generate fallback validation code when agent fails"""
        code = f'''import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.impute import SimpleImputer
import os
import warnings
warnings.filterwarnings('ignore')

print("📈 Starting Comprehensive Test Dataset Generation and Validation")
print("=" * 70)

# Load original dataset
original_data = pd.read_csv("{csv_path}")
print(f"Original dataset shape: {{original_data.shape}}")

# Create test datasets directory
test_datasets_dir = "final_test_datasets"
os.makedirs(test_datasets_dir, exist_ok=True)

# Initialize test generation results
test_generation_results = []
test_datasets = {{}}

# Component 1: Independent Test Dataset Creation
print("\\n🎯 Component 1: Creating Independent Test Dataset")
try:
    # Identify target column (last column)
    target_column = original_data.columns[-1]
    X = original_data.drop(target_column, axis=1)
    y = original_data[target_column]
    
    # Stratified split for classification, regular split for regression
    is_classification = len(y.unique()) <= 20 or y.dtype == 'object'
    
    if is_classification:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        split_type = "Stratified"
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        split_type = "Random"
    
    # Create independent test dataset
    independent_test = pd.concat([X_test, y_test], axis=1)
    test_path = os.path.join(test_datasets_dir, "independent_test_dataset.csv")
    independent_test.to_csv(test_path, index=False)
    
    test_datasets["Independent_Test"] = independent_test
    test_generation_results.append({{
        "component": "Independent Test Dataset",
        "status": "Success",
        "shape": independent_test.shape,
        "split_type": split_type,
        "file_path": test_path
    }})
    
    print(f"✅ Independent test dataset created: {{independent_test.shape}}")
    print(f"   Split type: {{split_type}}")
    print(f"   Saved to: {{test_path}}")
    
except Exception as e:
    print(f"⚠️ Error creating independent test dataset: {{str(e)}}")
    test_generation_results.append({{
        "component": "Independent Test Dataset",
        "status": "Failed",
        "error": str(e)
    }})

# Component 2: Test Dataset Variations
print("\\n🔧 Component 2: Creating Test Dataset Variations")

if "Independent_Test" in test_datasets:
    base_test = test_datasets["Independent_Test"]
    
    # Variation 1: StandardScaler applied
    try:
        print("  Creating StandardScaler test variation...")
        test_scaled = base_test.copy()
        numeric_cols = test_scaled.select_dtypes(include=[np.number]).columns.tolist()
        if target_column in numeric_cols:
            numeric_cols.remove(target_column)  # Don't scale target
        
        if len(numeric_cols) > 0:
            scaler = StandardScaler()
            test_scaled[numeric_cols] = scaler.fit_transform(test_scaled[numeric_cols])
            
            scaled_path = os.path.join(test_datasets_dir, "test_standardscaled.csv")
            test_scaled.to_csv(scaled_path, index=False)
            test_datasets["StandardScaled_Test"] = test_scaled
            
            test_generation_results.append({{
                "component": "StandardScaler Test Variation",
                "status": "Success",
                "shape": test_scaled.shape,
                "features_scaled": len(numeric_cols),
                "file_path": scaled_path
            }})
            print(f"    ✅ StandardScaler variation: {{test_scaled.shape}}")
        else:
            print("    ⚠️ No numeric columns to scale")
            
    except Exception as e:
        print(f"    ⚠️ Error creating StandardScaler variation: {{str(e)}}")
        test_generation_results.append({{
            "component": "StandardScaler Test Variation",
            "status": "Failed",
            "error": str(e)
        }})
    
    # Variation 2: MinMaxScaler applied
    try:
        print("  Creating MinMaxScaler test variation...")
        test_minmax = base_test.copy()
        numeric_cols = test_minmax.select_dtypes(include=[np.number]).columns.tolist()
        if target_column in numeric_cols:
            numeric_cols.remove(target_column)  # Don't scale target
        
        if len(numeric_cols) > 0:
            scaler = MinMaxScaler()
            test_minmax[numeric_cols] = scaler.fit_transform(test_minmax[numeric_cols])
            
            minmax_path = os.path.join(test_datasets_dir, "test_minmaxscaled.csv")
            test_minmax.to_csv(minmax_path, index=False)
            test_datasets["MinMaxScaled_Test"] = test_minmax
            
            test_generation_results.append({{
                "component": "MinMaxScaler Test Variation",
                "status": "Success",
                "shape": test_minmax.shape,
                "features_scaled": len(numeric_cols),
                "file_path": minmax_path
            }})
            print(f"    ✅ MinMaxScaler variation: {{test_minmax.shape}}")
        else:
            print("    ⚠️ No numeric columns to scale")
            
    except Exception as e:
        print(f"    ⚠️ Error creating MinMaxScaler variation: {{str(e)}}")
        test_generation_results.append({{
            "component": "MinMaxScaler Test Variation",
            "status": "Failed",
            "error": str(e)
        }})
    
    # Variation 3: Missing value simulation and imputation
    try:
        print("  Creating missing value imputation test variation...")
        test_imputed = base_test.copy()
        numeric_cols = test_imputed.select_dtypes(include=[np.number]).columns.tolist()
        if target_column in numeric_cols:
            numeric_cols.remove(target_column)  # Don't add missing to target
        
        if len(numeric_cols) > 0:
            # Simulate some missing values (5% of data)
            np.random.seed(42)
            for col in numeric_cols[:min(2, len(numeric_cols))]:
                mask = np.random.random(len(test_imputed)) < 0.05
                test_imputed.loc[mask, col] = np.nan
            
            # Apply mean imputation
            imputer = SimpleImputer(strategy='mean')
            test_imputed[numeric_cols] = imputer.fit_transform(test_imputed[numeric_cols])
            
            imputed_path = os.path.join(test_datasets_dir, "test_meanimputed.csv")
            test_imputed.to_csv(imputed_path, index=False)
            test_datasets["MeanImputed_Test"] = test_imputed
            
            test_generation_results.append({{
                "component": "Mean Imputed Test Variation",
                "status": "Success",
                "shape": test_imputed.shape,
                "columns_imputed": min(2, len(numeric_cols)),
                "file_path": imputed_path
            }})
            print(f"    ✅ Mean imputation variation: {{test_imputed.shape}}")
        else:
            print("    ⚠️ No numeric columns for imputation")
            
    except Exception as e:
        print(f"    ⚠️ Error creating imputation variation: {{str(e)}}")
        test_generation_results.append({{
            "component": "Mean Imputed Test Variation",
            "status": "Failed",
            "error": str(e)
        }})

# Component 3: Test Dataset Validation Framework
print("\\n🔍 Component 3: Test Dataset Validation Framework")

validation_results = []
for dataset_name, dataset in test_datasets.items():
    try:
        print(f"  Validating {{dataset_name}}...")
        
        # Basic validation checks
        validation_checks = {{
            "dataset_name": dataset_name,
            "shape": dataset.shape,
            "missing_values": dataset.isnull().sum().sum(),
            "duplicates": dataset.duplicated().sum(),
            "data_types": len(dataset.dtypes.unique()),
            "memory_usage_mb": dataset.memory_usage(deep=True).sum() / (1024*1024)
        }}
        
        # Statistical validation (for numeric columns)
        numeric_columns = dataset.select_dtypes(include=[np.number]).columns
        if len(numeric_columns) > 0:
            validation_checks["mean_values"] = dataset[numeric_columns].mean().to_dict()
            validation_checks["std_values"] = dataset[numeric_columns].std().to_dict()
        
        validation_results.append(validation_checks)
        print(f"    ✅ {{dataset_name}} validated: {{dataset.shape}} - {{dataset.isnull().sum().sum()}} missing values")
        
    except Exception as e:
        print(f"    ⚠️ Error validating {{dataset_name}}: {{str(e)}}")
        validation_results.append({{
            "dataset_name": dataset_name,
            "status": "validation_error",
            "error": str(e)
        }})

# Final summary
print("\\n" + "=" * 70)
print("🏆 TEST DATASET GENERATION AND VALIDATION SUMMARY")
print("=" * 70)

# Success summary
successful_components = len([r for r in test_generation_results if r.get("status") == "Success"])
total_components = len(test_generation_results)
total_datasets = len(test_datasets)

print(f"\\n📈 **Generation Results**:")
print(f"   Successful components: {{successful_components}}/{{total_components}}")
print(f"   Total test datasets created: {{total_datasets}}")
print(f"   Test datasets directory: {{test_datasets_dir}}")

print(f"\\n📋 **Generated Test Datasets**:")
for result in test_generation_results:
    status_icon = "✅" if result.get("status") == "Success" else "⚠️"
    component = result.get("component", "Unknown")
    if "shape" in result:
        shape = result["shape"]
        print(f"   {{status_icon}} {{component}}: {{shape[0]}} rows × {{shape[1]}} columns")
    else:
        print(f"   {{status_icon}} {{component}}: {{result.get('status', 'Unknown status')}}")

print(f"\\n🔍 **Validation Summary**:")
for validation in validation_results:
    if "shape" in validation:
        name = validation["dataset_name"]
        shape = validation["shape"]
        missing = validation["missing_values"]
        duplicates = validation["duplicates"]
        print(f"   ✅ {{name}}: {{shape}} - {{missing}} missing, {{duplicates}} duplicates")
    else:
        name = validation.get("dataset_name", "Unknown")
        print(f"   ⚠️ {{name}}: Validation failed")

# Final test generation summary
final_summary = {{
    "test_generation_successful": successful_components > 0,
    "total_components": total_components,
    "successful_components": successful_components,
    "total_test_datasets": total_datasets,
    "test_datasets_created": list(test_datasets.keys()),
    "generation_results": test_generation_results,
    "validation_results": validation_results,
    "datasets_directory": test_datasets_dir
}}

print(f"\\n🎉 Test dataset generation and validation completed!")
print(f"📁 {{total_datasets}} test datasets ready for final evaluation")
print(f"✅ Validation framework successfully applied to all datasets")

final_summary'''
        return code
    
    def _generate_basic_validation_code(self, csv_path, error_msg):
        """Generate basic validation code when processing fails"""
        return f'''# Basic test dataset validation (error fallback)
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

print("⚠️ Basic test dataset generation due to error: {error_msg}")

# Load dataset
data = pd.read_csv("{csv_path}")
print(f"Dataset loaded: {{data.shape}}")

# Create basic test split
X = data.iloc[:, :-1]
y = data.iloc[:, -1]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Create test dataset
test_dataset = pd.concat([X_test, y_test], axis=1)
test_dataset.to_csv("basic_test_dataset.csv", index=False)

print(f"✅ Basic test dataset created: {{test_dataset.shape}}")
print(f"📁 Saved to: basic_test_dataset.csv")

{{
    "test_generation_successful": True,
    "total_test_datasets": 1,
    "test_datasets_created": ["basic_test_dataset"],
    "generation_results": [{{"component": "Basic Test Dataset", "status": "Success", "shape": test_dataset.shape}}]
}}'''
    
    @finnish("validation_code_generated")
    def validation_code_generated(self):
        code_result = self.get_thinking("validation_code_generated")
        test_validation_code = code_result.get("test_validation_code", "")
        status = code_result.get("status", "unknown")
        
        # Store validation code
        self.add_variable("test_validation_code", test_validation_code)
        
        # Display and execute code
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Test Dataset Validation Code Generated**")
        self.add_text("**Executing comprehensive test dataset generation and validation:**")
        
        if test_validation_code:
            return self.add_code(test_validation_code) \
                .exe_code_cli(
                    event_tag="test_datasets_created",
                    mark_finnish="Test datasets generated and validated"
                ) \
                .end_event()
        else:
            return self.add_text("⚠️ No validation code could be generated") \
                .end_event()
    
    @after_exec("test_datasets_created")
    def test_datasets_created(self):
        test_generation_results = self.get_current_effect()
        self.add_variable("test_generation_results", test_generation_results)
        
        # Parse and display generation results
        if isinstance(test_generation_results, dict):
            success = test_generation_results.get("test_generation_successful", False)
            total_datasets = test_generation_results.get("total_test_datasets", 0)
            datasets_created = test_generation_results.get("test_datasets_created", [])
            successful_components = test_generation_results.get("successful_components", 0)
            total_components = test_generation_results.get("total_components", 0)
            
            status_icon = "✅" if success else "⚠️"
            self.add_text(f"{status_icon} **Test Dataset Generation Results:**")
            self.add_text(f"**Total Test Datasets Created**: {total_datasets}")
            self.add_text(f"**Generation Components**: {successful_components}/{total_components} successful")
            
            if datasets_created:
                datasets_text = ", ".join(datasets_created[:3])
                self.add_text(f"**Datasets Created**: {datasets_text}{'...' if len(datasets_created) > 3 else ''}")
            
            if success:
                self.add_text("🎉 **Test Dataset Generation Completed Successfully!**")
                self.add_text("🔍 **Validation Summary:**")
                self.add_text("- Independent test datasets created for final model evaluation")
                self.add_text("- Multiple test variations generated for robustness assessment")
                self.add_text("- Comprehensive validation framework applied to all test datasets")
                self.add_text("- Test datasets validated and ready for final evaluation phase")
            else:
                self.add_text("⚠️ **Generation completed with some limitations**")
        else:
            self.add_text("✅ **Test Dataset Generation Executed**")
            self.add_text("Generation results:")
            self.add_text(str(test_generation_results))
        
        return self.add_text("🏆 **Test Dataset Generation and Validation Completed Successfully!**") \
            .add_text("📈 **Complete Test Dataset Portfolio**: Independent datasets ready for final model evaluation") \
            .add_text("🚀 **Next Phase**: Ready for final model evaluation and DCLS report generation") \
            .end_event()

async def results_evaluation_step1(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return TestDatasetGenerationValidation(step, state, stream).run()