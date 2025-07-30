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
        return self.new_section("Data preview") \
            .add_text("read the first 5 rows of the CSV file and extract the variable names and data preview") \
            .add_code(f"""import pandas as pd
data = pd.read_csv("{self.input["csv_file_path"]}")
preview = data.head().to_dict(orient="records")
variables = list(data.columns)
print(variables)""") \
            .exe_code_cli(
                event_tag="get_column_names",
                mark_finnish="finished glance at the each column of the data"
            )\
            .end_event()

    @after_exec("get_column_names")
    def get_column_names(self):
        return self.add_variable("column_names", self.get_current_effect()) \
            .add_text("finished glance at the each column of the data") \
            .next_event("preview_data")\
            .end_event()

    @event("preview_data")
    def preview_data(self):
        return self.add_text("read the first 5 rows of the CSV file and extract the variable names and data preview") \
            .add_code(f"""from vdstools import DataPreview
data_preview = DataPreview("{self.input["csv_file_path"]}")
data_preview.top5line()""") \
            .exe_code_cli(
                event_tag="get_data_preview",
                mark_finnish="finished glance at the top 5 rows of the data"
            )\
            .end_event()

    @finnish("get_data_preview")
    def get_data_preview(self):
        return self.add_variable("top_5_lines", self.get_current_effect())\
            .add_text("finished glance at the top 5 rows of the data") \
            .end_event()

async def generate_data_loading_and_hypothesis_proposal_step_1(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return DataStructureDiscovery(step, state, stream).run()