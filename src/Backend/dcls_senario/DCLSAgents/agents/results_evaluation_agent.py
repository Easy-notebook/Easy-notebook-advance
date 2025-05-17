# agents/results_evaluation_agent.py
from .base_agent import BaseDSLC_Agent
from langchain.memory import ConversationBufferMemory
from DCLSAgents.prompts.results_evaluation_prompts import *
import re
import os

class ResultsEvaluationAgent(BaseDSLC_Agent):
    def __init__(self, problem_description, context_description, best_five_result, memory=None, llm=None):
        self.problem_description = problem_description
        self.context_description = context_description
        self.best_five_result = best_five_result
        
        system_message_content = RESULTS_EVALUATION_TEMPLATE.format(
            problem_description=problem_description,
            context_description=context_description,
            best_five_result=best_five_result
        )
        
        super().__init__(
            name="Results Evaluation",
            system_message=system_message_content,
            memory=memory,
            llm=llm
        )
        self.logger.info("ResultsEvaluationAgent initialized")

    def generate_test_datasets_code(self, multiple_datasets_code_path, original_dataset_path):
        """
        根据生成多个数据集的代码，生成只生成五个最佳拟合数据集的代码。
        
        参数：
        - multiple_datasets_code_path: 稳定性数据集的代码文件路径
        - original_dataset_path: 原始数据集路径
        
        返回值：
        - 生成的Python代码字符串，用于创建五个最佳拟合数据集
        """
        self.logger.info(f"Generating code for test datasets based on {multiple_datasets_code_path}")
        try:
            # 读取生成多个数据集的代码
            with open(multiple_datasets_code_path, 'r', encoding='utf-8') as f:
                multiple_datasets_code = f.read()
            
            input_data = BEST_FIVE_DATASETS_TEMPLATE.format(
                original_dataset_path=original_dataset_path,
                multiple_datasets_code=multiple_datasets_code
            )
            
            generated_code, _ = self.chat_with_memory(input_data, ConversationBufferMemory())
            code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
            
            if code_match:
                extracted_code = code_match.group(1)
                final_code = extracted_code
                self.logger.info("Successfully generated test datasets code")
                return f"```python\n{final_code}\n```"
            self.logger.warning("Failed to extract Python code from generated text")
            return "未生成代码。"
        except FileNotFoundError:
            self.logger.error(f"Multiple datasets code file not found: {multiple_datasets_code_path}")
            return f"找不到多数据集生成代码文件：{multiple_datasets_code_path}"
        except Exception as e:
            self.logger.error(f"Error generating best five datasets code: {str(e)}")
            return f"生成代码过程中出现错误：{str(e)}"

    def generate_and_execute_test_datasets(self, multiple_datasets_code_path, original_dataset_path, data_dir, max_attempts=3):
        """
        生成并执行生成最佳五个数据集的代码，并根据稳定性分析结果清理数据集。

        参数：
        - multiple_datasets_code_path: 生成多个数据集的代码文件路径
        - original_dataset_path: 原始数据集路径
        - data_dir: 数据根目录路径
        - max_attempts: 代码生成的最大尝试次数

        返回值：
        - 包含代码执行结果的字典
        """
        self.logger.info(f"Starting test datasets generation for {original_dataset_path}")
        data_dir = os.path.dirname(original_dataset_path)
        code_dir = os.path.join(data_dir, 'code')
        os.makedirs(code_dir, exist_ok=True)

        code_file = os.path.join(code_dir, "generate_best_five_datasets.py")
        stability_dir = os.path.join(data_dir, 'stability_analysis')
        dataset_dir = os.path.join(data_dir, 'dataset')

        for attempt in range(max_attempts):
            try:
                self.logger.info(f"Attempt {attempt + 1}/{max_attempts} to generate and execute code")
                self.logger.info("Generating best five datasets code")
                code = self.generate_test_datasets_code(
                    multiple_datasets_code_path=multiple_datasets_code_path,
                    original_dataset_path=original_dataset_path
                )
                
                if "未生成代码" in code:
                    self.logger.warning("Failed to generate test datasets code")
                    continue

                self.logger.info("Executing test datasets code")
                result = self.execute_generated_code(code, save_path=code_file)
                if "代码执行失败，已达到最大重试次数" in result:
                    self.logger.warning(f"Code execution failed after max retries, attempting regeneration")
                    continue
                
                # 检查稳定性分析目录是否存在
                if not os.path.exists(stability_dir):
                    self.logger.warning("Stability analysis directory not found")
                    continue
                
                # 获取稳定性分析目录中的CSV文件名
                stability_files = [f for f in os.listdir(stability_dir) if f.endswith('.csv')]
                if not stability_files:
                    self.logger.warning("No CSV files found in stability analysis directory")
                    continue
                
                # 清理dataset目录
                if os.path.exists(dataset_dir):
                    dataset_files = os.listdir(dataset_dir)
                    for file in dataset_files:
                        if file.endswith('.csv'):
                            # 只保留在稳定性分析中出现的文件
                            if file not in stability_files:
                                file_path = os.path.join(dataset_dir, file)
                                try:
                                    os.remove(file_path)
                                    self.logger.info(f"Removed unused dataset: {file}")
                                except Exception as e:
                                    self.logger.error(f"Error removing file {file}: {str(e)}")
                
                self.logger.info("Successfully executed test datasets code and cleaned up datasets")
                return {"结果": result}
                
            except Exception as e:
                self.logger.error(f"Error in attempt {attempt + 1}: {str(e)}")
                if attempt == max_attempts - 1:
                    return {"结果": f"在{max_attempts}次尝试后仍然失败：{str(e)}"}
                continue

        return {"结果": f"在{max_attempts}次尝试后未能成功生成和执行代码。"}

    def generate_model_evaluation_code(self, model_training_code_path, train_dataset_path, eval_dataset_path):
        """
        生成模型评估代码，使用最佳拟合的数据集和算法进行训练和评估。
        
        参数：
        - model_training_code_path: 原始建模代码文件路径
        - train_dataset_path: 训练数据集路径
        - eval_dataset_path: 评估数据集路径
        
        返回值：
        - 生成的Python代码字符串，用于训练模型和评估数据集
        """
        self.logger.info(f"Generating model evaluation code for {eval_dataset_path}")
        try:
            # 读取原始建模代码
            with open(model_training_code_path, 'r', encoding='utf-8') as f:
                model_training_code = f.read()
            
            input_data = MODEL_EVALUATION_TEMPLATE.format(
                train_dataset_path=train_dataset_path,
                eval_dataset_path=eval_dataset_path,
                model_training_code=model_training_code
            )
            
            generated_code, _ = self.chat_with_memory(input_data, ConversationBufferMemory())
            code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
            
            if code_match:
                extracted_code = code_match.group(1)
                path_setup_code = '''import os,sys,re
current_path = os.path.abspath(__file__)
match = re.search(r'(.*MyAgent)', current_path)
if not match:
    raise FileNotFoundError("Could not find MyAgent directory")
sys.path.append(match.group(1))
from tools.ml_tools import *
from tools.ml_tools import transform_features,reduce_dimensions,select_features,discretize_features,create_polynomial_features

'''
                final_code = path_setup_code + extracted_code
                self.logger.info("Successfully generated model evaluation code")
                return f"```python\n{final_code}\n```"
            self.logger.warning("Failed to extract Python code from generated text")
            return "未生成代码。"
        except FileNotFoundError:
            self.logger.error(f"Model training code file not found: {model_training_code_path}")
            return f"找不到建模代码文件：{model_training_code_path}"
        except Exception as e:
            self.logger.error(f"Error generating model evaluation code: {str(e)}")
            return f"生成代码过程中出现错误：{str(e)}"

    def generate_and_execute_model_evaluation(self, model_training_code_path, train_dataset_path, eval_dataset_path, max_attempts=5):
        """
        生成并执行模型评估代码。

        参数：
        - model_training_code_path: 原始建模代码文件路径
        - train_dataset_path: 训练数据集路径
        - eval_dataset_path: 评估数据集路径
        - max_attempts: 代码生成的最大尝试次数

        返回值：
        - 包含代码执行结果的字典
        """
        self.logger.info(f"Starting model evaluation for {eval_dataset_path}")
        data_dir = os.path.dirname(eval_dataset_path)
        code_dir = os.path.join(data_dir, 'code')
        os.makedirs(code_dir, exist_ok=True)

        code_file = os.path.join(code_dir, "model_evaluation.py")

        for attempt in range(max_attempts):
            try:
                self.logger.info(f"Attempt {attempt + 1}/{max_attempts} to generate and execute code")
                self.logger.info("Generating model evaluation code")
                code = self.generate_model_evaluation_code(
                    model_training_code_path=model_training_code_path,
                    train_dataset_path=train_dataset_path,
                    eval_dataset_path=eval_dataset_path
                )
                
                if "未生成代码" in code:
                    self.logger.warning("Failed to generate model evaluation code")
                    continue

                self.logger.info("Executing model evaluation code")
                result = self.execute_generated_code(code, save_path=code_file)
                if "代码执行失败，已达到最大重试次数，需要重新生成代码。" in result:
                    self.logger.warning(f"Code execution failed after max retries, attempting regeneration")
                    continue  # 尝试重新生成代码
                
                self.logger.info("Successfully executed model evaluation code")
                return {"结果": result}
                
            except Exception as e:
                self.logger.error(f"Error in attempt {attempt + 1}: {str(e)}")
                if attempt == max_attempts - 1:
                    return {"结果": f"在{max_attempts}次尝试后仍然失败：{str(e)}"}
                continue  # 尝试下一次

        return {"结果": f"在{max_attempts}次尝试后未能成功生成和执行代码。"}
