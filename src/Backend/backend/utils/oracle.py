from openai import OpenAI
import os
import logging
import asyncio
import json
from typing import AsyncGenerator, Dict, Any, Optional, List
from .parallel import ParallelProcessor
import dotenv

dotenv.load_dotenv()

# Disable OpenAI HTTP request logging
logging.getLogger("openai").setLevel(logging.ERROR)
logging.getLogger("httpx").setLevel(logging.WARNING)

class Oracle(ParallelProcessor):
    # enum for model names
    SUPPORTED_MODELS = {
        "doubao-1-5-lite-32k-250115": 32768,
        "gpt-5-mini": 128000,
        "gpt-4o": 128000,
        "o4-mini": 200000,
    }

    def __init__(self, model, apikey=None, base_url=None):
        super().__init__()
        self.model = model
        self.apikey = os.environ.get("OPENAI_API_KEY") if apikey is None else apikey
        self.base_url = os.environ.get("BASE_URL") if base_url is None else base_url
        self.client = OpenAI(api_key=self.apikey, base_url=self.base_url)
    
    def get_model_info(self):
        return self.client.models.retrieve(self.model)
    
    def _get_prompt_tokens_length(self, prompt):
        return self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            stream=False,
        ).usage.prompt_tokens
    
    def _check_token_limits(self, prompt_sys, prompt_user, model):
        if self._get_prompt_tokens_length(prompt_sys) + self._get_prompt_tokens_length(prompt_user) > self.SUPPORTED_MODELS[model]:
            # check and get a better model
            for model in self.SUPPORTED_MODELS:
                if self._get_prompt_tokens_length(prompt_sys) + self._get_prompt_tokens_length(prompt_user) <= self.SUPPORTED_MODELS[model]:
                    return model
            return model
        return model
    
    # for chat completion
    def query(self, prompt_sys, prompt_user):
        """
        Query the model with a system prompt and user prompt.
        Args:
            prompt_sys (str): System prompt.
            prompt_user (str): User prompt.
            temp (float): Temperature for the model (optional, some models don't support it).
            top_p (float): Top-p sampling parameter.
            logprobs (bool): Whether to return log probabilities.
            query_key (str): Key for the query.
        Returns:
            dict: Dictionary containing the query, answer, and log probabilities.
        """
        request_params = {
            "model": self._check_token_limits(prompt_sys, prompt_user, self.model),
            "messages": [
                {"role": "system", "content": prompt_sys},
                {"role": "user", "content": prompt_user},
            ],
            "stream": False,
        }
        
        completion = self.client.chat.completions.create(**request_params)

        response_result = ""
        # for chunk in stream:
        if completion.choices[0].message and completion.choices[0].message.content:
            response_result = completion.choices[0].message.content
        
        return response_result

    def query_stream(self, prompt_sys: str, prompt_user: str):
        """
        Query the model with streaming response.
        Args:
            prompt_sys (str): System prompt.
            prompt_user (str): User prompt.
            temp (float): Temperature for the model.
            top_p (float): Top-p sampling parameter.
            query_key (str): Key for the query.
        Yields:
            str: Streaming response chunks.
        """
        try:
            stream = self.client.chat.completions.create(
                model=self._check_token_limits(prompt_sys, prompt_user, self.model),
                messages=[
                    {"role": "system", "content": prompt_sys},
                    {"role": "user", "content": prompt_user},
                ],
                stream=True,
            )

            for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content is not None:
                        yield delta.content

        except Exception as e:
            yield f"STREAM_ERROR: {str(e)}"

    async def query_stream_async(self, prompt_sys: str, prompt_user: str) -> AsyncGenerator[str, None]:
        """
        Async query the model with streaming response.
        Args:
            prompt_sys (str): System prompt.
            prompt_user (str): User prompt.
            temp (float): Temperature for the model (optional, some models don't support it).
            top_p (float): Top-p sampling parameter.
            query_key (str): Key for the query.
        Yields:
            str: Streaming response chunks.
        """
        try:
            # Build request parameters
            request_params = {
                "model": self._check_token_limits(prompt_sys, prompt_user, self.model),
                "messages": [
                    {"role": "system", "content": prompt_sys},
                    {"role": "user", "content": prompt_user},
                ],
                "stream": True,
            }
            
            # Create streaming request - note: this is synchronous in OpenAI SDK
            stream = self.client.chat.completions.create(**request_params)

            # Process stream chunks - use regular for loop, not async for
            for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content is not None:
                        yield delta.content
                        # Allow other coroutines to run
                        await asyncio.sleep(0.001)

        except Exception as e:
            yield f"ASYNC_STREAM_ERROR: {str(e)}"

    def chat_with_history(self, messages: List[Dict[str, str]], stream: bool = False):
        """
        Chat with conversation history.
        Args:
            messages (List[Dict]): List of message dictionaries with 'role' and 'content'.
            temp (float): Temperature for the model.
            top_p (float): Top-p sampling parameter.
            stream (bool): Whether to stream the response.
        Returns:
            str or generator: Response content or streaming generator.
        """
        try:
            if stream:
                stream_response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    stream=True,
                )

                def stream_generator():
                    for chunk in stream_response:
                        if chunk.choices and len(chunk.choices) > 0:
                            delta = chunk.choices[0].delta
                            if delta and delta.content is not None:
                                yield delta.content

                return stream_generator()
            else:
                completion = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    stream=False,
                )

                if completion.choices[0].message and completion.choices[0].message.content:
                    return completion.choices[0].message.content
                return ""

        except Exception as e:
            if stream:
                def error_generator():
                    yield f"CHAT_ERROR: {str(e)}"
                return error_generator()
            else:
                return f"CHAT_ERROR: {str(e)}"

    def parse_tool_calls_from_stream(self, stream_content: str) -> List[Dict[str, Any]]:
        """
        Parse tool calls from streaming content.
        Args:
            stream_content (str): The accumulated streaming content.
        Returns:
            List[Dict]: List of parsed tool calls.
        """
        import re

        tool_calls = []

        # Define tool patterns for parsing
        tool_patterns = {
            'add_text': r'<add-text>(.*?)</add-text>',
            'add_code': r'<add-code(?:\s+language="([^"]*)")?>(.*?)</add-code>',
            'thinking': r'<thinking>(.*?)</thinking>',
            'call_execute': r'<call-execute(?:\s+event="([^"]*)")?>(.*?)</call-execute>',
            'get_variable': r'<get-variable\s+variable="([^"]*)"(?:\s+default="([^"]*)")?/>',
            'set_variable': r'<set-variable\s+variable="([^"]*)"\s+value="([^"]*)"(?:\s+type="([^"]*)")?/>',
            'remember': r'<remember(?:\s+type="([^"]*)")?>(.*?)</remember>',
            'update_todo': r'<update-todo\s+action="([^"]*)"(?:\s+event="([^"]*)")?>(.*?)</update-todo>',
            'analyze_data': r'<analyze-data\s+source="([^"]*)"(?:\s+method="([^"]*)")?/>',
            'create_visualization': r'<create-visualization\s+type="([^"]*)"(?:\s+data="([^"]*)")?/>',
            'validate': r'<validate\s+condition="([^"]*)"(?:\s+error="([^"]*)")?/>',
            'plan': r'<plan\s+goal="([^"]*)"(?:\s+horizon="([^"]*)")?(?:\s+constraints="([^"]*)")?>(.*?)</plan>'
        }

        # Parse each tool type
        for tool_name, pattern in tool_patterns.items():
            matches = re.finditer(pattern, stream_content, re.DOTALL | re.IGNORECASE)
            for match in matches:
                tool_call = {
                    'tool': tool_name,
                    'position': match.span(),
                    'groups': match.groups(),
                    'full_match': match.group(0),
                    'parsed_params': self._parse_tool_params(tool_name, match.groups())
                }
                tool_calls.append(tool_call)

        # Sort by position in text
        tool_calls.sort(key=lambda x: x['position'][0])

        return tool_calls

    def _parse_tool_params(self, tool_name: str, groups: tuple) -> Dict[str, Any]:
        """
        Parse tool parameters based on tool type.
        Args:
            tool_name (str): Name of the tool.
            groups (tuple): Regex match groups.
        Returns:
            Dict: Parsed parameters.
        """
        params = {}

        if tool_name == 'add_text':
            params['content'] = groups[0] if groups[0] else ""

        elif tool_name == 'add_code':
            params['language'] = groups[0] if groups[0] else 'python'
            params['code'] = groups[1] if len(groups) > 1 else groups[0]

        elif tool_name == 'thinking':
            params['content'] = groups[0] if groups[0] else ""

        elif tool_name == 'call_execute':
            params['event'] = groups[0] if groups[0] else 'default'
            params['code'] = groups[1] if len(groups) > 1 else groups[0]

        elif tool_name == 'get_variable':
            params['variable'] = groups[0] if groups[0] else ""
            params['default'] = groups[1] if len(groups) > 1 and groups[1] else ""

        elif tool_name == 'set_variable':
            params['variable'] = groups[0] if groups[0] else ""
            params['value'] = groups[1] if len(groups) > 1 else ""
            params['type'] = groups[2] if len(groups) > 2 and groups[2] else "str"

        elif tool_name == 'remember':
            params['type'] = groups[0] if groups[0] else 'general'
            params['content'] = groups[1] if len(groups) > 1 else groups[0]

        elif tool_name == 'update_todo':
            params['action'] = groups[0] if groups[0] else 'add'
            params['event'] = groups[1] if len(groups) > 1 and groups[1] else ""
            params['content'] = groups[2] if len(groups) > 2 else ""

        elif tool_name == 'analyze_data':
            params['source'] = groups[0] if groups[0] else ""
            params['method'] = groups[1] if len(groups) > 1 and groups[1] else "eda"

        elif tool_name == 'create_visualization':
            params['type'] = groups[0] if groups[0] else "scatter"
            params['data'] = groups[1] if len(groups) > 1 and groups[1] else ""

        elif tool_name == 'validate':
            params['condition'] = groups[0] if groups[0] else ""
            params['error'] = groups[1] if len(groups) > 1 and groups[1] else "Validation failed"

        elif tool_name == 'plan':
            params['goal'] = groups[0] if groups[0] else ""
            params['horizon'] = groups[1] if len(groups) > 1 and groups[1] else ""
            params['constraints'] = groups[2] if len(groups) > 2 and groups[2] else ""
            params['content'] = groups[3] if len(groups) > 3 else ""

        return params

    def extract_clean_text(self, content: str) -> str:
        """
        Extract clean text by removing all tool calls.
        Args:
            content (str): Content with tool calls.
        Returns:
            str: Clean text without tool calls.
        """
        import re

        # Remove all tool call patterns
        tool_patterns = [
            r'<add-text>.*?</add-text>',
            r'<add-code(?:\s+[^>]*)?>.*?</add-code>',
            r'<thinking>.*?</thinking>',
            r'<call-execute(?:\s+[^>]*)?>.*?</call-execute>',
            r'<get-variable\s+[^>]*/>',
            r'<set-variable\s+[^>]*/>',
            r'<remember(?:\s+[^>]*)?>.*?</remember>',
            r'<update-todo\s+[^>]*>.*?</update-todo>',
            r'<analyze-data\s+[^>]*/>',
            r'<create-visualization\s+[^>]*/>',
            r'<validate\s+[^>]*/>',
            r'<plan\s+[^>]*>.*?</plan>'
        ]

        clean_content = content
        for pattern in tool_patterns:
            clean_content = re.sub(pattern, '', clean_content, flags=re.DOTALL | re.IGNORECASE)

        # Clean up extra whitespace
        clean_content = re.sub(r'\n\s*\n', '\n\n', clean_content)
        clean_content = clean_content.strip()

        return clean_content

    
    def query_all(self, prompt_sys, prompt_user_all, workers=None, query_key_list=[], batch_size=10, max_retries=2, timeout=3000, **kwargs):
        """
        Query all prompts in parallel using ThreadPoolExecutor with optimized performance.
        Args:
            prompt_sys (str): System prompt.
            prompt_user_all (list): List of user prompts.
            workers (int): Number of worker threads. If None, will use min(32, os.cpu_count() * 4)
            query_key_list (list): List of query keys for each prompt.
            batch_size (int): Size of batches to process for better performance.
            max_retries (int): Maximum number of retries for failed queries.
            timeout (int): Timeout in seconds for each query.
        Returns:
            list: List of results from the model.
        """
        query_items = []
        for i, prompt in enumerate(prompt_user_all):
            key = query_key_list[i] if query_key_list and i < len(query_key_list) else None
            query_items.append((prompt, key))
        
        # Define process function for a single query
        def process_func(item, prompt_sys=prompt_sys):
            prompt, key = item
            try:
                if key:
                    return self.query(prompt_sys, prompt, query_key=key)
                else:   
                    return self.query(prompt_sys, prompt)
            except Exception as e:
                return f"QUERY_FAILED: {str(e)}"
        
        # Use the parallel processor base class
        workers = min(32, (os.cpu_count() or 4) * 4) if workers is None else workers
        
        return self.parallel_process(
            items=query_items,
            process_func=process_func,
            workers=workers,
            batch_size=batch_size,
            max_retries=max_retries,
            timeout=timeout,
            task_description="Processing queries"
        )