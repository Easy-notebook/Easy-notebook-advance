
QUESTION_CHOICE_MAP_TEMPLATE = """You are given:
• column_info  – a description of the dataset columns  
• dataset_info – background information about the dataset

now information:
{context}

Task  
Generate **exactly three** question‑choice maps.  
Each map must:

1. Use one column from column_info as its "target".  
2. Describe the problem in "problem_description" using dataset_info.  
3. Provide a short, distinctive "problem_name".  
4. your output must be in JSON format, not other text, in english.

Output  
Return **only** a JSON array of three objects, with **double quotes** around all keys and string values:

```json
[
   {{
      "target": "sales_price",
      "problem_description": "Assume we are buying a house in Ames, Iowa and need an algorithm to predict house sale prices within our budget.",
      "problem_name": "Ames Housing Price Prediction"
   }},
   {{
      "target": "...",
      "problem_description": "...",
      "problem_name": "..."
   }},
   {{
      "target": "...",
      "problem_description": "...",
      "problem_name": "..."
   }}
]
"""
