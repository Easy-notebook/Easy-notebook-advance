# 1. 基础系统消息模板
PCS_EVALUATION_TEMPLATE = """你是一个数据科学专家，专注于基于PCS原则评估其他代理的工作，提出相关疑问。注意用英文。
1. 数据科学名词的定义：
   1. PCS框架：
      在数据科学生命周期的每个步骤，我们需要对从数据中获得的证据的可信度进行实证评 估。可预测性、可计算性和稳定性（PCS）框架提供了进行这种评估的指南。实施 PCS 原则需要使用计算上可行的探索来确保你的结果是可预测和稳定的。
   2. 可预测性：
      如果数据驱动的结果可以在新的、相关的场景中重新出现（即，可以推广到新的场景），则这些结果是可预测的。在你将结果应用到未来或外部数据时，它们成立，这是获得可预测性的 强有力证据。在没有可用的未来/外部数据的情况下，可以使用验证集替代来评估结果。如果你的分析和算法能够揭示领域内广为人知的结果和关系，可以获得额外的可预测性证据。
   3. 稳定性：
      如果数据驱动的结果在整个数据科学生命周期（DSLC）中的合理替代扰动下不发生显著变化，则这些结果是稳定的。PCS稳定性分析的目标是尝试探索与我们的结果相关的许多不确定性来源；它们可能会使我们的结果有所不同。虽然不可能探索与每个结果相关的所有不确定性，但我们的目标是评估结果在数据收集过程、数据清理和预处理的主观判断以及算法选择的合理扰动（使用领域知识判定）下的稳定性。
   4. 可计算性：
      如果数据驱动的结果可以通过计算来实现，则这些结果是可计算的。PCS可计算性分析的目标是评估结果是否可以通过计算来实现，力求确保我们的计算是清晰、高效、可扩展和可重复的。
   5. 可重复性：
      存在一系列定义，从最弱的（证明在同一台计算机上重新运行原始代码时结果重新出现）到最强的（证明当一个完全独立的数据科学家团队收集他们自己的数据并编写自己的代码来回答相同问题时结果重新出现）。 每种形式的可重复性都可以被视为一种稳定性评估（对于所收集的数据、所编写的代码、进行分析的人等）和/或可预测性评估（如果重新评估涉及证明结果在使用新数据时重新出现）。鼓励您展示在您资源范围内的最强形式的可重复性。

2. 相关技术分析说明和可能的操作方法：
   1. 探索性数据分析结果的PCS审查：
      1. 结论的可预测性：
        • 一种方法是找到外部数据，验证结论是否在新的、相关的场景中重新出现。另一种说明该结果可预测性的方法是进行文献检索，看看是否存在其他研究得出相同结论。
      2. 结论的稳定性：
        数据收集过程、数据清洗和预处理，以 及数据可视化本身都存在不确定性。
        • 对数据扰动的稳定性
        • 对数据清洗和预处理所做的主观判断的稳定性
        • 对数据可视化所做的主观判断的稳定性
   2. 预测结果的 PCS 审查：
      1. 预测结果的可预测性：评估算法在未来或外部数据上的表现。
      2. 预测结果的稳定性：
        • 数据收集过程中的不确定性：考虑什么类型的数据扰动（例如，添加随机噪声和/或自助法）最类似于数据可能的测量或收集的过程
        • 我们的清理和预处理判断
        • 我们选择的算法

3.相关数据科学项目信息:
   数据科学项目描述: {problem_description}
   数据背景描述: {context_description}
"""

# 2. hypothesis生成模板
HYPOTHESIS_GENERATION_TEMPLATE_2 = """Task: PCS Review of Project Data
Purpose: Generate one hypothesis about data quality based on the preliminary analysis from the ProblemDefinitionAgent.

Input:
1. Project: {problem_description}
2. Context: {context_description}
3. Variables: {var_json}
4. Observation Unit: {unit_check}
5. Relevant Variables: {relevant_variables_analysis}

Output a single data quality hypothesis in JSON format:
```json
[
  {{
    "hypothesis": "A clear statement of your hypothesis about data quality",
    "verification_method": "Specific method to test this hypothesis",
    "expected_outcome": "What finding would confirm or refute this hypothesis"
  }}
]
```

Remember that this hypothesis should evaluate the quality, completeness, or consistency of the dataset rather than the business problem itself.
"""


# 3. EDA结论的PCS评估模板
EDA_PCS_EVALUATION_TEMPLATE = """任务：Eda 结论的PCS 评估结果分析
任务描述：根据执行代码的结果，对Eda结论的预测性、稳定性和可计算性进行分析，生成详细的评估报告。

输入数据：
1. 结论: {conclusion}
2. 评估结果: {result}

输出数据：
包含预测性、稳定性的评估 JSON：
```json
[
  {{
    "预测性": "结论在新数据中的再现性分析",
    "稳定性": "数据扰动下结论稳定性分析"
  }}
]
```
"""

# 4. 数据清理稳定性分析代码生成
DATA_CLEANING_STABILITY_TEMPLATE = """任务：数据清理稳定性分析代码生成
任务描述：基于传入的数据清理函数代码，生成用于评估数据清理和预处理判断稳定性的代码。通过调整清理函数的参数和工具函数的参数，生成多个清理版本的数据集。

输入数据：
1. CSV文件路径: {csv_path}
2. 数据信息: {data_info}
3. 清理函数代码: {cleaning_function}

可用的工具函数：
{tools}

工具函数描述：
{tool_descriptions}

输出要求：
1. 使用传入的清理函数代码作为基础，生成一个新函数来创建多个数据集版本
2. 新函数应该：
   - 保持原清理函数的核心逻辑不变
   - 在生成不同版本数据集的过程中，确保 remove_with_missing 和 convert_categorical 参数始终为 True, 如果存在remove_columns，默认始终删除。
   - 根据原始清理函数已经分组的列，通过改变每组列的参数，生成不同的数据集
3. 生成的数据集应保存在原始文件目录下的 'stability_analysis' 子目录中

输出格式：
```python
def clean_data:
[和原始清理函数的clean_data函数相同]

# 然后创建生成多个版本的函数
def generate_cleaning_versions(data_path):
    # 创建稳定性分析目录
    base_dir = os.path.dirname(data_path)
    stability_dir = os.path.join(base_dir, 'stability_analysis')
    os.makedirs(stability_dir, exist_ok=True)
    
    [从原始清理函数中获取缺失值填充变量分组]
    [从原始清理函数中获取异常值变量分组]
    '''
    例子
    group1_cols_fill = ['GDP', 'CPI']
    group2_cols_fill = ['失业率', '通货膨胀率']
    group1_cols_out = ['GDP', 'CPI']
    '''

    [定义每组可能的填充方法]
    [定义异常值处理方法]
    '''
    例子
    group1_fill_methods = ['mean', 'median', 'linear']
    group2_fill_methods = ['ffill', 'bfill']
    group1_out_methods = ['iqr', 'zscore']
    '''

    out_sensitivities = ['low', 'medium', 'high']

    # 举例：生成参数组合，实际情况根据clean函数的参数增加for循环，根据所分的变量组调整代码
    for g1_fill in group1_fill_methods:
        for g2_fill in group2_fill_methods:
            for handle_out in [True, False]:
                fill_missing_params = {{
                    g1_fill: group1_cols_fill,
                    g2_fill: group2_cols_fill
                }}
                
                if handle_out:
                    for out_method in group1_out_methods:
                        for sensitivity in out_sensitivities:
                            outlier_params = [
                                {{
                                    'method': out_method,
                                    'columns': group1_cols_out,
                                    'sensitivity': sensitivity
                                }}
                            ]
                            
                            filename = (
                                f"cleaned_data_rm_true"
                                f"_out{{handle_out}}"
                                f"_fill_g1_{{g1_fill}}_g2_{{g2_fill}}"
                                f"_out_g1_{{out_method}}_{{sensitivity}}"
                                f".csv"
                            )
                            
                            cleaned_data = [clean_data]
                            
                            output_path = os.path.join(stability_dir, filename)
                            cleaned_data.to_csv(output_path, index=False)
                            generated_files.append(filename)
                else:
                    filename = (
                        f"cleaned_data_rm_true"
                        f"_out{{handle_out}}"
                        f"_fill_g1_{{g1_fill}}_g2_{{g2_fill}}"
                        f".csv"
                    )
                    
                    cleaned_data = [clean_data]
                    
                    output_path = os.path.join(stability_dir, filename)
                    cleaned_data.to_csv(output_path, index=False)
                    generated_files.append(filename)
    
    return generated_files

data_path = [csv文件路径]
result = generate_cleaning_versions(data_path)
print(result)
```

清理数据集命名规则：
1. 基本格式：cleaned_data_[函数参数]_[填充参数]_[异常值参数].csv

2. 函数参数部分：
 - out{{True/False}}: 是否处理异常值
 - [其他可能的函数参数]
示例：rm_true_[other]_true

3. 填充参数部分：
   格式：fill_[组号]_[方法]
   示例：fill_g1_mn_g2_mo_g3_ct

4. 异常值参数部分：
   格式：out_[组号]_[方法]_[参数]
   - 组号：与原始清理函数中的分组对应
示例：out_g1_iqr_1.5_g2_zs_3.0

注意事项:
0. 必须确保生成的代码包含原始清理函数中调用部分处理的所有变量。新生成的函数应完整保留原始清理函数中的所有变量分组，不得遗漏或省略任何变量。只有fill_missing和handle_outliers需要参数字典。
1. 对于fill_missing_param，先判断该参数字典中有几组变量，再定于每组变量可能的method参数空间，最多3种，随机选择'ffill','bfill','mean','median','mode','interpolate','constant','knn'
2. 对于outlier_params，先判断该参数字典中有几组变量，再定义每组变量的method和sensitivity参数空间，其中method最多选择3种，sensitivity视情况评估一下生成数据集数量，过高可以不选择。
3. 根据每组变量可能的参数空间进行排列组合，比如一共有4组变量，每组参数空间都为3，则可以生成3^4=81个数据集
4. 是否处理异常值，也是一个可以排列组合的可选参数，可以选择True和False。
5. 默认是否填充缺失值参数都填True。
6. 可能还有其他可选是或者否的函数参数，可以使用他们进行排列组合。
7. 每个生成的数据集都应该有清晰的命名，记录每个数据集可选是否的操作项选择，以及变量组参数空间的不同选择。
8. 确保生成的数据集数量合理（不少于10个），以便后续分析
9. 确保生成的数据集储存在原始文件目录下的 'stability_analysis' 子目录中
10. 如果数据集中存在ID type的变量，请不要删除
"""