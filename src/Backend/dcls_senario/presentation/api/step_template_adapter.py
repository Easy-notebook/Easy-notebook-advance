"""
StepTemplate适配器 - 将新架构的Agent结果转换为前端需要的StepTemplate格式
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from domain.interfaces import AgentResult
from app.models.StepTemplate import StepTemplate


@dataclass
class StepAction:
    """步骤动作定义"""
    action: str
    shotType: Optional[str] = None
    content: Optional[str] = None
    delay: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    state: Optional[Dict[str, Any]] = None


class StepTemplateAdapter:
    """StepTemplate适配器，用于将Agent结果转换为前端协议"""
    
    def __init__(self, step_data: Dict[str, Any], initial_state: Dict[str, Any]):
        self.step_data = step_data
        self.state = initial_state.copy()
        self.template = StepTemplate(step_data, initial_state)
    
    def add_agent_thinking(
        self, 
        agent_name: str, 
        thinking_text: str = "", 
        text_array: List[str] = None
    ) -> 'StepTemplateAdapter':
        """添加Agent思考状态"""
        self.template.is_thinking(
            textArray=text_array or [],
            agentName=agent_name,
            customText=thinking_text
        )
        return self
    
    def finish_agent_thinking(self, completion_text: str = "思考完成") -> 'StepTemplateAdapter':
        """结束Agent思考"""
        self.template.finish_thinking()
        self.template.set_effect_as_thinking(completion_text)
        return self
    
    def add_agent_response(
        self, 
        agent_result: AgentResult, 
        agent_name: str = "",
        delay: Optional[int] = None
    ) -> 'StepTemplateAdapter':
        """添加Agent响应结果"""
        if agent_result.success:
            # 成功的响应
            response_text = self._format_agent_response(agent_result, agent_name)
            self.template.add_text(response_text, delay)
            
            # 更新状态变量
            if isinstance(agent_result.data, dict):
                for key, value in agent_result.data.items():
                    self.template.add_variable(f"agent_{key}", str(value))
        else:
            # 失败的响应
            error_text = f"**❌ {agent_name} 执行失败**\n\n{agent_result.message}"
            self.template.add_text(error_text, delay)
        
        return self
    
    def add_code_generation(
        self, 
        code: str, 
        description: str = "", 
        delay: Optional[int] = None
    ) -> 'StepTemplateAdapter':
        """添加代码生成"""
        if description:
            self.template.add_text(f"**📝 {description}**", delay)
        
        self.template.add_code(code, delay)
        return self
    
    def execute_code_with_event(
        self, 
        event_tag: str, 
        completion_message: str = "",
        codecell_id: str = "lastAddedCellId",
        auto_debug: bool = True
    ) -> 'StepTemplateAdapter':
        """执行代码并等待事件"""
        self.template.exe_code_cli(
            event_tag=event_tag,
            mark_finnish=completion_message,
            codecell_id=codecell_id,
            auto_debug=auto_debug
        )
        return self
    
    def add_data_analysis_result(
        self, 
        analysis_result: AgentResult,
        include_visualizations: bool = True
    ) -> 'StepTemplateAdapter':
        """添加数据分析结果"""
        if not analysis_result.success:
            return self.add_agent_response(analysis_result, "数据分析Agent")
        
        data = analysis_result.data
        
        # 添加分析摘要
        if 'summary' in data:
            summary_text = self._format_analysis_summary(data['summary'])
            self.template.add_text(summary_text)
        
        # 添加数据质量报告
        if 'basic_analysis' in data:
            quality_text = self._format_data_quality_report(data['basic_analysis'])
            self.template.add_text(quality_text)
        
        # 如果有可视化代码，添加它
        if include_visualizations and 'visualization_code' in data:
            self.add_code_generation(
                data['visualization_code'], 
                "生成数据可视化"
            )
        
        return self
    
    def add_cleaning_plan(self, cleaning_result: AgentResult) -> 'StepTemplateAdapter':
        """添加数据清理计划"""
        if not cleaning_result.success:
            return self.add_agent_response(cleaning_result, "数据清理Agent")
        
        data = cleaning_result.data
        
        # 添加问题识别结果
        if 'issues' in data:
            issues_text = self._format_data_issues(data['issues'])
            self.template.add_text(issues_text)
        
        # 添加清理计划
        if 'cleaning_operations' in data:
            plan_text = self._format_cleaning_plan(data['cleaning_operations'])
            self.template.add_text(plan_text)
        
        # 添加清理代码
        if 'cleaning_code' in data:
            self.add_code_generation(
                data['cleaning_code'],
                "执行数据清理操作"
            )
        
        return self
    
    def add_model_results(self, model_result: AgentResult) -> 'StepTemplateAdapter':
        """添加模型训练结果"""
        if not model_result.success:
            return self.add_agent_response(model_result, "模型训练Agent")
        
        data = model_result.data
        
        # 添加模型性能摘要
        if 'model_performance' in data:
            performance_text = self._format_model_performance(data['model_performance'])
            self.template.add_text(performance_text)
        
        # 添加模型比较表格
        if 'model_comparison' in data:
            comparison_table = self.template.to_tableh(data['model_comparison'])
            self.template.add_text(f"**🔍 模型性能比较**\n\n{comparison_table}")
        
        return self
    
    def add_event_checkpoint(self, event_name: str) -> 'StepTemplateAdapter':
        """添加事件检查点"""
        self.template.next_event(event_name)
        return self
    
    def handle_event(self, event_name: str) -> bool:
        """处理事件"""
        return self.template.event(event_name)
    
    def handle_thinking_event(self, event_name: str) -> bool:
        """处理思考事件"""
        return self.template.think_event(event_name)
    
    def update_step_title(self, title: str) -> 'StepTemplateAdapter':
        """更新步骤标题"""
        self.template.update_title(title)
        return self
    
    def build_response(self) -> Dict[str, Any]:
        """构建最终响应"""
        return self.template.build()
    
    def _format_agent_response(self, result: AgentResult, agent_name: str) -> str:
        """格式化Agent响应"""
        response = f"**✅ {agent_name} 执行完成**\n\n"
        response += f"{result.message}\n\n"
        
        # 添加执行统计
        if result.execution_time > 0:
            response += f"**📊 执行统计:**\n"
            response += f"- 执行时间: {result.execution_time:.2f}秒\n"
            if result.tokens_used > 0:
                response += f"- Token使用: {result.tokens_used}\n"
            if result.cost > 0:
                response += f"- 成本: ${result.cost:.4f}\n"
        
        return response
    
    def _format_analysis_summary(self, summary: Dict[str, Any]) -> str:
        """格式化分析摘要"""
        text = "**📊 数据集分析摘要**\n\n"
        
        if 'overview' in summary:
            text += f"**概览:** {summary['overview']}\n\n"
        
        if 'quality_score' in summary:
            score = summary['quality_score']
            emoji = "🟢" if score >= 80 else "🟡" if score >= 60 else "🔴"
            text += f"**数据质量评分:** {emoji} {score}/100\n\n"
        
        if 'key_findings' in summary:
            text += "**关键发现:**\n"
            for finding in summary['key_findings']:
                text += f"- {finding}\n"
            text += "\n"
        
        return text
    
    def _format_data_quality_report(self, analysis: Dict[str, Any]) -> str:
        """格式化数据质量报告"""
        text = "**🔍 数据质量报告**\n\n"
        
        if 'shape' in analysis:
            text += f"**数据维度:** {analysis['shape'][0]} 行 × {analysis['shape'][1]} 列\n\n"
        
        if 'missing_percentage' in analysis:
            missing_pct = analysis['missing_percentage']
            if isinstance(missing_pct, dict):
                total_missing = sum(missing_pct.values()) / len(missing_pct)
                text += f"**缺失值比例:** {total_missing:.1f}%\n\n"
        
        if 'duplicate_rows' in analysis:
            text += f"**重复行数:** {analysis['duplicate_rows']}\n\n"
        
        return text
    
    def _format_data_issues(self, issues: List[Dict[str, Any]]) -> str:
        """格式化数据问题"""
        if not issues:
            return "**✅ 未发现数据质量问题**\n\n"
        
        text = f"**⚠️ 发现 {len(issues)} 个数据质量问题**\n\n"
        
        # 按严重程度分组
        critical = [i for i in issues if i.get('severity') == 'high']
        medium = [i for i in issues if i.get('severity') == 'medium']
        low = [i for i in issues if i.get('severity') == 'low']
        
        if critical:
            text += "**🔴 严重问题:**\n"
            for issue in critical:
                text += f"- {issue.get('description', '')}\n"
            text += "\n"
        
        if medium:
            text += "**🟡 中等问题:**\n"
            for issue in medium:
                text += f"- {issue.get('description', '')}\n"
            text += "\n"
        
        if low:
            text += "**🟢 轻微问题:**\n"
            for issue in low:
                text += f"- {issue.get('description', '')}\n"
            text += "\n"
        
        return text
    
    def _format_cleaning_plan(self, operations: List[Dict[str, Any]]) -> str:
        """格式化清理计划"""
        if not operations:
            return "**ℹ️ 无需数据清理操作**\n\n"
        
        text = f"**🔧 数据清理计划 ({len(operations)} 项操作)**\n\n"
        
        for i, op in enumerate(operations, 1):
            priority = op.get('priority', 3)
            risk = op.get('risk_level', 'low')
            
            priority_emoji = "🔥" if priority <= 2 else "⚡" if priority <= 3 else "📝"
            risk_emoji = "🔴" if risk == 'high' else "🟡" if risk == 'medium' else "🟢"
            
            text += f"{i}. {priority_emoji} **{op.get('operation_type', '')}** - {op.get('column', '')}\n"
            text += f"   方法: {op.get('method', '')} {risk_emoji}\n"
            text += f"   说明: {op.get('description', '')}\n\n"
        
        return text
    
    def _format_model_performance(self, performance: Dict[str, Any]) -> str:
        """格式化模型性能"""
        text = "**🎯 模型训练结果**\n\n"
        
        if 'best_model' in performance:
            best = performance['best_model']
            text += f"**最佳模型:** {best.get('model_name', '')}\n"
            text += f"**验证得分:** {best.get('validation_score', 0):.4f}\n"
            text += f"**训练时间:** {best.get('training_time', 0):.2f}秒\n\n"
        
        if 'total_models_trained' in performance:
            text += f"**训练模型数量:** {performance['total_models_trained']}\n\n"
        
        return text


class AgentStepBuilder:
    """Agent步骤构建器，简化StepTemplate的创建"""
    
    def __init__(self, step_data: Dict[str, Any], state: Dict[str, Any]):
        self.adapter = StepTemplateAdapter(step_data, state)
    
    def start_agent_execution(self, agent_name: str, task_description: str) -> 'AgentStepBuilder':
        """开始Agent执行"""
        self.adapter.add_agent_thinking(
            agent_name=agent_name,
            thinking_text=f"正在{task_description}...",
            text_array=[f"分析{task_description}", "生成解决方案", "执行操作"]
        )
        return self
    
    def complete_agent_execution(
        self, 
        result: AgentResult, 
        agent_name: str,
        success_message: str = "任务完成"
    ) -> 'AgentStepBuilder':
        """完成Agent执行"""
        self.adapter.finish_agent_thinking(success_message)
        self.adapter.add_agent_response(result, agent_name)
        return self
    
    def add_analysis_step(self, result: AgentResult) -> 'AgentStepBuilder':
        """添加分析步骤"""
        self.adapter.add_data_analysis_result(result)
        return self
    
    def add_cleaning_step(self, result: AgentResult) -> 'AgentStepBuilder':
        """添加清理步骤"""
        self.adapter.add_cleaning_plan(result)
        return self
    
    def add_modeling_step(self, result: AgentResult) -> 'AgentStepBuilder':
        """添加建模步骤"""
        self.adapter.add_model_results(result)
        return self
    
    def add_code_execution(
        self, 
        code: str, 
        description: str,
        event_tag: str = "",
        auto_debug: bool = True
    ) -> 'AgentStepBuilder':
        """添加代码执行"""
        self.adapter.add_code_generation(code, description)
        if event_tag:
            self.adapter.execute_code_with_event(
                event_tag=event_tag,
                completion_message=f"{description}完成",
                auto_debug=auto_debug
            )
        return self
    
    def build(self) -> Dict[str, Any]:
        """构建最终结果"""
        return self.adapter.build_response()


def create_step_template_from_agent_result(
    step_data: Dict[str, Any],
    state: Dict[str, Any],
    agent_result: AgentResult,
    agent_name: str,
    task_description: str
) -> Dict[str, Any]:
    """从Agent结果创建StepTemplate响应的便捷函数"""
    builder = AgentStepBuilder(step_data, state)
    
    builder.start_agent_execution(agent_name, task_description)
    
    if agent_result.success:
        # 根据结果类型选择合适的展示方式
        if 'issues' in agent_result.data and 'cleaning_operations' in agent_result.data:
            builder.add_cleaning_step(agent_result)
        elif 'basic_analysis' in agent_result.data or 'summary' in agent_result.data:
            builder.add_analysis_step(agent_result)
        elif 'model_performance' in agent_result.data:
            builder.add_modeling_step(agent_result)
        else:
            builder.complete_agent_execution(agent_result, agent_name)
    else:
        builder.complete_agent_execution(agent_result, agent_name, "执行失败")
    
    return builder.build()