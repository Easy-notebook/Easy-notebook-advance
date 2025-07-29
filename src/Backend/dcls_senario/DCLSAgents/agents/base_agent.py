from DCLSAgents.utils.oracle import Oracle
from DCLSAgents.utils.logger import ModernLogger
from typing import List
import re
import json

class BaseAgent(ModernLogger):
    def __init__(self, name:str, model:str="", system_prompt:str=None):
        super().__init__()
        self.name = name
        self.model_name = model
        self.model = Oracle(model) if model else Oracle("gpt-4o-mini")
        self.system_prompt = system_prompt
        
    def answer(self, question:str) -> str:
        response = self.model.query(self.system_prompt, question)
        if response.startswith('QUERY_FAILED:'):
            self.error(f"Query failed for model {self.model_name} with error: {response}")
        return response
    
    def answer_multiple(self, questions:List[str]) -> List[str]:
        responses = self.model.query_all(self.system_prompt, questions)
        return responses
    
    def _parse_json(self, response):
        """Parse JSON data from LLM response using regex"""
        code_match = re.search(r"```json\n(.*?)\n```", response, re.DOTALL)
        if code_match:
            json_str = code_match.group(1).strip()
            return json.loads(json_str)
        self.error(f"Failed to parse JSON from response: {response}")
        return response
    
    def _parse_code(self, response):
        code_match = re.search(r"```python\n(.*)\n```", response, re.DOTALL)
        if code_match:
            return code_match.group(1).strip()
        self.error(f"Failed to parse code from response: {response}")
        return response
    
    def coding(self, question:str) -> str:
        response = self.answer(question)
        if response.startswith('QUERY_FAILED:'):
            response = self.answer(question)
        return self._parse_code(response)
    
    def analyzing(self, question:str) -> str:
        response = self.answer(question)
        if response.startswith('QUERY_FAILED:'):
            response = self.answer(question)
        return self._parse_json(response)
    
    def code_multiple(self, questions:List[str]) -> List[str]:
        responses = self.model.query_all(self.system_prompt, questions)
        multiple_code = []
        for response in responses:
            if response.startswith('QUERY_FAILED:'):
                response = self.answer(response)
            multiple_code.append(self._parse_code(response))
        return multiple_code
    
    def analyze_multiple(self, questions:List[str]) -> List[str]:
        responses = self.model.query_all(self.system_prompt, questions)
        multiple_analyze = []
        for response in responses:
            if response.startswith('QUERY_FAILED:'):
                response = self.answer(response)
            multiple_analyze.append(self._parse_json(response))
        return multiple_analyze