from .base_agent import BaseDSLC_Agent
import pandas as pd
from DCLSAgents.prompts.problem_definition_prompts import *


class ProblemDefinitionAndDataCollectionAgent(BaseDSLC_Agent):
    def __init__(self, memory=None, llm=None):
        super().__init__(
            name="Problem Definition and Data Collection",
            system_message=PROBLEM_DEFINITION_TEMPLATE,
            memory=memory,
            llm=llm
        )
        self.var_json = None
        self.unit_check = None
        self.data_corr = None
        self.logger.info("ProblemDefinitionAndDataCollectionAgent initialized")

    def load_data_preview(self, csv_file_path):
        """加载 CSV 文件的前五行，并提取变量名和数据预览"""
        self.logger.info(f"Loading data preview from {csv_file_path}")
        try:
            data = pd.read_csv(csv_file_path)
            preview = data.head().to_dict(orient="records")
            variables = list(data.columns)
            self.logger.info(f"Successfully loaded data preview with {len(variables)} variables")
            return preview, variables
        except Exception as e:
            self.logger.error(f"Error loading data preview: {str(e)}")
            return str(e), None

    def analyze_variables_cli(self,variables,preview,problem_description,context_description):
        request = VARIABLE_ANALYSIS_TEMPLATE_2.format(
            problem_description=problem_description,
            context_description=context_description,
            variable_info=variables,
            data_preview=preview
        )
        response = self.chat_without_memory(request)
        return response
        
    def transform_variable_analysis_response2json_cli(self,response):        
        request = VARIABLE_ANALYSIS_TRANSFORM_TEMPLATE.format(
            response=str(response)
        )
        response = self.chat_without_memory(request)
        return response
        
    def detect_observation_unit_cli(self,variables,preview,problem_description,context_description):
        self.logger.info("Detecting observation unit")
        try:
            input_data = OBSERVATION_UNIT_TEMPLATE_2.format(
                variable_info=variables,
                data_preview=preview,
                problem_description=problem_description,
                context_description=context_description
            )
            response = self.chat_without_memory(input_data)
            self.unit_check = response
            return self.unit_check
        except Exception as e:
            self.logger.error(f"Error detecting observation unit: {str(e)}")
            raise
        
    def evaluate_variable_relevance_cli(self,variables,preview,problem_description,context_description):
        """评估变量是否与数据科学项目相关"""
        self.logger.info("Evaluating variable relevance")
        try:
            input_data = VARIABLE_RELEVANCE_TEMPLATE_2.format(
                variable_descriptions=variables,
                data_preview=preview,
                problem_description=problem_description,
                context_description=context_description
            )
            response,_ = self.chat_with_memory(input_data, None)
            self.data_corr = response
            return self.data_corr
        except Exception as e:
            self.logger.error(f"Error evaluating variable relevance: {str(e)}")
            raise
    
    def transform_variable_relevance_response2json_cli(self,response):
        print(response)
        request = VARIABLE_RELEVANCE_TRANSFORM_TEMPLATE.format(
            response=response
        )
        response = self.chat_without_memory(request)
        return response
        
    def execute_problem_definition(self, csv_file_path, problem_description, context_description):
        """总的执行函数，按顺序执行1、2、3步"""
        self.logger.info(f"Starting problem definition execution for {csv_file_path}")
        try:
            # Step 1: 变量分析
            self.logger.info("Step 1: Variable analysis")
            self.analyze_variables(csv_file_path, problem_description, context_description)
            
            print(self.var_json)
            
            # Step 2: 观测单位检测
            self.logger.info("Step 2: Observation unit detection")
            self.detect_observation_unit()
            
            print(self.unit_check)
            
            # Step 3: 变量相关性判断
            self.logger.info("Step 3: Variable relevance evaluation")
            self.evaluate_variable_relevance()
            
            print(self.data_corr)
            
            result = {
                "变量描述": self.var_json,
                "观测单位": self.unit_check,
                "相关性判断": self.data_corr
            }
            self.logger.info("Successfully completed problem definition execution")
            return result
        except Exception as e:
            self.logger.error(f"Error in problem definition execution: {str(e)}")
            raise