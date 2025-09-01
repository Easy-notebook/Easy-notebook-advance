from openai import OpenAI
import os
import logging
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
    def query(self, prompt_sys, prompt_user, temp=0.0, top_p=0.9, logprobs=True, query_key=None):
        """
        Query the model with a system prompt and user prompt.
        Args:
            prompt_sys (str): System prompt.
            prompt_user (str): User prompt.
            temp (float): Temperature for the model.
            top_p (float): Top-p sampling parameter.
            logprobs (bool): Whether to return log probabilities.
            query_key (str): Key for the query.
        Returns:
            dict: Dictionary containing the query, answer, and log probabilities.
        """
        completion = self.client.chat.completions.create(
            model=self._check_token_limits(prompt_sys, prompt_user, self.model),
            messages=[
                {"role": "system", "content": prompt_sys},
                {"role": "user", "content": prompt_user},
            ],
            stream=False,
            temperature=temp,
            top_p=top_p,
            logprobs=logprobs,
        )

        response_result = ""
        # for chunk in stream:
        if completion.choices[0].message and completion.choices[0].message.content:
            response_result = completion.choices[0].message.content
        
        if not query_key:
            query_key = prompt_user 
        return response_result

    
    def query_all(self, prompt_sys, prompt_user_all, workers=None, temp=0.0, top_p=0.9, query_key_list=[], batch_size=10, max_retries=2, timeout=3000, **kwargs):
        """
        Query all prompts in parallel using ThreadPoolExecutor with optimized performance.
        Args:
            prompt_sys (str): System prompt.
            prompt_user_all (list): List of user prompts.
            workers (int): Number of worker threads. If None, will use min(32, os.cpu_count() * 4)
            temp (float): Temperature for the model.
            top_p (float): Top-p sampling parameter.
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
        def process_func(item, prompt_sys=prompt_sys, temp=temp, top_p=top_p):
            prompt, key = item
            try:
                if key:
                    return self.query(prompt_sys, prompt, temp, top_p, query_key=key)
                else:
                    return self.query(prompt_sys, prompt, temp, top_p)
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