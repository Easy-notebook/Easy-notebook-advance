import pandas as pd
import numpy as np
import pytest
from ml_tools import fill_missing_values, handle_outliers, encode_categorical, transform_features, reduce_dimensions, select_features, create_polynomial_features, discretize_features

def test_fill_missing_values():
    """测试缺失值填充函数"""
    # 准备测试数据
    data = pd.DataFrame({
        'num': [1, 2, None, 4, 5, None],
        'cat': ['A', 'B', None, 'B', 'C', None],
        'group': ['g1', 'g1', 'g1', 'g2', 'g2', 'g2']
    })
    
    # 测试自动填充方法
    result = fill_missing_values(data.copy(), ['num', 'cat'], method='auto')
    assert result['num'].isna().sum() == 0, "数值列应该被填充"
    assert result['cat'].isna().sum() == 0, "分类列应该被填充"
    assert result['num'].mean() == 3.0, "数值列应该使用均值填充"
    assert result['cat'].value_counts()['B'] >= 2, "分类列应该使用众数填充"
    
    # 测试分组填充
    result = fill_missing_values(
        data.copy(), 
        ['num', 'cat'], 
        method='mean',
        group_columns='group'
    )
    assert result['num'].isna().sum() == 0, "分组后的数值应该被填充"
    
    # 测试常数填充
    result = fill_missing_values(
        data.copy(), 
        ['num', 'cat'], 
        method='constant',
        fill_value=999
    )
    assert (result.loc[result['num'].isna(), 'num'] == 999).all(), "应该使用指定常数填充"

def test_handle_outliers():
    """测试异常值处理函数"""
    # 准备测试数据
    data = pd.DataFrame({
        'value': [1, 2, 3, 100, 4, 5, -50, 6],
        'group': ['g1', 'g1', 'g1', 'g1', 'g2', 'g2', 'g2', 'g2']
    })
    
    # 测试IQR方法
    result = handle_outliers(
        data.copy(), 
        'value',
        method='iqr',
        strategy='clip'
    )
    assert result['value'].max() < 100, "极大值应该被裁剪"
    assert result['value'].min() > -50, "极小值应该被裁剪"
    
    # 测试分组异常值处理
    result = handle_outliers(
        data.copy(),
        'value',
        method='zscore',
        strategy='clip',
        group_columns='group'
    )
    assert len(result) == len(data), "不应该删除任何行"
    
    # 测试删除策略
    result = handle_outliers(
        data.copy(),
        'value',
        method='iqr',
        strategy='remove'
    )
    assert len(result) < len(data), "应该删除异常值所在的行"

def test_encode_categorical():
    """测试类别特征编码函数"""
    # 准备测试数据
    data = pd.DataFrame({
        'cat_high': ['A', 'B', 'C', 'A', 'B', 'A'],
        'cat_low': ['X', 'X', 'Y', 'Y', 'Z', 'Z'],
        'group': ['g1', 'g1', 'g1', 'g2', 'g2', 'g2']
    })
    
    # 测试自动编码方法 (现在统一使用one-hot编码)
    result = encode_categorical(data.copy(), ['cat_high', 'cat_low'])
    # 检查cat_high的one-hot编码列
    assert 'cat_high_A' in result.columns, "应该创建one-hot编码列 cat_high_A"
    assert 'cat_high_B' in result.columns, "应该创建one-hot编码列 cat_high_B"
    assert 'cat_high_C' in result.columns, "应该创建one-hot编码列 cat_high_C"
    # 检查cat_low的one-hot编码列
    assert 'cat_low_X' in result.columns, "应该创建one-hot编码列 cat_low_X"
    assert 'cat_low_Y' in result.columns, "应该创建one-hot编码列 cat_low_Y"
    assert 'cat_low_Z' in result.columns, "应该创建one-hot编码列 cat_low_Z"
    
    # 测试标签编码
    result = encode_categorical(data.copy(), ['cat_high'], method='label')
    assert 'cat_high_encoded' in result.columns, "应该创建标签编码列"
    
    # 测试频率编码
    result = encode_categorical(
        data.copy(), 
        ['cat_high'],
        method='frequency'
    )
    assert 'cat_high_freq' in result.columns, "应该创建频率编码列"
    assert result['cat_high_freq'].max() <= 1, "频率值应该在0-1之间"
    
    # 测试分组编码
    result = encode_categorical(
        data.copy(),
        ['cat_high'],
        method='count',
        group_columns='group'
    )
    assert 'cat_high_count' in result.columns, "应该创建计数编码列"

def test_edge_cases():
    """测试边缘情况"""
    # 空数据框
    empty_df = pd.DataFrame()
    with pytest.raises(ValueError):
        fill_missing_values(empty_df, ['col'])
    
    # 不存在的列
    data = pd.DataFrame({'A': [1, 2, 3]})
    with pytest.raises(ValueError):
        fill_missing_values(data, ['B'])
    
    # 全是缺失值的列
    data = pd.DataFrame({'A': [None, None, None]})
    result = fill_missing_values(data, ['A'], method='constant', fill_value=0)
    assert result['A'].isna().sum() == 0, "应该填充所有缺失值"

def test_transform_features():
    """测试特征变换函数"""
    # 准备测试数据
    data = pd.DataFrame({
        'num1': [1, 2, 3, 4, 5],
        'num2': [10, 20, 30, 40, 50],
        'group': ['A', 'A', 'B', 'B', 'B']
    })
    
    # 测试标准化变换（保留原始列）
    result = transform_features(data.copy(), ['num1', 'num2'], method='standard')
    assert 'num1' in result.columns, "应该保留原始列"
    assert 'num1_standard' in result.columns, "应该创建标准化后的列"
    assert result['num1_standard'].mean() < 1e-10, "标准化后的均值应接近0"
    
    # 测试标准化变换（不保留原始列）
    result = transform_features(data.copy(), ['num1'], method='standard', keep_original=False)
    assert 'num1' not in result.columns, "不应该保留原始列"
    assert 'num1_standard' in result.columns, "应该只包含标准化后的列"
    
    # 测试对数变换
    result = transform_features(data.copy(), 'num1', method='log')
    assert 'num1_log' in result.columns, "应该创建对数变换后的列"
    
    # 测试异常情况
    with pytest.raises(ValueError):
        transform_features(data, ['group'], method='standard')  # 非数值列
    with pytest.raises(ValueError):
        transform_features(data, ['not_exist'])  # 不存在的列

def test_reduce_dimensions():
    """测试降维函数"""
    # 准备测试数据
    data = pd.DataFrame({
        'f1': [1, 2, 3, 4, 5, 6, 7, 8],
        'f2': [2, 4, 6, 8, 10, 12, 14, 16],
        'f3': [1, 3, 5, 7, 2, 4, 6, 8]
    })
    # 创建三个类别的目标变量
    target = pd.Series([0, 0, 0, 1, 1, 1, 2, 2])
    
    # 测试PCA（保留原始特征）
    result = reduce_dimensions(data.copy(), method='pca', n_components=2)
    assert 'PC1' in result.columns, "应该包含第一主成分"
    assert 'PC2' in result.columns, "应该包含第二主成分"
    assert 'f1' in result.columns, "应该保留原始特征"
    
    # 测试PCA（不保留原始特征）
    result = reduce_dimensions(data.copy(), method='pca', n_components=2, keep_original=False)
    assert len(result.columns) == 2, "应该只包含两个主成分"
    
    # 测试LDA（有三个类别，可以得到两个判别轴）
    result = reduce_dimensions(
        data.copy(), 
        method='lda',
        n_components=2,
        target=target
    )
    assert 'LD1' in result.columns, "应该包含第一判别轴"
    assert 'LD2' in result.columns, "应该包含第二判别轴"
    
    # 测试异常情况
    with pytest.raises(ValueError):
        reduce_dimensions(data, method='lda')  # 缺少目标变量
    with pytest.raises(ValueError):
        reduce_dimensions(data, method='invalid')  # 无效的方法

def test_select_features():
    """测试特征选择函数"""
    # 准备测试数据
    data = pd.DataFrame({
        'f1': [1, 2, 3, 4, 5],
        'f2': [2, 4, 6, 8, 10],
        'f3': [0.1, 0.1, 0.1, 0.1, 0.2]
    })
    target = pd.Series([0, 0, 1, 1, 1])
    
    # 测试方差选择（保留原始特征）
    result = select_features(data.copy(), method='variance', n_features=2)
    assert 'f1_selected' in result.columns, "应该标记被选中的特征"
    assert 'f1' in result.columns, "应该保留原始特征"
    
    # 测试相关性选择（不保留原始特征）
    result = select_features(
        data.copy(),
        target=target,
        method='correlation',
        n_features=2,
        keep_original=False
    )
    assert len(result.columns) == 2, "应该只保留两个选中的特征"
    
    # 测试互信息选择
    result = select_features(
        data.copy(),
        target=target,
        method='mutual_info',
        n_features=2
    )
    assert len([col for col in result.columns if '_selected' in col]) == 2, "应该选择两个特征"
    
    # 测试异常情况
    with pytest.raises(ValueError):
        select_features(data, method='correlation')  # 缺少目标变量
    with pytest.raises(ValueError):
        select_features(data, n_features=10)  # 选择的特征数量过多

def test_create_polynomial_features():
    """测试多项式特征创建函数"""
    # 准备测试数据
    data = pd.DataFrame({
        'x1': [1, 2, 3],
        'x2': [0, 1, 2]
    })
    
    # 测试基本多项式特征（保留原始特征）
    result = create_polynomial_features(data.copy(), ['x1'], degree=2)
    assert 'x1' in result.columns, "应该保留原始特征"
    assert 'x1^2' in result.columns, "应该创建平方项"
    
    # 测试交互特征（不保留原始特征）
    result = create_polynomial_features(
        data.copy(),
        ['x1', 'x2'],
        degree=2,
        keep_original=False
    )
    assert 'x1 * x2' in result.columns, "应该创建交互项"
    assert 'x1' not in result.columns, "不应该包含原始特征"
    
    # 测试只创建交互项
    result = create_polynomial_features(
        data.copy(),
        ['x1', 'x2'],
        degree=2,
        interaction_only=True
    )
    assert 'x1^2' not in result.columns, "不应该创建平方项"
    assert 'x1 * x2' in result.columns, "应该只包含交互项"
    
    # 测试异常情况
    with pytest.raises(ValueError):
        create_polynomial_features(data, ['not_exist'])  # 不存在的列
    with pytest.raises(ValueError):
        create_polynomial_features(data, ['x1'], degree=0)  # 无效的次数

def test_discretize_features():
    """测试特征离散化函数"""
    # 准备测试数据
    data = pd.DataFrame({
        'value': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        'group': ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C', 'C']
    })
    
    # 测试等宽分箱（保留原始特征）
    result = discretize_features(data.copy(), 'value', method='equal_width', n_bins=3)
    assert 'value' in result.columns, "应该保留原始特征"
    assert 'value_bin' in result.columns, "应该创建分箱后的特征"
    assert result['value_bin'].nunique() == 3, "应该创建3个分箱"
    
    # 测试等频分箱（不保留原始特征）
    result = discretize_features(
        data.copy(),
        'value',
        method='equal_freq',
        n_bins=4,
        keep_original=False
    )
    assert 'value' not in result.columns, "不应该保留原始特征"
    assert len(result.columns) == 1, "应该只包含分箱后的特征"
    
    # 测试自定义标签
    labels = ['low', 'medium', 'high']
    result = discretize_features(
        data.copy(),
        'value',
        method='equal_width',
        n_bins=3,
        labels=labels
    )
    assert set(result['value_bin'].unique()) == set(labels), "应该使用自定义标签"
    
    # 测试异常情况
    with pytest.raises(ValueError):
        discretize_features(data, ['group'])  # 非数值列
    with pytest.raises(ValueError):
        discretize_features(data, ['value'], method='invalid')  # 无效的方法

if __name__ == "__main__":
    # 运行所有测试
    pytest.main([__file__]) 