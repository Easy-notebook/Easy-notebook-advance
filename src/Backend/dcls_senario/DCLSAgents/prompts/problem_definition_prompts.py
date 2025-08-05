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
5. could not use any title markdown format, you can use quote to describe the observation unit and the response variable.

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

# Multi-Answer Variable Semantic Analysis Template
VARIABLE_SEMANTIC_MULTI_ANALYSIS_TEMPLATE = """Please perform comprehensive variable semantic analysis for the data science project. Analyze the data systematically and provide multiple targeted answers.

Data Science Project: {problem_description}
Data Background Description: {context_description}
Data Variable Preview: {variable_info}
First Five Rows of Data: {data_preview}

Provide your analysis in the following JSON structure with multiple focused answers:

{{
  "variable_semantics": {{
    "question": "What is the semantic meaning and business context of each variable?",
    "answer": "[Detailed markdown table with Variable Name, Data Type, Specific Type, Unit, Business Meaning, Expected Range]",
    "reasoning": "Analysis based on variable names, data preview, and business context (max 15 words)"
  }},
  "observation_unit": {{
    "question": "What is the observation unit and target variable in this dataset?",
    "answer": "[One clear sentence describing observation unit and response variable]",
    "reasoning": "Based on problem description and data structure analysis (max 10 words)"
  }},
  "variable_quality": {{
    "question": "What are the data quality issues for each variable?",
    "answer": "[Assessment of missing values, outliers, encoding issues, data consistency]",
    "reasoning": "Quality evaluation from data preview and expected patterns (max 12 words)"
  }},
  "variable_relevance": {{
    "question": "Which variables are most relevant to the project objective?",
    "answer": "[Markdown table: Variable Name, Strong Relevance, Weak Relevance, Could Remove, Justification]",
    "reasoning": "Relevance assessment based on project goals and variable semantics (max 12 words)"
  }},
  "domain_validation": {{
    "question": "Are the variable interpretations consistent with domain knowledge?",
    "answer": "[Validation of semantic accuracy, business logic, measurement units, value ranges]",
    "reasoning": "Domain expertise validation of variable meanings and constraints (max 10 words)"
  }}
}}

Ensure each answer is comprehensive yet focused on its specific aspect of variable analysis."""

# Enhanced Variable Relevance Assessment Template
VARIABLE_RELEVANCE_ENHANCED_TEMPLATE = """Please analyze variable relevance comprehensively using multiple analysis results.

Project Context:
- Problem: {problem_description}
- Context: {context_description}
- Variables: {variable_info}
- Data Preview: {data_preview}

Analysis Results Available:
- Correlation Analysis: {correlation_results}
- Multicollinearity Analysis: {multicollinearity_results}
- Feature Importance: {importance_results}
- Semantic Mapping: {semantic_mapping}

Provide a comprehensive relevance assessment in this format:

| Variable Name | Strong Relevance | Weak Relevance | Could Remove | Removal Reason | Keep/Remove Decision |
|---------------|------------------|----------------|--------------|----------------|----------------------|
| variable_1    | ✅ | ❌ | ❌ | N/A - highly relevant to target | KEEP |
| variable_2    | ❌ | ✅ | ❌ | Moderate relevance, keep for now | KEEP |
| variable_3    | ❌ | ❌ | ✅ | Low correlation + high multicollinearity | REMOVE |

Summary:
- **Keep Variables**: [list variables to keep with brief reasons]
- **Remove Variables**: [list variables to remove with brief reasons]
- **Uncertain Variables**: [list variables that need further analysis]

Recommendations:
1. Priority variables for the analysis: [list top 3-5 most important variables]
2. Variables that can be safely removed: [list variables with clear removal justification]
3. Variables requiring domain expert consultation: [list ambiguous cases]

"""

# Focused Variable Semantic Analysis Template
VARIABLE_SEMANTIC_FOCUSED_TEMPLATE = """Please perform focused variable semantic analysis to understand the business meaning and data validity of each variable.

Project Context:
- Problem: {problem_description}
- Context: {context_description}
- Variables: {variable_info}
- Data Preview: {data_preview}

Analyze each variable and provide a comprehensive semantic analysis in plain text format:

Variable Semantic Analysis Table:
| Variable Name | Business Meaning | Expected Data Type | Actual Data Type | Unit/Scale | Value Range | Business Logic Issues | Semantic Quality Score |
|---------------|------------------|--------------------|--------------------|------------|-------------|----------------------|------------------------|
| variable_1 | Customer age in years | Numeric (int) | Numeric | Years | 18-100 | None detected | 9/10 |
| variable_2 | Product category | Categorical | Text | Category | Electronics, Books, etc. | Some inconsistent naming | 7/10 |

Key Findings:

Observation Unit Analysis:
Observation Unit: [What does each row represent? e.g., "Each row represents a customer transaction"]
Analysis Granularity: [What level of analysis is this data suitable for?]
Target Variable: [Which variable appears to be the main outcome/target?]

Semantic Issues Detected:
- Data Type Mismatches: [List variables where actual type differs from expected]
- Business Logic Violations: [List variables with values that don't make business sense]
- Naming Inconsistencies: [List variables with unclear or inconsistent naming]
- Missing Context: [List variables that need more domain knowledge to interpret]

Data Quality Flags:
- High Quality Variables: [Variables with clear semantics and clean data]
- Medium Quality Variables: [Variables with minor issues but usable]
- Low Quality Variables: [Variables with significant semantic or data quality issues]

Business Context Validation:
- Domain-Aligned Variables: [Variables that clearly align with the business domain]
- Generic Variables: [Variables that could apply to multiple domains]
- Ambiguous Variables: [Variables that need domain expert consultation]

Recommendations:
1. Immediate Actions: [Variables that need immediate attention or clarification]
2. Data Cleaning Needs: [Specific data cleaning steps required for each variable]
3. Domain Expert Consultation: [Variables requiring business domain expertise]
4. Feature Engineering Opportunities: [Variables that could be enhanced or combined]

Provide specific, actionable insights for each variable's semantic meaning and business relevance."""

# Structured Variable Semantic Analysis Template (Returns JSON)
VARIABLE_SEMANTIC_STRUCTURED_TEMPLATE = """Analyze each variable and return a structured JSON array for table display.

Project Context:
- Problem: {problem_description}
- Context: {context_description}
- Variables: {variable_info}
- Data Preview: {data_preview}

Return ONLY a JSON array with this exact structure (no other text):

[
  {{
    "Variable": "variable_name",
    "Business_Meaning": "Brief description of business purpose",
    "Expected_Type": "int/float/string/datetime",
    "Unit": "measurement unit or N/A",
    "Value_Range": "expected range or categories",
    "Quality_Issues": "none/missing values/outliers/inconsistent",
    "Semantic_Score": "1-10"
  }}
]

Analyze ALL variables from the data preview and return the complete JSON array."""
