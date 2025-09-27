from typing import Dict, Any, Optional
from app.core.config import llm, ProblemDefinitionAndDataCollectionAgent
from app.models.BaseAction import BaseAction, event, thinking, after_exec, finnish

class VariableSemanticAnalysis(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_1_data_existence_establishment",
                         section_id="section_3_variable_semantic_analysis",
                         name="Variable Semantic Analysis",
                         ability="Analyze variable semantics using VDS tools and agent insights",
                         require_variables=["column_names", "top_5_lines", "problem_description"])
    
    @event("start")
    def start(self):
        return self.new_section("Variable Semantic Analysis") \
            .add_text("Analyzing variable semantics and business meanings using VDS tools") \
            .next_event("vds_semantic_analysis") \
            .end_event()
    
    @event("vds_semantic_analysis")
    def vds_semantic_analysis(self):
        csv_file_path = self.get_full_csv_path()
        return self.add_text("Using VDS tools for comprehensive variable semantic analysis") \
            .add_code(f'''from vdstools import EDAToolkit

# Use VDS tools for comprehensive data analysis
eda_toolkit = EDAToolkit()

# Data type analysis
data_types = eda_toolkit.data_type_analysis("{csv_file_path}")
print(data_types)

# Data quality report (includes semantic issues detection)
quality_report = eda_toolkit.data_quality_report("{csv_file_path}")
print(quality_report)

# Basic data audit (includes observation unit information)
data_audit = eda_toolkit.basic_data_audit("{csv_file_path}")
print(data_audit)

quality_report''') \
            .exe_code_cli(
                event_tag="vds_analysis_complete",
                mark_finnish="VDS semantic analysis completed"
            ) \
            .end_event()
    
    @after_exec("vds_analysis_complete")
    def vds_analysis_complete(self):
        vds_result = self.get_current_effect()
        self.add_variable("variable_semantic_analysis", vds_result)
        
        return self.add_text("Variable semantic analysis completed using VDS tools") \
            .add_text("Results stored for next analysis phase") \
            .end_event()

async def generate_data_loading_and_hypothesis_proposal_step_2(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return VariableSemanticAnalysis(step, state, stream).run()