"""
Agent流式输出模板解析器
支持动态模板解析为action流
"""

import re
import json
from typing import Dict, Any, List, Generator, Optional
from dataclasses import dataclass
from enum import Enum

class ActionType(Enum):
    """Action类型枚举"""
    THINKING = "thinking"
    IS_THINKING = "is_thinking"
    ADD = "add"
    NEW_CHAPTER = "new_chapter"
    FINNISH = "finnish"
    UPDATE_STATE = "update_state"

@dataclass
class TemplateAction:
    """模板Action"""
    action_type: ActionType
    content: str
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        result = {
            "action": self.action_type.value,
            "content": self.content
        }
        if self.metadata:
            result.update(self.metadata)
        return result

class StreamingTemplateParser:
    """流式模板解析器"""
    
    def __init__(self):
        self.template_patterns = {
            # 思考过程
            r'<thinking>(.*?)</thinking>': ActionType.THINKING,
            r'🤖\s*思考中\.\.\.|🧠\s*分析中\.\.\.|💭\s*正在思考\.\.\.': ActionType.IS_THINKING,
            
            # 章节标题
            r'#{1,3}\s*(.+)': ActionType.ADD,
            r'\*\*(.+?)\*\*': ActionType.ADD,
            
            # 列表项
            r'[-\*\+]\s*(.+)': ActionType.ADD,
            r'\d+\.\s*(.+)': ActionType.ADD,
            
            # 代码块
            r'```(\w+)?\n(.*?)\n```': ActionType.ADD,
            
            # 状态更新
            r'<state>(.*?)</state>': ActionType.UPDATE_STATE,
            
            # 结束标记
            r'<\/workflow>|结束|完成|finish': ActionType.FINNISH,
        }
        
        self.emoji_patterns = {
            '🎯': 'objective',
            '📊': 'analysis', 
            '🔍': 'investigation',
            '💡': 'insight',
            '⚠️': 'warning',
            '✅': 'success',
            '❌': 'error',
            '🚀': 'action',
            '📈': 'progress',
            '🔧': 'implementation'
        }
    
    def parse_template_stream(self, template: str, context: Dict[str, Any] = None) -> Generator[TemplateAction, None, None]:
        """解析模板为流式Action"""
        context = context or {}
        
        # 预处理模板，替换变量
        processed_template = self._process_template_variables(template, context)
        
        # 按行分割并逐行解析
        lines = processed_template.split('\n')
        current_thinking = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 检查是否是思考过程
            thinking_match = re.search(r'<thinking>(.*?)</thinking>', line, re.DOTALL)
            if thinking_match:
                yield TemplateAction(ActionType.IS_THINKING, "🤖 Agent正在思考...")
                yield TemplateAction(ActionType.THINKING, thinking_match.group(1))
                continue
            
            # 检查其他模式
            action = self._parse_line_to_action(line)
            if action:
                yield action
    
    def _process_template_variables(self, template: str, context: Dict[str, Any]) -> str:
        """处理模板变量替换"""
        # 替换 {{variable}} 格式的变量
        def replace_var(match):
            var_name = match.group(1).strip()
            return str(context.get(var_name, f"{{{{ {var_name} }}}}"))
        
        return re.sub(r'\{\{\s*(\w+)\s*\}\}', replace_var, template)
    
    def _parse_line_to_action(self, line: str) -> Optional[TemplateAction]:
        """解析单行为Action"""
        # 检查思考标记
        if any(pattern in line for pattern in ['🤖', '🧠', '💭']) and any(word in line for word in ['思考', '分析', '正在']):
            return TemplateAction(ActionType.IS_THINKING, line)
        
        # 检查标题
        if re.match(r'#{1,3}\s*', line):
            content = re.sub(r'#{1,3}\s*', '', line)
            return TemplateAction(ActionType.ADD, content, {"content_type": "heading"})
        
        # 检查粗体文本
        if re.search(r'\*\*(.+?)\*\*', line):
            return TemplateAction(ActionType.ADD, line, {"content_type": "emphasis"})
        
        # 检查列表项
        if re.match(r'[-\*\+]\s*', line):
            content = re.sub(r'[-\*\+]\s*', '', line)
            return TemplateAction(ActionType.ADD, f"- {content}", {"content_type": "list_item"})
        
        # 检查编号列表
        if re.match(r'\d+\.\s*', line):
            return TemplateAction(ActionType.ADD, line, {"content_type": "numbered_list"})
        
        # 检查代码块开始
        if line.startswith('```'):
            return TemplateAction(ActionType.ADD, line, {"content_type": "code_block"})
        
        # 检查状态更新
        state_match = re.search(r'<state>(.*?)</state>', line)
        if state_match:
            try:
                state_data = json.loads(state_match.group(1))
                return TemplateAction(ActionType.UPDATE_STATE, "", {"state": state_data})
            except json.JSONDecodeError:
                pass
        
        # 检查结束标记
        if any(word in line.lower() for word in ['结束', '完成', 'finish', 'end']):
            return TemplateAction(ActionType.FINNISH, line)
        
        # 默认作为普通文本
        if line:
            emoji_type = self._detect_emoji_type(line)
            metadata = {"emoji_type": emoji_type} if emoji_type else None
            return TemplateAction(ActionType.ADD, line, metadata)
        
        return None
    
    def _detect_emoji_type(self, text: str) -> Optional[str]:
        """检测文本中的emoji类型"""
        for emoji, type_name in self.emoji_patterns.items():
            if emoji in text:
                return type_name
        return None

class AgentTemplateEngine:
    """Agent模板引擎"""
    
    def __init__(self):
        self.parser = StreamingTemplateParser()
        self.templates = {}
        self._load_default_templates()
    
    def _load_default_templates(self):
        """加载默认模板"""
        self.templates = {
            "data_analysis": """
<thinking>
正在分析数据集结构和特征...
- 检查数据形状: {{dataset_shape}}
- 分析数据类型分布
- 识别缺失值模式
- 计算基础统计信息
</thinking>

# 📊 数据分析报告

## 🎯 数据集概览
- **数据形状**: {{dataset_shape}}
- **特征数量**: {{feature_count}}
- **目标变量**: {{target_variable}}

## 🔍 数据质量分析
{{#if missing_values}}
⚠️ **缺失值检测**: 发现 {{missing_values.total}} 个缺失值
{{#each missing_values.columns}}
- {{this.name}}: {{this.percentage}}% 缺失
{{/each}}
{{/if}}

## 📈 特征分析
{{#each feature_analysis}}
### {{this.name}}
- **类型**: {{this.type}}
- **唯一值**: {{this.unique_count}}
- **质量评分**: {{this.quality_score}}/100
{{/each}}

## 💡 关键洞察
{{#each insights}}
- {{this}}
{{/each}}

## 🚀 下一步建议
{{#each recommendations}}
- {{this}}
{{/each}}

<state>
{
  "data_analysis_completed": true,
  "data_quality_score": {{quality_score}},
  "next_steps": {{next_steps}}
}
</state>
""",

            "methodology_design": """
<thinking>
基于数据特征设计机器学习方法论...
- 问题类型: {{problem_type}}
- 数据复杂度: {{complexity_level}}
- 选择合适的算法组合
- 设计验证策略
</thinking>

# 🧠 机器学习方法论设计

## 🎯 问题分析
- **问题类型**: {{problem_type}}
- **复杂度**: {{complexity_level}}
- **数据规模**: {{data_size}}

## 🤖 算法选择策略

### 基础算法
{{#each primary_algorithms}}
- **{{this.name}}**: {{this.description}}
  - 适用场景: {{this.use_case}}
  - 预期性能: {{this.expected_performance}}
{{/each}}

### 集成方法
{{#each ensemble_methods}}
- **{{this.name}}**: {{this.description}}
{{/each}}

## 🔧 特征工程策略

### 预处理步骤
{{#each preprocessing_steps}}
1. **{{this.name}}**: {{this.description}}
   - 实现方法: {{this.implementation}}
{{/each}}

### 特征创建
{{#each feature_engineering}}
- {{this}}
{{/each}}

## ✅ 验证框架
- **验证方法**: {{validation_method}}
- **交叉验证**: {{cv_folds}} 折
- **评估指标**: {{evaluation_metrics}}

## 📊 性能目标
- **R² 分数**: ≥ {{target_r2}}
- **RMSE**: ≤ ${{target_rmse}}
- **MAE**: ≤ ${{target_mae}}

<state>
{
  "methodology_designed": true,
  "selected_algorithms": {{selected_algorithms}},
  "validation_strategy": "{{validation_method}}"
}
</state>
""",

            "model_implementation": """
<thinking>
开始实现机器学习模型...
- 准备训练数据
- 配置模型参数
- 实现训练流程
- 设置评估指标
</thinking>

# 🚀 模型实现与训练

## 📋 实现计划
1. **数据准备**: 特征工程和数据分割
2. **模型训练**: 训练选定的算法
3. **超参数调优**: 网格搜索优化
4. **模型评估**: 交叉验证评估

## 💻 代码实现

### 数据预处理
```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder

# 加载数据
df = pd.read_csv('{{csv_file_path}}')

# 特征工程
{{#each feature_engineering_code}}
{{this}}
{{/each}}

# 数据分割
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
```

### 模型训练
```python
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error

# 模型定义
models = {
    {{#each models}}
    '{{this.name}}': {{this.implementation}},
    {{/each}}
}

# 训练和评估
results = {}
for name, model in models.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    results[name] = {
        'r2': r2_score(y_test, y_pred),
        'rmse': np.sqrt(mean_squared_error(y_test, y_pred))
    }
```

## 📊 训练结果
{{#each model_results}}
### {{this.name}}
- **R² 分数**: {{this.r2_score}}
- **RMSE**: ${{this.rmse}}
- **训练时间**: {{this.training_time}}秒
{{/each}}

## 🏆 最佳模型
**{{best_model.name}}** 表现最佳:
- R² = {{best_model.r2}}
- RMSE = ${{best_model.rmse}}

<state>
{
  "model_trained": true,
  "best_model": "{{best_model.name}}",
  "performance_metrics": {{performance_metrics}}
}
</state>
"""
        }
    
    def render_template(self, template_name: str, context: Dict[str, Any]) -> Generator[Dict[str, Any], None, None]:
        """渲染模板为流式Action"""
        if template_name not in self.templates:
            raise ValueError(f"Template '{template_name}' not found")
        
        template = self.templates[template_name]
        
        # 使用简单的模板引擎处理 {{#if}} 和 {{#each}} 等逻辑
        processed_template = self._process_template_logic(template, context)
        
        # 解析为流式Action
        for action in self.parser.parse_template_stream(processed_template, context):
            yield action.to_dict()
    
    def _process_template_logic(self, template: str, context: Dict[str, Any]) -> str:
        """处理模板逻辑（简化版Handlebars）"""
        # 处理 {{#if condition}} ... {{/if}}
        def process_if(match):
            condition = match.group(1).strip()
            content = match.group(2)

            # 支持嵌套属性检查，如 missing_values.total
            if '.' in condition:
                parts = condition.split('.')
                value = context
                for part in parts:
                    if isinstance(value, dict) and part in value:
                        value = value[part]
                    else:
                        value = None
                        break
                if value:
                    return content
            else:
                # 简单的条件判断
                if condition in context and context[condition]:
                    return content
            return ""

        template = re.sub(r'\{\{#if\s+([\w\.]+)\}\}(.*?)\{\{/if\}\}', process_if, template, flags=re.DOTALL)

        # 处理 {{#each array}} ... {{/each}}
        def process_each(match):
            array_name = match.group(1).strip()
            content = match.group(2)

            # 支持嵌套属性，如 missing_values.columns
            if '.' in array_name:
                parts = array_name.split('.')
                array_data = context
                for part in parts:
                    if isinstance(array_data, dict) and part in array_data:
                        array_data = array_data[part]
                    else:
                        array_data = None
                        break
            else:
                array_data = context.get(array_name)

            if array_data and isinstance(array_data, list):
                result = ""
                for item in array_data:
                    # 替换 {{this}} 或 {{this.property}}
                    item_content = content
                    if isinstance(item, dict):
                        for key, value in item.items():
                            item_content = item_content.replace(f"{{{{this.{key}}}}}", str(value))
                    else:
                        item_content = item_content.replace("{{this}}", str(item))
                    result += item_content
                return result
            return ""

        template = re.sub(r'\{\{#each\s+([\w\.]+)\}\}(.*?)\{\{/each\}\}', process_each, template, flags=re.DOTALL)

        return template
    
    def add_template(self, name: str, template: str):
        """添加新模板"""
        self.templates[name] = template
    
    def list_templates(self) -> List[str]:
        """列出所有可用模板"""
        return list(self.templates.keys())

# 全局模板引擎实例
template_engine = AgentTemplateEngine()
