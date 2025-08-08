from typing import Dict, Any, Optional
from app.core.config import llm, ProblemDefinitionAndDataCollectionAgent
from app.models.BaseAction import BaseAction, event, after_exec, thinking, finnish

class VariableSemanticAnalysis(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_1_data_existence_establishment",
                         section_id="section_3_variable_semantic_analysis",
                         name="Variable Semantic Analysis",
                         ability="Analyze variable semantics using VDS tools and agent insights",
                         require_variables=["csv_file_path", "column_names", "top_5_lines", "problem_description"])
    
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
            .add_code(f'''from vdstools import build_semantic_context

# Build compact semantic context for agents
vds_semantic_context = build_semantic_context("{csv_file_path}")
print(vds_semantic_context)''') \
            .exe_code_cli(
                event_tag="vds_analysis_complete",
                mark_finnish="VDS semantic analysis completed"
            ) \
            .end_event()
    
    @after_exec("vds_analysis_complete")
    def vds_analysis_complete(self):
        vds_context = self.get_current_effect()
        # Persist VDS semantic context for agent reference
        self.add_variable("vds_semantic_context", vds_context)
        # Bridge common variables if missing to keep downstream steps robust
        try:
            if isinstance(vds_context, dict):
                # Provide data_preview from sample_preview
                if not self.get_variable("data_preview") and vds_context.get("sample_preview") is not None:
                    self.add_variable("data_preview", vds_context.get("sample_preview"))
                # Provide data_info as columns list if not present
                if not self.get_variable("data_info") and vds_context.get("columns") is not None:
                    self.add_variable("data_info", vds_context.get("columns"))
                # Persist variable dtypes for downstream feature engineering
                if vds_context.get("dtypes") is not None:
                    self.add_variable("variable_dtypes", vds_context.get("dtypes"))
                # Persist missing counts per column for data cleaning agents
                if vds_context.get("missing_per_column") is not None:
                    self.add_variable("missing_per_column", vds_context.get("missing_per_column"))
        except Exception:
            pass
        # Proceed to derive business-oriented semantic mapping via agent
        return self.next_thinking_event(
            event_tag="derive_semantic_mapping",
            textArray=["Analyzing variables' business semantics...", "Deriving units/scales and human-friendly meanings..."],
            agentName="Problem Definition Agent"
        ).end_event()

    @thinking("derive_semantic_mapping")
    def derive_semantic_mapping(self):
        try:
            column_names = self.get_variable("column_names", [])
            top_5_lines = self.get_variable("top_5_lines", "")
            problem_description = self.get_variable("problem_description", "")
            context_description = self.get_variable("context_description", "")
            vds_semantic_context = self.get_variable("vds_semantic_context", {})

            agent = ProblemDefinitionAndDataCollectionAgent(llm=llm)
            if hasattr(agent, 'derive_variable_semantics_cli'):
                mapping = agent.derive_variable_semantics_cli(
                    variables=column_names,
                    preview=top_5_lines,
                    problem_description=problem_description,
                    context_description=context_description,
                    vds_context=str(vds_semantic_context)
                )
            else:
                mapping = [
                    {"variable": c, "meaning": "TBD", "unit": "", "scale": "", "notes": "fallback"}
                    for c in column_names
                ]

            return self.conclusion("variable_semantic_mapping_ready", mapping)
        except Exception as e:
            fallback = [
                {"variable": c, "meaning": f"auto: {c}", "unit": "", "scale": "", "notes": f"error: {str(e)}"}
                for c in self.get_variable("column_names", [])
            ]
            return self.conclusion("variable_semantic_mapping_ready", fallback)
        finally:
            return self.end_event()

    @finnish("variable_semantic_mapping_ready")
    def variable_semantic_mapping_ready(self):
        mapping = self.get_thinking("variable_semantic_mapping_ready")
        self.add_variable("variable_semantic_mapping", mapping)
        return self.add_text("Variable semantic analysis completed and mapping prepared") \
            .end_event()

async def generate_data_loading_and_hypothesis_proposal_step_2(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return VariableSemanticAnalysis(step, state, stream).run()