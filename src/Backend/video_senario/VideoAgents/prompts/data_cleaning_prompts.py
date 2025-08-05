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

# 1. Data Loading and Validation
DATA_LOADING_TEMPLATE = """Task: Data Loading and Validation
Task Description: Check if data is correctly loaded by comparing the first 10 rows with random 10 rows to confirm data consistency.

Input Data:
1. First ten rows of data: {first_10_rows}
2. Random ten rows of data: {random_10_rows}

Output Data:
Confirm whether data is correctly loaded, provided in text format.
"""

# 2. Data Dimension Check Code Generation
DIMENSION_CHECK_TEMPLATE = """Task: Data Dimension Check Code Generation
Task Description: Generate Python code to check data dimensions. Based on existing scientific project description, data background description, observation units, and data variable descriptions, check if data dimensions meet expectations, identify any logical issues that contradict the data background, and verify if the actual number of years in the data exceeds the range described in the data background. Store all analysis results in the result variable, which should include data analysis information rather than just text conclusions.

Input Data:
1. CSV file path: {csv_path}
2. Data background information: {context_description}

Output Data:
Python code in the following format:
```python
import pandas as pd
data = pd.read_csv('path')
result = ""
# Code to check dimensions
print(result)
```
"""

DIMENSION_ANALYSIS_TEMPLATE_2 = """You should conduct dimension analysis based on the result and background knowledge.

Input Data:
1. Result: {result}
2. Background knowledge: {context_description}

Your Output Should Be:
If there are problems with the data dimension, return the JSON format of the problem. If there is no problem, do not return JSON.
Each problem should include the problem description and the method that can be used to handle the problem to keep data integrity.
The JSON format should be:
```json
[
  {{"problem": "describe the problem", "method": "method that can be used to handle the problem to keep data integrity"}}
]
```
If there is no problem, just output "no problem" only, without JSON.

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

CLEANING_OPERATIONS_TEMPLATE_2 = """You are a data cleaning expert. You need to generate cleaning operations for the data.

Input Data:
1. Problem list: {problem_list}

Your Output Should Be:
The JSON format of the cleaning operations. If there is no problem, do not return JSON.
```json
[
  {{"problem": "describe the problem", "method": "method that can be used to handle the problem. Methods based on background knowledge."}}
]

If there is no problem, just output "no problem" only, without JSON.
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
- Keep responses concise and focused
- If using headings, use maximum level 4 headings (####) only when necessary

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

DATA_INTEGRITY_CHECK_TEMPLATE_2 = """You are a data cleaning expert. You need to generate data integrity check code for the data.

Input Data:
1. CSV file path: {csv_path}

INSTRUCTIONS:
- Keep responses concise and focused
- If using headings, use maximum level 4 headings (####) only when necessary

Your Output Should Be:
Python code for data integrity check, format as follows:
```python
import pandas as pd
data = pd.read_csv('{csv_path}')
result = ''
# Check the data integrity
result += 'Analysis result:...'
print(result)
```
"""

DATA_INTEGRITY_CLEANING_TEMPLATE_2 = """You are a data cleaning expert. You need to generate data integrity cleaning operations for the data.

Input Data:
1. Data integrity check result: {integrity_result}

INSTRUCTIONS:
- Keep responses concise and focused
- If using headings, use maximum level 4 headings (####) only when necessary

Your Output Should Be:
The JSON format of data integrity cleaning operations. If there is no problem, do not return JSON.
```json
[
  {{"problem": "describe the problem", "method": "method that can be used to handle the problem. Methods based on background knowledge."}}
]
```

If there is no problem, just output "no problem" only, without JSON.
"""

# 10. Hypothesis Validation Code Generation
HYPOTHESIS_VALIDATION_CODE_TEMPLATE = """Task: Hypothesis Validation Code Generation
Task Description: Based on the provided hypothesis and verification method, generate Python code to validate the hypothesis. The code needs to store analysis results in the result variable.

Input Data:
1. Hypothesis content: {hypothesis}
2. Verification method: {validation_method}
3. CSV file path: {csv_path}

Output Data:
Python code for hypothesis validation, format as follows:
```python
import pandas as pd
data = pd.read_csv('csv_path')
result = ''
# Validation logic
result += 'Validation result:...'
print(result)
```
"""

# 11. Hypothesis Validation Result Analysis
HYPOTHESIS_VALIDATION_ANALYSIS_TEMPLATE = """Task: Hypothesis Validation Result Analysis
Task Description: Based on the results of locally running Python code, determine whether the hypothesis holds and generate new hypothesis conclusions.

Input Data:
1. Validation result: {validation_result}

Output Data:
JSON format analysis result:
```json
[
  {{
    "hypothesis": "content of the hypothesis",
    "verification_method": "verification method of the hypothesis",
    "conclusion": "the hypothesis is valid or invalid"
  }}
]
```
"""

# 12. Data Cleaning Function Generation
DATA_CLEANING_FUNCTION_TEMPLATE = """Task: Data Cleaning Function Generation
Task Description: Generate a data cleaning Python function based on the provided list of cleaning operations. For data imputation, pay attention to the imputation logic. For example, for country-year data, imputation should be performed by country for each variable. The function should allow custom settings for tool function parameters of each operation item.

Input Data:
1. CSV file path: {csv_path}
2. Data background description: {context_description}
3. Variable descriptions: {var_descriptions}
4. Data unit: {check_unit}
5. Data information: {data_info}
6. Cleaning operations list: {cleaning_operations}

Available Tool Functions:
{tools}

Tool Function Descriptions:
{tool_descriptions}

Output Requirements:
Implement a data processing function with multiple optional parameters that meets the following functional requirements:
- Tool functions are already imported by default, your code does not need to re-import.
- The function should be able to call predefined tool functions for data processing and can extend to implement other processing functions when necessary. After each tool function call, use a variable to receive the returned dataframe to ensure data processing continuity.
- The function needs to distinguish between necessary data cleaning steps and optional data preprocessing steps. Data integrity processing has priority, followed by data cleaning, and finally data preprocessing.
- Control the execution of various processing operations through boolean parameters
- For calls to functions fill_missing and handle_outliers, allow custom parameter settings through parameter dictionaries
- Processed data file storage path rules:
  - Location: 'clean_dataset' subdirectory under the original file directory (create if it doesn't exist)
  - Example: Original file '/path/data.csv' -> Processed file '/path/clean_dataset/cleaned_data.csv'
  - Note: Dataset saving operation should be performed after function call, not implemented inside the function
- Must include optional parameter `remove_with_missing`: Controls whether to remove rows that still contain missing values from the dataset after all data cleaning operations are completed according to data structure. This parameter defaults to True, and when set to True will generate a dataset completely without missing values.
- Must include optional parameter `convert_categorical`: Controls whether to convert categorical variables to numerical encoding. Preferably use categorical encoding, do not save original columns, and do not need to transform variables that need to be predicted.
- Function parameter naming should avoid conflicts with tool function parameters to prevent parameter conflicts
- Directly call the function at the end of the code, do not use if __name__ == "__main__", store the dataset in the calling part and store the dataset address in the result variable
- The function should return the processed DataFrame
- According to operation items, if several variables have the same method for fill_missing or handle_outliers operations, merge these variables into variable groups.
- The boolean parameters of fill_missing and handle_outliers control whether to perform filling and outlier handling, fill_missing_params and outlier_params are dictionary parameters, in the calling part fill methods and thresholds according to suggested methods of operation items.
- The strategy parameter of handle_outliers defaults to clip
- If there are ID type variables in the dataset, please do not delete them

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

DATA_CLEANING_FUNCTION_TEMPLATE_2 = """You are a data cleaning expert. You need to generate a data cleaning Python script for the data.

Input Data:
1. CSV file path: {csv_path}
2. Context description: {context_description}
3. Variable descriptions: {var_descriptions} # Variable descriptions, e.g., column names, expected types, meanings, value ranges, etc.
4. Check unit: {check_unit} # Whether unit checking and unification is needed (e.g., True/False or specific requirements)
5. Data info: {data_info} # Basic information about the data, e.g., output from df.info() and df.describe()
6. Cleaning operations: {cleaning_operations} # List or description of specific cleaning operations to execute
7. Save path: {save_path} # Save path for cleaned data, must save at this path

IMPORTANT REQUIREMENTS:
- DO NOT use any try-except blocks in the generated code
- DO NOT include any error handling with try-catch statements
- The code should be direct and straightforward without exception handling
- If operations might fail, use simple conditional checks instead of try-except
- When processing multiple cleaning operations, optimize for efficiency by:
  * Loading the data only once at the beginning
  * Applying all cleaning operations in logical sequence
  * Grouping related operations on same columns together
  * Saving the data only once at the end
- Generate clean, readable code with clear comments for each operation
- Ensure operations are applied in the correct order to avoid conflicts

Your Output Should Be:
A Python script that can be run directly, and the cleaned data will be saved to the save_path.
The script must not contain any try-except statements.
For multiple operations, generate an optimized single script rather than separate code blocks.
"""


# 13. EDA Question Generation
EDA_QUESTIONS_TEMPLATE = """Task: Exploratory Data Analysis (EDA) Question Generation
Task Description: Generate specific exploratory data analysis questions based on cleaned data and data science project descriptions.

Notes:
1. Do not propose more than three questions.
2. For prediction problems, questions can involve data feature extraction, such as analyzing correlations between all relevant variables and response variables.
3. Since the provided dataset is a cleaned dataset, column names in EDA questions may have changed. Please pay attention to using correct column names.

Input Data:
1. Data science project description: {problem_description}
2. Cleaned data structure information: {data_structure}
3. Cleaned data variable preview: {data_preview}

Output Data:
JSON format EDA question list (JSON format, including questions and brief descriptions):
```json
[
  {{
    "Question 1": "Question 1 description",
    "Conclusion": "Awaiting further resolution"
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
- Keep responses concise and focused
- Focus ONLY on statistically significant findings
- Prioritize insights directly applicable to feature engineering
- Identify specific variable relationships, patterns, or anomalies
- Quantify findings with precise metrics when available
- Suggest concrete next steps for model development
- Maximum 3-5 concise bullet points
- No explanations, background, or methodological discussion
- If using headings, use maximum level 4 headings (####) only when necessary
"""

# 16. PCS Evaluation Code Generation
PCS_EVALUATION_TEMPLATE = """Task: PCS Evaluation Code Generation
Task Description: Generate Python code to evaluate predictability, computability, and stability based on provided conclusions. The code can include analysis, plotting, and other operations. The code should store analysis results and generated image path lists in the result variable, and save images in the same directory as the CSV file. When saving images, use the os.path.join function to dynamically generate paths and avoid direct hardcoded paths.
Ensure that the code generates no more than 3 images, with all legend titles in English.
The generated_plots list should only contain complete image path strings, no other information.

Input Data:
1. Cleaned data path: {csv_path}
2. Conclusions to be evaluated: {conclusions}
3. Data structure information: {data_structure}
4. Data variable preview: {data_preview}

Output Data:
Python code, evaluation content includes:
- Predictability assessment of conclusions. Predictability refers to these data-driven results reappearing in some new contexts
- Stability of conclusions after data perturbation
- Stability of subjective judgments generated by visualization

Format as follows:
```python
import pandas as pd
result = ''
...
# Evaluation code
result = {{
    'text_result': '',  # Text analysis results, including specific descriptions of data
    'generated_plots': []  # Image path list, e.g.: ['path/to/plot1.png', 'path/to/plot2.png']
}}
print(result)
```
"""

# 17. Discrete Variable Numeralization Need Assessment
DISCRETE_VAR_CHECK_TEMPLATE = """Task: Discrete Variable Numeralization Need Assessment
Task Description: Based on the provided data path and problem description, determine whether discrete variables in the data need to be numeralized.

Input Data:
1. Cleaned data path: {csv_path}
2. Problem description: {problem_description}

Output Data:
JSON format judgment result:
```json
[
  {{
    "needs_numeralization": true
  }}
]
```
"""

# 18. Discrete Variable Numeralization Code Generation
DISCRETE_VAR_CODE_TEMPLATE = """Task: Discrete Variable Numeralization Code Generation
Task Description: Generate numeralization Python code based on provided data path and discrete variable list.

Input Data:
1. CSV path: {csv_path}
2. Discrete variables and their unique values: {discrete_vars}

Output Data:
Python code for numeralization processing:
- Code needs to convert all discrete variables in the data to numerical variables
- Cleaned data needs to be saved as a new CSV file, with path generated based on original data path
```python
import pandas as pd
data = pd.read_csv('path')
# Numeralization code logic
data.to_csv('new_file.csv', index=False)
```
"""

# Data Cleaning Task List Generation
TASK_LIST_TEMPLATE = """Task: Data Cleaning Task List Generation
Task Description: Before formally executing data cleaning tasks, you need to first generate a task sequence list related to data cleaning based on the provided data science project description, data background description, observation units, data variable descriptions, and designed hypothesis.

Optional Task Types (select only from the following options):
- Dimension Analysis
- Invalid Value Analysis
- Missing Value Analysis
- Data Integrity Analysis

Notes:
- Only list task_name, no need to add additional descriptions
- Strictly select according to the above task type text descriptions
- Each task only needs to include the "task_name" field
- Arrange tasks in execution order, the generated task list will be used to guide subsequent data cleaning operations

Input Data:
1. Data science project description: {problem_description}
2. Data background description: {context_description}
3. Observation unit: {check_unit}
4. Data variable description: {var_json}

Output Data:
Please strictly output the task list in the following JSON format:
```json
[
  {{"task_name": "Dimension Analysis"}},
  {{"task_name": "Invalid Value Analysis"}},
  {{"task_name": "Missing Value Analysis"}},
  {{"task_name": "Data Integrity Analysis"}}
]
```
"""

# 19. EDA Summary Generation
EDA_SUMMARY_TEMPLATE = """Task: Generate EDA Analysis Summary
Task Description: Generate a comprehensive exploratory data analysis summary report based on completed EDA questions and their conclusions.

Input Data:
1. EDA questions and conclusions list: {eda_results}
2. Data science project description: {problem_description}

Output Requirements:
1. The summary needs to include the following content:
   - Main findings from data exploration
   - Key relationships between variables
   - Insights for subsequent modeling
2. Use professional but understandable language
3. Ensure the summary is relevant to project objectives
4. Use concise content with maximum heading level 4 (####) when necessary
5. Adopt coherent paragraph format rather than list or JSON format
6. The summary should be a complete narrative text

Output Format Example:
Through exploratory data analysis, we discovered the following key insights: [main findings]. Regarding variable relationships, [describe important variable relationships]. These findings provide important insights for subsequent modeling, [modeling-related recommendations].
""" 