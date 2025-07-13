from typing import Dict, Any, List, Optional
import json
import re

from domain.interfaces import IGeneralAgent, ILLMProvider, AgentConfig, AgentResult
from infrastructure.agents.base import ConversationalAgent


class GeneralAgent(ConversationalAgent, IGeneralAgent):
    """通用Agent - 迁移到新架构"""
    
    def __init__(
        self,
        llm_provider: ILLMProvider,
        config: AgentConfig,
        system_prompt: str = "你是DCLS系统的通用智能助手，可以回答用户的各种数据科学相关问题，提供专业的建议和指导。"
    ):
        super().__init__(
            name="GeneralAgent",
            llm_provider=llm_provider,
            config=config,
            system_message=system_prompt
        )
        
        self._logger.info("GeneralAgent initialized")
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "general_qa",
            "context_analysis",
            "question_mapping",
            "recommendation_generation",
            "problem_solving",
            "guidance_provision",
            "workflow_assistance"
        ]
    
    def validate_input(self, input_data: Any) -> bool:
        """Validate input data"""
        if isinstance(input_data, dict):
            return 'request' in input_data or 'context' in input_data or 'question' in input_data
        return isinstance(input_data, str)  # Accept string queries directly
    
    def process_general_request(self, request: str, context: Dict[str, Any] = None) -> AgentResult:
        """
        处理通用数据科学请求
        """
        try:
            self._logger.info(f"Processing general request: {request[:100]}...")
            
            # 构建提示词
            if context:
                context_str = json.dumps(context, ensure_ascii=False, indent=2)
                prompt = f"""
基于以下上下文信息，请回答用户的问题：

上下文：
{context_str}

用户问题：
{request}

请提供详细、专业的回答，包括：
1. 直接回答用户的问题
2. 相关的背景知识或概念解释
3. 实用的建议或最佳实践
4. 如果适用，提供下一步的行动建议

请确保回答准确、有用且易于理解。
"""
            else:
                prompt = f"""
请回答以下数据科学相关的问题：

问题：{request}

请提供详细、专业的回答，包括：
1. 直接回答用户的问题
2. 相关的背景知识或概念解释
3. 实用的建议或最佳实践
4. 如果适用，提供下一步的行动建议

请确保回答准确、有用且易于理解。
"""
            
            response = self._call_llm(prompt)
            
            return AgentResult(
                success=True,
                data={
                    "response": response,
                    "request": request,
                    "context": context or {},
                    "response_type": "general_assistance"
                },
                message="通用请求处理完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"request_type": "general", "has_context": bool(context)}
            )
            
        except Exception as e:
            self._logger.error(f"General request processing failed: {str(e)}")
            return AgentResult(
                success=False,
                data={"error": str(e)},
                message=f"通用请求处理失败: {str(e)}",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"request_type": "general", "error": True}
            )
    
    def generate_question_choice_map(self, context: str) -> AgentResult:
        """
        生成问题选择映射
        """
        try:
            self._logger.info("Generating question choice map")
            
            prompt = f"""
基于以下上下文，请生成一个问题选择映射，帮助用户了解可以提出哪些类型的问题：

上下文：
{context}

请生成一个JSON格式的问题选择映射，包含：
1. 可以提出的问题类别
2. 每个类别下的具体问题示例
3. 每个问题的推荐场景
4. 预期的回答类型

JSON格式：
{{
    "categories": [
        {{
            "category": "类别名称",
            "description": "类别描述",
            "questions": [
                {{
                    "question": "示例问题",
                    "scenario": "适用场景",
                    "expected_output": "预期输出类型"
                }}
            ]
        }}
    ],
    "general_guidance": "通用指导说明"
}}
"""
            
            response = self._call_llm(prompt)
            
            # 解析JSON结果
            try:
                question_map = json.loads(response)
            except json.JSONDecodeError:
                # 如果解析失败，尝试提取JSON部分
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    try:
                        question_map = json.loads(json_match.group())
                    except:
                        question_map = {"error_message": "failed to parse question choice map"}
                else:
                    question_map = {"error_message": "failed to parse question choice map"}
            
            return AgentResult(
                success=True,
                data={
                    "question_choice_map": question_map,
                    "context": context,
                    "generation_successful": "error_message" not in question_map
                },
                message="问题选择映射生成完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"output_type": "question_choice_map", "parsed_successfully": "error_message" not in question_map}
            )
            
        except Exception as e:
            self._logger.error(f"Question choice map generation failed: {str(e)}")
            return AgentResult(
                success=False,
                data={"error": str(e)},
                message=f"问题选择映射生成失败: {str(e)}",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"output_type": "question_choice_map", "error": True}
            )
    
    def provide_guidance(self, topic: str, user_level: str = "intermediate") -> AgentResult:
        """
        提供特定主题的指导
        """
        try:
            self._logger.info(f"Providing guidance on topic: {topic}")
            
            prompt = f"""
请为以下主题提供详细的指导，适合{user_level}水平的用户：

主题：{topic}

请提供：
1. 主题概述和重要性
2. 核心概念和原理
3. 实践步骤和方法
4. 常见问题和解决方案
5. 最佳实践和建议
6. 进一步学习资源

请确保内容结构清晰，易于理解和实施。
"""
            
            response = self._call_llm(prompt)
            
            return AgentResult(
                success=True,
                data={
                    "guidance": response,
                    "topic": topic,
                    "user_level": user_level,
                    "guidance_type": "comprehensive"
                },
                message=f"{topic}指导提供完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"guidance_type": "comprehensive", "topic": topic, "user_level": user_level}
            )
            
        except Exception as e:
            self._logger.error(f"Guidance provision failed: {str(e)}")
            return AgentResult(
                success=False,
                data={"error": str(e)},
                message=f"指导提供失败: {str(e)}",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"guidance_type": "comprehensive", "error": True}
            )
    
    def _execute_internal(self, input_data: Any, **kwargs) -> Any:
        """Internal execution logic"""
        if isinstance(input_data, str):
            # If input is just a string, treat it as a general request
            return self.process_general_request(input_data)
        
        if isinstance(input_data, dict):
            operation = input_data.get('operation', 'process_request')
            
            if operation == 'process_request':
                return self.process_general_request(
                    input_data.get('request', ''),
                    input_data.get('context', {})
                )
            elif operation == 'generate_question_choice_map':
                return self.generate_question_choice_map(
                    input_data.get('context', '')
                )
            elif operation == 'provide_guidance':
                return self.provide_guidance(
                    input_data.get('topic', ''),
                    input_data.get('user_level', 'intermediate')
                )
        
        raise ValueError(f"Unsupported input format: {type(input_data)}")