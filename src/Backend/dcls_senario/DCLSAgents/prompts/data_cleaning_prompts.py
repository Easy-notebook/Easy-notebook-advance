DATA_CLEANING_TEMPLATE ="""
the information we know:
1. the problem description: {problem_description}
2. the context description: {context_description}
"""

# 1. 数据加载与验证
DIMENSION_CHECK_TEMPLATE = """Task: Data Dimension Check Code Generation
Task Description: Generate Python code to check data dimensions based on the scientific project description, data background description, observation units, and variable descriptions. Verify if the data dimensions meet expectations, identify any logical issues that contradict the data background, and check if the actual number of years exceeds the range described in the data background. Store all analysis results in the variable 'result', which should contain data analysis information rather than just textual conclusions.

Input Data:
1. CSV file path: {csv_path}
2. Data background information: {context_description}

Output Data:
Python code in the following format:
```python
import pandas as pd
data = pd.read_csv('{csv_path}')
result = ""
# check the data dimension
print(result)
```
"""

DIMENSION_ANALYSIS_TEMPLATE_2 = """you should do the dimension analysis based on the result and the background knowledge.

input data:
1. result: {result}
2. background knowledge: {context_description}

your output should be:
if there are problems with the data dimension, return the JSON format of the problem, if there is no problem, do not return JSON.
each problem should include the problem description and the method that can be used to handle the problem. to keep the data integrity.
the JSON format should be:
```json
[
  {{"problem": "describe the problem", "method": "method that can be used to handle the problem. to keep the data integrity"}}
]
```
if there is no problem, just output "no problem" only, without json.

"""


INVALID_VALUE_TEMPLATE_2 = """You are a data cleaning expert. Your task is to identify invalid or unreasonable values in the dataset based on variable descriptions, logic, and domain knowledge.

INPUT:
1. Data summary statistics: {data_describe}
2. Variable definitions: {variable_descriptions}
3. Domain context: {context_description}

INSTRUCTIONS:
- Focus ONLY on detecting invalid or unreasonable values
- Do NOT address missing values
- Apply logical reasoning and domain knowledge to identify problematic values
- For each identified problem, suggest a practical solution that preserves data integrity

OUTPUT FORMAT:
- If problems exist, return a JSON array of problems
- If no problems exist, simply return "No data quality issues detected"

JSON STRUCTURE:
```json
[
  {{
    "variable": "name of problematic variable",
    "problem": "precise description of the invalid/unreasonable value",
    "method": "specific correction method based on domain context"
  }}
]
```
"""

CLEANING_OPERATIONS_TEMPLATE_2 = """you are a data cleaning expert, you need to generate the cleaning operations for the data.

input data:
1. problem list: {problem_list}

your output should be:
the JSON format of the cleaning operations,if there is no problem, do not return JSON.
```json
[
  {{"problem": "describe the problem", "method": "method that can be used to handle the problem. methods based on the background knowledge."}}
]

if there is no problem, just output "no problem" only, without json.
"""

MISSING_VALUE_CODE_TEMPLATE_2 = """Please generate Python code for an in-depth exploratory analysis of missing values based on the provided missing value proportion data. Images will be saved directly in the current directory with filenames beginning with "data_cleaning_missing_value_". Please think through and complete the task step by step.

Please follow these steps:
1. Analyze the missing value proportion data to identify variables with missing values
2. Generate analysis code and visualization charts for each variable containing missing values
3. For each variable analysis, output the format: "Data analysis shows that the variable 'variable_name' has XX% missing values. We visualize the missing value situation for the 'variable_name' variable:"
4. Save all images directly to the current directory with filenames beginning with "data_cleaning_missing_value_"

Please use the provided missing value proportion data directly without recalculating.

For example:

Given missing value proportion data:
Age             0.130000
Income          0.050000
Education       0.000000
Occupation      0.175000
CSV file path: {csv_path}

Your answer would be:

From the missing value proportion data, we know that Age, Income, and Occupation have missing values, so we need to generate analysis code for these three variables
```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Read the data
data = pd.read_csv('{csv_path}')

# Generate chart and save
plt.figure(figsize=(10, 6))
# ... chart generation code ...
plt.savefig(f'data_cleaning_missing_value_Age.png')
plt.show()
plt.close()

result += 'Generated missing value analysis chart for the "Age" variable.\\n\\n'
print(result)

# Analyze Income variable
...

```

Now, the current situation is:
We know:
1. Data missing value proportions: {missing_ratio}
2. CSV file path: {csv_path}

Please complete your task:

"""

MISSING_VALUE_CLEANING_TEMPLATE_2 = """Task: Generate Missing Value Cleaning Operations

You are a data cleaning expert. Based on missing value analysis results, generate appropriate cleaning operations for each variable.

INPUT:
1. Missing value ratios: {missing_ratio}
2. Missing value analysis: {missing_analysis}
3. Data unit: {data_unit} (e.g., country-year, patient records, transactions)

INSTRUCTIONS:
- Provide specific handling methods for ALL variables, including when "no cleaning needed"
- Ensure cleaning operations align with the data unit structure (e.g., for country-year data, impute by country)
- You may group variables with identical treatment methods
- Consider these common scenarios:
  * High missingness + low relevance to target: Remove variable
  * High missingness in specific segments: Remove those segments
  * Missing completely at random: Mean/median imputation
  * Time-series data: Forward/backward fill or interpolation
  * Categorical data: Mode imputation or create "Missing" category
  * Correlated variables: Regression-based imputation
  * Domain-specific patterns: Custom logic based on context
- do not talk about any no operation needed variable.
- you should group the variables with the same operation method.

OUTPUT FORMAT:
JSON array of cleaning operations:
```json
[
  {{
    "variable": "variable name(s)",
    "operation": "remove/impute/transform/...",
    "method": "detailed description of how to implement the operation"
  }}
]
```
"""

DATA_INTEGRITY_CHECK_TEMPLATE_2 = """you are a data cleaning expert, you need to generate the data integrity check code for the data.

input data:
1. csv file path: {csv_path}

your output should be:
Python code for data integrity check,format as follows:
```python
import pandas as pd
data = pd.read_csv('{csv_path}')
result = ''
# check the data integrity
result += 'analysis result:...'
print(result)
```
"""

DATA_INTEGRITY_CLEANING_TEMPLATE_2 = """you are a data cleaning expert, you need to generate the data integrity cleaning operations for the data.

input data:
1. data integrity check result: {integrity_result}

your output should be:
the JSON format of the data integrity cleaning operations,if there is no problem, do not return JSON.
```json
[
  {{"problem": "describe the problem", "method": "method that can be used to handle the problem. methods based on the background knowledge."}}
]
```

if there is no problem, just output "no problem" only, without json.
"""

# 10. hypothesis验证代码生成
HYPOTHESIS_VALIDATION_CODE_TEMPLATE = """任务：hypothesis验证代码生成
任务描述：根据提供的hypothesis和verification method，生成用于验证hypothesis的 Python 代码。代码需要将分析结果存储在 result 变量中。

输入数据：
1. hypothesis内容: {hypothesis}
2. verification_method: {validation_method}
3. CSV文件路径: {csv_path}

输出数据：
用于验证hypothesis的 Python 代码，格式如下：
```python
import pandas as pd
data = pd.read_csv('csv路径')
result = ''
# 验证逻辑
result += '验证结果：...'
print(result)
```
"""

# 11. hypothesis验证结果分析
HYPOTHESIS_VALIDATION_ANALYSIS_TEMPLATE = """任务：hypothesis验证结果分析
任务描述：根据本地运行Python代码的结果，判断hypothesis是否成立,并生成新的hypothesis结论。

输入数据：
1. 验证结果: {validation_result}

输出数据：
JSON格式的分析结果：
```json
[
  {{
    "hypothesis": "hypothesis的内容",
    "verification_method": "hypothesis的verification method",
    "结论": "该hypothesis成立或不成立"
  }}
]
```
"""

DATA_CLEANING_FUNCTION_TEMPLATE_2 = """you are a data cleaning expert, you need to generate the data cleaning python script for the data.

input data:
1. csv file path: {csv_path}
2. context description: {context_description}
3. var_descriptions: {var_descriptions} # variable descriptions, including the column name, expected type, meaning, and value range.
4. check_unit: {check_unit} # whether to check and unify the units (e.g., True/False or specific requirements)
5. data_info: {data_info} # basic information of the data, such as df.info() and df.describe() outputs
6. cleaning_operations: {cleaning_operations} # specific cleaning operations to be executed
7. save_path: {save_path} # the path to save the cleaned data

your output should be:
a python script that can be run directly, and the cleaned data will be saved to the save_path.
"""


EDA_QUESTIONS_TEMPLATE_2 = """You are a data science consultant specializing in exploratory data analysis. Your task is to generate strategic EDA questions that will extract valuable insights from the dataset.

INPUT:
1. Problem description: {problem_description}
2. Data structure: {data_structure}
3. Data preview: {data_preview}

OBJECTIVES:
- Identify key patterns, relationships, and anomalies in the data
- Focus on features relevant to the target variable
- Discover insights that directly inform predictive modeling
- Validate assumptions about the data distribution and quality

REQUIREMENTS:
- Generate exactly 3 high-impact EDA questions
- Each question must address a distinct analytical aspect
- The questions should be more specific and actionable about the data,do not include any missing value or outlier analysis.
- Questions should be specific, actionable, and directly related to the problem
- Each question must include both the analytical objective and a suggested methodology
- Use the exact column names from the provided data preview
- Focus on statistical relationships and feature importance for prediction tasks

YOUR RESPONSE MUST BE:
A JSON array containing 3 objects, each with "question" and "action" fields. The "question" should describe what to analyze, and the "action" should outline the methodology.

```json
[
  {{
    "question": "[Specific, well-defined analytical question]",
    "action": "[Detailed methodology to answer the question, including specific visualization techniques or statistical methods]"
  }},
  {{
    "question": "[Specific, well-defined analytical question]",
    "action": "[Detailed methodology to answer the question, including specific visualization techniques or statistical methods]"
  }},
  {{
    "question": "[Specific, well-defined analytical question]",
    "action": "[Detailed methodology to answer the question, including specific visualization techniques or statistical methods]"
  }}
]
```
"""


EDA_CODE_TEMPLATE_2 = """You are a data science expert specializing in Exploratory Data Analysis. Your task is to generate comprehensive EDA code that analyzes the provided dataset and answers the specific question.

INPUT:
1. Dataset path: {csv_path}
2. Analysis question: {question}
3. Data structure: {data_structure}
4. Data preview: {data_preview}

REQUIREMENTS:
- Generate a complete, executable Python script
- Create relevant visualizations that help answer the question
- Save visualizations to eda_plots_{{question_short_name}}.png
- Ensure all plots are displayed using plt.show() or equivalent methods
- You only need to generate one image
- You must not generate more than one image
- the image must not be too large or complex
- desired_width_pixels = 512
- desired_height_pixels = 512
- dpi = 100 

Matplotlib代码生成规范 - 中文字体兼容
核心原则：生成的代码必须兼容中文字体设置
❌ 禁止使用的代码模式
python# 1. 禁止使用 sns.set() - 会重置所有matplotlib设置
sns.set(style="whitegrid")

# 2. 禁止使用 sns.set() 的任何全局设置
sns.set(context="notebook", style="darkgrid")
sns.set_theme()  # 也会重置设置

# 3. 禁止直接重置matplotlib设置
plt.rcdefaults()  # 除非立即重新设置中文字体
✅ 推荐使用的代码模式
python# 1. 使用 sns.set_style() 而不是 sns.set()
sns.set_style("whitegrid")  # 只设置样式，不重置字体

# 2. 使用 sns.set_palette() 设置颜色
sns.set_palette("husl")

# 3. 使用 with 语句进行临时设置
with sns.axes_style("darkgrid"):
    plt.plot(x, y)
    plt.show()

# 4. 直接在绘图函数中设置样式参数
sns.scatterplot(data=df, x='x', y='y', style='category')

# 5. 使用matplotlib原生样式
plt.style.use('seaborn-v0_8-whitegrid')  # 新版seaborn样式
生成代码的标准模板
python# 标准的matplotlib绘图代码模板
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

# 1. 样式设置（安全方式）
sns.set_style("whitegrid")  # 或其他样式
# sns.set_palette("husl")  # 如需要

# 2. 创建图形
fig, ax = plt.subplots(figsize=(10, 6))

# 3. 绘图代码
# ... 你的绘图逻辑 ...

# 4. 标签和标题设置
plt.title('图表标题')
plt.xlabel('X轴标签')
plt.ylabel('Y轴标签')

# 5. 布局和保存
plt.tight_layout()
plt.savefig('output.png', dpi=300, bbox_inches='tight')
plt.show()
具体的替代方案
替代 sns.set(style="whitegrid")
python# ❌ 错误方式
sns.set(style="whitegrid")

# ✅ 正确方式
sns.set_style("whitegrid")
替代 sns.set(context="notebook")
python# ❌ 错误方式
sns.set(context="notebook")

# ✅ 正确方式
sns.set_context("notebook")
替代复合设置
python# ❌ 错误方式
sns.set(style="whitegrid", context="notebook", palette="husl")

# ✅ 正确方式
sns.set_style("whitegrid")
sns.set_context("notebook")
sns.set_palette("husl")
Seaborn绘图函数的安全使用
python# 这些seaborn函数是安全的，不会重置字体设置
sns.scatterplot(data=df, x='x', y='y')
sns.lineplot(data=df, x='x', y='y')
sns.barplot(data=df, x='category', y='value')
sns.boxplot(data=df, x='category', y='value')
sns.heatmap(data=corr_matrix)
sns.pairplot(df)
sns.distplot(df['column'])
sns.violinplot(data=df, x='category', y='value')
特殊情况处理
当必须重置设置时
python# 如果必须使用会重置的函数，立即重新设置字体
plt.rcdefaults()
# 立即重新设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
使用上下文管理器
python# 推荐使用上下文管理器进行临时设置
with plt.style.context('seaborn-v0_8-whitegrid'):
    plt.plot(x, y)
    plt.title('中文标题')
    plt.show()
代码生成检查清单
生成matplotlib代码时，确保：

不使用 sns.set()
使用 sns.set_style() 替代
使用 sns.set_context() 和 sns.set_palette() 分别设置
避免使用 plt.rcdefaults() 除非立即重设字体
优先使用具体的绘图函数而不是全局设置

YOUR RESPONSE SHOULD BE:
```python
# Comprehensive EDA for: {question}
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Load dataset
df = pd.read_csv("{csv_path}")

# 3. Visualization (only one image)
# [your visualization code here]

# 4. Save visualizations
plt.savefig("eda_plots_{{question_short_name}}.png", dpi=300, bbox_inches='tight')
plt.show()
```
"""

EDA_ANALYSIS_TEMPLATE_2 = """Analyze the EDA result to answer the question and provide actionable insights for model development.

INPUTS:
1. Question: {question}
2. Analysis approach: {attempt}
3. Analysis results: {result}

OUTPUT REQUIREMENTS:
- Write in clear, technical
- Focus ONLY on statistically significant findings
- Prioritize insights directly applicable to feature engineering
- Identify specific variable relationships, patterns, or anomalies
- Quantify findings with precise metrics when available
- Suggest concrete next steps for model development
- Maximum 3-5 concise bullet points
- No explanations, background, or methodological discussion
"""

# 16. PCS评估代码生成
PCS_EVALUATION_TEMPLATE = """任务：PCS评估代码生成
任务描述：根据提供的结论，生成用于评估预测性、可计算性和稳定性的 Python 代码。代码可以包括分析、绘图等操作。代码应将分析结果和生成的图片路径列表存储在 result 变量中，并将图片保存在与 CSV 文件相同的目录下。保存图片时请使用 os.path.join 函数动态生成路径，避免直接硬编码路径。
请确保代码生成的图片不超过3张，图例标题都使用中文；
generated_plots 列表中只包含图片的完整路径字符串，不要包含其他信息。

输入数据：
1. 清理后的数据路径: {csv_path}
2. 待评估的结论: {conclusions}
3. 数据结构信息: {data_structure}
4. 数据变量预览: {data_preview}

输出数据：
Python代码，评估内容包括：
- 对结论的可预测性评估。可预测性指这些数据驱动的结果在某些新情境中重新出现
- 数据扰动后结论的稳定性
- 可视化生成的主观判断稳定性

格式如下：
```python
import pandas as pd
result = ''
...
# 评估代码
result = {{
    'text_result': '',  # 文本分析结果，包含数据的具体描述
    'generated_plots': []  # 图片路径列表，例如: ['path/to/plot1.png', 'path/to/plot2.png']
}}
print(result)
```
"""

# 17. 离散变量数值化需求判断
DISCRETE_VAR_CHECK_TEMPLATE = """任务：离散变量数值化需求判断
任务描述：根据提供的数据路径和问题描述，判断是否需要将数据中的离散变量数值化。

输入数据：
1. 清理后的数据路径: {csv_path}
2. 问题描述: {problem_description}

输出数据：
JSON格式的判断结果：
```json
[
  {{
    "需要数值化": true
  }}
]
```
"""

# 18. 离散变量数值化代码生成
DISCRETE_VAR_CODE_TEMPLATE = """任务：离散变量数值化代码生成
任务描述：根据提供的数据路径和离散变量列表，生成数值化的 Python 代码。

输入数据：
1. CSV路径: {csv_path}
2. 离散变量及其唯一值: {discrete_vars}

输出数据：
Python代码，用于数值化处理：
- 代码需将数据中的所有离散变量转换为数值变量
- 清理后的数据需保存为新的 CSV 文件，路径基于原始数据路径生成
```python
import pandas as pd
data = pd.read_csv('路径')
# 数值化代码逻辑
data.to_csv('new_file.csv', index=False)
```
"""

# 数据清理任务列表生成
TASK_LIST_TEMPLATE = """任务：数据清理任务列表生成
任务描述：在正式执行数据清理任务之前，你需要首先根据提供的数据科学项目描述、数据背景描述、观测单位、数据变量描述和设计的hypothesis，生成一个与数据清理相关的任务顺序列表。

可选的任务类型（仅从以下选项中选择）：
- Dimension Analysis
- Invalid Value Analysis
- Missing Value Analysis
- Data Integrity Analysis

注意：
- 只需列出task_name，无需添加额外描述
- 严格按照上述任务类型的文字描述选择
- 每个任务只需包含"task_name"字段
- 按照执行顺序排列任务，生成的任务列表将用于指导后续数据清理操作

输入数据：
1. 数据科学项目描述: {problem_description}
2. 数据背景描述: {context_description}
3. 观测单位: {check_unit}
4. 数据变量描述: {var_json}

输出数据：
请严格按照以下JSON格式输出任务列表：
```json
[
  {{"task_name": "Dimension Analysis"}},
  {{"task_name": "Invalid Value Analysis"}},
  {{"task_name": "Missing Value Analysis"}},
  {{"task_name": "Data Integrity Analysis"}}
]
```
"""

# 19. EDA总结生成
EDA_SUMMARY_TEMPLATE = """任务：生成EDA分析总结
任务描述：根据已完成的EDA问题及其结论，生成一个全面的探索性数据分析总结报告。

输入数据：
1. EDA问题及结论列表: {eda_results}
2. 数据科学项目描述: {problem_description}

输出要求：
1. 总结需要包含以下内容：
   - 数据探索的主要发现
   - 各个变量之间的关键关系
   - 对后续建模的启示
2. 使用专业但易懂的语言
3. 确保总结与项目目标相关
5. 采用连贯的段落形式，而不是列表或JSON格式
6. 总结应该是一段完整的叙述性文本

输出格式示例：
通过对数据的探索性分析，我们发现了以下关键insights：[主要发现]。在变量关系方面，[描述重要的变量关系]。这些发现对后续建模有重要启示，[建模相关建议]。
""" 