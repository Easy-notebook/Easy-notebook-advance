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
        [把result储存到result_all中]

    
    [找到最好的5个组合，这5个组合的评估指标值是不同的，如果相同更换组合。并储存到result_best_5变量]
    return result_best_5

[调用函数，把评估结果的字典储存到result变量,符合上述结构，具有top_5_combinations和evaluation_metric其中dataset、model、feature_count、features、metrics都是必有的字段]
```
"""

# 添加结果总结模板
RESULT_SUMMARY_TEMPLATE = """任务：模型评估结果总结
任务描述：将模型评估结果按性能排序并清晰展示每个组合的详细信息。

输入数据：
评估结果字典: {results}

输出格式：
```markdown
# 模型评估结果排名

## Top 1
- 数据集：
- 模型：
- 特征数量：
- 使用的特征：
- 评估指标及相应得分：

## Top 2
[类似格式]

## Top 3
[类似格式]

## Top 4
[类似格式]

## Top 5
[类似格式]
```
"""