# 基础系统消息模板
DEBUG_TEMPLATE = """你是一个专业的代码调试专家，擅长分析和修复代码错误。在接下来的对话中，请用中文完成。
"""

# 定位错误模板
DEBUG_LOCATE_TEMPLATE = """任务：定位代码错误
任务描述：分析代码和error_message，定位导致错误的最相关代码片段(5-10行)。

输入数据：
1. 错误代码：
```python
{wrong_code}
```

2. error_message：
{error_messages}

3. 输出信息：
{output_messages}

输出要求：
1. 仅输出导致错误的代码片段
2. 不要在此阶段尝试修复错误
3. 如果是断言错误，找出导致断言失败的底层代码
4. 输出格式：
```python
[相关错误代码片段]
```
"""

# 修复错误模板
DEBUG_FIX_TEMPLATE = """任务：修复代码错误
任务描述：根据error_message和代码分析，修复错误代码片段。

输入数据：

1. 错误代码片段：
```python
{most_relevant_code_snippet}
```

2. error_message：
{error_messages}

3. 输出信息：
{output_messages}


输出要求：
1. 分析错误原因
2. 提供修复后的代码
3. 确保修复后的代码与系统中预定义的工具兼容
4. 输出格式：
```python
[修复后的代码片段]
```
"""

# 合并代码模板
DEBUG_MERGE_TEMPLATE = """任务：合并修复代码
任务描述：将修复后的代码片段整合到原始代码中。

输入数据：
1. 原始代码：
```python
{wrong_code}
```

2. 错误代码片段：
```python
{most_relevant_code_snippet}
```

3. 修复后的代码片段：
```python
{code_snippet_after_correction}
```

输出要求：
1. 用修复后的代码片段替换原始代码中的错误部分
2. 保持代码结构和缩进的一致性
3. 输出格式：
```python
[完整的修复后代码]
```
"""

# 请求帮助模板
DEBUG_ASK_FOR_HELP_TEMPLATE = """任务：评估是否需要人工帮助
任务描述：分析多次调试尝试的结果，判断是否需要请求人工帮助。

输入数据：
1. 当前尝试次数：{i}
2. 历史error_message：
{all_error_messages}

判断标准：
1. 最后两次error_message相同
2. 最后三次错误中有超过两次包含相同关键词

输出要求：
1. 如果需要帮助，输出：<HELP>需要人工帮助</HELP>
2. 如果不需要帮助，输出空字符串
"""

# 测试错误定位模板
DEBUG_TEST_LOCATE_TEMPLATE = """任务：定位测试失败的代码
任务描述：分析代码和测试失败信息，定位导致测试失败的代码片段(5-10行)。

输入数据：
1. 当前代码：
```python
{code}
```

2. 测试失败信息：
{test_info}

3. 输出信息：
{output_message}

输出要求：
1. 仅输出导致测试失败的代码片段
2. 不要在此阶段尝试修复问题
3. 输出格式：
```python
[相关问题代码片段]
```
"""

# 测试错误修复模板
DEBUG_TEST_FIX_TEMPLATE = """任务：修复测试失败的代码
任务描述：根据测试失败信息和代码分析，修复问题代码片段。

输入数据：
1. 问题代码片段：
```python
{error_snippet}
```

2. 测试失败信息：
{test_info}

3. 输出信息：
{output_message}

输出要求：
1. 分析测试失败原因
2. 提供修复后的代码
3. 确保修复后的代码能通过测试
4. 输出格式：
```python
[修复后的代码片段]
```
"""

# 测试修复代码合并模板
DEBUG_TEST_MERGE_TEMPLATE = """任务：合并测试修复代码
任务描述：将修复后的代码片段整合到原始代码中。

输入数据：
1. 原始代码：
```python
{original_code}
```

2. 问题代码片段：
```python
{error_snippet}
```

3. 修复后的代码片段：
```python
{fixed_snippet}
```

输出要求：
1. 用修复后的代码片段替换原始代码中的问题部分
2. 保持代码结构和缩进的一致性
3. 确保修改不会影响其他功能
4. 输出格式：
```python
[完整的修复后代码]
```
""" 