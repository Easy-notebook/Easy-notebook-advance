"""
Context Management Utilities
上下文管理工具 - 处理上下文压缩、总结和优化
"""

import json
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ContextManager:
    """
    智能上下文管理器
    - 压缩过长的上下文
    - 生成阶段和步骤总结
    - 优化数据传输
    """
    
    def __init__(self, max_context_length: int = 12000, max_history_items: int = 50):
        self.max_context_length = max_context_length
        self.max_history_items = max_history_items
        
    def compress_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        压缩上下文数据
        """
        if not context:
            return context
            
        compressed = dict(context)
        
        # 压缩agent思考历史
        if 'agent_thinking_history' in compressed:
            compressed['agent_thinking_history'] = self._compress_thinking_history(
                compressed['agent_thinking_history']
            )
        
        # 压缩步骤结果
        if 'step_results' in compressed:
            compressed['step_results'] = self._compress_step_results(
                compressed['step_results']
            )
            
        # 压缩阶段结果
        if 'stage_results' in compressed:
            compressed['stage_results'] = self._compress_stage_results(
                compressed['stage_results']
            )
            
        # 清理冗余数据
        compressed = self._clean_redundant_data(compressed)
        
        # 检查总长度并进一步压缩
        context_str = json.dumps(compressed, ensure_ascii=False)
        if len(context_str) > self.max_context_length:
            compressed = self._aggressive_compress(compressed)
            
        return compressed
    
    def _compress_thinking_history(self, history: List[Dict]) -> List[Dict]:
        """压缩agent思考历史"""
        if not history or len(history) <= self.max_history_items:
            return history
            
        # 保留关键里程碑
        milestones = [
            item for item in history 
            if item.get('is_milestone') or item.get('confidence_level', 0) > 0.8
        ]
        
        # 保留最近的记录
        recent_count = max(20, self.max_history_items - len(milestones))
        recent = history[-recent_count:]
        
        # 合并并去重
        combined = milestones + recent
        unique_items = []
        seen_timestamps = set()
        
        for item in combined:
            timestamp = item.get('timestamp')
            if timestamp not in seen_timestamps:
                seen_timestamps.add(timestamp)
                unique_items.append(item)
                
        return unique_items[-self.max_history_items:]
    
    def _compress_step_results(self, step_results: Dict[str, Any]) -> Dict[str, Any]:
        """压缩步骤结果"""
        compressed = {}
        
        for step_id, result in step_results.items():
            if not result:
                continue
                
            if isinstance(result, dict):
                compressed[step_id] = {
                    'status': result.get('status', 'unknown'),
                    'summary': result.get('summary') or self._summarize_step_result(result),
                    'key_outputs': result.get('key_outputs') or result.get('outputs', [])[:3],
                    'timestamp': result.get('timestamp'),
                    'execution_time': result.get('execution_time'),
                    'quality_score': result.get('quality_score')
                }
            else:
                compressed[step_id] = str(result)[:200]
                
        return compressed
    
    def _compress_stage_results(self, stage_results: Dict[str, Any]) -> Dict[str, Any]:
        """压缩阶段结果"""
        compressed = {}
        
        for stage_id, result in stage_results.items():
            if not result:
                continue
                
            compressed[stage_id] = {
                'status': 'completed',
                'summary': self._summarize_stage_result(stage_id, result),
                'completedAt': result.get('completedAt'),
                'step_count': len(result.get('steps', [])),
                'key_achievements': result.get('key_achievements', [])[:3]
            }
            
        return compressed
    
    def _summarize_step_result(self, result: Dict[str, Any]) -> str:
        """为步骤结果创建总结"""
        if not result:
            return "No result available"
            
        # 代码执行结果
        if 'code' in result:
            outputs_count = len(result.get('outputs', []))
            return f"Executed code with {outputs_count} outputs"
            
        # 分析结果
        if 'analysis' in result:
            analysis = result['analysis']
            if isinstance(analysis, str) and len(analysis) > 200:
                return analysis[:200] + "..."
            return str(analysis)
            
        # 数据处理结果
        if 'data' in result:
            data = result['data']
            if isinstance(data, (list, dict)):
                return f"Processed data: {type(data).__name__} with {len(data)} items"
            return str(data)[:100]
            
        # 通用总结
        result_str = json.dumps(result, ensure_ascii=False)
        return result_str[:150] + "..." if len(result_str) > 150 else result_str
    
    def _summarize_stage_result(self, stage_id: str, result: Dict[str, Any]) -> str:
        """为阶段结果创建总结"""
        steps_count = len(result.get('steps', []))
        completed_at = result.get('completedAt', 'unknown time')
        
        return f"Stage '{stage_id}' completed with {steps_count} steps at {completed_at}"
    
    def _clean_redundant_data(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """清理冗余数据"""
        cleaned = {}
        
        for key, value in context.items():
            # 跳过空值
            if value is None or (isinstance(value, (list, dict)) and len(value) == 0):
                continue
                
            # 清理字符串
            if isinstance(value, str):
                # 移除多余的空白字符
                cleaned_value = re.sub(r'\s+', ' ', value.strip())
                if cleaned_value:
                    cleaned[key] = cleaned_value
            else:
                cleaned[key] = value
                
        return cleaned
    
    def _aggressive_compress(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """激进压缩 - 用于处理仍然过长的上下文"""
        compressed = {}
        
        # 只保留最核心的信息
        essential_keys = [
            'current_stage', 'current_step', 'stage_id', 'step_id',
            'user_preferences', 'dataset_info', 'goal', 'objectives'
        ]
        
        for key in essential_keys:
            if key in context and context[key]:
                compressed[key] = context[key]
        
        # 保留最关键的思考记录（只有里程碑）
        if 'agent_thinking_history' in context:
            milestones = [
                item for item in context['agent_thinking_history']
                if item.get('is_milestone') or item.get('confidence_level', 0) > 0.9
            ]
            compressed['agent_thinking_history'] = milestones[-5:]
        
        # 保留阶段完成状态
        if 'completed_stages' in context:
            compressed['completed_stages'] = context['completed_stages']
            
        if 'completed_steps' in context:
            compressed['completed_steps'] = context['completed_steps'][-10:]
        
        # 创建总体总结
        compressed['context_summary'] = self._create_context_summary(context)
        
        return compressed
    
    def _create_context_summary(self, context: Dict[str, Any]) -> str:
        """创建上下文总结"""
        summary_parts = []
        
        # 当前状态
        current_stage = context.get('current_stage', 'unknown')
        current_step = context.get('current_step', 'unknown')
        summary_parts.append(f"Current: {current_stage}/{current_step}")
        
        # 完成进度
        completed_stages = context.get('completed_stages', [])
        completed_steps = context.get('completed_steps', [])
        summary_parts.append(f"Progress: {len(completed_stages)} stages, {len(completed_steps)} steps completed")
        
        # 关键成果
        if 'stage_results' in context:
            key_achievements = []
            for result in context['stage_results'].values():
                if isinstance(result, dict) and 'key_achievements' in result:
                    key_achievements.extend(result['key_achievements'][:2])
            if key_achievements:
                summary_parts.append(f"Key achievements: {', '.join(key_achievements[:3])}")
        
        return "; ".join(summary_parts)
    
    def create_stage_summary(self, stage_id: str, step_results: Dict[str, Any], 
                           agent_history: List[Dict]) -> Dict[str, Any]:
        """
        创建阶段总结
        """
        summary = {
            'stage_id': stage_id,
            'timestamp': datetime.now().isoformat(),
            'steps_completed': len(step_results),
            'key_outcomes': [],
            'issues_encountered': [],
            'recommendations': []
        }
        
        # 分析步骤结果
        for step_id, result in step_results.items():
            if isinstance(result, dict):
                # 提取关键成果
                if result.get('status') == 'success':
                    if 'key_outputs' in result:
                        summary['key_outcomes'].extend(result['key_outputs'][:2])
                elif result.get('status') == 'error':
                    summary['issues_encountered'].append(f"Step {step_id}: {result.get('error', 'Unknown error')}")
        
        # 分析agent思考历史
        high_confidence_thoughts = [
            thought for thought in agent_history
            if thought.get('confidence_level', 0) > 0.8
        ]
        
        if high_confidence_thoughts:
            summary['key_insights'] = [
                thought.get('thinking_text', '')[:100]
                for thought in high_confidence_thoughts[-3:]
            ]
        
        return summary
    
    def estimate_context_size(self, context: Dict[str, Any]) -> int:
        """估算上下文大小（字符数）"""
        try:
            return len(json.dumps(context, ensure_ascii=False))
        except (TypeError, ValueError):
            return 0
    
    def should_compress(self, context: Dict[str, Any]) -> bool:
        """判断是否需要压缩上下文"""
        return self.estimate_context_size(context) > self.max_context_length

# 全局实例
context_manager = ContextManager()