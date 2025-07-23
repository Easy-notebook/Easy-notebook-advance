from ..utils.oracle import Oracle
from ..utils.logger import ModernLogger
from typing import List
import re
import json
class BaseAgent(ModernLogger):
    """
    Base class for all agents.

    Args:
        default_model: The default model to use | str
        alternative_model: The alternative model to use | str
        lang: Language of the response ('en' or 'zh')
    Note:
        The alternative model is designed to handle cases where the default model's context window is insufficient for the chat history length.
        For example, the default model is gpt-4o, the length of the chat history is 128k, 
            and the alternative model is o4-mini, the length of the chat history is 200k.
    """
    def __init__(self, 
                    default_model:str='gpt-4o', 
                    alternative_model:str='o4-mini',
                    lang:str='en'
                ):
        ModernLogger.__init__(self, name="BaseAgent")
        
        self.model = Oracle(default_model, alternative_model)
        self.system_prompt = ''
        self.default_model = default_model
        self.alternative_model = alternative_model
        self.lang = lang
        
    def _get_content_from_block(self, content:str) -> str:
        """
        remove ```markdown and ``` from the content,
        """
        content = content.replace("```markdown", "").replace("```", "")
        return content
        
    def _answer(self, question:str) -> str:
        """
        Get answer from the model with retry mechanism and model fallback.
        
        Args:
            question: The question to ask
            lang: Language of the response ('en' or 'zh')
            
        Returns:
            str: The model's response or error message
        """
        try:
            response = self.model.query(
                self.system_prompt, 
                question,
                lang=self.lang
            )
            
            if response.get('response') == "QUERY_FAILED":
                self.error(f"Query failed: {response.get('error')}")
                return f"Error: {response.get('error')}"
                
            return response['response']
            
        except Exception as e:
            self.error(f"Error in answer method: {str(e)}")
            return f"Error: {str(e)}"

    def answer(self, question:str) -> str:
        """
        Get answer from the model with retry mechanism and model fallback.
        
        Args:
            question: The question to ask
        Returns:
            str: The model's response or error message
        """
        return self._get_content_from_block(self._answer(question))
    
    def answer_multiple(self, questions:List[str]) -> List[str]:
        """
        Get answers for multiple questions with retry mechanism and model fallback.
        
        Args:
            questions: List of questions to ask
        Returns:
            List[str]: List of model responses or error messages
        """
        responses = []
        for question in questions:
            response = self._answer(question)
            responses.append(response)
        return responses
    
    
    def _parse_json(self, response:str, no_json_return:str='No JSON data found'):
        """
        Use regular expression to parse JSON data from the response.
        Args:
            response: The response from the model
        Returns:
            dict: The parsed JSON data
        """
        code_match = re.search(r"```json\n(.*?)\n```", response, re.DOTALL)
        if code_match:
            json_str = code_match.group(1).strip()
            return json.loads(json_str)
        else:
            self.error(f"No JSON data found, original response: {response}")
            return no_json_return
            
    def answer_parse_json(self, question:str, no_json_return:str='No JSON data found'):
        """
        Get answer from the model and parse the JSON data.
        Args:
            question: The question to ask
            no_json_return: The return value if no JSON data is found
        Returns:
            dict: The parsed JSON data
        """
        answer = self._answer(question)
        return self._parse_json(answer, no_json_return)
    
    def answer_multiple_parse_json(self, questions:List[str], no_json_return:str='No JSON data found') -> List[str]:
        """
        Get answers for multiple questions and parse the JSON data.
        Args:
            questions: List of questions to ask
            no_json_return: The return value if no JSON data is found
        Returns:
            List[dict]: List of parsed JSON data
        """
        answers = self.answer_multiple(questions)
        return [self._parse_json(answer, no_json_return) for answer in answers]
    
    def _parse_llm_code(self, generated_code:str) -> str:
        """
        Use regular expression to parse code from the response.
        Args:
            generated_code: The code from the model
        Returns:
            str: The parsed code
        """
        if re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL):
            code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
            return code_match.group(1)
        else:
            return generated_code
    
    def answer_parse_llm_code(self, question:str) -> str:
        """
        Get answer from the model and parse the code.
        Args:
            question: The question to ask
        Returns:
            str: The parsed code
        """ 
        answer = self._answer(question)
        return self._parse_llm_code(answer)

    def answer_multiple_parse_llm_code(self, questions:List[str]) -> List[str]:
        """
        Get answers for multiple questions and parse the code.
        Args:
            questions: List of questions to ask
        Returns:
            List[str]: List of parsed code
        """
        answers = self.answer_multiple(questions)
        return [self._parse_llm_code(answer) for answer in answers]
