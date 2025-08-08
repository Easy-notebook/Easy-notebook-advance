from typing import Dict, Any, Optional
from app.core.config import llm, DataCleaningAndEDA_Agent
from app.models.BaseAction import BaseAction, event, thinking, after_exec, finnish

class AnalyticalInsightExtraction(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_3_data_insight_acquisition",
                         section_id="section_4_analytical_insight_extraction",
                         name="Analytical Insight Extraction",
                         ability="Extract analytical insights by solving EDA questions systematically",
                         require_variables=["problem_description", "csv_file_path"])
    
    @event("start")
    def start(self):
        return self.new_section("EDA Questions Solving") \
            .add_text("Starting systematic analysis of EDA questions") \
            .add_text("Extracting insights through comprehensive exploratory data analysis") \
            .next_thinking_event(
                event_tag="solve_eda_questions",
                textArray=["Data Cleaning and EDA Agent is thinking...", "solving EDA questions..."],
                agentName="Data Cleaning and EDA Agent"
            ) \
            .end_event()
    
    @thinking("solve_eda_questions")
    def solve_eda_questions(self):
        try:
            # Check if there's an ongoing EDA question analysis
            eda_question_is_working = self.get_variable("eda_question_is_working", False)
            if eda_question_is_working:
                return self.conclusion("continue_analysis", {"action": "continue"})
            
            # Get the next EDA question to solve
            eda_questions = self.get_variable("eda_questions", [])
            if not eda_questions:
                # Auto-generate questions if missing, based on previously bootstrapped context
                problem_description = self.get_variable("problem_description")
                data_info = self.get_variable("data_info")
                data_preview = self.get_variable("data_preview")
                from app.core.config import DataCleaningAndEDA_Agent, llm
                eda_agent = DataCleaningAndEDA_Agent(llm=llm, problem_description=problem_description,
                                                     context_description=self.get_variable("context_description", ""),
                                                     check_unit=self.get_variable("unit_check", ""),
                                                     var_json=self.get_variable("variables", []),
                                                     hyp_json=self.get_variable("pcs_hypothesis", {}))
                eda_questions = eda_agent.generate_eda_questions_cli(problem_description, data_info, data_preview) or []
                self.add_variable("eda_questions", eda_questions)
            
            # Check if there are questions to process
            if not eda_questions or len(eda_questions) == 0:
                return self.conclusion("all_questions_completed", {"status": "completed"})
            
            # Get the first question and remove it from the list
            current_question = eda_questions[0]
            remaining_questions = eda_questions[1:] if len(eda_questions) > 1 else []
            
            # Update the questions list
            self.add_variable("eda_questions", remaining_questions)
            self.add_variable("current_eda_question", current_question)
            
            # Get context for EDA code generation
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            unit_check = self.get_variable("unit_check", "")
            variables = self.get_variable("variables", self.get_variable("data_info", []))
            hypothesis = self.get_variable("pcs_hypothesis", {})
            csv_file_path = self.get_full_csv_path()
            data_info = self.get_variable("data_info")
            data_preview = self.get_variable("data_preview")
            
            # Initialize EDA agent
            clean_agent = DataCleaningAndEDA_Agent(
                llm=llm,
                problem_description=problem_description,
                context_description=context_description,
                check_unit=unit_check,
                var_json=variables,
                hyp_json=hypothesis
            )
            
            # Generate EDA code for the current question
            eda_code = clean_agent.generate_eda_code_cli(
                csv_file_path, 
                current_question, 
                data_info, 
                data_preview
            )
            
            return self.conclusion("eda_code_generated", {
                "question": current_question,
                "code": eda_code,
                "remaining_count": len(remaining_questions)
            })
        except Exception as e:
            # Error fallback
            fallback_code = f'''# Basic EDA analysis fallback
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Load data
data = pd.read_csv("{self.get_full_csv_path()}")

print("=== Basic Data Analysis ===")
print("Dataset shape:", data.shape)
print("\\nBasic statistics:")
print(data.describe())

print("\\nData types:")
print(data.dtypes)

print("\\nMissing values:")
print(data.isnull().sum())

# Simple visualization if numeric columns exist
numeric_cols = data.select_dtypes(include=[np.number]).columns
if len(numeric_cols) > 0:
    plt.figure(figsize=(10, 6))
    for i, col in enumerate(numeric_cols[:4]):  # Plot first 4 numeric columns
        plt.subplot(2, 2, i+1)
        data[col].hist(alpha=0.7)
        plt.title(f'Distribution of {{col}}')
        plt.xlabel(col)
        plt.ylabel('Frequency')
    plt.tight_layout()
    plt.show()

print("Basic analysis completed")'''
            
            return self.conclusion("eda_code_generated", {
                "question": {"question": f"Basic analysis due to error: {str(e)}", "type": "fallback"},
                "code": fallback_code,
                "remaining_count": 0
            })
        finally:
            return self.end_event()
    
    @finnish("eda_code_generated")
    def eda_code_generated(self):
        code_result = self.get_thinking("eda_code_generated")
        current_question = code_result.get("question", {})
        eda_code = code_result.get("code", "")
        remaining_count = code_result.get("remaining_count", 0)
        
        # Display question being solved
        question_text = current_question.get("question", "Unknown question") if isinstance(current_question, dict) else str(current_question)
        question_type = current_question.get("type", "analysis") if isinstance(current_question, dict) else "analysis"
        
        return self.add_text(f"#### 🔍 Solving EDA Question: {question_text}") \
            .add_text(f"**Type**: {question_type}") \
            .add_code(eda_code) \
            .exe_code_cli(
                event_tag="eda_executed",
                mark_finnish="EDA analysis completed"
            ) \
            .end_event()
    
    @after_exec("eda_executed")
    def eda_executed(self):
        eda_result = self.get_current_effect()
        return self.add_variable("current_eda_result", eda_result) \
            .add_text("EDA analysis completed, analyzing results for insights") \
            .next_thinking_event(
                event_tag="analyze_eda_result",
                textArray=["EDA Agent is thinking...", "analyzing EDA result..."],
                agentName="Data Cleaning and EDA Agent"
            ) \
            .end_event()
    
    @thinking("analyze_eda_result")
    def analyze_eda_result(self):
        try:
            # Get current question and result for analysis
            current_question = self.get_variable("current_eda_question", {})
            eda_result = self.get_variable("current_eda_result")
            
            # Validate question structure
            if isinstance(current_question, str):
                # Try to parse if it's JSON string
                import json
                try:
                    current_question = json.loads(current_question)
                except (json.JSONDecodeError, TypeError):
                    # Create a basic question structure
                    current_question = {
                        "question": str(current_question),
                        "action": "basic_analysis",
                        "type": "general"
                    }
            elif not isinstance(current_question, dict):
                current_question = {
                    "question": "Analysis question",
                    "action": "data_analysis",
                    "type": "general"
                }
            
            # Get agent context
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            unit_check = self.get_variable("unit_check", "")
            variables = self.get_variable("variables", self.get_variable("data_info", []))
            hypothesis = self.get_variable("pcs_hypothesis", {})
            
            # Initialize EDA agent for result analysis
            clean_agent = DataCleaningAndEDA_Agent(
                llm=llm,
                problem_description=problem_description,
                context_description=context_description,
                check_unit=unit_check,
                var_json=variables,
                hyp_json=hypothesis
            )
            
            # Analyze EDA result
            question_text = current_question.get("question", "Data analysis")
            action_type = current_question.get("action", "analysis")
            
            analysis_result = clean_agent.analyze_eda_result_cli(
                question_text,
                action_type,
                eda_result
            )
            
            # Create EDA summary entry
            eda_qa = {
                "question": question_text,
                "action": action_type,
                "type": current_question.get("type", "analysis"),
                "conclusion": analysis_result,
                "status": "completed"
            }
            
            return self.conclusion("eda_analysis_complete", eda_qa)
        except Exception as e:
            # Fallback analysis
            current_question = self.get_variable("current_eda_question", {})
            question_text = current_question.get("question", "Analysis question") if isinstance(current_question, dict) else "Data analysis"
            
            fallback_qa = {
                "question": question_text,
                "action": "basic_analysis",
                "type": "fallback",
                "conclusion": f"Analysis completed with basic results due to error: {str(e)}",
                "status": "completed_with_error"
            }
            return self.conclusion("eda_analysis_complete", fallback_qa)
        finally:
            return self.end_event()
    
    @finnish("eda_analysis_complete")
    def eda_analysis_complete(self):
        eda_qa = self.get_thinking("eda_analysis_complete")
        
        # Add to EDA summary
        current_summary = self.get_variable("eda_summary", [])
        current_summary.append(eda_qa)
        self.add_variable("eda_summary", current_summary)
        
        # Display analysis conclusion
        conclusion = eda_qa.get("conclusion", "Analysis completed")
        question_text = eda_qa.get("question", "Question")
        
        self.add_text(f"**📊 Analysis Result**: {conclusion}")
        
        # Check if there are more questions to process
        remaining_questions = self.get_variable("eda_questions", [])
        if remaining_questions and len(remaining_questions) > 0:
            return self.add_text(f"✅ Question solved: {question_text}") \
                .add_text(f"🔄 Continuing with {len(remaining_questions)} remaining questions") \
                .next_thinking_event(
                    event_tag="solve_eda_questions",
                    textArray=["Data Cleaning and EDA Agent is thinking...", "solving next EDA question..."],
                    agentName="Data Cleaning and EDA Agent"
                ) \
                .end_event()
        else:
            # All questions completed
            total_completed = len(current_summary)
            return self.add_text(f"✅ Question solved: {question_text}") \
                .add_text("🎉 **All EDA questions completed successfully!**") \
                .add_text(f"📈 **Total insights extracted**: {total_completed} analytical findings") \
                .add_text("Ready to proceed with comprehensive insight consolidation") \
                .end_event()
    
    @finnish("continue_analysis")
    def continue_analysis(self):
        return self.add_text("Continuing with ongoing EDA analysis...") \
            .end_event()
    
    @finnish("all_questions_completed")
    def all_questions_completed(self):
        eda_summary = self.get_variable("eda_summary", [])
        total_insights = len(eda_summary)
        
        if total_insights > 0:
            return self.add_text("🎉 **All EDA questions have been processed!**") \
                .add_text(f"📊 **Total insights extracted**: {total_insights} analytical findings") \
                .add_text("✅ Analytical insight extraction completed successfully") \
                .add_text("Ready for comprehensive insight consolidation") \
                .end_event()
        else:
            return self.add_text("⚠️ No EDA questions were available for analysis") \
                .add_text("Proceeding with basic data exploration completed") \
                .end_event()

async def generate_exploratory_data_sequence_step3(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return AnalyticalInsightExtraction(step, state, stream).run()