from openai import OpenAI
import os
import logging
from ..utils.parallel import ParallelProcessor
from tenacity import retry, stop_after_attempt, wait_exponential

# Disable OpenAI HTTP request logging
logging.getLogger("openai").setLevel(logging.ERROR)
logging.getLogger("httpx").setLevel(logging.WARNING)

class Oracle(ParallelProcessor):
    # enum for model names
    MODEL_GPT4o_MINI = 'gpt-4o-mini'
    MODEL_GPT4o = 'gpt-4o'
    MODEL_GPT4_TURBO = 'gpt-4-turbo'
    MODEL_GPTo4_MINI = 'o4-mini'

    DEEP_INFRA_BASE_URL = 'https://api.deepinfra.com/v1/openai'
    MODEL_LLAMA_3_8B = 'llama-3-8B'
    MODEL_LLAMA_3_70B = 'llama-3-70B'
    MODEL_MIXTRAL_8X7B = 'mixtral-8x7B'

    def __init__(self, default_model, alternative_model, apikey=None, base_url=None):
        super().__init__()
        self.default_model = default_model
        self.alternative_model = alternative_model
        self.apikey = os.environ.get("OPENAI_API_KEY") if apikey is None else apikey
        
        # for deepinfra models
        self.deepinfra_model_list = [self.MODEL_LLAMA_3_8B, self.MODEL_LLAMA_3_70B, self.MODEL_MIXTRAL_8X7B]
        self.base_url_deepinfra = 'https://api.deepinfra.com/v1/openai'
        # for openai models
        self.openai_model_list = [self.MODEL_GPT4o_MINI, self.MODEL_GPT4o, self.MODEL_GPT4_TURBO, self.MODEL_GPTo4_MINI]
        
        # all models
        self.all_model_list = self.deepinfra_model_list + self.openai_model_list
        assert default_model in self.all_model_list, f'err: model named {default_model} is not supported'
        assert alternative_model in self.all_model_list, f'err: model named {alternative_model} is not supported'

        # Set base_url based on model type
        if default_model in self.openai_model_list:
            self.base_url = os.environ.get("BASE_URL") if base_url is None else base_url
        elif default_model in self.deepinfra_model_list:
            self.base_url = self.base_url_deepinfra

        # initialize the client
        self.client = OpenAI(api_key=self.apikey, base_url=self.base_url)

    def query(self, prompt_sys, prompt_user, lang='en', temp=1.0, top_p=0.9, logprobs=True, query_key=None, max_retries=3, retry_delay=2):
        """
        Query the model with a system prompt and user prompt.
        Args:
            prompt_sys (str): System prompt.
            prompt_user (str): User prompt.
            lang (str): Language of the answer.
            temp (float): Temperature for the model.
            top_p (float): Top-p sampling parameter.
            logprobs (bool): Whether to return log probabilities.
            query_key (str): Key for the query.
            max_retries (int): Maximum number of retries for failed queries
            retry_delay (int): Delay in seconds between retries
        Returns:
            dict: Dictionary containing the query, answer, and log probabilities.
        """
        @retry(stop=stop_after_attempt(max_retries), wait=wait_exponential(multiplier=retry_delay))
        def _query_with_retry(model_to_use):
            try:
                # Update client base_url based on model type
                if model_to_use in self.openai_model_list:
                    self.client.base_url = self.base_url
                elif model_to_use in self.deepinfra_model_list:
                    self.client.base_url = self.base_url_deepinfra

                lang_prompt = """
                Your answer must be in Chinese.
                Your answer must be in Chinese.
                """ 
                if lang != 'zh':
                    lang_prompt = """
                    Your answer must be in English.
                    Your answer must be in English.
                    """
                
                completion = self.client.chat.completions.create(
                    model=model_to_use,
                    messages=[
                        {"role": "system", "content": prompt_sys + lang_prompt},
                        {"role": "user", "content": lang_prompt + prompt_user},
                    ],
                    stream=False,
                    temperature=temp,
                    top_p=top_p,
                    logprobs=logprobs,
                )

                response_result = completion.choices[0].message.content if completion.choices[0].message else ""
                logprobs_list = [token.logprob for token in completion.choices[0].logprobs.content] if logprobs and completion.choices[0].logprobs else []
                
                return {
                    'response': response_result,
                    'logprobs': logprobs_list,
                    'query_key': query_key or prompt_user,
                    'model_used': model_to_use
                }

            except Exception as e:
                logging.error(f"Error querying model {model_to_use}: {str(e)}")
                raise

        # First try with default model
        try:
            return _query_with_retry(self.default_model)
        except Exception as e:
            logging.warning(f"Default model {self.default_model} failed, trying alternative model {self.alternative_model}")
            try:
                return _query_with_retry(self.alternative_model)
            except Exception as e:
                logging.error(f"Both models failed for query: {prompt_user}")
                return {
                    'response': "QUERY_FAILED",
                    'error': str(e),
                    'query_key': query_key or prompt_user,
                    'model_used': None
                }

    def query_all(self, prompt_sys, prompt_user_all, lang='en', workers=None, temp=1.0, top_p=0.9, query_key_list=[], batch_size=10, max_retries=2, timeout=60, **kwargs):
        """
        Query all prompts in parallel using ThreadPoolExecutor with optimized performance.
        Args:
            prompt_sys (str): System prompt.
            prompt_user_all (list): List of user prompts.
            lang (str): Language of the answer.
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
        query_items = [(prompt, query_key_list[i] if query_key_list and i < len(query_key_list) else None) 
                    for i, prompt in enumerate(prompt_user_all)]
        
        def process_func(item, prompt_sys=prompt_sys, temp=temp, top_p=top_p):
            prompt, key = item
            try:
                return self.query(prompt_sys, prompt, lang, temp, top_p, query_key=key)
            except Exception as e:
                return f"QUERY_FAILED: {str(e)}"
        
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