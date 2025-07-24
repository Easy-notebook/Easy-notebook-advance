# 模型结果评估模板
RESULTS_EVALUATION_TEMPLATE = """你是一个数据科学专家，专注于使用PCS原则评估机器学习模型在测试集上的表现。
1. 数据科学名词的定义：
    1. 预测拟合：
      在PCS 框架中,预测拟合(或简称"拟合")是指算法与用于训练该算法的特定 清理/预处理训练数据集的配对。
    2. 单一 PCS 预测拟合：
      作为传统方法的真实数据科学对应方法,这种方法首先识别具有最高验证集预测性能的单一 PCS 预测拟合。然后使用所选预测拟合为新数据点生成未来预测。如果表现最好的拟合在验证集上没有通过特定问题的可预测性筛选(即,如果表现最好的算法没有达到领域问题规定的足够性能),则不应使用任何预测拟合。通过考虑跨越多种替代算法和清理/预处理选项的 PCS 预测拟合,这种方法在计算预测时考虑了算法和清理/预处理选择带来的不确定性。然而,通过仅提供单一预测值作为最终输出,这种不确定性没有传达给用户。
    3. PCS 集成：
      这种方法不选择单一 PCS 预测拟合,而是从通过特定问题的可预测性筛选的 PCS 预测拟合创建一个集成。一种为未来数据点计算集成响应预测的方法是计算连续响应的平均响应预测或二元响应的多数投票。通过考虑一系列替代算法和清理/预处理判断选项,这种方法生成最终预测结果在计算预测时考虑了算法和清理/预处理判断带来的不确定性。然而,通过提供单一预测值作 为输出,这种方法也没有将这种不确定性传达给用户。
    4. PCS 校准的 PPIs:
      这种方法不是为每个新数据点提供单一预测(例如,使用单一拟合或集成),而是使用通过特定问题的可预测性筛选的拟合生成一个区间。这些区间称为预测扰动区间(PPIs)。 由于区间的长度通常取决于用于创建区间的预测数量,区间被校准以达到预定的覆盖率水平 (例如,调整区间的长度以确保 90% 的验证集区间包含观察响应)。目前,这种基于区间的方法仅适用于连续响应预测。通过提供基于替代算法和清理/预处理选项的区间,这种方法可以向用户传达基础预测的不确定性。
    5.训练集、验证集、测试集
      训练集和验证集是我们知道真实标签的数据,其中我们在训练集上训练,在验证集上评估模型性能
      测试集是真实数据中我们不知道真实标签的数据

2. Relevant Technical Analysis and Operation Methods:
    1. 使用 PCS 选择单一预测拟合
        1. 可预测性筛选:确定哪个拟合具有最佳验证集性能。
            a. 使用不同的清理和预处理判断组合创建并记录清理/预处理训练集和验证集的多个版本。设定最终清理/预处理的数据集数量为 K。  
            b. 使用每个 K 个清理/预处理后的训练数据集训练每个预测算法(例如,LS,RF 等)。如果有 L 个不同的算法,你将最终获得 K × L 个预测拟合。  
            c. 使用每个 K × L 个预测拟合为每个验证集观测生成响应预测。
            d. 确定哪个预测拟合在所有 K × L 个拟合中具有最佳验证集预测性能。这是最佳 PCS 拟合。
        2. 为新观测计算预测:可以使用最佳 PCS 拟合计算新观测的预测。  
        3. 测试集评估:使用测试集观测评估你的最佳拟合,以提供其预测性能的最终独立评估
    2. PCS 集成
        1. 可预测性筛选:确定哪些拟合将包括在集成中。  
            a. 使用不同的清理和预处理判断组合创建并记录清理/预处理训练集、验证集和测试集的多个版本。设定最终清理/预处理的数据集数量为 K。  
            b. 使用每个 K 个清理/预处理后的训练数据集训练每个相关的预测算法(例如,LS,RF 等)。 如果有 L 个不同的算法,你将最终获得 K × L 个预测拟合。  
            c. 使用每个 K × L 个预测拟合为每个验证集观测生成响应预测。
            d. 评估每个 K × L 个拟合的验证集预测性能(例如,使用 rMSE 或相关性来评估连续响应, 使用准确性或 AUC 来评估二元响应)。
            e. 通过保留验证集预测性能最好的拟合(例如,前 10% 的拟合)进行可预测性筛选。这个阈值(例如,前 10% 的拟合)可以基于领域知识或根据集成在验证集上的预测性能进行调整。
        2. 使用集成为新观测计算预测:可以基于通过可预测性筛选步骤的拟合(例如,前 10% 的拟合) 通过平均其连续预测响应或取其二元预测响应的多数票来计算集成的预测。  
        3. 测试集评估:使用测试集观测评估你的集成的预测性能,以提供其预测性能的最终独立评估。

3. In prediction inference exploration, we have completed the following steps:
    1. 我们已经通过PCS法则创建了K 个清理/预处理的判断组合，创建了L 个不同的算法
    2. 我们已经把最开始传入的数据划分为训练集和验证集，并已经在训练集上训练、预测集上评估了K × L 个预测拟合
    3. 我们已经得到最佳的5个预测拟合在验证集上的评估结果
    4. 我们将提供清洗得到不同数据集、批训练不同数据集的相关代码
    5. 接下来，我需要您帮助我使用 PCS 选择单一预测拟合和PCS 集成，我们将提供不知道真实标签的测试集，用最佳的5个预测拟合在训练集上训练算法并在测试集上完成拟合

4. Notes
  1. To avoid escape errors, please use / when defining paths, e.g., ...MyAgent/obesity_risks/1/data/test.csv
5. Related Background
Data science project description: {problem_description}
Data background description: {context_description}
Best five predictive fits: {best_five_result}

"""

# 生成最佳五个数据集的代码模板
BEST_FIVE_DATASETS_TEMPLATE = """任务：生成评估数据集代码
任务描述：根据生成训练数据集的代码，创建一个新的Python代码，该代码指定生成评估数据集。如果数据集中存在ID type的变量，请不要删除

输入数据：
1. 评估数据集路径: {original_dataset_path}
2. 训练数据集生成代码: 
```python
{multiple_datasets_code}
```

要求：
1. 保持原始代码完整逻辑，只是把训练数据集代码中训练数据集路径替换为评估数据集路径
2. 生成的数据集必须保存在评估数据集所在目录下的dataset文件夹中
   - 例如：如果评估数据集路径为 /path/to/original.csv
   - 则生成的数据集应保存在 /path/to/dataset/ 目录下

输出数据：
```python
[完整的python代码]
```
"""

# 模型评估代码模板
MODEL_EVALUATION_TEMPLATE = """任务：生成模型评估代码
任务描述：使用最佳预测拟合对应的数据集和算法来训练模型并评估指定数据集。

输入数据：
1. 训练数据集路径: {train_dataset_path}
2. 评估数据集路径: {eval_dataset_path}
3. 原始建模代码: 
```python
{model_training_code}
```

要求：
0. 原始建模代码中的特征工程中的工具函数已经使用from tools.ml_tools import transform_features,reduce_dimensions,select_features,discretize_features,create_polynomial_features提前声明,生成的代码中直接调用即可，不需要重声明和定义
1. 从最佳五个拟合结果中获取：
   - 最佳算法选择
   - 对应的训练数据集版本
2. 首先从路径｛[训练数据集路径]/最佳拟合对应的训练数据集名称｝读取训练数据集,从｛[评估数据集路径]/最佳拟合对应的训练数据集名称｝读取评估数据集
3. 接着,使用原始建模代码调用tools.ml_tools中的特征工程函数对训练数据集和评估数据集进行特征转换,请注意评估数据集中并没有预测变量,特征转换时依照原始建模代码对所有的除预测变量的列进行转换，而不是只对最佳预测拟合选择的特征进行转换。转换训练集时不用填写scale参数，转换评估集时填写对训练集转换时训练好的scaler参数
4. 接着,使用最佳预测拟合中的算法以及选择的特征训练模型,注意使用完整的训练数据集训练，不需要再次划分为训练集和测试集
5. 最后,使用刚刚训练好的算法评估评估数据集,评估数据集中没有预测变量的标签，这一部分需要模型预测
6. 生成预测结果文件：
   - 保存在评估数据集同级目录下的predictions文件夹中
      - 例如：如果评估数据集路径为 /path/to/dataset/
      - 则生成的数据集应保存在 /path/to/dataset/predictions/ 目录下
   - 文件名格式为：best_prediction.csv
   - 包含原始数据集的所有列
   - 添加一个新列存储预测结果
7. 将生成的文件路径存储到result变量中，在代码的最后直接调用该函数，不要使用if __name__ == "__main__"

输出数据：
```python
[完整的python代码]
```
"""

# 结果评估框架生成模板
RESULTS_EVALUATION_FRAMEWORK_TEMPLATE = """Based on stability analysis results and report template:
Stability Summary: {stability_summary}
Report Template: {report_template}

Problem: {problem_description}
Context: {context_description}
Best Results: {best_five_result}

Generate a comprehensive results evaluation framework that includes:
1. Evaluation criteria and metrics
2. Validation methodology
3. Quality assessment standards
4. Performance benchmarks
5. Report generation guidelines

Return as a structured evaluation framework."""

# 测试数据集策略模板
TEST_DATASET_STRATEGY_TEMPLATE = """Based on the evaluation framework:
Evaluation Framework: {evaluation_framework}

Problem: {problem_description}
Context: {context_description}

Generate a comprehensive test dataset strategy that includes:
1. Test data generation approaches
2. Dataset validation criteria
3. Quality control measures
4. Coverage requirements
5. Sampling strategies

Return as a structured test dataset strategy."""

# 测试数据集生成计划模板
TEST_DATASETS_PLAN_TEMPLATE = """Based on the test strategy and evaluation framework:
CSV File Path: {csv_file_path}
Test Strategy: {test_strategy}
Evaluation Framework: {evaluation_framework}

Problem: {problem_description}
Context: {context_description}

Generate a detailed plan for creating test datasets that includes:
1. Specific dataset variations to create
2. Generation parameters and settings
3. Validation procedures for each dataset
4. Expected outcomes and quality metrics
5. Implementation timeline

Return as a structured test datasets generation plan."""

# 测试验证代码模板
TEST_VALIDATION_CODE_TEMPLATE = """Based on the test generation plan:
Test Generation Plan: {test_generation_plan}
Original CSV File Path: {csv_file_path}

Problem: {problem_description}
Context: {context_description}

Generate Python code for test dataset generation and validation that implements the plan.

Code Requirements:
1. **File Path Management:**
   - Use original CSV path: {csv_file_path}
   - Create test_datasets/ folder in same directory as CSV
   - Generate multiple test dataset variations

2. **Test Dataset Generation:**
   - Create variations based on the generation plan
   - Save each test dataset with descriptive names
   - Log generation process and validation results

3. **Quality Validation:**
   - Validate data integrity for each generated dataset
   - Check statistical properties vs original data
   - Save validation reports to test_datasets/validation_reports/

4. **Output Organization:**
   - Save test datasets to: [csv_dir]/test_datasets/
   - Save validation logs to: [csv_dir]/test_datasets/validation_reports/
   - Return list of generated dataset paths and validation results

5. **Function Structure:**
   - Create function: def generate_test_datasets(csv_path: str) -> dict
   - Return: {{'generated_datasets': [...], 'validation_results': [...], 'summary': {{...}}}}

The code should create multiple test dataset variations and validate their quality.
Return the code wrapped in ```python``` tags."""

# 最终评估策略模板
FINAL_EVALUATION_STRATEGY_TEMPLATE = """Based on evaluation components:
Evaluation Framework: {evaluation_framework}
Test Plan: {test_plan}
Validation Code: {validation_code}

Problem: {problem_description}
Context: {context_description}

Generate a comprehensive final evaluation strategy that includes:
1. Complete evaluation methodology
2. Final testing procedures
3. Results analysis framework
4. Quality assurance measures
5. Success criteria and metrics

Return as a structured final evaluation strategy."""

# DCLS最终报告模板
DCLS_FINAL_REPORT_TEMPLATE = """Generate a comprehensive DCLS (Data-Centric Learning Science) final report:
Problem Description: {problem_description}
Context Description: {context_description}
Final Evaluation Strategy: {final_evaluation_strategy}
Best Results: {best_five_result}

The report should include:
1. Executive Summary
2. Methodology Overview
3. Data Analysis Results
4. Model Performance Evaluation
5. Stability Analysis Findings
6. Final Recommendations
7. Implementation Guidelines
8. Risk Assessment and Mitigation
9. Future Research Directions

Return as a comprehensive markdown report."""

# 可行性建议模板
ACTIONABLE_RECOMMENDATIONS_TEMPLATE = """Based on the comprehensive DCLS report:
DCLS Report: {dcls_report}

Problem: {problem_description}
Context: {context_description}

Generate specific, actionable recommendations that include:
1. Immediate next steps
2. Implementation priorities
3. Resource requirements
4. Success metrics
5. Timeline estimates
6. Risk mitigation strategies
7. Quality checkpoints

Return as a structured list of actionable recommendations."""

# 最终评估代码模板
FINAL_EVALUATION_CODE_TEMPLATE = """Generate Python code for final model evaluation:
Evaluation Strategy: {evaluation_strategy}
Test Validation Code: {test_validation_code}
Original CSV File Path: {csv_file_path}

Problem: {problem_description}
Context: {context_description}

Generate comprehensive Python code that implements the evaluation strategy.

Code Requirements:
1. **File Path Management:**
   - Use original CSV path: {csv_file_path}
   - Load best models from: [csv_dir]/models/
   - Load test datasets from: [csv_dir]/test_datasets/
   - Save final results to: [csv_dir]/final_evaluation_results/

2. **Model Loading and Evaluation:**
   - Load the best performing models from training phase
   - Apply models to all test dataset variations
   - Calculate comprehensive performance metrics
   - Compare performance across different test scenarios

3. **Statistical Analysis:**
   - Perform statistical comparisons between models
   - Calculate confidence intervals and significance tests
   - Analyze performance stability across test variations
   - Generate statistical summary reports

4. **Results Organization:**
   - Save evaluation metrics to: [csv_dir]/final_evaluation_results/metrics.json
   - Save detailed reports to: [csv_dir]/final_evaluation_results/detailed_report.csv
   - Save visualizations to: [csv_dir]/final_evaluation_results/plots/
   - Create comprehensive evaluation summary

5. **Error Handling and Logging:**
   - Include proper error handling for model loading and data processing
   - Log evaluation process to: [csv_dir]/final_evaluation_results/evaluation.log
   - Validate data integrity and model compatibility
   - Handle missing models or test data gracefully

6. **Function Structure:**
   - Create function: def final_model_evaluation(csv_path: str) -> dict
   - Return: {{'evaluation_results': {...}, 'model_rankings': [...], 'summary': {{...}}, 'file_paths': {{...}}}}

The code should provide a comprehensive final evaluation of all models using the generated test datasets.
Return the code wrapped in ```python``` tags."""