from typing import Dict, Any, List, Optional

from domain.interfaces import IResultsCommunicationAgent, ILLMProvider, AgentConfig, AgentResult
from infrastructure.agents.base import ConversationalAgent


class ResultsCommunicationAgent(ConversationalAgent, IResultsCommunicationAgent):
    """结果沟通Agent - 迁移到新架构"""
    
    def __init__(
        self,
        llm_provider: ILLMProvider,
        config: AgentConfig,
        system_prompt: str = "你是一个数据科学专家，专注于生成一份报告，汇总结果并提供给相关方。"
    ):
        super().__init__(
            name="ResultsCommunicationAgent",
            llm_provider=llm_provider,
            config=config,
            system_message=system_prompt
        )
        
        self._logger.info("ResultsCommunicationAgent initialized")
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "report_generation",
            "summary_creation", 
            "recommendation_generation",
            "audience_specific_communication",
            "visualization_explanation",
            "business_insights"
        ]
    
    def validate_input(self, input_data: Any) -> bool:
        """Validate input data"""
        if isinstance(input_data, dict):
            return 'results' in input_data or 'analysis_data' in input_data
        return False
    
    def generate_report(self, results: Dict[str, Any], template: str) -> AgentResult:
        """生成综合报告"""
        try:
            self._logger.info(f"Generating {template} report")
            
            # Build report prompt based on template type
            if template == "comprehensive":
                prompt = self._build_comprehensive_report_prompt(results)
            elif template == "executive":
                prompt = self._build_executive_summary_prompt(results)
            elif template == "technical":
                prompt = self._build_technical_report_prompt(results)
            else:
                prompt = self._build_default_report_prompt(results)
            
            response = self._call_llm(prompt)
            
            return AgentResult(
                success=True,
                data={
                    "report": response,
                    "template_type": template,
                    "sections_included": self._extract_report_sections(results)
                },
                message=f"{template}报告生成完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"template": template}
            )
            
        except Exception as e:
            self._logger.error(f"Report generation failed: {str(e)}")
            raise
    
    def create_summary(self, results: Dict[str, Any], audience: str) -> AgentResult:
        """创建面向特定受众的摘要"""
        try:
            self._logger.info(f"Creating summary for {audience} audience")
            
            # Customize summary based on audience
            if audience == "executive":
                prompt = self._build_executive_summary_prompt(results)
            elif audience == "technical":
                prompt = self._build_technical_summary_prompt(results)
            elif audience == "business":
                prompt = self._build_business_summary_prompt(results)
            else:
                prompt = self._build_general_summary_prompt(results)
            
            response = self._call_llm(prompt)
            
            return AgentResult(
                success=True,
                data={
                    "summary": response,
                    "audience": audience,
                    "key_points": self._extract_key_points(results)
                },
                message=f"面向{audience}的摘要生成完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"audience": audience}
            )
            
        except Exception as e:
            self._logger.error(f"Summary creation failed: {str(e)}")
            raise
    
    def generate_recommendations(self, analysis_results: Dict[str, Any]) -> AgentResult:
        """生成可行性建议"""
        try:
            self._logger.info("Generating actionable recommendations")
            
            prompt = f"""
基于以下分析结果，生成具体的、可行的建议：

分析结果摘要：
{self._format_results_for_recommendations(analysis_results)}

请生成：
1. 直接行动建议（立即可执行的步骤）
2. 中期策略建议（3-6个月内的改进）
3. 长期战略建议（6个月以上的规划）
4. 风险缓解建议
5. 进一步分析建议

每个建议都应包含：
- 具体的行动步骤
- 预期的业务影响
- 实施难度评估
- 所需资源

请以结构化的方式组织建议，便于业务团队理解和执行。
"""
            
            response = self._call_llm(prompt)
            
            return AgentResult(
                success=True,
                data={
                    "recommendations": response,
                    "categories": ["immediate", "medium_term", "long_term", "risk_mitigation", "further_analysis"],
                    "implementation_priorities": self._extract_priorities(analysis_results)
                },
                message="行动建议生成完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"recommendation_type": "actionable"}
            )
            
        except Exception as e:
            self._logger.error(f"Recommendations generation failed: {str(e)}")
            raise
    
    def _execute_internal(self, input_data: Any, **kwargs) -> Any:
        """Internal execution logic"""
        if isinstance(input_data, dict):
            operation = input_data.get('operation', 'generate_report')
            
            if operation == 'generate_report':
                return self.generate_report(
                    input_data.get('results', {}),
                    input_data.get('template', 'comprehensive')
                )
            elif operation == 'create_summary':
                return self.create_summary(
                    input_data.get('results', {}),
                    input_data.get('audience', 'general')
                )
            elif operation == 'generate_recommendations':
                return self.generate_recommendations(
                    input_data.get('analysis_results', {})
                )
        
        raise ValueError(f"Unsupported input format: {type(input_data)}")
    
    # Helper methods for building different types of prompts
    def _build_comprehensive_report_prompt(self, results: Dict[str, Any]) -> str:
        return f"""
请基于以下分析结果生成一份综合性报告：

分析结果：
{self._format_results_summary(results)}

报告应包含以下部分：
1. 执行摘要
2. 项目背景和目标
3. 数据概述和质量评估
4. 分析方法和过程
5. 主要发现和洞察
6. 模型性能评估（如适用）
7. 业务影响分析
8. 风险和局限性
9. 建议和下一步行动
10. 附录（技术细节）

请确保报告既有技术深度又易于业务理解。
"""
    
    def _build_executive_summary_prompt(self, results: Dict[str, Any]) -> str:
        return f"""
基于以下分析结果，生成一份简洁的执行摘要（500字以内）：

分析结果：
{self._format_results_summary(results)}

执行摘要应包含：
1. 项目目标和关键问题
2. 主要发现（3-5个要点）
3. 业务影响和价值
4. 关键建议（2-3个优先行动）
5. 投资回报预期

语言要简洁明了，聚焦商业价值和决策要点。
"""
    
    def _build_technical_report_prompt(self, results: Dict[str, Any]) -> str:
        return f"""
基于以下分析结果，生成一份技术报告：

分析结果：
{self._format_results_summary(results)}

技术报告应包含：
1. 数据处理和清洗过程
2. 特征工程方法
3. 模型选择和调优过程
4. 性能指标和验证方法
5. 技术挑战和解决方案
6. 代码和算法说明
7. 可重现性说明
8. 技术债务和改进机会

目标读者是数据科学家和工程师团队。
"""
    
    def _format_results_summary(self, results: Dict[str, Any]) -> str:
        """格式化结果摘要"""
        summary_parts = []
        
        for key, value in results.items():
            if isinstance(value, dict):
                summary_parts.append(f"{key}: {str(value)[:200]}...")
            elif isinstance(value, list):
                summary_parts.append(f"{key}: {len(value)} items")
            else:
                summary_parts.append(f"{key}: {str(value)[:100]}")
        
        return "\n".join(summary_parts)
    
    def _format_results_for_recommendations(self, results: Dict[str, Any]) -> str:
        """为建议生成格式化结果"""
        # Extract key insights for recommendations
        key_insights = []
        
        if 'model_performance' in results:
            key_insights.append(f"模型性能: {results['model_performance']}")
        
        if 'data_quality' in results:
            key_insights.append(f"数据质量: {results['data_quality']}")
        
        if 'business_impact' in results:
            key_insights.append(f"业务影响: {results['business_impact']}")
        
        return "\n".join(key_insights) if key_insights else str(results)[:500]
    
    def _extract_report_sections(self, results: Dict[str, Any]) -> List[str]:
        """提取报告中包含的部分"""
        sections = ["executive_summary", "methodology", "findings"]
        
        if 'model_results' in results:
            sections.append("model_evaluation")
        
        if 'data_quality' in results:
            sections.append("data_assessment")
        
        if 'recommendations' in results:
            sections.append("recommendations")
        
        return sections
    
    def _extract_key_points(self, results: Dict[str, Any]) -> List[str]:
        """提取关键要点"""
        key_points = []
        
        # Extract based on available data
        if 'insights' in results:
            key_points.extend(results['insights'][:3])  # Top 3 insights
        
        if 'performance_metrics' in results:
            key_points.append(f"模型准确率: {results['performance_metrics']}")
        
        return key_points
    
    def _extract_priorities(self, results: Dict[str, Any]) -> List[str]:
        """提取实施优先级"""
        priorities = ["high", "medium", "low"]
        
        # Logic to determine priorities based on results
        if 'urgency_indicators' in results:
            return results['urgency_indicators']
        
        return priorities
    
    # Additional prompt builders for different audiences
    def _build_technical_summary_prompt(self, results: Dict[str, Any]) -> str:
        return f"""
为技术团队创建摘要，重点关注：
- 技术实现细节
- 性能指标
- 技术挑战和解决方案
- 下一步技术改进

分析结果：
{self._format_results_summary(results)}
"""
    
    def _build_business_summary_prompt(self, results: Dict[str, Any]) -> str:
        return f"""
为业务团队创建摘要，重点关注：
- 业务价值和ROI
- 市场影响
- 客户体验改进
- 风险和机会

分析结果：
{self._format_results_summary(results)}
"""
    
    def _build_general_summary_prompt(self, results: Dict[str, Any]) -> str:
        return f"""
创建通用摘要，平衡技术和业务观点：

分析结果：
{self._format_results_summary(results)}

摘要应该清晰、简洁，适合不同背景的读者理解。
"""
    
    def _build_default_report_prompt(self, results: Dict[str, Any]) -> str:
        return f"""
基于以下结果生成标准报告：

{self._format_results_summary(results)}

请包含主要发现、关键洞察和建议。
"""