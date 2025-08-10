"""
Agent工具调用协议
定义Agent如何通过标注token调用平台工具和更新状态
"""

import re
import json
from typing import Dict, List, Any, Tuple
from datetime import datetime

class AgentToolProtocol:
    """Agent工具调用协议解析器"""
    
    # 定义所有支持的工具标注token
    TOOL_TOKENS = {
        'add_text': r'<add-text>(.*?)</add-text>',
        'add_code': r'<add-code language="([^"]*)">(.*?)</add-code>',
        'thinking': r'<thinking>(.*?)</thinking>',
        'call_execute': r'<call-execute event="([^"]*)">(.*?)</call-execute>',
        'get_variable': r'<get-variable variable="([^"]*)"(?:\s+default="([^"]*)")?/>',
        'set_variable': r'<set-variable variable="([^"]*)" value="([^"]*)"(?:\s+type="([^"]*)")?/>',
        'remember': r'<remember type="([^"]*)">(.*?)</remember>',
        'update_todo': r'<update-todo action="([^"]*)"(?:\s+event="([^"]*)")?>(.*?)</update-todo>',
        'call_agent': r'<call-agent name="([^"]*)" task="([^"]*)"(?:\s+context="([^"]*)")?/>',
        'generate_code': r'<generate-code type="([^"]*)" target="([^"]*)"(?:\s+params="([^"]*)")?/>',
        'analyze_data': r'<analyze-data source="([^"]*)" method="([^"]*)"(?:\s+output="([^"]*)")?/>',
        'create_visualization': r'<create-visualization type="([^"]*)" data="([^"]*)"(?:\s+title="([^"]*)")?/>',
        'save_result': r'<save-result key="([^"]*)" format="([^"]*)">(.*?)</save-result>',
        'load_result': r'<load-result key="([^"]*)"(?:\s+default="([^"]*)")?/>',
        'conditional': r'<conditional condition="([^"]*)">(.*?)</conditional>',
        'loop': r'<loop variable="([^"]*)" items="([^"]*)">(.*?)</loop>',
        'parallel': r'<parallel>(.*?)</parallel>',
        'wait': r'<wait seconds="([^"]*)"(?:\s+message="([^"]*)")?/>',
        'log': r'<log level="([^"]*)">(.*?)</log>',
        'validate': r'<validate condition="([^"]*)" error="([^"]*)"(?:\s+action="([^"]*)")?/>',
        'transform_data': r'<transform-data input="([^"]*)" operation="([^"]*)" output="([^"]*)"(?:\s+params="([^"]*)")?/>',
        'export_report': r'<export-report format="([^"]*)" filename="([^"]*)"(?:\s+template="([^"]*)")?>(.*?)</export-report>',
        'notify_user': r'<notify-user type="([^"]*)" priority="([^"]*)">(.*?)</notify-user>',
        'checkpoint': r'<checkpoint name="([^"]*)"(?:\s+auto_save="([^"]*)")?/>',
        'rollback': r'<rollback checkpoint="([^"]*)"(?:\s+reason="([^"]*)")?/>',
        'branch': r'<branch condition="([^"]*)" true_path="([^"]*)" false_path="([^"]*)"(?:\s+merge="([^"]*)")?/>',
        'merge_results': r'<merge-results sources="([^"]*)" strategy="([^"]*)" output="([^"]*)"(?:\s+conflict_resolution="([^"]*)")?/>',
        'quality_check': r'<quality-check target="([^"]*)" criteria="([^"]*)"(?:\s+threshold="([^"]*)")?/>',
        'optimize': r'<optimize target="([^"]*)" objective="([^"]*)"(?:\s+constraints="([^"]*)")?/>',
        'schedule': r'<schedule task="([^"]*)" when="([^"]*)"(?:\s+priority="([^"]*)")?/>',
        'delegate': r'<delegate agent="([^"]*)" task="([^"]*)"(?:\s+deadline="([^"]*)")?/>',
        'collaborate': r'<collaborate agents="([^"]*)" task="([^"]*)" coordination="([^"]*)"(?:\s+timeout="([^"]*)")?/>',
        'learn': r'<learn from="([^"]*)" pattern="([^"]*)"(?:\s+confidence="([^"]*)")?/>',
        'adapt': r'<adapt strategy="([^"]*)" based_on="([^"]*)"(?:\s+scope="([^"]*)")?/>',
        'meta_analyze': r'<meta-analyze target="([^"]*)" perspective="([^"]*)"(?:\s+depth="([^"]*)")?/>',
        'synthesize': r'<synthesize sources="([^"]*)" method="([^"]*)" output="([^"]*)"(?:\s+criteria="([^"]*)")?/>',
        'reflect': r'<reflect on="([^"]*)" aspect="([^"]*)"(?:\s+action="([^"]*)")?/>',
        'plan': r'<plan goal="([^"]*)" horizon="([^"]*)"(?:\s+constraints="([^"]*)")?>(.*?)</plan>',
        'execute_plan': r'<execute-plan name="([^"]*)"(?:\s+mode="([^"]*)")?/>',
        'monitor': r'<monitor target="([^"]*)" metrics="([^"]*)"(?:\s+frequency="([^"]*)")?/>',
        'alert': r'<alert condition="([^"]*)" severity="([^"]*)">(.*?)</alert>',
        'recover': r'<recover from="([^"]*)" strategy="([^"]*)"(?:\s+fallback="([^"]*)")?/>',
        'scale': r'<scale resource="([^"]*)" factor="([^"]*)"(?:\s+trigger="([^"]*)")?/>',
        'cache': r'<cache key="([^"]*)" ttl="([^"]*)"(?:\s+strategy="([^"]*)")?>(.*?)</cache>',
        'stream': r'<stream source="([^"]*)" processor="([^"]*)"(?:\s+buffer_size="([^"]*)")?/>',
        'batch': r'<batch size="([^"]*)" timeout="([^"]*)">(.*?)</batch>',
        'pipeline': r'<pipeline name="([^"]*)" stages="([^"]*)"(?:\s+parallel="([^"]*)")?/>',
        'compose': r'<compose functions="([^"]*)" input="([^"]*)" output="([^"]*)"(?:\s+error_handling="([^"]*)")?/>',
        'version': r'<version target="([^"]*)" tag="([^"]*)"(?:\s+message="([^"]*)")?/>',
        'diff': r'<diff source="([^"]*)" target="([^"]*)"(?:\s+format="([^"]*)")?/>',
        'merge': r'<merge base="([^"]*)" source="([^"]*)" target="([^"]*)"(?:\s+strategy="([^"]*)")?/>',
        'test': r'<test target="([^"]*)" type="([^"]*)"(?:\s+coverage="([^"]*)")?/>',
        'benchmark': r'<benchmark target="([^"]*)" metrics="([^"]*)"(?:\s+iterations="([^"]*)")?/>',
        'profile': r'<profile target="([^"]*)" aspect="([^"]*)"(?:\s+duration="([^"]*)")?/>',
        'debug': r'<debug target="([^"]*)" level="([^"]*)"(?:\s+breakpoint="([^"]*)")?/>',
        'trace': r'<trace execution="([^"]*)" depth="([^"]*)"(?:\s+filter="([^"]*)")?/>',
        'audit': r'<audit target="([^"]*)" scope="([^"]*)"(?:\s+compliance="([^"]*)")?/>',
        'secure': r'<secure resource="([^"]*)" level="([^"]*)"(?:\s+method="([^"]*)")?/>',
        'encrypt': r'<encrypt data="([^"]*)" algorithm="([^"]*)"(?:\s+key="([^"]*)")?/>',
        'decrypt': r'<decrypt data="([^"]*)" key="([^"]*)"(?:\s+verify="([^"]*)")?/>',
        'authenticate': r'<authenticate user="([^"]*)" method="([^"]*)"(?:\s+token="([^"]*)")?/>',
        'authorize': r'<authorize user="([^"]*)" resource="([^"]*)" action="([^"]*)"(?:\s+context="([^"]*)")?/>',
        'rate_limit': r'<rate-limit resource="([^"]*)" limit="([^"]*)"(?:\s+window="([^"]*)")?/>',
        'throttle': r'<throttle target="([^"]*)" rate="([^"]*)"(?:\s+burst="([^"]*)")?/>',
        'circuit_breaker': r'<circuit-breaker service="([^"]*)" threshold="([^"]*)"(?:\s+timeout="([^"]*)")?/>',
        'retry': r'<retry operation="([^"]*)" max_attempts="([^"]*)"(?:\s+backoff="([^"]*)")?/>',
        'timeout': r'<timeout operation="([^"]*)" duration="([^"]*)"(?:\s+action="([^"]*)")?/>',
        'health_check': r'<health-check service="([^"]*)" endpoint="([^"]*)"(?:\s+interval="([^"]*)")?/>',
        'metrics': r'<metrics collect="([^"]*)" interval="([^"]*)"(?:\s+tags="([^"]*)")?/>',
        'trace_span': r'<trace-span name="([^"]*)" operation="([^"]*)"(?:\s+tags="([^"]*)")?>(.*?)</trace-span>',
        'emit_event': r'<emit-event type="([^"]*)" data="([^"]*)"(?:\s+target="([^"]*)")?/>',
        'subscribe': r'<subscribe event="([^"]*)" handler="([^"]*)"(?:\s+filter="([^"]*)")?/>',
        'publish': r'<publish topic="([^"]*)" message="([^"]*)"(?:\s+routing_key="([^"]*)")?/>',
        'consume': r'<consume queue="([^"]*)" handler="([^"]*)"(?:\s+batch_size="([^"]*)")?/>',
        'transform': r'<transform input="([^"]*)" transformer="([^"]*)" output="([^"]*)"(?:\s+config="([^"]*)")?/>',
        'aggregate': r'<aggregate data="([^"]*)" function="([^"]*)" output="([^"]*)"(?:\s+group_by="([^"]*)")?/>',
        'filter': r'<filter data="([^"]*)" condition="([^"]*)" output="([^"]*)"(?:\s+mode="([^"]*)")?/>',
        'sort': r'<sort data="([^"]*)" key="([^"]*)" output="([^"]*)"(?:\s+order="([^"]*)")?/>',
        'join': r'<join left="([^"]*)" right="([^"]*)" on="([^"]*)" output="([^"]*)"(?:\s+type="([^"]*)")?/>',
        'split': r'<split data="([^"]*)" strategy="([^"]*)" outputs="([^"]*)"(?:\s+ratio="([^"]*)")?/>',
        'sample': r'<sample data="([^"]*)" method="([^"]*)" size="([^"]*)" output="([^"]*)"(?:\s+seed="([^"]*)")?/>',
        'normalize': r'<normalize data="([^"]*)" method="([^"]*)" output="([^"]*)"(?:\s+params="([^"]*)")?/>',
        'encode': r'<encode data="([^"]*)" method="([^"]*)" output="([^"]*)"(?:\s+params="([^"]*)")?/>',
        'decode': r'<decode data="([^"]*)" method="([^"]*)" output="([^"]*)"(?:\s+params="([^"]*)")?/>',
        'compress': r'<compress data="([^"]*)" algorithm="([^"]*)" output="([^"]*)"(?:\s+level="([^"]*)")?/>',
        'decompress': r'<decompress data="([^"]*)" algorithm="([^"]*)" output="([^"]*)"(?:\s+verify="([^"]*)")?/>',
        'hash': r'<hash data="([^"]*)" algorithm="([^"]*)" output="([^"]*)"(?:\s+salt="([^"]*)")?/>',
        'verify_hash': r'<verify-hash data="([^"]*)" hash="([^"]*)" algorithm="([^"]*)"(?:\s+salt="([^"]*)")?/>',
        'sign': r'<sign data="([^"]*)" key="([^"]*)" algorithm="([^"]*)" output="([^"]*)"(?:\s+format="([^"]*)")?/>',
        'verify_signature': r'<verify-signature data="([^"]*)" signature="([^"]*)" key="([^"]*)" algorithm="([^"]*)"(?:\s+format="([^"]*)")?/>',
        'custom_tool': r'<custom-tool name="([^"]*)" params="([^"]*)"(?:\s+async="([^"]*)")?>(.*?)</custom-tool>'
    }
    
    def __init__(self):
        self.compiled_patterns = {
            name: re.compile(pattern, re.DOTALL | re.IGNORECASE)
            for name, pattern in self.TOOL_TOKENS.items()
        }
    
    def parse_agent_response(self, response: str) -> Dict[str, Any]:
        """解析Agent响应中的工具调用标注"""
        parsed_tools = []
        remaining_text = response
        
        # 按顺序解析所有工具调用
        for tool_name, pattern in self.compiled_patterns.items():
            matches = pattern.finditer(remaining_text)
            for match in matches:
                tool_call = {
                    'tool': tool_name,
                    'position': match.span(),
                    'groups': match.groups(),
                    'full_match': match.group(0)
                }
                parsed_tools.append(tool_call)
        
        # 按位置排序
        parsed_tools.sort(key=lambda x: x['position'][0])
        
        # 提取纯文本内容（移除工具标注）
        clean_text = remaining_text
        for tool_call in reversed(parsed_tools):  # 从后往前移除，避免位置偏移
            start, end = tool_call['position']
            clean_text = clean_text[:start] + clean_text[end:]
        
        return {
            'tools': parsed_tools,
            'clean_text': clean_text.strip(),
            'original_response': response,
            'parsed_at': datetime.now().isoformat()
        }
    
    def execute_tool_calls(self, parsed_response: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """执行解析出的工具调用"""
        results = []
        
        for tool_call in parsed_response['tools']:
            try:
                result = self._execute_single_tool(tool_call, context)
                results.append(result)
            except Exception as e:
                error_result = {
                    'tool': tool_call['tool'],
                    'success': False,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                results.append(error_result)
        
        return results
    
    def _execute_single_tool(self, tool_call: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """执行单个工具调用"""
        tool_name = tool_call['tool']
        groups = tool_call['groups']
        
        # 根据工具类型执行相应逻辑
        if tool_name == 'add_text':
            return self._execute_add_text(groups[0], context)
        elif tool_name == 'add_code':
            return self._execute_add_code(groups[0], groups[1], context)
        elif tool_name == 'thinking':
            return self._execute_thinking(groups[0], context)
        elif tool_name == 'call_execute':
            return self._execute_call_execute(groups[0], groups[1], context)
        elif tool_name == 'get_variable':
            return self._execute_get_variable(groups[0], groups[1] if len(groups) > 1 else None, context)
        elif tool_name == 'set_variable':
            return self._execute_set_variable(groups[0], groups[1], groups[2] if len(groups) > 2 else None, context)
        elif tool_name == 'remember':
            return self._execute_remember(groups[0], groups[1], context)
        elif tool_name == 'update_todo':
            return self._execute_update_todo(groups[0], groups[1] if len(groups) > 1 else None, groups[2] if len(groups) > 2 else None, context)
        elif tool_name == 'call_agent':
            return self._execute_call_agent(groups[0], groups[1], groups[2] if len(groups) > 2 else None, context)
        elif tool_name == 'generate_code':
            return self._execute_generate_code(groups[0], groups[1], groups[2] if len(groups) > 2 else None, context)
        elif tool_name == 'analyze_data':
            return self._execute_analyze_data(groups[0], groups[1], groups[2] if len(groups) > 2 else None, context)
        # ... 其他工具的执行逻辑
        else:
            return self._execute_custom_tool(tool_name, groups, context)
    
    def _execute_add_text(self, content: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行添加文本工具"""
        return {
            'tool': 'add_text',
            'success': True,
            'action': {
                'action': 'add',
                'shotType': 'DIALOGUE',
                'content': content.strip(),
                'state': context.get('state', {}),
                'delay': 0
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _execute_add_code(self, language: str, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行添加代码工具"""
        return {
            'tool': 'add_code',
            'success': True,
            'action': {
                'action': 'add',
                'shotType': 'CODE',
                'content': code.strip(),
                'language': language,
                'state': context.get('state', {}),
                'delay': 0
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _execute_thinking(self, content: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行思考工具"""
        return {
            'tool': 'thinking',
            'success': True,
            'action': {
                'action': 'is_thinking',
                'shotType': 'thinking',
                'textArray': [content.strip()],
                'state': context.get('state', {}),
                'delay': 1000
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _execute_call_execute(self, event: str, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行代码执行工具"""
        return {
            'tool': 'call_execute',
            'success': True,
            'action': {
                'action': 'exec_code',
                'shotType': 'CODE',
                'content': code.strip(),
                'event_tag': event,
                'state': context.get('state', {}),
                'delay': 0
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _execute_get_variable(self, variable: str, default: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行获取变量工具"""
        state = context.get('state', {})
        variables = state.get('variables', {})
        value = variables.get(variable, default)
        
        return {
            'tool': 'get_variable',
            'success': True,
            'variable': variable,
            'value': value,
            'found': variable in variables,
            'timestamp': datetime.now().isoformat()
        }
    
    def _execute_set_variable(self, variable: str, value: str, var_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行设置变量工具"""
        # 类型转换
        if var_type == 'int':
            try:
                value = int(value)
            except ValueError:
                pass
        elif var_type == 'float':
            try:
                value = float(value)
            except ValueError:
                pass
        elif var_type == 'bool':
            value = value.lower() in ('true', '1', 'yes', 'on')
        elif var_type == 'json':
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                pass
        
        # 更新状态
        if 'state' not in context:
            context['state'] = {}
        if 'variables' not in context['state']:
            context['state']['variables'] = {}
        
        context['state']['variables'][variable] = value
        
        return {
            'tool': 'set_variable',
            'success': True,
            'variable': variable,
            'value': value,
            'type': type(value).__name__,
            'action': {
                'action': 'update_variable',
                'variable': variable,
                'value': value,
                'state': context['state']
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _execute_remember(self, memory_type: str, content: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行记忆工具"""
        return {
            'tool': 'remember',
            'success': True,
            'memory_type': memory_type,
            'content': content,
            'action': {
                'action': 'store_memory',
                'memory_type': memory_type,
                'content': content,
                'timestamp': datetime.now().isoformat(),
                'state': context.get('state', {})
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _execute_update_todo(self, action: str, event: str, content: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行更新待办工具"""
        return {
            'tool': 'update_todo',
            'success': True,
            'action_type': action,
            'event': event,
            'content': content,
            'action': {
                'action': 'update_todo',
                'action_type': action,
                'event': event,
                'content': content,
                'state': context.get('state', {})
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _execute_custom_tool(self, tool_name: str, groups: Tuple, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行自定义工具"""
        return {
            'tool': tool_name,
            'success': True,
            'params': groups,
            'action': {
                'action': 'custom_tool',
                'tool_name': tool_name,
                'params': groups,
                'state': context.get('state', {})
            },
            'timestamp': datetime.now().isoformat()
        }

# 全局协议实例
agent_tool_protocol = AgentToolProtocol()

def parse_agent_response(response: str) -> Dict[str, Any]:
    """解析Agent响应的便捷函数"""
    return agent_tool_protocol.parse_agent_response(response)

def execute_tool_calls(parsed_response: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """执行工具调用的便捷函数"""
    return agent_tool_protocol.execute_tool_calls(parsed_response, context)
