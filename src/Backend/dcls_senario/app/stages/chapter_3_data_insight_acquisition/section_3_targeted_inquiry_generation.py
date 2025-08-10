from typing import Dict, Any, Optional
from app.core.config import llm, DataCleaningAndEDA_Agent
from app.models.Behavior import Behavior, event, thinking, finnish

class TargetedInquiryGeneration(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_3_data_insight_acquisition",
                         section_id="section_3_targeted_inquiry_generation",
                         name="Targeted Inquiry Generation",
                         ability="Generate targeted EDA questions based on data characteristics and problem context",
                         require_variables=["problem_description", "csv_file_path"])
    
    @event("start")
    def start(self):
        # If data_info or data_preview is missing, bootstrap EDA context via VDS Tools
        needs_bootstrap = not self.get_variable("data_info") or not self.get_variable("data_preview")
        if needs_bootstrap:
            csv_file_path = self.get_full_csv_path()
            return self.new_section("Generate EDA Questions") \
                .add_text("Bootstrapping EDA context (data_info, data_preview) using VDS tools") \
                .add_code(f'''from vdstools import DataPreview

dp = DataPreview()
info = dp.data_info("{csv_file_path}")
preview = dp.top5line("{csv_file_path}")
print({{"data_info": info, "data_preview": preview}})''') \
                .exe_code_cli(
                    event_tag="bootstrap_eda_context",
                    mark_finnish="EDA context prepared"
                ) \
                .end_event()
        
        return self.new_section("Generate EDA Questions") \
            .add_text("Understanding data structure and generating targeted exploratory questions") \
            .add_text("Creating comprehensive EDA questions based on problem context and data characteristics") \
            .next_thinking_event(
                event_tag="generate_eda_questions",
                textArray=["Data Cleaning and EDA Agent is thinking...", "generating targeted EDA questions..."],
                agentName="Data Cleaning and EDA Agent"
            ) \
            .end_event()

    @after_exec("bootstrap_eda_context")
    def bootstrap_eda_context(self):
        effect = self.get_current_effect()
        if isinstance(effect, dict):
            if "data_info" in effect:
                self.add_variable("data_info", effect["data_info"])
            if "data_preview" in effect:
                self.add_variable("data_preview", effect["data_preview"])
        return self.next_thinking_event(
            event_tag="generate_eda_questions",
            textArray=["Data Cleaning and EDA Agent is thinking...", "generating targeted EDA questions..."],
            agentName="Data Cleaning and EDA Agent"
        ).end_event()
    
    @thinking("generate_eda_questions")
    def generate_eda_questions(self):
        try:
            # Get context information for question generation
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            unit_check = self.get_variable("unit_check", "")
            variables = self.get_variable("variables", self.get_variable("data_info", []))
            hypothesis = self.get_variable("pcs_hypothesis", {})
            data_info = self.get_variable("data_info")
            data_preview = self.get_variable("data_preview")
            
            # Initialize EDA agent with comprehensive context
            eda_agent = DataCleaningAndEDA_Agent(
                llm=llm,
                problem_description=problem_description,
                context_description=context_description,
                check_unit=unit_check,
                var_json=variables,
                hyp_json=hypothesis
            )
            
            # Generate targeted EDA questions
            eda_questions = eda_agent.generate_eda_questions_cli(
                problem_description, 
                data_info, 
                data_preview
            )
            
            # Validate and structure questions
            if not eda_questions or not isinstance(eda_questions, list):
                # Fallback to basic EDA questions
                fallback_questions = [
                    {
                        "question": "What is the basic statistical distribution of numeric variables?",
                        "type": "descriptive",
                        "priority": "high",
                        "rationale": "Understanding basic data characteristics"
                    },
                    {
                        "question": "What are the relationships between key variables?",
                        "type": "correlation",
                        "priority": "high", 
                        "rationale": "Identifying important variable relationships"
                    },
                    {
                        "question": "Are there any outliers or anomalies in the data?",
                        "type": "anomaly_detection",
                        "priority": "medium",
                        "rationale": "Data quality and pattern discovery"
                    },
                    {
                        "question": "What patterns exist in categorical variables?",
                        "type": "categorical",
                        "priority": "medium",
                        "rationale": "Understanding categorical data distribution"
                    }
                ]
                eda_questions = fallback_questions
            
            return self.conclusion("eda_questions_generated", eda_questions)
        except Exception as e:
            # Error fallback with minimal questions
            error_questions = [
                {
                    "question": "What is the basic structure and distribution of the data?",
                    "type": "basic_exploration",
                    "priority": "high",
                    "rationale": f"Fallback due to error: {str(e)}"
                },
                {
                    "question": "What are the key characteristics of each variable?",
                    "type": "variable_analysis", 
                    "priority": "high",
                    "rationale": "Essential data understanding"
                }
            ]
            return self.conclusion("eda_questions_generated", error_questions)
        finally:
            return self.end_event()
    
    @finnish("eda_questions_generated")
    def eda_questions_generated(self):
        eda_questions = self.get_thinking("eda_questions_generated")
        
        # Store questions and display them
        self.add_variable("eda_questions", eda_questions)
        
        # Display questions in organized format
        if isinstance(eda_questions, list) and len(eda_questions) > 0:
            # Convert to table format for better display
            markdown_str = self.to_tableh(eda_questions)
            
            self.add_text("🎯 **Generated EDA Questions**")
            self.add_text("Based on your problem context and data characteristics, here are the targeted exploratory questions:")
            self.add_text(markdown_str)
            
            # Group questions by priority for summary
            high_priority = [q for q in eda_questions if q.get("priority", "").lower() == "high"]
            medium_priority = [q for q in eda_questions if q.get("priority", "").lower() == "medium"]
            
            self.add_text(f"📊 **Question Summary**: {len(eda_questions)} total questions generated")
            if high_priority:
                self.add_text(f"🔴 High Priority: {len(high_priority)} questions")
            if medium_priority:
                self.add_text(f"🟡 Medium Priority: {len(medium_priority)} questions")
                
            self.add_text("✅ EDA questions generated successfully")
            self.add_text("Ready to proceed with analytical insight extraction")
        else:
            self.add_text("⚠️ No EDA questions generated, using basic exploration approach")
        
        return self.end_event()

async def generate_exploratory_data_sequence_step2(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return TargetedInquiryGeneration(step, state, stream).run()