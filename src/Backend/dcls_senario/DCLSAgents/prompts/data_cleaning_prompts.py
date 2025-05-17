DATA_CLEANING_TEMPLATE ="""
the information we know:
1. the problem description: {problem_description}
2. the context description: {context_description}
"""
# DATA_CLEANING_TEMPLATE = """你是一个数据科学专家，专注于清理数据集清洗、创建数据清理的操作项函数以及EDA分析。你将根据我的数据和我要完成的任务列出一个或者多个数据清理的操作项，并进行EDA分析。你的所有任务将使用中文完成。

# 1. 数据科学名词的定义：
#    1. 数据清洗：
#       数据清洗是修改数据的过程，使其尽可能明确，并能被你的计算机正确解释。每个数据集可能有许多不同的清洁版本，因此建议编写一个函数，让你可以创建多个清洁数据集的替代版本，从而使你能够研究你的下游结果是否对你所做的任何判断保持稳定。
#    2. 预处理：
#       预处理是将清洁数据修改为适合应用于某个特定算法或分析的过程。与数据清洗一样，预处理涉及进行判断，建议编写一个带有各种判断选项作为参数的预处理函数，使你能够研究下游结果对预处理判断的稳定性。
#    3. 操作项：
#       数据清洗和预处理的操作项是你对数据进行清洗和预处理所做的独特修改。这些操作项是根据从背景领域信息、数据收集过程以及对数据的初步探索中发现的问题和模糊性确定的。每个数据集都有自己独特的一组操作项，每个操作项可能包括多个判断选项。
#    4. 探索性和解释性数据分析：
#       探索性数据分析(EDA)是指探索数据以识别其包含的模式和关系。我们建议使用基于问答的工作流程（在领域知识和项目目标的指导下）来创建各种相关的"粗略"的数据可视化和数值汇总。在识别出最有趣和相关的模式和趋势后，解释性数据分析则是修饰图表的过程，用于向外部观众传达特别有洞察力的探索性发现。

# 2. 相关技术分析说明和可能的操作方法：
#    1. 针对识别无效或不一致值的技术：
#       1. 探索方法：
#          • 查看数据中随机选择的行以及连续的行（例如，前10行和后10行）。你看到什么意外的东西了吗？
#          • 打印出每个数值列的最小值（最小值）、最大值（最大值）和平均值。根据你对变量测量内容的理解，这些值是否有意义？
#          • 查看每个数值变量分布的直方图。这可以帮助你直观地识别任何奇怪或不一致的值。
#          • 打印出分类变量的唯一值（去除重复的取值）。查看这些类别有意义吗？
#    2. 针对识别和处理缺失值的技术：
#       1. 识别缺失值的探索方法：
#          • 打印每个数值列的最小值和最大值。这些值在任何方面是否看起来异常？
#          • 打印分类变量的唯一值。是否有任何分类值对应于缺失值（例如，是否有"unknown"或"missing"等级别）？
#          • 制作每个连续变量的直方图，以揭示异常值（例如，如果有大量的"99"值，那么这些值可能对应于缺失值）。
#          • 打印每列中缺失值的数量（和比例）。
#          • 可视化缺失数据的模式（例如，使用热图）。
#       2. 预处理缺失值的操作项：
#          • 基于领域知识和数据本身的数据单位对缺失值用特定方法插补。
#          • 移除缺失值比例超过特定阈值的变量/列。这个阈值需要根据具体数据科学情况判断。
#    3. 针对数据完整性检查的技术：
#      1. 识别数据是否完整的技术:
#          • 检查每个观测单位在数据中恰好出现一次。 
#          • 检查数据中的行数是否符合你的预期，例如，基于数据文档。如果行数少于预期，这可能表明你的数据不完整。
#      2. 预处理数据完整性的操作项：
#          • 如果数据中缺少任何观测单位，则将其添加到数据中，并用缺失值填充未知条目。
#    4. 常见的数据探索性分析（EDA）方法：
#       • 单个变量的典型汇总值：平均值和中位数
#       • 直方图和箱线图
#       • 变量的"离散程度"：方差和标准差
#       • 两个变量之间的线性关系：协方差和相关系数
#       • 散点图
#       • 对数尺度
#       • 相关系数热图

# 3. 在审查数据的背景和领域信息过程中，我们分析出以下信息：
#    数据科学项目描述: {problem_description}
#    数据背景描述: {context_description}
#    观测单位: {check_unit}
#    数据变量描述: {var_json}
#    设计的hypothesis: {hyp_json}
# """

# 1. 数据加载与验证
DATA_LOADING_TEMPLATE = """任务：数据加载与验证
任务描述：检查数据是否正确加载，比较前10行与随机10行，确认数据一致性。

输入数据：
1. 数据的前十行内容: {first_10_rows}
2. 数据的随机十行内容: {random_10_rows}

输出数据：
确认数据是否正确加载，以文本格式提供。
"""

# 2. 数据维度检查代码生成
DIMENSION_CHECK_TEMPLATE = """任务：数据维度检查代码生成
任务描述：生成用于检查数据维度的Python代码，根据已有的科学项目描述、数据背景描述、观测单位、数据变量描述检查数据维度是否符合预期，以及是否有违背数据背景的逻辑问题，数据的真实年份数量是否超出数据背景描述的范围。请把所有分析结果存在变量 result 中，result变量中最好包含数据的分析信息而不是只有文字结论。

输入数据：
1. CSV文件路径: {csv_path}
2. 数据背景信息: {context_description}

输出数据：
Python代码，格式如下：
```python
import pandas as pd
data = pd.read_csv('路径')
result = ""
# 检查维度的代码
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
- All responses must be in English

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

# 12. 数据清理函数生成
DATA_CLEANING_FUNCTION_TEMPLATE = """任务：数据清理函数生成
任务描述：根据提供的清理操作项列表，生成一个数据清理 Python 函数。对于插补数据，请注意插补的逻辑。比如对于 国家-年的数据应该按照国家对每个变量进行插补。函数应该允许对每个操作项的工具函数参数进行自定义设置。

输入数据：
1. CSV文件路径: {csv_path}
2. 数据背景描述: {context_description}
3. 变量描述: {var_descriptions}
4. 数据单位: {check_unit}
5. 数据信息: {data_info}
6. 清理操作项列表: {cleaning_operations}

可用的工具函数：
{tools}

工具函数描述：
{tool_descriptions}

输出要求：
实现一个具有多个可选参数的数据处理函数，需满足以下功能要求：
- 工具函数已经默认导入，你给出的代码不需要重新import。
- 函数应能调用预定义的工具函数进行数据处理，必要时可扩展实现其他处理函数。每次调用工具函数后需要使用变量接收返回的数据框，以保证数据处理的连续性。
- 函数需区分必要的数据清理步骤和可选的数据预处理步骤。数据完整性处理优先执行，随后执行数据清理，最后执行数据预处理
- 通过布尔类型参数控制各项处理操作的执行
- 对于函数fill_missing和handle_outliers的调用，应该允许通过参数字典自定义其参数设置
- 处理后的数据文件存储路径规则：
  - 位置：原始文件目录下的 'clean_dataset' 子目录（不存在则创建）
  - 示例：原始文件 '/path/data.csv' -> 处理后文件 '/path/clean_dataset/cleaned_data.csv'
  - 注意：数据集的保存操作应在函数调用后进行，而不是在函数内部实现
- 必须包含可选参数 `remove_with_missing`：控制是否在所有数据清理操作完成后，按照数据结构移除数据集中仍然包含缺失值的行。此参数默认为 True，设置为 True 时将生成一个完全没有缺失值的数据集。
- 必须包含可选参数 `convert_categorical`：控制是否将分类变量转换为数值编码，编码方式最好使用类别编码，不保存原始列，不需要对需要预测的变量进行转换。
- 函数参数命名需避免与工具函数参数重名，以防止参数冲突
- 在代码的最后直接调用该函数，不要使用if __name__ == "__main__"，在调用部分储存数据集，并将数据集地址储存在result变量中
- 函数应返回处理后的DataFrame
- 根据操作项，如果对某几个变量有相同方法的fill_missing或者handle_outliers操作，则把这几个变量合并成变量组。
- fill_missing和handle_outliers的布尔值参数控制是否进行填充和异常值处理，fill_missing_params和outlier_params是字典参数，在调用部分根据操作项的建议方法进行填充方法和阈值。
- handle_outliers的strategy参数默认是clip
- 如果数据集中存在ID type的变量，请不要删除

格式示例：
```python
def clean_data(data_path, 
    [可选的操作项参数],
    remove_with_missing=True,
    convert_categorical=True,
    [工具函数的参数字典，fill_missing_params=None, outlier_params=None]
  ):
    data = pd.read_csv(data_path)
    
    [根据操作项编写相关代码]
    
    # 数据清理步骤
    if fill_missing:
        for method, columns in fill_missing_params.items():
            if isinstance(columns, str):
                columns = [columns]
            params = {{'method': method}}
            data = fill_missing_values_tools(data, target_columns=columns, **params)

    if handle_outliers:
        for group_params in outlier_params:
            method = group_params.get('method', 'iqr')
            columns = group_params.get('columns', [])
            sensitivity = group_params.get('sensitivity', 'medium')
            params = {{'method': method, 'strategy': 'clip', 'sensitivity': sensitivity}}
            data = handle_outliers_tools(data, target_columns=columns, **params)
    
    [处理缺失值和数值化离散数据]
    
    return data

import os
data_path = [csv文件路径]

[按照操作项中的缺失值填补和异常值处理合并同类操作定义多个变量组group1,group2,group3...]
fill_missing_params = [根据操作项填充默认参数]
outlier_params = [根据操作项填充method参数,请注意，这个参数不含有clip]

'''
例子（这部分是给你参考，生成的代码中不要出现：
group1 = ['GDP', 'CPI', '人均收入']
group2 = ['失业率', '通货膨胀率']
group3 = ['人口数量']
group = ['GDP', 'CPI']

fill_missing_params = {{
    'bfill': group_linear,
    'ffill': group_ffill,
    'mean': group_mean
}}

outlier_params = [
  {{'method': 'iqr', 'columns': group_outliers}}
]
'''


cleaned_data = clean_data(
    data_path=data_path,
    [可选的操作项参数],
    remove_with_missing=True,
    convert_categorical=True,
    [工具函数的参数字典，fill_missing_params=None, outlier_params=None]
)

# 保存清理后的数据集
output_dir = os.path.join(os.path.dirname(data_path), 'clean_dataset')
os.makedirs(output_dir, exist_ok=True)
[数据集的命名不仅要体现函数参数，也要体现工具函数参数]
output_path = os.path.join(output_dir, [生成的文件名])
cleaned_data.to_csv(output_path, index=False)
result = output_path
```
"""

DATA_CLEANING_FUNCTION_TEMPLATE_2 = """you are a data cleaning expert, you need to generate the data cleaning python script for the data.

input data:
1. csv file path: {csv_path}
2. context description: {context_description}
3. var_descriptions: {var_descriptions} # 变量描述，例如列名、预期类型、含义、取值范围等
4. check_unit: {check_unit} # 是否需要检查和统一单位 (例如 True/False 或具体要求)
5. data_info: {data_info} # 数据的基本信息，例如 df.info() 和 df.describe() 的输出
6. cleaning_operations: {cleaning_operations} # 需要执行的具体清洗操作列表或描述
7. save_path: {save_path} # 清洗后数据的保存路径

your output should be:
a python script that can be run directly, and the cleaned data will be saved to the save_path.
"""


# 13. EDA问题生成
EDA_QUESTIONS_TEMPLATE = """任务：数据探索性分析（EDA）问题生成
任务描述：根据清理后的数据和数据科学项目描述，生成具体的探索性数据分析问题。

注意：
1. 不要提出超过三个问题。
2. 对于预测问题，问题可以涉及数据的特征提取，比如分析所有相关变量与响应变量的相关关系。
3.由于提供的数据集是清理后的数据集，eda问题中的列名可能存在一定的变化，请注意使用正确的列名。

输入数据：
1. 数据科学项目描述: {problem_description}
2. 清理后的数据结构信息: {data_structure}
3. 清理后的数据变量预览: {data_preview}

输出数据：
JSON格式的EDA问题列表（JSON 格式，包含问题及其简要描述）：
```json
[
  {{
    "问题1": "问题1描述",
    "结论": "等待后续解决"
  }}
]
```
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
- Questions must be in English
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
- Write in clear, technical English
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