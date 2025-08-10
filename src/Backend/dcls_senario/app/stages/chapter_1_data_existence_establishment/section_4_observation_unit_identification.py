from typing import Dict, Any, Optional
from app.core.config import llm, ProblemDefinitionAndDataCollectionAgent
from app.models.Behavior import Behavior, event, thinking, after_exec, finnish

class ObservationUnitIdentification(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_1_data_existence_establishment",
                         section_id="section_4_observation_unit_identification",
                         name="Observation Unit Identification",
                         ability="Identify observation units and analyze temporal/spatial dimensions",
                         require_variables=["csv_file_path", "column_names", "top_5_lines", "problem_description"])
    
    @event("start")
    def start(self):
        return self.new_section("Observation Unit Identification") \
            .add_text("Start identifying observation units and analysis granularity of data") \
            .next_thinking_event(
                event_tag="unit_definition",
                textArray=["Analyzing observation unit types...", "Determining unique identifiers...", "Evaluating representativeness and completeness..."],
                agentName="Problem Definition Agent"
            ) \
            .end_event()
    
    @thinking("unit_definition")
    def unit_definition(self):
        try:
            # 获取变量信息
            column_names = self.get_variable("column_names")
            top_5_lines = self.get_variable("top_5_lines")
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            
            # 使用智能体进行观测单元识别
            agent = ProblemDefinitionAndDataCollectionAgent(llm=llm)
            unit_analysis = agent.detect_observation_unit_cli(
                variables=column_names,
                preview=top_5_lines,
                problem_description=problem_description,
                context_description=context_description
            )
            
            # 验证分析结果
            if not unit_analysis or not isinstance(unit_analysis, dict):
                unit_analysis = {
                    "observation_unit": "record",
                    "unit_definition": "Each row represents one observation unit",
                    "identifiers": column_names[:3] if column_names else [],
                    "temporal_fields": [],
                    "spatial_fields": [],
                    "analysis_status": "fallback_applied"
                }
            
            return self.conclusion("unit_definition_result", unit_analysis)
        except Exception as e:
            error_result = {
                "observation_unit": "record",
                "unit_definition": f"Error in analysis: {str(e)}, using fallback definition",
                "identifiers": [],
                "temporal_fields": [],
                "spatial_fields": [],
                "analysis_status": "error_fallback",
                "error": str(e)
            }
            return self.conclusion("unit_definition_result", error_result)
        finally:
            return self.end_event()
    
    @finnish("unit_definition_result")
    def unit_definition_result(self):
        unit_result = self.get_thinking("unit_definition_result")
        
        # 显示分析结果
        status = unit_result.get("analysis_status", "completed")
        if status == "error_fallback":
            self.add_text(f"⚠️ Agent analysis failed: {unit_result.get('error', 'Unknown error')}")
            self.add_text("Using fallback observation unit definition")
        elif status == "fallback_applied":
            self.add_text("⚠️ Agent returned invalid result, using fallback definition")
        else:
            self.add_text(f"✅ Observation unit identified: {unit_result.get('observation_unit', 'Unknown')}")
            
        # Build a normalized unit_check structure for downstream steps
        column_names = self.get_variable("column_names", [])
        identifiers = unit_result.get("identifiers") or []
        temporal_fields = unit_result.get("temporal_fields") or []
        spatial_fields = unit_result.get("spatial_fields") or []

        # Heuristics if agent did not provide fields
        if not identifiers and isinstance(column_names, list):
            id_like = [c for c in column_names if str(c).lower().endswith("id") or str(c).lower() in ["id", "uid", "pid"]]
            identifiers = id_like[:3]
        if not temporal_fields and isinstance(column_names, list):
            time_keywords = ["date", "time", "year", "month", "day", "week"]
            temporal_fields = [c for c in column_names if any(k in str(c).lower() for k in time_keywords)]
        if not spatial_fields and isinstance(column_names, list):
            geo_keywords = ["lat", "lon", "lng", "latitude", "longitude", "address", "city", "state", "region", "country"]
            spatial_fields = [c for c in column_names if any(k in str(c).lower() for k in geo_keywords)]

        unit_check = {
            "unit": unit_result.get("observation_unit", "record"),
            "identifiers": identifiers,
            "temporal_fields": temporal_fields,
            "spatial_fields": spatial_fields,
        }

        return self.add_variable("observation_unit_definition", unit_result) \
            .add_variable("unit_check", unit_check) \
            .add_text("Observation unit definition completed, starting temporal dimension analysis") \
            .next_event("temporal_analysis") \
            .end_event()
    
    @event("temporal_analysis")
    def temporal_analysis(self):
        csv_file_path = self.get_full_csv_path()
        return self.new_section("Temporal Dimension Analysis") \
            .add_text("Analyze data's time span, collection frequency and continuity") \
            .add_code(f'''from vdstools import EDAToolkit

# Use VDS tools for temporal dimension analysis
eda_toolkit = EDAToolkit()
temporal_report = eda_toolkit.temporal_analysis("{csv_file_path}")
''') \
            .exe_code_cli(
                event_tag="temporal_visualization",
                mark_finnish="Temporal dimension analysis completed"
            ) \
            .end_event()
    
    @after_exec("temporal_visualization")
    def temporal_visualization(self):
        temporal_result = self.get_current_effect()
        # persist temporal analysis html
        self.add_variable("temporal_characteristics", temporal_result)
        # enrich unit_check with temporal flags
        unit_check = self.get_variable("unit_check", {}) or {}
        unit_check["has_temporal"] = bool(self.get_variable("unit_check", {}).get("temporal_fields", []))
        self.add_variable("unit_check", unit_check)
        return self.add_text("Identified temporal characteristics of data through time series analysis") \
            .next_event("spatial_analysis") \
            .end_event()
    
    @event("spatial_analysis")
    def spatial_analysis(self):
        csv_file_path = self.get_full_csv_path()
        return self.new_section("Spatial Dimension Analysis") \
            .add_text("Analyze geographical distribution and spatial sampling characteristics of data") \
            .add_code(f'''from vdstools import EDAToolkit

# Use VDS tools for spatial dimension analysis
eda_toolkit = EDAToolkit()
spatial_report = eda_toolkit.spatial_analysis("{csv_file_path}")
''') \
            .exe_code_cli(
                event_tag="spatial_visualization",
                mark_finnish="Spatial dimension analysis completed"
            ) \
            .end_event()
    
    @after_exec("spatial_visualization")
    def spatial_visualization(self):
        spatial_result = self.get_current_effect()
        # persist spatial analysis html
        self.add_variable("spatial_characteristics", spatial_result)
        # enrich unit_check with spatial flags
        unit_check = self.get_variable("unit_check", {}) or {}
        unit_check["has_spatial"] = bool(self.get_variable("unit_check", {}).get("spatial_fields", []))
        self.add_variable("unit_check", unit_check)
        return self.add_text("Identified geographic characteristics and sampling patterns through spatial distribution analysis") \
            .end_event()

async def generate_data_loading_and_hypothesis_proposal_step_3(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return ObservationUnitIdentification(step, state, stream).run()