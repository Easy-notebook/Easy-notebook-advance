# 1. 基础系统消息模板
PREDICTION_INFERENCE_TEMPLATE = """你是一个数据科学专家，专注于特征工程、模型训练和预测推断。你擅长使用各种特征工程技术来提升模型性能，并基于处理后的数据集训练模型进行预测。
1. 数据科学名词的定义：
   1. 预测问题：
      预测问题的目标是预测响应变量在未来数据中未观察到的值。大多数预测算法通过近似 （当前/历史）观察到的响应值与预测特征（其他变量）之间的关系来实现。如果这些基本的观察到的关系在未来仍然成立，那么它们可以用于生成对未来数据中未观察到的响应的预测。
   2. 预测算法：
      预测算法旨在根据预测变量（也称为协变量或预测特征）的值来预测响应变量的值。预测算法通常通过找到预测变量的某种特定组合，使其组合值尽可能接近实际响应值。如果算法可以证明在响应已知的数据上效果良好，那么它也可以用于预测类似未来数据中响应未知的情况（hypothesis算法捕捉到的预测变量和响应之间的关系在未来数据中也成立）
   3. 预测性能的量化指标：
      1.均方误差（MSE）、平均绝对误差（MAE）和中位数绝对偏差（MAD）是三个用于评估连续响应预测的性能指标。MSE和MAE通过将观察和预测响应代入均方损失和绝对损失函数计算得到。MAD通过将观察和预测响应代入绝对值损失的中位数（而不是平均值）计算得到。每个指标的值越小表示预测性能越好。
      2.相关系数和R平方：观察和预测响应之间的相关系数接近0表示观察和预测响应之间没有明显的线性关系（非常差的性能），而观察和预测响应之间的相关系数接近1表示预测和观察响应之间具有非常强的线性关系。
   4. 响应变量：
      响应变量是预测问题中需要预测的变量。
   5. 预测变量：
      预测变量是预测问题中用于预测响应变量的变量。

3.注意：如果一定要对离散型变量进行数值转换，请使用Label encoder

4.在数据清理和EDA探索中，你得到了以下信息：
数据科学项目描述: {problem_description}
数据背景描述: {context_description}
EDA分析后的相关总结 : {eda_summary}
"""


FEATURE_ENGINEERING_TEMPLATE_2 = """Task: Generate Feature Engineering Recommendations
Task Description: Generate feature engineering recommendations based on the problem description and background information.

Input Data:
1. Data Science Project Description: {problem_description}
2. Background Context: {context_description}
3. Dataset Column Names: {column_names}

Requirements:
1. Generate at least two methods, preferably three:
   - First method (REQUIRED): Feature Creation/Transformation
     * Select one or more from: PCA dimensionality reduction, LDA dimensionality reduction, discretization, standardization, normalization, logarithmic transformation, square root transformation, etc.
   - Second method (RECOMMENDED): Business-Based Feature Combinations
     * Create new features with practical business/physical meaning by combining existing columns
   - Third method (REQUIRED): Feature Selection
     * Select one from: variance selection, correlation coefficient selection, mutual information selection, RFE selection, etc.
2. For feature creation/transformation methods, specify that transformations should be applied to all potential predictor variables, excluding ID-type columns.

Output Requirements:
- Response must be in English only
- Provide detailed justifications for why each method is appropriate for this project

Output Format:
```json
[
  {{"feature_engineering_method": "Feature Creation/Transformation", "description": "Detailed explanation of why this method is suitable for this data science project"}},
  {{"feature_engineering_method": "Business Feature Creation", "description": "Detailed explanation of the physical meaning of this new feature and why it's suitable for this data science project"}},
  {{"feature_engineering_method": "Feature Selection Method", "description": "Detailed explanation of why this method is suitable for this data science project"}}
]
```
"""

MODELING_METHODS_TEMPLATE_2 = """Task: Generate Modeling Method Recommendations
Task Description: Based on the problem description and background information, generate up to three modeling methods ranked from best to worst.

Input Data:
1. Data Science Project Description: {problem_description}
2. Background Context: {context_description}
3. EDA Analysis Summary: {eda_summary}

Output Requirements:
- Provide up to three modeling methods in JSON format ordered from best to worst
- IMPORTANT: Response must be in English only
- Include detailed implementation descriptions for each method
- you could not write ordered list, should write <br> to break line

Output Format:
```json
[
  {{"method": "Modeling Method Name", "description": "Detailed explanation of how to implement this method"}},
  {{"method": "Modeling Method Name", "description": "Detailed explanation of how to implement this method"}}
]
```
"""

COMBINED_MODEL_CODE_TEMPLATE = """任务：模型训练与评估代码生成
任务描述：根据指定的建模方法和特征工程方法，生成用于训练和评估的 Python 代码。

可用的工具函数：
{tools}

工具函数描述：
{tool_descriptions}

输入数据：
1. 模型: {models}
2. 数据科学项目: {problem_description}
3. 数据背景: {context_description}
4. csv数据路径: {csv_path}
5. csv数据变量预览: {csv_columns}
6. 特征工程方法: {feature_engineering_methods}
7.响应变量以及列信息: {response_variable}

输出要求：
请根据以下要求生成 Python 代码：
0.读取到数据集后，先把数据集分为训练集和测试集，确保三种模型方法用一个训练集和测试集训练和评估
1.工具函数已经默认导入，你给出的代码不需要重新import。函数应能工具函数进行数据处理，必要时可扩展实现其他处理函数。按照工具函数描述正确处理数据。
2.在开始特征工程前，首先将响应变量和预测变量进行分离。不要对响应变量进行特征变换！对所有预测变量进行特征变换，在这一步骤中保存原始变量即keep_original填True，对训练集转换时不用填写scale参数，对测试集转换时填写对训练集转换时训练好的scaler参数，得到特征池
3.初始化3种不同数量的特征(n1, n2, n3)，对特征池中的所有变量进行特征选择，接收所有被选择的特征列表。得到三个特征集，每个模型都要使用这三种不同数量的特征集进行训练和评估。
4.使用训练集训练模型。训练前检查一下响应变量没有泄露到预测变量。
5.使用测试集评估模型性能，并生成相关的评价指标，如果响应变量是离散型，评估的结果也应该是离散型的结果。
6.可视化模型性能（如残差图、实际值与预测值的对比）
7.结果应存储在变量 result 中，需包含：
  - 每种特征数量下选择的特征列表
  - 每个模型在每种特征数量下的评估指标和性能结果（共9个结果）
8.图表应保存在数据路径所在目录下的'[数据集名称_model_plots]'文件夹中，如果该文件夹不存在则创建。文件名应包含模型方法名和特征数量
9.特征工程和模型训练评估部分写成一个完整的函数，入参是csv_path，返回值是result
10.逻辑回归模型为了尽量收敛，至少迭代2000次

输出数据：
生成的 Python 代码，格式如下：
```python
def train_and_evaluate_models(csv_path: str) -> list: 
    # 创建图片保存目录
    csv_dir = os.path.dirname(csv_path)
    dataset_name = os.path.basename(csv_path).split('.')[0]
    plot_dir = os.path.join(csv_dir, f'{{dataset_name}}_model_plots')
    os.makedirs(plot_dir, exist_ok=True)

    data = pd.read_csv(csv_path)

    # 特征数量列表
    feature_counts = [n1, n2, n3]  # 三种不同的特征数量

    [特征工程和特征选择]
    [模型训练和评估,一共训练3*3=9个模型]
    
    # 存储所有组合的结果
    all_combinations = []
    
    # 遍历所有模型和特征数量组合
    for model_name, model in models.items():
        for feature_count in feature_counts:
            # 获取当前特征集
            features = selected_features_sets[feature_count]
            
            # 训练和评估模型
            [训练和评估代码]
            
            # 添加结果到列表
            combination = {{
                'dataset': os.path.basename(csv_path),
                'model': model_name,
                'feature_count': feature_count,
                'features': features,
                'metrics': {{
                    '指标1': ...,
                    '指标2': ...,
                    '指标3': ...,
                    '...': ...
                }}
            }}
            all_combinations.append(combination)
    
    return all_combinations

result = train_and_evaluate_models(传入的csv数据路径)
print(result)
```
"""

# 5. 响应变量识别模板
RESPONSE_VARIABLE_TEMPLATE = """任务：识别响应变量
任务描述：根据问题描述、背景信息和数据集列名分析并识别需要预测的响应变量。

输入数据：
1. 数据科学项目描述: {problem_description}
2. 数据背景描述: {context_description}
3. 数据集列名: {column_names}

注意：
1. 响应变量是预测问题中需要预测的目标变量，可能有一个或多个（如TRUE/FALSE，YES/NO）
2. 需要明确指出每个变量的类型（连续型/离散型）
3. 响应变量必须是数据集中已有的列名

输出数据：
包含响应变量信息的 JSON 数组，格式如下：
```json
[
    {{
        "响应变量": "变量名称1",
        "变量类型": "连续型/离散型",
        "说明": "为什么这个变量是响应变量的解释"
    }},
    {{
        "响应变量": "变量名称2",
        "变量类型": "连续型/离散型",
        "说明": "为什么这个变量是响应变量的解释"
    }}
]
```

注：如果只有一个响应变量，数组中只包含一个元素即可。
"""

# 6. 批量数据集评估模板
BATCH_EVALUATION_TEMPLATE = """任务：批量数据集评估代码生成
任务描述：根据已有的模型训练评估代码，生成用于评估多个数据集性能的代码。

输入数据：
1. 数据集目录路径: {datasets_dir}
2. 已有的特征工程模型训练代码内容: {model_code}
3. 数据科学项目描述: {problem_description}
4. 数据背景描述: {context_description}

首先根据数据科学项目描述选择最合适的评估指标：
- 对于回归问题：
  - 如果特别关注预测的精确性，优先考虑 MSE（均方误差）
  - 如果需要评估模型的解释能力，优先考虑 R2
- 对于分类问题：
  - 准确率（Accuracy）：适用于类别平衡的分类问题
  - F1分数：适用于类别不平衡的分类问题

遍历指定目录下的所有CSV数据集，对每个数据集调用已有的评估函数，收集所有数据集-算法-特征数量组合的评估指标，按照选定的评估指标对结果进行排序，输出性能最好的前5个数据集-算法-特征数量组合，将这5个组合的结果储存到result变量中并输出。

注意事项：
- 你给出的代码需要import所有特征工程模型训练代码中使用过的包。
1. 已有的模型训练代码中包含函数 train_and_evaluate_models(csv_path)，该函数：
   - 输入参数是单个数据集的路径
   - 返回包含多个模型评估结果的字典，格式为：
     {{
       'top_5_combinations': [
         {{
           'dataset': '数据集名称',
           'model': '模型名称',
           'feature_count': '特征数量',
           'features': ['特征1', '特征2', ...],  # 该组合使用的特征列表
           'metrics': {{
             'metric1': 值1,
             'metric2': 值2,
             ...
           }}
         }},
         // ... 其他4个最佳组合 ...
       ],
       'evaluation_metric': '用于排序的评估指标名称'
     }}
2. 不需要重新实现模型训练和评估逻辑，完整复刻上传函数的完整逻辑代码，不要省略代码，但是代码中的绘图部分需要删除
3. 主要任务是遍历目录中的所有数据集，收集评估结果并找出最佳组合。
4. 请确保找到的五个组合的评估指标的值是不同的，如果相同，则需要更换其中一个指标值相同的组合。
5. 对最后找到的五个数据集-算法-特征数量组合的相关评价指标进行可视化：
   - 创建一个条形图，展示这5个最佳组合的评估指标得分
   - X轴显示组合信息（数据集名称、模型名称、特征数量）
   - Y轴显示选定的评估指标得分
   - 在每个柱子上方显示具体的评估指标数值
   - 图表标题需要包含所使用的评估指标名称
   - 将图片储存在与数据集同一个目录的plot文件夹中，文件名为'top_5_combinations.png'

输出数据：
生成的 Python 代码，格式如下：
```python
def train_and_evaluate_models(csv_path):
    [上传代码的主要逻辑，不要省略]

def evaluate_all_datasets(datasets_dir: str) -> dict:
    all_results = []  # 存储所有组合的结果
    csv_files = [f for f in os.listdir(datasets_dir) if f.endswith('.csv')]
    
    # 评估每个数据集
    for csv_file in csv_files:
        csv_path = os.path.join(datasets_dir, csv_file)
        result = train_and_evaluate_models(csv_path)
        [Store result in result_all]

    
    [Find the best 5 combinations, these 5 combinations have different evaluation metric values, replace combinations if same. Store in result_best_5 variable]
    return result_best_5

[Call function, store evaluation results dictionary in result variable, conform to above structure, with top_5_combinations and evaluation_metric where dataset, model, feature_count, features, metrics are all required fields]
```
"""

# Result Summary Template
RESULT_SUMMARY_TEMPLATE = """Task: Model Evaluation Result Summary
Task Description: Sort model evaluation results by performance and clearly display detailed information for each combination.

Input Data:
Evaluation results dictionary: {results}

Output Format:
```markdown
# Model Evaluation Result Rankings

## Top 1
- Dataset:
- Model:
- Feature Count:
- Features Used:
- Evaluation Metrics and Corresponding Scores:

## Top 2
[Similar format]

## Top 3
[Similar format]

## Top 4
[Similar format]

## Top 5
[Similar format]
```
"""

# Training Strategy Generation Template
TRAINING_EVALUATION_STRATEGY_TEMPLATE = """Based on the problem description, context, and EDA summary:
Problem: {problem_description}
Context: {context_description}
EDA Summary: {eda_summary}

Feature Engineering Methods: {feature_methods}
Modeling Methods: {modeling_methods}

Generate a comprehensive training and evaluation strategy that includes:
1. Data preprocessing steps
2. Feature engineering pipeline
3. Model selection and tuning approach
4. Cross-validation strategy
5. Evaluation metrics
6. Model comparison framework

Return as a structured list of strategy components."""

# 多方法模型训练代码生成模板
COMPREHENSIVE_MODEL_TRAINING_CODE_TEMPLATE = """Task: Comprehensive Model Training and Evaluation Code Generation
Task Description: Generate Python code for training and evaluating multiple models with multiple feature engineering approaches.

Input Data:
Training Strategy: {training_strategy}
CSV File Path: {csv_file_path}
Response Variable Analysis: {response_variable_analysis}

Problem: {problem_description}
Context: {context_description}
EDA Summary: {eda_summary}

Code Requirements:
1. **Data Preparation:**
   - Load the CSV data from: {csv_file_path}
   - Split data into training and testing sets (80/20 split)  
   - Separate response variable from predictor variables using response variable analysis

2. **Directory Structure Setup:**
   - Create output directories in the same folder as the CSV file:
     * models/ folder for saving trained models
     * plots/ folder for visualizations  
     * logs/ folder for training logs
     * results/ folder for evaluation results

3. **Feature Engineering Pipeline:**
   - Apply ALL feature engineering methods from the training strategy
   - Use different feature counts (e.g., 10, 20, 30 features) to create multiple feature sets
   - Ensure proper scaling for training and test sets
   - Create a feature pool with all engineered features

4. **Feature Selection:**
   - Implement feature selection for each target feature count
   - Generate 3 different feature sets with different numbers of features
   - Store selected feature lists for each combination

5. **Model Training and Evaluation:**
   - Train ALL modeling methods from the training strategy
   - For each model, test with each feature set (3 feature sets per model)
   - **Save each trained model** to models/ folder with naming: model_name_features_N.pkl
   - Calculate comprehensive performance metrics (accuracy, precision, recall, F1, etc.)
   - Include cross-validation for robust evaluation
   - **Log training process** to logs/ folder

6. **Results Organization:**
   - Store results in structured format with model name, feature count, feature list, and metrics
   - Generate visualizations (confusion matrix, ROC curves, feature importance plots)
   - Save plots to plots/ folder with clear naming
   - **Save detailed results** to results/ folder as JSON and CSV

7. **Model and Data Persistence:**
   - Save all trained models with pickle
   - Save feature transformers/scalers for future use
   - Save training/test splits for reproducibility
   - Log model performance and training details

8. **Output Format:**
   - Return a list of dictionaries with format:
     [{{'model': 'model_name', 'feature_count': n, 'features': [...], 'metrics': {{}}, 'model_path': 'path/to/saved/model.pkl'}}]
   - Include evaluation results for all model-feature combinations
   - Include paths to saved models and result files

9. **Function Structure:**
   - Create function: def train_and_evaluate_models(csv_path: str) -> list
   - Function should be self-contained and take only the CSV path as input
   - Return comprehensive results including file paths

10. **Error Handling:**
    - Include proper try-catch blocks
    - Handle different data types (categorical/continuous response variables)
    - Validate data integrity
    - Log all errors to logs/ folder

Generate complete, executable Python code wrapped in ```python``` tags.
The code should handle multiple models and multiple feature engineering approaches systematically."""

# 训练结果分析模板
TRAINING_RESULTS_ANALYSIS_TEMPLATE = """Based on the training results and strategy:
Training Results: {training_results}
Training Strategy: {training_strategy}

Problem: {problem_description}
Context: {context_description}

Analyze the training results and provide:
1. Model performance comparison
2. Feature engineering effectiveness
3. Best performing models identification
4. Performance metrics analysis
5. Recommendations for model selection

Return as a structured analysis report."""

# 稳定性分析总结模板
STABILITY_ANALYSIS_SUMMARY_TEMPLATE = """Based on batch evaluation results:
Batch Evaluation Strategy: {batch_evaluation_strategy}
Evaluation Approach: {evaluation_approach}

Problem: {problem_description}
Context: {context_description}

Generate a comprehensive stability analysis summary that includes:
1. Model performance consistency across datasets
2. Stability metrics and variance analysis
3. Robustness assessment
4. Risk factors identification
5. Reliability recommendations

Return as a structured analysis report."""

# 批量评估策略模板
BATCH_EVALUATION_STRATEGY_TEMPLATE = """Based on the stability analysis requirements:
Stability Strategy: {stability_strategy}
Dataset Variations: {dataset_variations}
Model Training Code: {model_training_code}

Problem: {problem_description}
Context: {context_description}

Generate a comprehensive batch evaluation strategy that includes:
1. Evaluation framework design
2. Performance metrics selection
3. Batch processing approach
4. Results aggregation method
5. Statistical analysis plan

Return as a structured evaluation strategy."""

# 批量评估代码生成模板
BATCH_EVALUATION_CODE_TEMPLATE = """Based on the batch evaluation strategy:
{batch_evaluation_strategy}

Original CSV File Path: {csv_file_path}
Model Training Code Reference: {model_training_code}

Problem: {problem_description}
Context: {context_description}

Generate Python code for batch model evaluation that implements the strategy.
The code should:
1. **Load Dataset Variations:** Load all dataset variations from the stability_analysis/ folder
2. **Load Trained Models:** Load models from the models/ folder created by training code
3. **Batch Evaluation:** Apply loaded models to all dataset variations
4. **Results Aggregation:** Collect and aggregate results across all combinations
5. **Statistical Analysis:** Perform statistical comparison of results
6. **Output Organization:** Save results to batch_evaluation_results/ folder

Code Requirements:
- Use the original CSV file path to locate related files: {csv_file_path}
- Find dataset variations in: [csv_dir]/stability_analysis/
- Find trained models in: [csv_dir]/models/
- Save batch results to: [csv_dir]/batch_evaluation_results/
- Return structured results including file paths and performance metrics

Return the code wrapped in ```python``` tags."""

# 评估报告模板生成模板
EVALUATION_REPORT_TEMPLATE_GENERATION = """Based on the stability analysis:
{stability_summary}

Problem: {problem_description}
Context: {context_description}

Generate a comprehensive evaluation report template in markdown format that includes:
1. Executive summary section
2. Methodology overview
3. Results presentation framework
4. Performance metrics tables
5. Stability analysis section
6. Conclusions and recommendations

Return as a markdown template that can be filled with actual results."""

# 批量评估结果分析模板
BATCH_EVALUATION_RESULTS_ANALYSIS_TEMPLATE = """Based on the batch evaluation results:
Batch Results: {batch_results}
Evaluation Strategy: {evaluation_strategy}

Problem: {problem_description}
Context: {context_description}

Analyze the batch evaluation results and provide:
1. Model performance consistency across datasets
2. Stability metrics and variance analysis
3. Best and worst performing variations identification
4. Statistical significance of differences
5. Robustness assessment
6. Recommendations for model reliability

Return as a structured batch analysis report."""