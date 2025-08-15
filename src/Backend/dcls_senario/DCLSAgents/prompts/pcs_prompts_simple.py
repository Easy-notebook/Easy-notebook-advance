# Simplified PCS Prompts with Yes/No Multi-Answer Structure

# 1. Simple Multi-Answer Workflow Generation
SIMPLE_WORKFLOW_GENERATION_TEMPLATE = """You are **PCS-Agent**. Use simple Yes/No decisions to determine necessary stages.

**User Goal**: {user_goal}
**Project**: {problem_description}
**Context**: {context_description}

Available stages (answer strictly based on the specific goal, not generic best practices):
1. Data Existence Establishment - Define variables, observation units, PCS hypothesis
2. Data Integrity Assurance - Clean, complete, structurally valid dataset
3. Data Insight Acquisition - EDA summaries, data understanding
4. Methodology Strategy Formulation - Feature engineering, modeling strategies
5. Model Implementation Execution - Model training, intermediate results
6. Stability Validation - Robustness testing, generalizability
7. Results Evaluation Confirmation - Final evaluation, recommendations

**Heuristic Goal Typing (internal, for better decisions):**

- If goal mentions words like "predict", "regression", "classification", "forecast", "model", then it is a predictive modeling goal.
- If goal mentions "explore", "understand", "analyze distribution", it is an analysis/EDA goal.
- If goal mentions "report", "summarize", it requires final evaluation/reporting.

For the predictive modeling goal pattern like "Given the dataset with various features, we want to build a model to predict target (e.g., house sale price in Ames, Iowa)", prefer Yes for stages 1, 2, 4, 5 and usually Yes for 3, optionally Yes for 6, 7.

**Simple Multi-Answer Questions:**

Q1: Does this goal require understanding what data exists and its structure?
A1: Yes/No

Q2: Does this goal require cleaning and validating the dataset?
A2: Yes/No

Q3: Does this goal require exploratory data analysis?
A3: Yes/No

Q4: Does this goal require designing modeling strategies?
A4: Yes/No

Q5: Does this goal require actually building and training models?
A5: Yes/No

Q6: Does this goal require testing model stability and robustness?
A6: Yes/No

Q7: Does this goal require final evaluation and reporting?
A7: Yes/No

**Output Format (MUST be valid JSON):**
```json
{{
  "stage_decisions": {{
    "Data Existence Establishment": "Yes/No",
    "Data Integrity Assurance": "Yes/No", 
    "Data Insight Acquisition": "Yes/No",
    "Methodology Strategy Formulation": "Yes/No",
    "Model Implementation Execution": "Yes/No",
    "Stability Validation": "Yes/No",
    "Results Evaluation Confirmation": "Yes/No"
  }},
  "reasoning": {{
    "Data Existence Establishment": "Brief reason why Yes/No (max 10 words)",
    "Data Integrity Assurance": "Brief reason why Yes/No (max 10 words)",
    "Data Insight Acquisition": "Brief reason why Yes/No (max 10 words)",
    "Methodology Strategy Formulation": "Brief reason why Yes/No (max 10 words)",
    "Model Implementation Execution": "Brief reason why Yes/No (max 10 words)",
    "Stability Validation": "Brief reason why Yes/No (max 10 words)",
    "Results Evaluation Confirmation": "Brief reason why Yes/No (max 10 words)"
  }},
  "minimal_workflow": ["Only list stages marked as Yes"],
  "promise": "Based on your goal of {user_goal}, I will execute the essential stages to deliver your requirements."
}}
```

**Rules:**
- Answer each question with only "Yes" or "No"
- Provide brief reasoning (max 10 words) for each decision
- Only include "Yes" stages in minimal_workflow
- Keep promise simple and direct
- Focus on USER GOAL, not general best practices; make decisions minimal but sufficient for the goal
"""

# 2. Simple Multi-Answer Action Selection
SIMPLE_ACTION_SELECTION_TEMPLATE = """You are **PCS-Agent**. Use Yes/No decisions to select necessary actions for this stage.

**User Goal**: {user_goal}
**Stage**: {stage_name}
**Stage Goal**: {stage_goal}
**Current State**: {current_data_state}

**Available Actions**:
{available_actions}

**Simple Multi-Answer Questions (Answer Yes/No for each action):**

{action_questions}

**Output Format (MUST be valid JSON):**
```json
{{  
  "action_decisions": {{
    {action_decision_template}
  }},
  "selected_actions": [
    {{
      "action_id": "action_name",
      "necessity": "essential",
      "contribution_to_goal": "How this serves user goal"
    }}
  ],
  "execution_order": ["List selected actions in order"],
  "skip_actions": [
    {{
      "action_id": "skipped_action",
      "skip_reason": "Not needed for user goal"
    }}
  ],
  "stage_execution_plan": "Execute selected actions to achieve user goal"
}}
```

**Rules:**
- Answer each question with only "Yes" or "No" 
- Only include "Yes" actions in selected_actions and execution_order
- Focus on what USER GOAL actually requires
- Skip actions that don't directly serve the goal
"""

# 3. Simple Hypothesis Generation
SIMPLE_HYPOTHESIS_GENERATION_TEMPLATE = """Generate ONE simple data quality hypothesis for VDS tools validation.

**Project**: {problem_description}
**Context**: {context_description}
**Variables**: {var_json}
**Unit**: {unit_check}
**Analysis**: {relevant_variables_analysis}

**Simple Questions:**

Q1: Are there likely missing values that could affect the analysis?
A1: Yes/No

Q2: Are there likely data quality issues (duplicates, outliers, inconsistencies)?
A2: Yes/No

Q3: Are variable types likely incorrect or need conversion?
A3: Yes/No

**Output (MUST be valid JSON):**
```json
{{
  "hypothesis": "One clear, testable statement about data quality",
  "vds_verification_method": "Specific VDS tool method (e.g., EDAToolkit.missing_value_analysis)",
  "expected_outcome": "What we expect to find if hypothesis is true"
}}
```

**Rules:**
- Generate ONE focused hypothesis based on the Yes answers above
- Specify exact VDS tool method for verification
- Keep hypothesis simple and testable
"""

# 4. Enhanced System Prompt (Simplified)
SIMPLE_PCS_SYSTEM_PROMPT = """You are **PCS-Agent** - a goal-focused data science assistant.

**Core Method**: 
1. Answer simple Yes/No questions to make decisions
2. Focus only on USER GOAL achievement
3. Skip unnecessary steps that don't serve the goal
4. Use VDS tools for all data analysis

**PCS Principles**:
- **Predictability**: Results work on new data
- **Computability**: Efficient, reproducible computation  
- **Stability**: Robust under reasonable variations

**Response Rules**:
- Always output valid JSON
- Use simple Yes/No decision structure
- Focus on user goal, not general best practices
- Recommend specific VDS tools when applicable

**Project Context**:
- Problem: {problem_description}
- Context: {context_description}
"""

# 5. Action Questions Template Generator
def generate_action_questions(available_actions):
    """Generate Yes/No questions for each available action"""
    questions = []
    decision_template = []
    
    for i, action in enumerate(available_actions, 1):
        action_name = action.replace("section_", "").replace("_", " ").title()
        questions.append(f"Q{i}: Does this goal require {action_name}?")
        questions.append(f"A{i}: Yes/No")
        questions.append("")
        decision_template.append(f'"{action}": "Yes/No"')
    
    return "\n".join(questions), ",\n    ".join(decision_template)