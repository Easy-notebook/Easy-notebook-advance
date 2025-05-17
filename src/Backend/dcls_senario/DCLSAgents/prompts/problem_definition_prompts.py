PROBLEM_DEFINITION_TEMPLATE = """你是一个数据科学专家，专注于审查数据的背景和领域信息。在接下来的对话中，请用英文完成。
"""


VARIABLE_ANALYSIS_TEMPLATE_2 = """Please perform variable analysis on the data. Analyze each variable in the data, understand their meaning, and give the expected unit, expected variable type, and expected value range of each variable, and output it in markdown table format.
Data Science Project: {problem_description}
Data Background Description: {context_description}
Data Variable Preview: {variable_info}
First Five Rows of Data: {data_preview}


Example, your answer should be like this:
| Variable Name | Data Type | Specific Type | Unit |  Description |
|---------------|-----------|--------------|------|------------------------|-------------|
| age | Numeric | int | years | Age of the participant |
| income | Numeric | float | USD | Annual income of the participant |
| education | Categorical | string | none |Highest education level achieved |
| heart_rate | Numeric | float | bpm | Resting heart rate measurement |
| test_score | Numeric | int | points | Score achieved on assessment test |

"""

VARIABLE_ANALYSIS_TRANSFORM_TEMPLATE = """Your job is to transform the markdown table text into JSON format:
note that you should not use any other text, just output the JSON format.

For example, when you receive the following text:
| Variable Name | Data Type | Specific Type | Unit | Description |
|---------------|-----------|--------------|------|------------------------|-------------|
| age | Numeric | int | years |Age of the participant |
| year | Numeric | int | years | Year of the participant |
|...|...|...|...|...|...|

Your answer should be like this:
```json
[
  {{"name": "age", "type": "Numeric", "specific_type": "int", "unit": "years", "description": "Age of the participant"}},
  ...
]
```

Now, please transform the following markdown table text into JSON format:
{response}

"""


OBSERVATION_UNIT_TEMPLATE_2 = """Analyze the following data to identify the observation unit and the response variable (target variable to be predicted).

Problem: {problem_description}
Context: {context_description}
Variables: {variable_info}
Data Preview: {data_preview}

Output format:
1. Just one sentence, describe the observation unit and the response variable.
2. should not use any other text, just output the sentence.
3. should mention the response variable in the sentence.
4. should mention the observation unit in the sentence.

Example output:
The observation unit of the data is house, and each row represents an independent property. The response variable to be predicted is house price. From the problem description and variable list, we can see that we need to predict the market price of a house based on its various characteristics.
"""

VARIABLE_RELEVANCE_TEMPLATE_2 = """Please judge the relevance of variables in the data and evaluate whether each variable is relevant to the current data science project.
Variable description: {variable_descriptions}
Please provide an analysis of each variable in the format of a markdown table to explain whether each variable supports the project goals.
Summarize which variables are strongly correlated, which variables are weakly correlated, and which variables can be removed.
Note that you cannot use titles, and output directly in the form of tables and summaries.

For example, your answer:
| variable_name | strong relevance| weak relevance| could_be_removed | why |
|---------------|----------------------|-------------|-------------|-------------------|
| variable_1    | ✅ | ❌ | ❌ |...|
| variable_2    | ❌ | ❌ | ✅ |...|
| ...           |  ...  | ...         | ...         | ...               |

So, according to my thinking, we should pay more attention to the variables: variable_1, variable_2, ...
and we should remove the variables: variable_3, variable_4, ...

"""

VARIABLE_RELEVANCE_TRANSFORM_TEMPLATE = """Please transform the following text into JSON format:

For example, when you receive the following text:
```
| variable_name | strong relevance| weak relevance| could_be_removed | why |
|---------------|----------------------|-------------|-------------|-------------------|
| variable_1    | ✅ | ❌ | ❌ |...|
| variable_2    | ❌ | ❌ | ✅ |...|
| ...           |  ...  | ...         | ...         | ...               |
So, according to my thinking, we should pay more attention to the variables: variable_1, variable_2, ...
and we should remove the variables: variable_3, variable_4, ...
```

Your answer should be like this:
```json
{
  "strong_relevance": ["variable_1", "variable_2", ...],
  "weak_relevance": ["variable_3", "variable_4", ...],
  "could_be_removed": ["variable_5", "variable_6", ...]
}
```

Now, please transform the following text into JSON format:
{response}

"""


CODE_GENERATION_FOR_COULD_BE_REMOVED_VARIABLES_TEMPLATE = """Please generate code to remove variables that are not relevant to the project.
Note that you should not use any other text, just output the code.
You Operate FIle Path Is {csv_file_path}
And The Output CSV File Should Be {csv_output_path}
the variables that you should remove are: {variables_to_remove}

Now, please generate the code:
"""
