from .base_agent import BaseAgent
from DCLSAgents.prompts.problem_definition_prompts import (
    PROBLEM_DEFINITION_TEMPLATE,
    VARIABLE_ANALYSIS_TEMPLATE_2,
    OBSERVATION_UNIT_TEMPLATE_2,
    VARIABLE_RELEVANCE_TEMPLATE_2,
    VARIABLE_SEMANTIC_MULTI_ANALYSIS_TEMPLATE,
    VARIABLE_RELEVANCE_ENHANCED_TEMPLATE,
    VARIABLE_SEMANTIC_FOCUSED_TEMPLATE,
    VARIABLE_SEMANTIC_STRUCTURED_TEMPLATE
)

class ProblemDefinitionAndDataCollectionAgent(BaseAgent):
    def __init__(self, llm=None):
        super().__init__(
            name="Problem Definition and Data Collection",
            model=llm if llm else "gpt-4o-mini",
            system_prompt=PROBLEM_DEFINITION_TEMPLATE
        )
        self.info("ProblemDefinitionAndDataCollectionAgent initialized")


    def analyze_variables_cli(self,variables,preview,problem_description,context_description):
        request = VARIABLE_ANALYSIS_TEMPLATE_2.format(
            problem_description=problem_description,
            context_description=context_description,
            variable_info=variables,
            data_preview=preview
        )
        response = self.answer(request)
        return response
    
    def analyze_variable_semantics_structured(self, variables, preview, problem_description, context_description):
        """返回结构化JSON数据的变量语义分析，用于表格显示"""
        request = VARIABLE_SEMANTIC_STRUCTURED_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            variable_info=variables,
            data_preview=preview
        )
        response = self.analyzing(request)
        return response
        
        
    def detect_observation_unit_cli(self,variables,preview,problem_description,context_description):
        input_data = OBSERVATION_UNIT_TEMPLATE_2.format(
            variable_info=variables,
            data_preview=preview,
            problem_description=problem_description,
            context_description=context_description
        )
        response = self.answer(input_data)
        return response
        
    def evaluate_variable_relevance_cli(self,variables,preview,problem_description,context_description):
        """评估变量是否与数据科学项目相关"""
        input_data = VARIABLE_RELEVANCE_TEMPLATE_2.format(
            variable_descriptions=variables,
            data_preview=preview,
            problem_description=problem_description,
            context_description=context_description
        )
        response = self.answer(input_data)
        return response
    
    def analyze_variables_multi_answer(self, variables, preview, problem_description, context_description):
        """使用multi-answer进行全面的变量语义分析"""
        request = VARIABLE_SEMANTIC_MULTI_ANALYSIS_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            variable_info=variables,
            data_preview=preview
        )
        response = self.analyzing(request)
        return response
    
    def evaluate_variable_relevance_enhanced(self, variable_info, data_preview, problem_description, context_description, 
                                           correlation_results="", multicollinearity_results="", 
                                           importance_results="", semantic_mapping=""):
        """使用增强模板进行变量相关性评估，整合多种分析结果"""
        request = VARIABLE_RELEVANCE_ENHANCED_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            variable_info=variable_info,
            data_preview=data_preview,
            correlation_results=correlation_results,
            multicollinearity_results=multicollinearity_results,
            importance_results=importance_results,
            semantic_mapping=semantic_mapping
        )
        response = self.answer(request)
        return response
    
    def analyze_variable_semantics_structured(self, variables, preview, problem_description, context_description):
        """返回结构化JSON数据的变量语义分析，用于表格显示"""
        request = VARIABLE_SEMANTIC_STRUCTURED_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            variable_info=variables,
            data_preview=preview
        )
        response = self.analyzing(request)
        return response
    
    def analyze_variable_semantics_focused(self, variables, preview, problem_description, context_description):
        """专注的变量语义分析，理解业务含义和数据有效性"""
        request = VARIABLE_SEMANTIC_FOCUSED_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            variable_info=variables,
            data_preview=preview
        )
        response = self.answer(request)
        return response
