## transform_features

**名称：** transform_features  
**描述：** 使用多种方法进行特征转换和缩放。该工具提供多种特征转换和缩放选项，以提升模型性能。支持训练和转换两种模式。  
**适用场景：** 特征缩放、标准化、数据转换，特别适用于对特征尺度敏感的机器学习模型的数据准备

**参数：**
- `data`:
  - **类型：** `pd.DataFrame`
  - **描述：** 表示数据集的pandas DataFrame对象
- `columns`:
  - **类型：** `string | array`
  - **描述：** 需要转换的列名
- `method`:
  - **类型：** `string`
  - **描述：** 使用的转换方法
  - **可选值：** `standard` | `minmax` | `robust` | `log` | `sqrt` | `power`
  - **默认值：** `standard`
- `params`:
  - **类型：** `dict | null`
  - **描述：** 转换器的额外参数
  - **默认值：** `None`
- `keep_original`:
  - **类型：** `boolean`
  - **描述：** 是否保留原始列
  - **默认值：** `True`
- `scaler`:
  - **类型：** `object | dict | null`
  - **描述：** 已训练的转换器对象。用于确保测试数据使用与训练数据相同的转换参数
  - **默认值：** `None`

**必需参数：** `data`, `columns`  

**返回值：** 
- **类型：** `Tuple[pd.DataFrame, object]`
- **描述：** 返回一个元组，包含：
  1. 转换后的数据框
  2. 使用的转换器对象（用于后续转换测试数据）

**使用模式：**
1. **训练模式** (scaler=None):
   - 学习数据的转换参数
   - 返回转换后的数据和训练好的转换器
2. **转换模式** (提供scaler):
   - 使用已有转换器的参数进行转换
   - 确保与训练数据使用相同的转换参数

**转换结果：** 
- 新列的命名规则为：`原列名_转换方法`（例如：'age_standard'，'salary_minmax'）
- 如果 keep_original=True，将同时保留原始列和转换后的列
- 如果 keep_original=False，将只保留转换后的列

**方法说明：**
- 'standard'：
  - 将特征标准化为零均值和单位方差
  - 自动检测极端值，对极端值使用稳健标准化
- 'minmax'：将特征缩放到固定范围[0,1]
- 'robust'：使用四分位数进行缩放，对异常值不敏感
- 'log'：应用自然对数变换，适用于偏斜分布
- 'sqrt'：应用平方根变换，适用于中度偏斜分布
- 'power'：应用Yeo-Johnson幂转换，自动处理负值

**异常处理：**
- 对于产生的无穷值或NaN，会自动切换到更稳健的方法或使用0填充
- 对于极端值，会使用稳健标准化方法处理
- 所有异常情况都会发出警告信息

**注意事项：**
- 只能转换数值类型的列
- 指定的列必须存在于数据框中
- 训练和测试数据必须使用相同的转换器以保持一致性
- 某些方法（如对数）会自动处理负值和零值

---
## reduce_dimensions

**名称：** reduce_dimensions  
**描述：** 使用PCA或LDA进行数据集降维。该工具用于特征提取和降维。  
**适用场景：** 降维、特征提取、高维数据可视化

**参数：**
- `data`:
  - **类型：** `pd.DataFrame`
  - **描述：** 表示数据集的pandas DataFrame对象
- `method`:
  - **类型：** `string`
  - **描述：** 降维方法
  - **可选值：** `pca` | `lda`
  - **默认值：** `pca`
- `n_components`:
  - **类型：** `int | float`
  - **描述：** 保留的组件数量。如果是浮点数，表示PCA的方差比率
  - **默认值：** `0.95`
- `target`:
  - **类型：** `pd.Series | null`
  - **描述：** LDA方法需要的目标变量。当method='lda'时必需
  - **默认值：** `None`
- `keep_original`:
  - **类型：** `boolean`
  - **描述：** 是否保留原始特征
  - **默认值：** `True`

**必需参数：** `data`  
**结果：** 
- 降维后的数据框将包含新的降维特征列
- PCA方法的新列命名为：'PC1', 'PC2', 'PC3'... 
- LDA方法的新列命名为：'LD1', 'LD2', 'LD3'...
- 如果 keep_original=True，将同时保留原始列和降维后的列
- 如果 keep_original=False，将只保留降维后的列

**注意事项：**
- PCA寻找最大方差方向
- LDA寻找最大化类别分离的方向
- LDA的组件数不能超过min(特征数, 类别数-1)
- 需要权衡降维和信息损失
- PCA是无监督的，而LDA是有监督的
- 只能处理数值类型的列，非数值列会报错
- 对于LDA方法，必须提供target参数
- 当n_components为浮点数时（如0.95），PCA将保留解释该比例方差的组件数

---
## select_features

**名称：** select_features  
**描述：** 使用各种统计和机器学习方法进行特征选择。该工具提供多种特征选择方法。  
**适用场景：** 特征选择、降维、识别重要特征

**参数：**
- `data`:
  - **类型：** `pd.DataFrame`
  - **描述：** 表示数据集的pandas DataFrame对象
- `target`:
  - **类型：** `pd.Series | null`
  - **描述：** 有监督方法需要的目标变量
  - **默认值：** `None`
- `method`:
  - **类型：** `string`
  - **描述：** 特征选择方法
  - **可选值：** `variance` | `correlation` | `mutual_info` | `rfe` | `lasso`
  - **默认值：** `variance`
- `n_features`:
  - **类型：** `int | null`
  - **描述：** 要选择的特征数量
  - **默认值：** `None`
  - **各方法的默认行为：**
    - variance方法：为None时使用方差阈值进行选择
    - correlation方法：为None时使用相关系数阈值进行选择
    - mutual_info方法：为None时默认选择10个特征
    - rfe方法：为None时默认选择一半特征
    - lasso方法：为None时由alpha参数控制特征数量
- `params`:
  - **类型：** `dict | null`
  - **描述：** 选择器的额外参数
  - **默认值：** `None`
  - **各方法的参数说明：**
    - variance: {'threshold': float}  # 方差阈值，低于此值的特征将被移除
    - correlation: {'threshold': float}  # 相关系数阈值，低于此值的特征将被移除
    - mutual_info: {'k': int}  # 每轮选择的特征数量
    - rfe: {'step': int}  # 每轮消除的特征数量
    - lasso: {'alpha': float}  # L1正则化强度，值越大选择的特征越少

**必需参数：** `data`  
**返回：** `List[str]`: 返回被选中的特征名列表

**注意事项：**
- 'variance'：移除低方差特征
- 'correlation'：基于与目标变量的相关性选择
- 'mutual_info'：使用互信息进行选择
- 'rfe'：执行递归特征消除
- 'lasso'：使用L1正则化进行选择
- 某些方法需要目标变量
- 需考虑所选特征的可解释性

---
## discretize_features（特征离散化）

**名称：** discretize_features  
**描述：** 将连续特征转换为离散类别。该工具提供多种连续变量分箱方法。  
**适用场景：** 特征离散化、连续变量分箱、创建分类特征

**参数：**
- `data`:
  - **类型：** `pd.DataFrame`
  - **描述：** 表示数据集的pandas DataFrame对象
- `columns`:
  - **类型：** `string | array`
  - **描述：** 需要离散化的列名
- `method`:
  - **类型：** `string`
  - **描述：** 离散化方法
  - **可选值：** `equal_width` | `equal_freq` | `kmeans`
  - **默认值：** `equal_width`
- `n_bins`:
  - **类型：** `int`
  - **描述：** 要创建的分箱数量
  - **默认值：** `10`
- `labels`:
  - **类型：** `array | null`
  - **描述：** 分箱的标签
  - **默认值：** `None`
- `keep_original`:
  - **类型：** `boolean`
  - **描述：** 是否保留原始连续特征
  - **默认值：** `True`

**必需参数：** `data`, `columns`  
**结果：** 
- 离散化后的数据框将包含新的离散化特征列
- 新列的命名规则为：`原列名_bin`（例如：'age_bin'，'salary_bin'）
- 如果 keep_original=True，将同时保留原始列和离散化后的列
- 如果 keep_original=False，将只保留离散化后的列

**注意事项：**
- 'equal_width'：创建等宽分箱
- 'equal_freq'：创建等频分箱
- 'kmeans'：使用k-means聚类进行分箱
- 选择方法时需考虑数据分布
- 分箱数量影响离散化的粒度
- 如果提供标签，其数量应与分箱数量匹配

---
## create_polynomial_features

**名称：** create_polynomial_features  
**描述：** 创建多项式和交互特征。该工具可以生成特征的高次项和特征间的交互项。  
**适用场景：** 非线性特征工程、特征交互建模、复杂关系捕捉

**参数：**
- `data`:
  - **类型：** `pd.DataFrame`
  - **描述：** 表示数据集的pandas DataFrame对象
- `columns`:
  - **类型：** `string | array`
  - **描述：** 需要创建多项式特征的列名
- `degree`:
  - **类型：** `int`
  - **描述：** 最高多项式次数
  - **默认值：** `2`
- `interaction_only`:
  - **类型：** `boolean`
  - **描述：** 是否只创建交互特征
  - **默认值：** `False`
- `keep_original`:
  - **类型：** `boolean`
  - **描述：** 是否保留原始列
  - **默认值：** `True`

**必需参数：** `data`, `columns`  

**结果：** 
- 生成的数据框将包含新的多项式特征列
- 单变量多项式特征命名为：`变量名^次数`（例如：'age^2'，'salary^3'）
- 交互特征命名为：`变量1 * 变量2`（例如：'age * salary'）
- 如果 keep_original=True，将同时保留原始列和新特征列
- 如果 keep_original=False，将只保留新特征列

**注意事项：**
- 只能处理数值类型的列
- degree必须大于等于1
- 当interaction_only=True时，只生成交互特征，不生成单变量的高次项
- 交互特征的组合数会随degree的增加而快速增长
- 建议在使用前对特征进行标准化，以避免数值溢出
- 过高的degree可能导致过拟合