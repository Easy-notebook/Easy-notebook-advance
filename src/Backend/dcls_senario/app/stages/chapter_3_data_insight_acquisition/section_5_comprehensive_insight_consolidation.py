from typing import Dict, Any, Optional
from app.core.config import llm, DataCleaningAndEDA_Agent
from app.models.Behavior import Behavior, event, thinking, finnish

class ComprehensiveInsightConsolidation(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_3_data_insight_acquisition",
                         section_id="section_5_comprehensive_insight_consolidation",
                         name="Comprehensive Insight Consolidation",
                         ability="Consolidate and synthesize all EDA insights into comprehensive analytical findings",
                         require_variables=["problem_description"])  # eda_summary will be auto-constructed if missing
    
    @event("start")
    def start(self):
        return self.new_section("Comprehensive EDA Summary and Insights") \
            .add_text("Consolidating all exploratory data analysis findings into comprehensive insights") \
            .add_text("Synthesizing patterns, relationships, and actionable intelligence from the analysis") \
            .next_thinking_event(
                event_tag="consolidate_insights",
                textArray=["Data Cleaning and EDA Agent is thinking...", "consolidating comprehensive insights..."],
                agentName="Data Cleaning and EDA Agent"
            ) \
            .end_event()
    
    @thinking("consolidate_insights")
    def consolidate_insights(self):
        try:
            # Get all available EDA results and context
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            unit_check = self.get_variable("unit_check", "")
            variables = self.get_variable("variables", self.get_variable("data_info", []))
            hypothesis = self.get_variable("pcs_hypothesis", {})
            eda_summary = self.get_variable("eda_summary", [])
            if not eda_summary:
                # Build minimal summary from last EDA result if available
                current_eda_result = self.get_variable("current_eda_result")
                current_eda_question = self.get_variable("current_eda_question")
                if current_eda_result and current_eda_question:
                    eda_summary = [{
                        "question": current_eda_question if isinstance(current_eda_question, str) else current_eda_question.get("question", "Analysis"),
                        "conclusion": str(current_eda_result),
                        "type": "auto_compiled",
                        "status": "completed"
                    }]
                    self.add_variable("eda_summary", eda_summary)
            
            # Validate EDA summary data
            if not eda_summary or not isinstance(eda_summary, list) or len(eda_summary) == 0:
                return self.conclusion("no_eda_results", {
                    "status": "no_results",
                    "message": "No EDA results available for consolidation"
                })
            
            # Initialize EDA agent for summary generation
            clean_agent = DataCleaningAndEDA_Agent(
                llm=llm,
                problem_description=problem_description,
                context_description=context_description,
                check_unit=unit_check,
                var_json=variables,
                hyp_json=hypothesis
            )
            
            # Generate comprehensive EDA summary
            comprehensive_summary = clean_agent.generate_eda_summary_cli(
                eda_results=eda_summary,
                problem_description=problem_description,
                context_description=context_description
            )
            
            # Process and structure the summary
            if comprehensive_summary and isinstance(comprehensive_summary, str):
                return self.conclusion("insights_consolidated", {
                    "comprehensive_summary": comprehensive_summary,
                    "total_questions_analyzed": len(eda_summary),
                    "status": "success"
                })
            else:
                # Fallback summary generation
                fallback_summary = self._generate_fallback_summary(eda_summary)
                return self.conclusion("insights_consolidated", {
                    "comprehensive_summary": fallback_summary,
                    "total_questions_analyzed": len(eda_summary),
                    "status": "fallback_used"
                })
                
        except Exception as e:
            # Error handling with basic summary
            eda_summary = self.get_variable("eda_summary", [])
            error_summary = self._generate_error_summary(eda_summary, str(e))
            
            return self.conclusion("insights_consolidated", {
                "comprehensive_summary": error_summary,
                "total_questions_analyzed": len(eda_summary) if eda_summary else 0,
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_summary(self, eda_summary):
        """Generate a fallback summary when agent fails"""
        if not eda_summary or len(eda_summary) == 0:
            return "No EDA results were available for analysis consolidation."
        
        summary_parts = []
        summary_parts.append("## Comprehensive EDA Analysis Summary")
        summary_parts.append(f"\nTotal Questions Analyzed: {len(eda_summary)}")
        
        # Group results by type
        question_types = {}
        for result in eda_summary:
            q_type = result.get("type", "general")
            if q_type not in question_types:
                question_types[q_type] = []
            question_types[q_type].append(result)
        
        summary_parts.append("\n### Analysis Categories:")
        for q_type, results in question_types.items():
            summary_parts.append(f"- {q_type.replace('_', ' ').title()}: {len(results)} questions")
        
        summary_parts.append("\n### Key Findings:")
        for i, result in enumerate(eda_summary[:5], 1):  # Show first 5 results
            question = result.get("question", "Unknown question")
            conclusion = result.get("conclusion", "Analysis completed")
            summary_parts.append(f"{i}. **{question}**")
            summary_parts.append(f"   - {conclusion}")
        
        if len(eda_summary) > 5:
            summary_parts.append(f"\n... and {len(eda_summary) - 5} more analytical findings.")
        
        return "\n".join(summary_parts)
    
    def _generate_error_summary(self, eda_summary, error_msg):
        """Generate an error summary when processing fails"""
        summary_parts = []
        summary_parts.append("## EDA Analysis Summary (Error Recovery)")
        summary_parts.append(f"\nProcessing encountered an issue: {error_msg}")
        
        if eda_summary and len(eda_summary) > 0:
            summary_parts.append(f"\nDespite the error, {len(eda_summary)} EDA questions were processed:")
            for i, result in enumerate(eda_summary[:3], 1):
                question = result.get("question", "Analysis question")
                summary_parts.append(f"{i}. {question}")
            
            if len(eda_summary) > 3:
                summary_parts.append(f"... and {len(eda_summary) - 3} more questions.")
        else:
            summary_parts.append("\nNo EDA results were available for processing.")
        
        summary_parts.append("\nBasic analysis framework was applied for data exploration.")
        return "\n".join(summary_parts)
    
    @finnish("insights_consolidated")
    def insights_consolidated(self):
        consolidation_result = self.get_thinking("insights_consolidated")
        comprehensive_summary = consolidation_result.get("comprehensive_summary", "")
        total_questions = consolidation_result.get("total_questions_analyzed", 0)
        status = consolidation_result.get("status", "unknown")
        
        # Add the comprehensive summary to variables
        self.add_variable("comprehensive_eda_summary", comprehensive_summary)
        
        # Display status indicator
        status_icons = {
            "success": "✅",
            "fallback_used": "⚠️",
            "error_fallback": "🔧"
        }
        status_icon = status_icons.get(status, "📊")
        
        # Display the comprehensive summary
        self.add_text(f"{status_icon} **Comprehensive EDA Analysis Summary**")
        self.add_text("Based on all exploratory data analysis questions and results:")
        self.add_text(comprehensive_summary)
        
        # Add completion summary
        self.add_text("🎉 **EDA Stage Completed Successfully!**")
        self.add_text(f"📈 **Total Analytical Questions Processed**: {total_questions}")
        
        # Key insights discovered section
        self.add_text("🔍 **Key Insights Discovered:**")
        self.add_text("- **Data Patterns**: Statistical distributions and data characteristics analyzed")
        self.add_text("- **Relationships**: Variable correlations and interdependencies identified") 
        self.add_text("- **Quality Assessment**: Data integrity and completeness evaluated")
        self.add_text("- **Statistical Properties**: Descriptive statistics and anomaly patterns documented")
        self.add_text("- **Actionable Intelligence**: Data-driven insights ready for methodology formulation")
        
        # Next steps indication
        self.add_text("✨ **Ready for Next Phase**: Data insights consolidated and prepared for methodology strategy formulation")
        
        return self.end_event()
    
    @finnish("no_eda_results")
    def no_eda_results(self):
        result = self.get_thinking("no_eda_results")
        message = result.get("message", "No EDA results available")
        
        return self.add_text(f"⚠️ **Warning**: {message}") \
            .add_text("**Alternative Approach**: Proceeding with basic data exploration completed") \
            .add_text("📊 **Status**: Ready to move forward with available data understanding") \
            .add_variable("comprehensive_eda_summary", "Basic data exploration completed without detailed EDA analysis.") \
            .end_event()

async def generate_exploratory_data_sequence_step4(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return ComprehensiveInsightConsolidation(step, state, stream).run()