import pandas as pd
import json
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

from domain.interfaces import IProblemDefinitionAgent, ILLMProvider, AgentConfig, AgentResult
from infrastructure.agents.base import ConversationalAgent

# Import prompts from existing module
from DCLSAgents.prompts.problem_definition_prompts import *


@dataclass
class VariableAnalysis:
    variable_name: str
    data_type: str
    description: str
    relevance_score: float
    is_target_candidate: bool
    missing_percentage: float


@dataclass
class ObservationUnit:
    unit_type: str
    description: str
    unique_identifier: Optional[str]
    confidence_score: float


class ProblemDefinitionAgent(ConversationalAgent, IProblemDefinitionAgent):
    """问题定义和数据收集Agent - 迁移到新架构"""
    
    def __init__(
        self,
        llm_provider: ILLMProvider,
        config: AgentConfig,
        problem_description: str = "",
        context_description: str = ""
    ):
        system_message = PROBLEM_DEFINITION_TEMPLATE
        super().__init__(
            name="ProblemDefinitionAgent",
            llm_provider=llm_provider,
            config=config,
            system_message=system_message
        )
        
        self._problem_description = problem_description
        self._context_description = context_description
        
        # State variables from original implementation
        self.var_json = None
        self.unit_check = None
        self.data_corr = None
        
        self._logger.info("ProblemDefinitionAgent initialized")
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "problem_analysis",
            "variable_identification",
            "observation_unit_detection",
            "hypothesis_generation",
            "data_preview_analysis",
            "variable_relevance_evaluation"
        ]
    
    def validate_input(self, input_data: Any) -> bool:
        """Validate input data"""
        if isinstance(input_data, str):
            # File path
            return input_data.endswith('.csv')
        elif isinstance(input_data, dict):
            required_keys = ['problem_description', 'context_description']
            return all(key in input_data for key in required_keys)
        return False
    
    def analyze_problem_statement(self, problem_description: str, context: str) -> AgentResult:
        """分析问题陈述并提取关键信息"""
        try:
            self._logger.info("Analyzing problem statement")
            
            # Update internal state
            self._problem_description = problem_description
            self._context_description = context
            
            # Use LLM to analyze problem
            prompt = f"""
请分析以下问题陈述和上下文，提取关键信息：

问题描述: {problem_description}
上下文: {context}

请以JSON格式返回分析结果，包含：
1. problem_type: 问题类型（分类、回归、聚类等）
2. target_variable_hints: 可能的目标变量提示
3. key_requirements: 关键需求列表
4. success_metrics: 成功指标
5. constraints: 约束条件
6. stakeholders: 利益相关者
"""
            
            response = self._call_llm_json(prompt)
            
            return AgentResult(
                success=True,
                data=response,
                message="问题陈述分析完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"step": "problem_analysis"}
            )
            
        except Exception as e:
            self._logger.error(f"Problem statement analysis failed: {str(e)}")
            raise
    
    def identify_variables(self, dataset_path: str, problem_context: str) -> AgentResult:
        """识别和分类变量"""
        try:
            self._logger.info(f"Identifying variables from {dataset_path}")
            
            # Load data preview
            preview, variables = self._load_data_preview(dataset_path)
            if isinstance(preview, str):  # Error case
                raise ValueError(f"Failed to load data: {preview}")
            
            # Analyze variables using existing method
            analysis_response = self._analyze_variables_cli(
                variables, preview, self._problem_description, self._context_description
            )
            
            # Transform to JSON
            json_response = self._transform_variable_analysis_response2json_cli(analysis_response)
            
            # Parse the JSON response
            try:
                variable_analysis = self.parse_llm_json(json_response)
            except:
                # Fallback to string response if JSON parsing fails
                variable_analysis = {"raw_analysis": analysis_response}
            
            # Store in internal state for backward compatibility
            self.var_json = variable_analysis
            
            return AgentResult(
                success=True,
                data={
                    "variables": variables,
                    "preview": preview,
                    "analysis": variable_analysis,
                    "variable_count": len(variables)
                },
                message=f"识别了 {len(variables)} 个变量",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"dataset_path": dataset_path}
            )
            
        except Exception as e:
            self._logger.error(f"Variable identification failed: {str(e)}")
            raise
    
    def suggest_hypotheses(self, problem_context: str, variables: Dict[str, Any]) -> AgentResult:
        """基于问题上下文和变量信息生成假设"""
        try:
            self._logger.info("Generating hypotheses")
            
            # Get observation unit first
            if isinstance(variables, dict) and 'preview' in variables:
                unit_response = self._detect_observation_unit_cli(
                    variables.get('variables', []),
                    variables.get('preview', []),
                    self._problem_description,
                    self._context_description
                )
                self.unit_check = unit_response
            
            # Generate hypotheses based on variables and problem context
            prompt = f"""
基于以下信息生成可测试的假设：

问题上下文: {problem_context}
变量信息: {json.dumps(variables, ensure_ascii=False, indent=2)}
观测单位: {getattr(self, 'unit_check', '未确定')}

请生成3-5个可测试的假设，每个假设应该：
1. 具体且可测试
2. 与业务问题相关
3. 基于现有变量
4. 包含预期的关系方向

返回JSON格式：
{{
    "hypotheses": [
        {{
            "hypothesis": "假设描述",
            "variables_involved": ["变量1", "变量2"],
            "expected_relationship": "正相关/负相关/非线性等",
            "rationale": "假设依据",
            "testability": "如何测试"
        }}
    ]
}}
"""
            
            response = self._call_llm_json(prompt)
            
            return AgentResult(
                success=True,
                data=response,
                message=f"生成了 {len(response.get('hypotheses', []))} 个假设",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"observation_unit": self.unit_check}
            )
            
        except Exception as e:
            self._logger.error(f"Hypothesis generation failed: {str(e)}")
            raise
    
    def _execute_internal(self, input_data: Any, **kwargs) -> Any:
        """Internal execution logic"""
        if isinstance(input_data, str):
            # Dataset path provided
            dataset_path = input_data
            problem_desc = kwargs.get('problem_description', self._problem_description)
            context_desc = kwargs.get('context_description', self._context_description)
            
            return self.execute_problem_definition(dataset_path, problem_desc, context_desc)
        
        elif isinstance(input_data, dict):
            operation = input_data.get('operation', 'full_analysis')
            
            if operation == 'analyze_problem':
                return self.analyze_problem_statement(
                    input_data['problem_description'],
                    input_data['context_description']
                )
            elif operation == 'identify_variables':
                return self.identify_variables(
                    input_data['dataset_path'],
                    input_data.get('problem_context', '')
                )
            elif operation == 'suggest_hypotheses':
                return self.suggest_hypotheses(
                    input_data.get('problem_context', ''),
                    input_data.get('variables', {})
                )
            elif operation == 'full_analysis':
                return self.execute_problem_definition(
                    input_data['dataset_path'],
                    input_data['problem_description'],
                    input_data['context_description']
                )
        
        raise ValueError(f"Unsupported input format: {type(input_data)}")
    
    def execute_problem_definition(self, csv_file_path: str, problem_description: str, context_description: str) -> Dict[str, Any]:
        """完整的问题定义执行流程 - 保持原有接口"""
        self._logger.info(f"Starting problem definition execution for {csv_file_path}")
        
        try:
            # Update internal state
            self._problem_description = problem_description
            self._context_description = context_description
            
            # Step 1: Variable analysis
            self._logger.info("Step 1: Variable analysis")
            variables_result = self.identify_variables(csv_file_path, context_description)
            
            # Step 2: Observation unit detection  
            self._logger.info("Step 2: Observation unit detection")
            preview, variables = self._load_data_preview(csv_file_path)
            unit_response = self._detect_observation_unit_cli(
                variables, preview, problem_description, context_description
            )
            
            # Step 3: Variable relevance evaluation
            self._logger.info("Step 3: Variable relevance evaluation")
            relevance_response = self._evaluate_variable_relevance_cli(
                variables, preview, problem_description, context_description
            )
            relevance_json = self._transform_variable_relevance_response2json_cli(relevance_response)
            
            result = {
                "变量描述": self.var_json,
                "观测单位": unit_response,
                "变量相关性": self.parse_llm_json(relevance_json) if relevance_json else relevance_response
            }
            
            self._logger.info("Problem definition execution completed successfully")
            return result
            
        except Exception as e:
            self._logger.error(f"Problem definition execution failed: {str(e)}")
            raise
    
    # Original methods for backward compatibility
    def _load_data_preview(self, csv_file_path: str) -> Tuple[Any, List[str]]:
        """加载 CSV 文件的前五行，并提取变量名和数据预览"""
        self._logger.info(f"Loading data preview from {csv_file_path}")
        try:
            data = pd.read_csv(csv_file_path)
            preview = data.head().to_dict(orient="records")
            variables = list(data.columns)
            self._logger.info(f"Successfully loaded data preview with {len(variables)} variables")
            return preview, variables
        except Exception as e:
            self._logger.error(f"Error loading data preview: {str(e)}")
            return str(e), []
    
    def _analyze_variables_cli(self, variables: List[str], preview: List[Dict], problem_description: str, context_description: str) -> str:
        """分析变量"""
        request = VARIABLE_ANALYSIS_TEMPLATE_2.format(
            problem_description=problem_description,
            context_description=context_description,
            variable_info=variables,
            data_preview=preview
        )
        response = self._call_llm(request)
        return response
    
    def _transform_variable_analysis_response2json_cli(self, response: str) -> str:
        """转换变量分析响应为JSON"""
        request = VARIABLE_ANALYSIS_TRANSFORM_TEMPLATE.format(response=str(response))
        response = self._call_llm(request)
        return response
    
    def _detect_observation_unit_cli(self, variables: List[str], preview: List[Dict], problem_description: str, context_description: str) -> str:
        """检测观测单位"""
        self._logger.info("Detecting observation unit")
        try:
            input_data = OBSERVATION_UNIT_TEMPLATE_2.format(
                variable_info=variables,
                data_preview=preview,
                problem_description=problem_description,
                context_description=context_description
            )
            response = self._call_llm(input_data)
            self.unit_check = response
            return self.unit_check
        except Exception as e:
            self._logger.error(f"Error detecting observation unit: {str(e)}")
            raise
    
    def _evaluate_variable_relevance_cli(self, variables: List[str], preview: List[Dict], problem_description: str, context_description: str) -> str:
        """评估变量相关性"""
        self._logger.info("Evaluating variable relevance")
        try:
            input_data = VARIABLE_RELEVANCE_TEMPLATE_2.format(
                variable_descriptions=variables,
                data_preview=preview,
                problem_description=problem_description,
                context_description=context_description
            )
            response = self._call_llm(input_data)
            self.data_corr = response
            return self.data_corr
        except Exception as e:
            self._logger.error(f"Error evaluating variable relevance: {str(e)}")
            raise
    
    def _transform_variable_relevance_response2json_cli(self, response: str) -> str:
        """转换变量相关性响应为JSON"""
        request = VARIABLE_RELEVANCE_TRANSFORM_TEMPLATE.format(response=response)
        response = self._call_llm(request)
        return response
    
    def parse_llm_json(self, response: str) -> Dict[str, Any]:
        """解析LLM返回的JSON响应"""
        try:
            import re
            code_match = re.search(r"```json\n(.*?)\n```", response, re.DOTALL)
            if code_match:
                json_str = code_match.group(1).strip()
                return json.loads(json_str)
            # Try to parse directly if no code block
            return json.loads(response)
        except json.JSONDecodeError as e:
            self._logger.warning(f"JSON parsing failed: {str(e)}, returning raw response")
            return {"raw_response": response, "parse_error": str(e)}