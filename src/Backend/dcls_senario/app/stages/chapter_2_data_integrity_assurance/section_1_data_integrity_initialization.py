from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.Behavior import Behavior, event, thinking, finnish, after_exec

class DataIntegrityInitialization(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step, 
            state, 
            stream,
            chapter_id="chapter_2_data_integrity_assurance",
            section_id="section_1_data_integrity_initialization",
            name="Data Integrity Initialization",
            ability="Initialize data integrity assurance workflow with comprehensive quality analysis",
            require_variables=[
                "problem_description",
                "csv_file_path"
            ]
        )
        
    @event("start")
    def start(self):
        return self.new_chapter(self.chapter_name) \
            .add_text("🔧 **Data Integrity Assurance - Initialization**") \
            .add_text("I will establish comprehensive data quality standards and validation procedures.") \
            .add_text("**Focus**: Missing values, data types, outliers, consistency, and completeness validation.") \
            .next_thinking_event(event_tag="analyze_integrity_requirements",
                                textArray=["PCS Agent analyzing data integrity requirements...", 
                                          "Applying quality assurance principles...", 
                                          "Determining optimal validation strategy..."])\
            .end_event()
    
    @thinking("analyze_integrity_requirements")
    def analyze_integrity_requirements(self):
        # Get context for integrity analysis
        user_goal = self.input.get("user_goal", "Complete data science analysis")
        csv_file_path = self.input.get("csv_file_path", "")
        target_variable = self.input.get("target_variable", "")
        
        # Use PCS Agent to analyze integrity requirements
        pcs_agent = PCSAgent(
            problem_description=self.input.get("problem_description", ""),
            context_description=self.input.get("context_description", ""),
            llm=llm
        )
        
        # Define integrity analysis goal
        integrity_goal = (
            f"Establish data integrity for goal: {user_goal}. "
            f"Validate dataset at {csv_file_path} with target variable {target_variable}. "
            "Ensure data quality through missing value analysis, type validation, outlier detection, and consistency checks."
        )
        
        try:
            # Get available sections for this stage
            available_sections = self.available_actions if isinstance(self.available_actions, list) else [
                "section_2_dimensional_integrity_validation",
                "section_3_value_validity_assurance", 
                "section_4_completeness_integrity_restoration",
                "section_5_comprehensive_integrity_verification"
            ]
            
            stage_analysis = pcs_agent.select_stage_actions_cli(
                stage_name="Data Integrity Assurance",
                stage_goal=integrity_goal,
                available_actions=available_sections,
                current_data_state="Data structure established - ready for quality validation",
                user_goal=user_goal
            )
            
            if stage_analysis and not stage_analysis.get("error"):
                selected_actions = [action["action_id"] for action in stage_analysis.get("selected_actions", [])]
                execution_order = stage_analysis.get("execution_order", selected_actions)
                stage_execution_plan = stage_analysis.get("stage_execution_plan", f"Execute selected sections: {', '.join(execution_order)}")
                
                analysis_result = {
                    "execution_order": execution_order,
                    "stage_execution_plan": stage_execution_plan,
                    "goal_relevance": stage_analysis.get("goal_relevance_analysis", ""),
                    "selected_actions": stage_analysis.get("selected_actions", []),
                    "skip_actions": stage_analysis.get("skip_actions", []),
                    "integrity_requirements": {
                        "csv_file_path": csv_file_path,
                        "target_variable": target_variable,
                        "analysis_type": "integrity_assurance",
                        "quality_standards": ["missing_values", "data_types", "outliers", "consistency"]
                    }
                }
            else:
                # Fallback to essential integrity checks
                print(f"PCS Agent analysis failed: {stage_analysis.get('error') if stage_analysis else 'No response'}")
                analysis_result = {
                    "execution_order": available_sections[:2],  # 执行前2个最重要的步骤
                    "stage_execution_plan": "Executing essential data integrity validation steps",
                    "goal_relevance": "Using fallback strategy with essential integrity checks only",
                    "selected_actions": [{"action_id": s, "necessity": "essential"} for s in available_sections[:2]],
                    "skip_actions": available_sections[2:],
                    "integrity_requirements": {
                        "csv_file_path": csv_file_path,
                        "target_variable": target_variable,
                        "analysis_type": "integrity_assurance_fallback",
                        "quality_standards": ["missing_values", "data_types"]
                    }
                }
                
        except Exception as e:
            print(f"Error in PCS Agent analysis: {str(e)}")
            # Minimal fallback - only dimensional integrity
            analysis_result = {
                "execution_order": ["section_2_dimensional_integrity_validation"],
                "stage_execution_plan": "Executing minimal dimensional integrity validation (error fallback)",
                "goal_relevance": f"Using minimal fallback due to: {str(e)}",
                "selected_actions": [{"action_id": "section_2_dimensional_integrity_validation", "necessity": "critical"}],
                "skip_actions": available_sections[1:],
                "integrity_requirements": {
                    "csv_file_path": csv_file_path,
                    "target_variable": target_variable,
                    "analysis_type": "minimal_fallback",
                    "quality_standards": ["basic_validation"]
                }
            }
        
        return self.conclusion("integrity_requirements_analysis", analysis_result)\
            .end_event()

    @finnish("integrity_requirements_analysis")
    def integrity_requirements_analysis(self):
        analysis_result = self.get_thinking("integrity_requirements_analysis")
        
        self.add_text("📋 **Data Integrity Requirements Analysis Complete**")
        self.add_text(analysis_result["stage_execution_plan"])
        
        # Store integrity requirements for later use
        self.add_variable("integrity_requirements", analysis_result["integrity_requirements"])
        
        # Update the workflow with selected steps
        return self.update_stage_steps(analysis_result["execution_order"]) \
            .next_event("perform_initial_quality_check") \
            .end_event()
    
    @event("perform_initial_quality_check")
    def perform_initial_quality_check(self):
        csv_file_path = self.get_safe_csv_path()
        target_variable = self.input.get("target_variable", "")
        
        return self.new_section("Initial Data Quality Assessment") \
            .add_text("🔍 Performing comprehensive initial data quality assessment") \
            .add_code(f'''import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Load and assess data quality
csv_file_path = "{csv_file_path}"
target_variable = "{target_variable}"

print("🔧 Data Integrity Assessment")
print("=" * 50)

try:
    # Load data
    df = pd.read_csv(csv_file_path)
    print(f"✅ Data loaded: {{df.shape}}")
    
    # 1. Missing Values Analysis
    print("\\n📊 Missing Values Analysis:")
    missing_summary = df.isnull().sum()
    missing_percentage = (missing_summary / len(df)) * 100
    
    missing_report = pd.DataFrame({{
        'Column': missing_summary.index,
        'Missing_Count': missing_summary.values,
        'Missing_Percentage': missing_percentage.values
    }})
    missing_report = missing_report[missing_report['Missing_Count'] > 0].sort_values('Missing_Percentage', ascending=False)
    
    if len(missing_report) > 0:
        print(f"⚠️ Found missing values in {{len(missing_report)}} columns:")
        print(missing_report.head(10))
    else:
        print("✅ No missing values found")
    
    # 2. Data Types Analysis
    print("\\n📋 Data Types Analysis:")
    dtype_summary = df.dtypes.value_counts()
    print(dtype_summary)
    
    # 3. Target Variable Analysis (if specified)
    if target_variable and target_variable in df.columns:
        print(f"\\n🎯 Target Variable Analysis: {{target_variable}}")
        print(f"Type: {{df[target_variable].dtype}}")
        print(f"Missing: {{df[target_variable].isnull().sum()}} ({{df[target_variable].isnull().sum()/len(df)*100:.1f}}%)")
        
        if df[target_variable].dtype in ['int64', 'float64']:
            print(f"Statistics: {{df[target_variable].describe()}}")
        else:
            print(f"Unique values: {{df[target_variable].nunique()}}")
            print(f"Value counts: {{df[target_variable].value_counts().head()}}")
    
    # 4. Basic Outlier Detection (for numeric columns)
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        print(f"\\n📈 Outlier Detection ({{len(numeric_cols)}} numeric columns):")
        outlier_summary = []
        
        for col in numeric_cols[:5]:  # Check first 5 numeric columns
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
            outlier_count = len(outliers)
            outlier_percentage = (outlier_count / len(df)) * 100
            
            outlier_summary.append({{
                'Column': col,
                'Outlier_Count': outlier_count,
                'Outlier_Percentage': outlier_percentage
            }})
        
        outlier_df = pd.DataFrame(outlier_summary)
        print(outlier_df)
    
    print("\\n✅ Initial data quality assessment completed")
    
except Exception as e:
    print(f"❌ Error in quality assessment: {{e}}")
    raise

''') \
            .exe_code_cli(
                event_tag="quality_assessment_completed",
                mark_finnish="Initial data quality assessment completed"
            ) \
            .end_event()
    
    @after_exec("quality_assessment_completed")
    def quality_assessment_completed(self):
        assessment_result = self.get_current_effect()
        
        # Store assessment result
        self.add_variable("initial_quality_assessment", assessment_result)
        
        return self.add_text("✅ **Data Integrity Initialization Complete**") \
            .add_text("Initial quality assessment completed. Data integrity requirements established and ready for detailed validation.") \
            .end_event()

    def get_safe_csv_path(self) -> str:
        """Get safe CSV file path with fallback options"""
        csv_file_path = self.input.get("csv_file_path", "")
        
        if not csv_file_path:
            # Try to get from variables
            csv_file_path = self.get_variable("csv_file_path", "")
        
        if not csv_file_path:
            # Use default test file
            csv_file_path = "src/Frontend/src/templates/AmesHousing.csv"
        
        return csv_file_path

async def generate_data_integrity_initialization_step_0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return DataIntegrityInitialization(step, state, stream).run()
