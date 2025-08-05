## fill_missing_values_tools

**名称:** fill_missing_values_tools  
**描述:** 对数据框中指定列的缺失值进行填充。该工具可以处理数值型和分类型特征的缺失值填充,支持多种填充方法。  
**适用场景:** 处理各类特征的缺失值,支持分组填充和时序填充

**参数:**
- `data`:
  - **类型:** `pd.DataFrame`
  - **描述:** 输入的数据框
- `target_columns`:
  - **类型:** `string | List[str]`
  - **描述:** 需要填充的目标列名
- `method`:
  - **类型:** `string`
  - **描述:** 填充方法
  - **可选值:** `auto` | `mean` | `median` | `mode` | `ffill` | `bfill` | `interpolate` | `constant` | `knn`
  - **默认值:** `auto`
- `group_columns`:
  - **类型:** `string | List[str] | None`
  - **描述:** 分组列,用于分组填充
  - **默认值:** `None`
- `time_column`:
  - **类型:** `string | None`
  - **描述:** 时间列,用于时序相关填充
  - **默认值:** `None`
- `fill_value`:
  - **类型:** `Any | None`
  - **描述:** 使用constant方法时的填充值
  - **默认值:** `None`
- `max_group_null_ratio`:
  - **类型:** `float`
  - **描述:** 分组内最大允许的缺失比例
  - **默认值:** `0.8`


**必需参数:** `data`, `target_columns`  
**返回:** 填充后的数据框  
**注意事项:**
- `auto`方法会根据数据类型自动选择填充方法(数值用mean,分类用mode)
- 支持按组填充,可以更好地保持数据的分布特征
- 支持时序数据的前向/后向填充和插值填充
- 建议根据实际业务场景选择合适的填充方法
- 当使用批量填充操作时，每个填充操作需要指定四个参数：目标列、填充方法、分组列和填充值。对于不需要填充值的方法（如mean、median、mode），填充值参数应设为None

---

## remove_columns_tools

**名称:** remove_columns_tools  
**描述:** 基于多种策略删除数据框中的列。支持基于缺失值比例、常值比例、相关性和方差等多种删除策略，也支持直接指定要删除的列名。  
**适用场景:** 数据预处理阶段的特征筛选,去除无用或冗余的特征列

**参数:**
- `data`:
  - **类型:** `pd.DataFrame`
  - **描述:** 输入的数据框
- `strategy`:
  - **类型:** `string | List[str] | None`
  - **描述:** 删除策略
  - **可选值:** `missing` | `constant` | `correlation` | `variance` | `None`
  - **默认值:** `missing`
- `columns`:
  - **类型:** `List[str] | None`
  - **描述:** 要直接删除的列名列表
  - **默认值:** `None`
- `threshold`:
  - **类型:** `float | Dict[str, float]`
  - **描述:** 各策略的阈值
  - **默认值:** `0.5`
- `exclude_columns`:
  - **类型:** `List[str] | None`
  - **描述:** 不需要检查的列
  - **默认值:** `None`
- `min_unique_ratio`:
  - **类型:** `float`
  - **描述:** 最小唯一值比例
  - **默认值:** `0.01`
- `correlation_threshold`:
  - **类型:** `float`
  - **描述:** 相关性阈值
  - **默认值:** `0.95`

**必需参数:** `data`  
**返回:** 处理后的数据框  
**注意事项:**
- 支持多种删除策略的组合使用
- 可以通过columns参数直接指定要删除的列
- 可以通过exclude_columns保护重要特征不被删除
- correlation策略仅适用于数值型特征
- 删除前会通过warnings提示要删除的列名
- 建议根据业务需求谨慎设置各类阈值
- 当strategy为None时，只删除columns参数指定的列

---

## handle_outliers_tools

**名称:** handle_outliers_tools  
**描述:** 通用的异常值处理函数。支持多种异常值检测方法，可以按组处理，并提供多种处理策略。  
**适用场景:** 数据清洗阶段的异常值处理，特别适用于需要分组处理异常值的场景

**参数:**
- `data`:
  - **类型:** `pd.DataFrame`
  - **描述:** 输入的数据框
- `target_columns`:
  - **类型:** `string | List[str]`
  - **描述:** 需要处理的目标列
- `method`:
  - **类型:** `string`
  - **描述:** 异常值检测方法
  - **可选值:** `iqr` | `zscore` | `isolation_forest` | `dbscan` | `mad`
  - **默认值:** `'iqr'`
- `strategy`:
  - **类型:** `string`
  - **描述:** 处理策略
  - **可选值:** `clip` | `remove`
  - **默认值:** `'clip'`
- `sensitivity`:
  - **类型:** `string`
  - **描述:** 异常值检测的敏感度
  - **可选值:** `low` | `medium` | `high`
  - **默认值:** `'medium'`
  - **参数说明:**
    - `low`: 宽松的阈值，只检测极端异常值
    - `medium`: 中等阈值，平衡检测
    - `high`: 严格的阈值，检测更多的异常值
- `group_columns`:
  - **类型:** `string | List[str] | None`
  - **描述:** 分组列
  - **默认值:** `None`
- `params`:
  - **类型:** `Dict[str, Any] | None`
  - **描述:** 各方法的参数字典
  - **默认值:** `None`
  - **参数配置示例:**
    - iqr: `{'threshold': 1.5}`
    - zscore: `{'threshold': 3}`
    - isolation_forest: `{'contamination': 0.1, 'random_state': 42}`
    - dbscan: `{'eps': 0.5, 'min_samples': 5}`
    - mad: `{'threshold': 3.5}`

**必需参数:** `data`, `target_columns`  
**返回:** 处理后的数据框  
**注意事项:**
- 不同检测方法适用于不同的数据分布特征
- `clip`策略会将异常值限制在合理范围内，`remove`策略会直接删除异常值
- 支持按组处理异常值，更好地保持数据的分布特征
- 可以通过`sensitivity`参数快速调整异常值检测的严格程度
- 如需更精细的控制，可通过`params`参数覆盖默认设置
- 建议根据数据特征选择合适的检测方法和敏感度
- 处理异常值时需要考虑是否会影响后续分析

---

## encode_categorical_tools

**名称:** encode_categorical_tools  
**描述:** 通用的类别特征编码函数。支持多种编码方法，可以处理未知类别，支持按组编码。  
**适用场景:** 类别特征预处理，将类别变量转换为机器学习算法可以处理的数值形式

**参数:**
- `data`:
  - **类型:** `pd.DataFrame`
  - **描述:** 输入的数据框
- `target_columns`:
  - **类型:** `string | List[str]`
  - **描述:** 需要编码的目标列
- `method`:
  - **类型:** `string`
  - **描述:** 编码方法
  - **可选值:** `auto` | `label` | `onehot` | `frequency` | `count`
  - **默认值:** `'auto'`
- `group_columns`:
  - **类型:** `string | List[str] | None`
  - **描述:** 分组列(用于分组编码)
  - **默认值:** `None`
- `handle_unknown`:
  - **类型:** `string`
  - **描述:** 处理未知类别的方式
  - **默认值:** `'ignore'`
- `keep_original`:
  - **类型:** `bool`
  - **描述:** 是否保留原始类别列
  - **默认值:** `True`

**必需参数:** `data`, `target_columns`  
**返回:** 编码后的数据框  
**注意事项:**
- `auto`方法默认使用one-hot编码
- one-hot编码会显著增加特征维度
- 频率编码和计数编码可以保留类别的频率信息
- 标签编码适用于有序类别变量
- 建议根据特征的性质和模型需求选择合适的编码方法
- 可以通过`keep_original`参数控制是否保留原始类别列

--- 