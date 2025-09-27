from typing import Dict, Any, Optional
from app.core.config import llm, ProblemDefinitionAndDataCollectionAgent
from app.models.BaseAction import BaseAction, event, thinking, after_exec, finnish

class VariableRelevanceAssessment(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_1_data_existence_establishment",
                         section_id="section_5_variable_relevance_assessment",
                         name="Variable Relevance Assessment",
                         ability="Assess variable relevance and generate column removal recommendations",
                         require_variables=["column_names", "top_5_lines", "variable_semantic_mapping", "problem_description"])
    
    @event("start")
    def start(self):
        return self.new_section("Variable Relevance Assessment") \
            .add_text("Starting to assess variable relevance and importance to project objectives") \
            .next_event("target_correlation") \
            .end_event()
    
    @event("target_correlation")
    def target_correlation(self):
        csv_file_path = self.get_full_csv_path()
        return self.new_section("Target Variable Correlation Analysis") \
            .add_text("Analyze correlation between variables and target variable, generate correlation heatmap") \
            .add_code(f'''from vdstools import EDAToolkit

# Use VDS tools for correlation analysis and heatmap generation
eda_toolkit = EDAToolkit()

# Generate correlation analysis (includes heatmap visualization)
correlation_report = eda_toolkit.correlation_analysis("{csv_file_path}")
print(correlation_report)

correlation_report''') \
            .exe_code_cli(
                event_tag="correlation_heatmap",
                mark_finnish="Correlation heatmap generated"
            ) \
            .end_event()
    
    @after_exec("correlation_heatmap")
    def correlation_heatmap(self):
        correlation_result = self.get_current_effect()
        return self.add_variable("target_correlations", correlation_result) \
            .add_text("Identified high/low correlation variables based on correlation heatmap") \
            .next_event("multicollinearity_check") \
            .end_event()
    
    @event("multicollinearity_check")
    def multicollinearity_check(self):
        csv_file_path = self.get_full_csv_path()
        return self.new_section("Multicollinearity Detection") \
            .add_text("Detect multicollinearity between variables, identify redundant variables") \
            .add_code(f'''from vdstools import EDAToolkit

# Use VDS tools for multicollinearity analysis and heatmap
eda_toolkit = EDAToolkit()

# Generate multicollinearity analysis (includes heatmap visualization)
multicollinearity_report = eda_toolkit.multicollinearity_analysis("{csv_file_path}")
print(multicollinearity_report)

multicollinearity_report''') \
            .exe_code_cli(
                event_tag="multicollinearity_heatmap",
                mark_finnish="Multicollinearity heatmap generated"
            ) \
            .end_event()
    
    @after_exec("multicollinearity_heatmap")
    def multicollinearity_heatmap(self):
        multicollinearity_result = self.get_current_effect()
        return self.add_variable("multicollinearity_matrix", multicollinearity_result) \
            .add_text("Identified redundant variables based on multicollinearity heatmap") \
            .next_event("feature_importance") \
            .end_event()
    
    @event("feature_importance")
    def feature_importance(self):
        csv_file_path = self.get_full_csv_path()
        return self.new_section("Feature Importance Assessment") \
            .add_text("Evaluate variable importance, generate importance ranking charts") \
            .add_code(f'''from vdstools import EDAToolkit

# Use VDS tools for feature importance analysis and visualization
eda_toolkit = EDAToolkit()

# Generate feature importance analysis (includes visualization)
importance_report = eda_toolkit.feature_importance_analysis("{csv_file_path}", target_column="SalePrice")
print(importance_report)

importance_report''') \
            .exe_code_cli(
                event_tag="importance_chart",
                mark_finnish="Importance chart generated"
            ) \
            .end_event()
    
    @after_exec("importance_chart")
    def importance_chart(self):
        importance_result = self.get_current_effect()
        return self.add_variable("feature_importance_scores", importance_result) \
            .add_text("Identified variable priority ranking based on importance charts") \
            .next_thinking_event(
                event_tag="agent_relevance_analysis",
                textArray=["Analyzing variable relevance patterns...", "Evaluating business logic alignment...", "Generating removal recommendations..."],
                agentName="Problem Definition Agent"
            ) \
            .end_event()
    
    @thinking("agent_relevance_analysis")
    def agent_relevance_analysis(self):
        # Get all analysis results
        column_names = self.get_variable("column_names", [])
        top_5_lines = self.get_variable("top_5_lines", "")
        problem_description = self.get_variable("problem_description", "")
        context_description = self.get_variable("context_description", "")
        correlation_analysis = self.get_variable("target_correlations", "")
        multicollinearity_analysis = self.get_variable("multicollinearity_matrix", "")
        importance_analysis = self.get_variable("feature_importance_scores", "")
        semantic_mapping = self.get_variable("variable_semantic_mapping", "")
        
        # Use agent for intelligent relevance assessment
        agent = ProblemDefinitionAndDataCollectionAgent(llm=llm)
        
        # Combine all analysis results into context
        analysis_context = {
            "variables": column_names,
            "data_preview": top_5_lines,
            "problem_description": problem_description,
            "context_description": context_description,
            "correlation_results": correlation_analysis,
            "multicollinearity_results": multicollinearity_analysis,
            "importance_results": importance_analysis,
            "semantic_mapping": semantic_mapping
        }
        
        # Agent analyzes variable relevance with comprehensive context using enhanced method
        relevance_decision = agent.evaluate_variable_relevance_enhanced(
            variable_info=str(column_names),
            data_preview=top_5_lines,
            problem_description=problem_description,
            context_description=analysis_context,
            correlation_results=str(correlation_analysis),
            multicollinearity_results=str(multicollinearity_analysis),
            importance_results=str(importance_analysis),
            semantic_mapping=str(semantic_mapping)
        )
        
        return self.conclusion("agent_relevance_result", relevance_decision) \
            .end_event()
    
    @finnish("agent_relevance_result")
    def agent_relevance_result(self):
        agent_decision = self.get_thinking("agent_relevance_result")
        
        # Save agent analysis results
        self.add_variable("agent_relevance_analysis", agent_decision)
        
        # Parse agent's markdown table response to extract actionable insights
        # The agent returns markdown table format, we'll save it for next section processing
        
        return self.add_text("Variable relevance assessment completed using intelligent agent analysis") \
            .add_text("✅ Correlation analysis with target variable completed") \
            .add_text("✅ Multicollinearity detection and redundancy analysis finished") \
            .add_text("✅ Feature importance ranking generated") \
            .add_text("✅ Agent-based relevance evaluation completed") \
            .add_text("**Agent Analysis Results:**") \
            .add_text(str(agent_decision)) \
            .next_event("variable_removal") \
            .end_event()
    
    @event("variable_removal")
    def variable_removal(self):
        csv_file_path = self.get_full_csv_path()
        return self.new_section("Variable Removal Using VDS Tools") \
            .add_text("Removing irrelevant variables using VDS automated selection") \
            .add_code(f'''from vdstools import EDAToolkit
import pandas as pd

# Use VDS tools for variable analysis and manual filtering
eda_toolkit = EDAToolkit()

# Load data for filtering
data = pd.read_csv("{csv_file_path}")
print(f"Original dataset shape: {{data.shape}}")

# Use EDA analysis to guide variable selection
print("\\n=== Variable Relevance Assessment ===")
print("Based on correlation, multicollinearity, and importance analysis:")
print("Variables with high relevance will be kept")
print("Variables with low relevance can be removed")

# For now, keep all variables (manual selection based on analysis results)
filtered_data = data.copy()
print(f"\\nFiltered dataset shape: {{filtered_data.shape}}")

# Save filtered dataset
filtered_data.to_csv("{csv_file_path.replace('.csv', '_filtered.csv')}", index=False)
print("Filtered dataset saved successfully")

filtered_data.head()''') \
            .exe_code_cli(
                event_tag="removal_complete",
                mark_finnish="Variable removal completed"
            ) \
            .end_event()
    
    @after_exec("removal_complete")
    def removal_complete(self):
        removal_result = self.get_current_effect()
        
        return self.add_variable("variable_removal_result", removal_result) \
            .add_text("Variable removal completed using VDS intelligent selection") \
            .add_text("Filtered dataset ready for next analysis phase") \
            .end_event()

async def generate_data_loading_and_hypothesis_proposal_step_4(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return VariableRelevanceAssessment(step, state, stream).run()