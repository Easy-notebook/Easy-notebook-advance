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
        self.model = Oracle(model) if model else Oracle("openai/gpt-oss-120b")
        self.system_prompt = system_prompt
        
    def answer(self, question:str) -> str:
        response = self.model.query(self.system_prompt, question)
        self.debug(f"Response: {response}")
        
        # Handle dict response format from Oracle
        if isinstance(response, dict):
            answer = response.get("answer", "")
            if answer.startswith('QUERY_FAILED:'):
                self.error(f"Query failed for model {self.model_name} with error: {answer}")
            self.debug(f"Question: {question}")
            self.debug(f"Response: {answer}")
            return answer
        else:
            # Handle string response (backward compatibility)
            if response.startswith('QUERY_FAILED:'):
                self.error(f"Query failed for model {self.model_name} with error: {response}")
            self.debug(f"Question: {question}")
            self.debug(f"Response: {response}")
            return response
    
    def answer_multiple(self, questions:List[str]) -> List[str]:
        responses = self.model.query_all(self.system_prompt, questions)
        return responses
    
    def _parse_json(self, response):
        """Parse JSON data from LLM response with multiple fallback strategies"""
        self.info(f"Parsing JSON from response: {response}")
        
        # Strategy 1: Try standard markdown code block format
        code_match = re.search(r"```json\n(.*?)\n```", response, re.DOTALL)
        if code_match:
            try:
                json_str = code_match.group(1).strip()
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                self.error(f"JSON decode error in markdown block: {e}")
        
        # Strategy 2: Try without markdown formatting (direct JSON)
        try:
            # Remove potential markdown artifacts and whitespace
            cleaned_response = response.strip()
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith('```'):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
            
            return json.loads(cleaned_response)
        except json.JSONDecodeError:
            self.error(f"JSON decode error in markdown block: {e}")
        
        # Strategy 3: Extract JSON-like content using regex
        json_pattern = r'\{.*\}'
        json_match = re.search(json_pattern, response, re.DOTALL)
        if json_match:
            try:
                json_str = json_match.group(0)
                return json.loads(json_str)
            except json.JSONDecodeError:
                self.error(f"JSON decode error in regex: {e}")
        
        # All strategies failed
        self.error(f"Failed to parse JSON from response using all strategies. Response: {response[:500]}...")
        return None
    
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
        max_retries = 3
        for attempt in range(max_retries):
            response = self.answer(question)
            
            # If query failed, try again
            if response.startswith('QUERY_FAILED:'):
                self.warning(f"Query failed on attempt {attempt + 1}: {response}")
                if attempt < max_retries - 1:
                    continue
                else:
                    self.error(f"All {max_retries} query attempts failed")
                    raise ValueError(f"Model query failed after {max_retries} attempts: {response}")
            
            # Try to parse JSON response
            parsed_result = self._parse_json(response)
            if parsed_result is not None:
                return parsed_result
            
            # If JSON parsing failed, log and retry
            self.warning(f"JSON parsing failed on attempt {attempt + 1}")
            if attempt < max_retries - 1:
                continue
        
        # All attempts failed
        self.error(f"JSON parsing failed completely after {max_retries} attempts for question: {question[:100]}...")
        raise ValueError(f"Failed to parse JSON response from LLM after {max_retries} attempts")
    
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
            parsed_result = self._parse_json(response)
            if parsed_result is None:
                self.error(f"JSON parsing failed in batch analysis")
                raise ValueError("Failed to parse JSON response in batch analysis")
            multiple_analyze.append(parsed_result)
        return multiple_analyze