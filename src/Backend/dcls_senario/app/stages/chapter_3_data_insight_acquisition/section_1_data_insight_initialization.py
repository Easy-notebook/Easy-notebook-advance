from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.Behavior import Behavior, event, thinking, finnish, after_exec

class DataInsightInitialization(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step, 
            state, 
            stream,
            chapter_id="chapter_3_data_insight_acquisition",
            section_id="section_1_data_insight_initialization",
            name="Data Insight Initialization",
            ability="Initialize data insight acquisition workflow with exploratory data analysis strategy",
            require_variables=[
                "problem_description",
                "csv_file_path"
            ]
        )
        
    @event("start")
    def start(self):
        return self.new_chapter(self.chapter_name) \
            .add_text("🔍 **Data Insight Acquisition - Initialization**") \
            .add_text("I will establish comprehensive exploratory data analysis strategy to uncover hidden patterns and insights.") \
            .add_text("**Focus**: Statistical analysis, correlation discovery, pattern recognition, and feature relationships.") \
            .next_thinking_event(event_tag="analyze_insight_strategy",
                                textArray=["PCS Agent analyzing insight acquisition strategy...", 
                                          "Applying exploratory data analysis principles...", 
                                          "Determining optimal discovery approach..."])\
            .end_event()
    
    @thinking("analyze_insight_strategy")
    def analyze_insight_strategy(self):
        # Get context for insight analysis
        user_goal = self.input.get("user_goal", "Complete data science analysis")
        csv_file_path = self.input.get("csv_file_path", "")
        target_variable = self.input.get("target_variable", "")
        
        # Use PCS Agent to analyze insight strategy
        pcs_agent = PCSAgent(
            problem_description=self.input.get("problem_description", ""),
            context_description=self.input.get("context_description", ""),
            llm=llm
        )
        
        # Define insight analysis goal
        insight_goal = (
            f"Acquire deep data insights for goal: {user_goal}. "
            f"Explore dataset at {csv_file_path} with target variable {target_variable}. "
            "Discover patterns, correlations, distributions, and feature relationships through comprehensive EDA."
        )
        
        try:
            # Get available sections for this stage
            available_sections = self.available_actions if isinstance(self.available_actions, list) else [
                "section_2_current_data_state_assessment",
                "section_3_targeted_inquiry_generation", 
                "section_4_analytical_insight_extraction",
                "section_5_comprehensive_insight_consolidation"
            ]
            
            stage_analysis = pcs_agent.select_stage_actions_cli(
                stage_name="Data Insight Acquisition",
                stage_goal=insight_goal,
                available_actions=available_sections,
                current_data_state="Data integrity validated - ready for deep exploration",
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
                    "insight_strategy": {
                        "csv_file_path": csv_file_path,
                        "target_variable": target_variable,
                        "analysis_type": "insight_acquisition",
                        "exploration_focus": ["distributions", "correlations", "patterns", "relationships"]
                    }
                }
            else:
                # Fallback to essential insight discovery
                print(f"PCS Agent analysis failed: {stage_analysis.get('error') if stage_analysis else 'No response'}")
                analysis_result = {
                    "execution_order": available_sections[:2],  # 执行前2个最重要的步骤
                    "stage_execution_plan": "Executing essential data insight discovery steps",
                    "goal_relevance": "Using fallback strategy with essential insight acquisition only",
                    "selected_actions": [{"action_id": s, "necessity": "essential"} for s in available_sections[:2]],
                    "skip_actions": available_sections[2:],
                    "insight_strategy": {
                        "csv_file_path": csv_file_path,
                        "target_variable": target_variable,
                        "analysis_type": "insight_acquisition_fallback",
                        "exploration_focus": ["basic_distributions", "simple_correlations"]
                    }
                }
                
        except Exception as e:
            print(f"Error in PCS Agent analysis: {str(e)}")
            # Minimal fallback - only current state assessment
            analysis_result = {
                "execution_order": ["section_2_current_data_state_assessment"],
                "stage_execution_plan": "Executing minimal data state assessment (error fallback)",
                "goal_relevance": f"Using minimal fallback due to: {str(e)}",
                "selected_actions": [{"action_id": "section_2_current_data_state_assessment", "necessity": "critical"}],
                "skip_actions": available_sections[1:],
                "insight_strategy": {
                    "csv_file_path": csv_file_path,
                    "target_variable": target_variable,
                    "analysis_type": "minimal_fallback",
                    "exploration_focus": ["basic_assessment"]
                }
            }
        
        return self.conclusion("insight_strategy_analysis", analysis_result)\
            .end_event()

    @finnish("insight_strategy_analysis")
    def insight_strategy_analysis(self):
        analysis_result = self.get_thinking("insight_strategy_analysis")
        
        self.add_text("📋 **Data Insight Strategy Analysis Complete**")
        self.add_text(analysis_result["stage_execution_plan"])
        
        # Store insight strategy for later use
        self.add_variable("insight_strategy", analysis_result["insight_strategy"])
        
        # Update the workflow with selected steps
        return self.update_stage_steps(analysis_result["execution_order"]) \
            .next_event("perform_initial_exploration") \
            .end_event()
    
    @event("perform_initial_exploration")
    def perform_initial_exploration(self):
        csv_file_path = self.get_safe_csv_path()
        target_variable = self.input.get("target_variable", "")
        
        return self.new_section("Initial Data Exploration") \
            .add_text("🔍 Performing comprehensive initial exploratory data analysis") \
            .add_code(f'''import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

# Set up plotting style
plt.style.use('default')
sns.set_palette("husl")

# Load data for exploration
csv_file_path = "{csv_file_path}"
target_variable = "{target_variable}"

print("🔍 Data Insight Acquisition - Initial Exploration")
print("=" * 60)

try:
    # Load data
    df = pd.read_csv(csv_file_path)
    print(f"✅ Data loaded: {{df.shape}}")
    
    # 1. Basic Statistical Summary
    print("\\n📊 Basic Statistical Summary:")
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        print(f"Numeric columns: {{len(numeric_cols)}}")
        print(df[numeric_cols].describe())
    
    categorical_cols = df.select_dtypes(include=['object']).columns
    if len(categorical_cols) > 0:
        print(f"\\nCategorical columns: {{len(categorical_cols)}}")
        for col in categorical_cols[:5]:  # Show first 5 categorical columns
            print(f"{{col}}: {{df[col].nunique()}} unique values")
    
    # 2. Target Variable Deep Dive (if specified)
    if target_variable and target_variable in df.columns:
        print(f"\\n🎯 Target Variable Deep Analysis: {{target_variable}}")
        
        if df[target_variable].dtype in ['int64', 'float64']:
            # Numeric target analysis
            print(f"Type: Numeric")
            print(f"Range: {{df[target_variable].min()}} to {{df[target_variable].max()}}")
            print(f"Mean: {{df[target_variable].mean():.2f}}")
            print(f"Median: {{df[target_variable].median():.2f}}")
            print(f"Std: {{df[target_variable].std():.2f}}")
            
            # Check for skewness
            skewness = stats.skew(df[target_variable].dropna())
            print(f"Skewness: {{skewness:.2f}} ({'Right-skewed' if skewness > 0.5 else 'Left-skewed' if skewness < -0.5 else 'Approximately normal'})")
            
        else:
            # Categorical target analysis
            print(f"Type: Categorical")
            print(f"Unique values: {{df[target_variable].nunique()}}")
            print("Value distribution:")
            print(df[target_variable].value_counts().head())
    
    # 3. Correlation Analysis (for numeric variables)
    if len(numeric_cols) > 1:
        print(f"\\n📈 Correlation Analysis:")
        correlation_matrix = df[numeric_cols].corr()
        
        # Find high correlations with target variable (if numeric)
        if target_variable and target_variable in numeric_cols:
            target_correlations = correlation_matrix[target_variable].abs().sort_values(ascending=False)
            print(f"\\nTop correlations with {{target_variable}}:")
            print(target_correlations.head(10))
        
        # Find high inter-feature correlations
        high_corr_pairs = []
        for i in range(len(correlation_matrix.columns)):
            for j in range(i+1, len(correlation_matrix.columns)):
                corr_val = abs(correlation_matrix.iloc[i, j])
                if corr_val > 0.7:  # High correlation threshold
                    high_corr_pairs.append((
                        correlation_matrix.columns[i], 
                        correlation_matrix.columns[j], 
                        corr_val
                    ))
        
        if high_corr_pairs:
            print(f"\\n⚠️ High inter-feature correlations (>0.7):")
            for col1, col2, corr in high_corr_pairs[:5]:
                print(f"{{col1}} - {{col2}}: {{corr:.3f}}")
    
    # 4. Missing Value Patterns
    print("\\n🔍 Missing Value Patterns:")
    missing_data = df.isnull().sum()
    missing_cols = missing_data[missing_data > 0]
    
    if len(missing_cols) > 0:
        print(f"Columns with missing values: {{len(missing_cols)}}")
        for col in missing_cols.head(5).index:
            missing_pct = (missing_cols[col] / len(df)) * 100
            print(f"{{col}}: {{missing_cols[col]}} ({{missing_pct:.1f}}%)")
    else:
        print("✅ No missing values detected")
    
    # 5. Data Distribution Insights
    print("\\n📊 Data Distribution Insights:")
    
    # Check for potential data quality issues
    duplicate_rows = df.duplicated().sum()
    print(f"Duplicate rows: {{duplicate_rows}} ({{duplicate_rows/len(df)*100:.1f}}%)")
    
    # Check for constant columns
    constant_cols = [col for col in df.columns if df[col].nunique() <= 1]
    if constant_cols:
        print(f"⚠️ Constant columns (may need removal): {{constant_cols}}")
    
    # Check for high cardinality categorical columns
    high_cardinality_cols = [col for col in categorical_cols if df[col].nunique() > 50]
    if high_cardinality_cols:
        print(f"⚠️ High cardinality categorical columns: {{high_cardinality_cols}}")
    
    print("\\n✅ Initial data exploration completed")
    print("Ready for detailed insight extraction and pattern discovery")
    
except Exception as e:
    print(f"❌ Error in data exploration: {{e}}")
    raise

''') \
            .exe_code_cli(
                event_tag="exploration_completed",
                mark_finnish="Initial data exploration completed"
            ) \
            .end_event()
    
    @after_exec("exploration_completed")
    def exploration_completed(self):
        exploration_result = self.get_current_effect()
        
        # Store exploration result
        self.add_variable("initial_data_exploration", exploration_result)
        
        return self.add_text("✅ **Data Insight Initialization Complete**") \
            .add_text("Initial data exploration completed. Insight acquisition strategy established and ready for detailed pattern discovery.") \
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

async def generate_data_insight_initialization_step_0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return DataInsightInitialization(step, state, stream).run()
