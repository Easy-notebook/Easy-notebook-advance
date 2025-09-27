from typing import Dict, Any, Optional
from app.models.BaseAction import BaseAction, event, after_exec, finnish

class DataStructureDiscovery(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_1_data_existence_establishment",
                         section_id="section_2_data_structure_discovery",
                         name="Data Structure Discovery",
                         ability="Discover the data structure",
                         require_variables=["csv_file_path"])
    
    @event("start")
    def start(self):
        csv_file_path = self.get_full_csv_path()
        return self.new_section("Data Preview") \
            .add_text("Read the first 5 rows of the CSV file and extract variable names and data preview") \
            .add_code(f"""from vdstools import DataPreview

# Use VDS tools to get column names and data preview
data_preview = DataPreview("{csv_file_path}")
variables = data_preview.column_list()
print(variables)""") \
            .exe_code_cli(
                event_tag="get_column_names",
                mark_finnish="Finished analysis of data columns"
            )\
            .end_event()

    @after_exec("get_column_names")
    def get_column_names(self):
        return self.add_variable("column_names", self.get_current_effect()) \
            .add_text("Finished analysis of data columns") \
            .next_event("preview_data")\
            .end_event()

    @event("preview_data")
    def preview_data(self):
        csv_file_path = self.get_full_csv_path()
        return self.add_text("Preview the first 5 rows of CSV file data") \
            .add_code(f"""from vdstools import DataPreview
data_preview = DataPreview("{csv_file_path}")
data_preview.top5line()""") \
            .exe_code_cli(
                event_tag="get_data_preview",
                mark_finnish="Finished preview of top 5 data rows"
            )\
            .end_event()

    @finnish("get_data_preview")
    def get_data_preview(self):
        return self.add_variable("top_5_lines", self.get_current_effect())\
            .add_text("Data preview completed, starting in-depth data type analysis") \
            .next_event("data_type_analysis") \
            .end_event()
    
    @event("data_type_analysis")
    def data_type_analysis(self):
        csv_file_path = self.get_full_csv_path()
        return self.new_section("Data Type Analysis") \
            .add_text("Analyze data types of each variable, identify mixed types and abnormal formats") \
            .add_code(f'''from vdstools import EDAToolkit

# Use VDS tools for data type analysis
eda_toolkit = EDAToolkit()
type_analysis_report = eda_toolkit.data_type_analysis("{csv_file_path}")
''') \
            .exe_code_cli(
                event_tag="type_analysis_result",
                mark_finnish="Data type analysis completed"
            ) \
            .end_event()

    @after_exec("type_analysis_result")
    def type_analysis_result(self):
        type_result = self.get_current_effect()
        return self.add_variable("data_types_analysis", type_result) \
            .add_text("Data type analysis completed, starting data distribution analysis") \
            .next_event("distribution_analysis") \
            .end_event()
    
    @event("distribution_analysis") 
    def distribution_analysis(self):
        csv_file_path = self.get_full_csv_path()
        return self.new_section("Data Distribution Analysis") \
            .add_text("Analyze data distribution characteristics, identify outliers and distribution patterns") \
            .add_code(f'''from vdstools import EDAToolkit

# Use VDS tools for data distribution analysis
eda_toolkit = EDAToolkit()
# Generate statistical summary report
stats_report = eda_toolkit.statistical_summary("{csv_file_path}")
# Perform correlation analysis to understand variable relationships
correlation_report = eda_toolkit.correlation_analysis("{csv_file_path}")  
''') \
            .exe_code_cli(
                event_tag="distribution_visualization",
                mark_finnish="Data distribution analysis completed"
            ) \
            .end_event()

    @after_exec("distribution_visualization")
    def distribution_visualization(self):
        dist_result = self.get_current_effect()
        return self.add_variable("distribution_summary", dist_result) \
            .add_text("Identified data distribution patterns and outlier characteristics based on distribution analysis") \
            .end_event()

async def generate_data_loading_and_hypothesis_proposal_step_1(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return DataStructureDiscovery(step, state, stream).run()