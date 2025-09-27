import pandas as pd
import numpy as np
from typing import Union, List, Optional, Dict, Any, Tuple
from sklearn.preprocessing import LabelEncoder, StandardScaler, MinMaxScaler, RobustScaler, PowerTransformer
import warnings
from scipy import stats
from sklearn.decomposition import PCA
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.feature_selection import SelectKBest, mutual_info_classif, mutual_info_regression
from sklearn.feature_selection import VarianceThreshold, RFE
from sklearn.linear_model import Lasso, LogisticRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from itertools import combinations
import json
from sklearn.impute import KNNImputer

def fill_missing_values_tools(
    data: pd.DataFrame,
    target_columns: Union[str, List[str]],
    method: str = 'auto',
    group_columns: Optional[Union[str, List[str]]] = None,
    time_column: Optional[str] = None,
    fill_value: Optional[Any] = None,
    max_group_null_ratio: float = 0.8,
    **params
) -> pd.DataFrame:
    """
    通用的缺失值填充函数
    
    Args:
        data: 输入数据框
        target_columns: 需要填充的目标列
        method: 填充方法
            - 'auto': 自动选择(数值用mean,分类用mode)
            - 'mean','median','mode': 统计值填充
            - 'ffill','bfill': 前向/后向填充
            - 'interpolate': 插值填充
            - 'constant': 常数填充
            - 'knn': 基于相似样本填充
        group_columns: 分组列,用于分组填充
        time_column: 时间列,用于时序相关填充
        fill_value: 使用constant方法时的填充值
        max_group_null_ratio: 分组内最大允许的缺失比例
        **params: 其他参数
        
    Returns:
        填充后的数据框
    """
    if isinstance(params, str):
        try:
            params = json.loads(params)
        except json.JSONDecodeError:
            raise ValueError("Invalid params string format. Must be valid JSON.")

    df = data.copy()
    if isinstance(target_columns, str):
        target_columns = [target_columns]
    if isinstance(group_columns, str):
        group_columns = [group_columns]
        
    for target_col in target_columns:
        # 检查列是否存在
        if target_col not in df.columns:
            raise ValueError(f"Column {target_col} not found in data")
            
        # 如果没有缺失值,跳过
        if not df[target_col].isna().any():
            continue
            
        # 提前进行一次类型转换
        if pd.api.types.is_numeric_dtype(df[target_col]):
            df[target_col] = df[target_col].astype(float)
            
        # 确定填充方法
        if method == 'auto':
            if pd.api.types.is_numeric_dtype(df[target_col]):
                # 对数值列，先计算填充值
                fill_val = df[target_col].mean()
                # 确保列是浮点型
                df[target_col] = df[target_col].astype(float)
                df[target_col].fillna(fill_val, inplace=True)
            else:
                # 对非数值列，使用众数填充
                fill_val = df[target_col].mode()[0] if not df[target_col].mode().empty else None
                if fill_val is not None:
                    df[target_col] = df[target_col].fillna(fill_val)
            continue
            
        # 如果是常数填充但没有提供填充值，设置默认值
        if method == 'constant' and fill_value is None:
            if pd.api.types.is_numeric_dtype(df[target_col]):
                fill_value = 0
            else:
                fill_value = 'Unknown'
            warnings.warn(f"No fill_value provided for constant method in column {target_col}. "
                        f"Using default value: {fill_value}")
        
        # 如果使用分组填充，优化填充逻辑
        if group_columns:
            # 计算分组统计值
            if method in ['mean', 'median', 'mode']:
                if pd.api.types.is_numeric_dtype(df[target_col]):
                    if method == 'mean':
                        fill_values = df.groupby(group_columns)[target_col].transform('mean')
                    elif method == 'median':
                        fill_values = df.groupby(group_columns)[target_col].transform('median')
                    else:
                        fill_values = df.groupby(group_columns)[target_col].transform(lambda x: x.mode().iloc[0] if not x.mode().empty else np.nan)
                else:
                    fill_values = df.groupby(group_columns)[target_col].transform(lambda x: x.mode().iloc[0] if not x.mode().empty else np.nan)
                
                # 一次性填充所有符合条件的值
                mask = df[target_col].isna()
                group_null_ratios = df[mask].groupby(group_columns).size() / df.groupby(group_columns).size()
                valid_groups = group_null_ratios[group_null_ratios <= max_group_null_ratio].index
                
                if len(valid_groups) > 0:
                    valid_mask = mask & df[group_columns].isin(valid_groups).all(axis=1)
                    df.loc[valid_mask, target_col] = fill_values[valid_mask]
            
            elif method in ['ffill', 'bfill']:
                # 使用transform进行填充
                if time_column:
                    df[target_col] = df.sort_values([time_column]).groupby(group_columns)[target_col].transform(lambda x: x.fillna(method=method))
                else:
                    df[target_col] = df.groupby(group_columns)[target_col].transform(lambda x: x.fillna(method=method))
                    
            elif method == 'interpolate':
                # 使用transform进行插值
                df[target_col] = df.groupby(group_columns)[target_col].transform(
                    lambda x: x.interpolate(method='linear', limit_direction='both')
                )
            
        # 全局填充(当没有指定分组时)
        else:
            if method == 'constant':
                if pd.api.types.is_numeric_dtype(df[target_col]) and isinstance(fill_value, (int, float)):
                    df[target_col] = df[target_col].astype(float)
                df[target_col].fillna(fill_value, inplace=True)
            elif method in ['mean', 'median', 'mode']:
                if pd.api.types.is_numeric_dtype(df[target_col]):
                    # 确保数值列是浮点型
                    df[target_col] = df[target_col].astype(float)
                    if method == 'mean':
                        fill_val = df[target_col].mean()
                    elif method == 'median':
                        fill_val = df[target_col].median()
                    else:
                        fill_val = df[target_col].mode()[0]
                else:
                    fill_val = df[target_col].mode()[0] if not df[target_col].mode().empty else None
                
                if fill_val is not None:
                    df[target_col].fillna(fill_val, inplace=True)
            elif method in ['ffill', 'bfill']:
                df[target_col].fillna(method=method, inplace=True)
            elif method == 'interpolate':
                df[target_col].interpolate(method='linear', limit_direction='both', inplace=True)       

        # 在method判断部分添加knn方法的处理
        if method == 'knn':
            # 获取KNN参数
            n_neighbors = params.get('n_neighbors', 5)
            weights = params.get('weights', 'uniform')  # 'uniform' 或 'distance'
            
            # 准备用于KNN填充的特征
            if group_columns:
                # 如果有分组列，使用分组列作为额外特征
                features = group_columns.copy() if isinstance(group_columns, list) else [group_columns]
            else:
                # 如果没有分组列，使用所有数值列作为特征
                features = df.select_dtypes(include=[np.number]).columns.tolist()
            
            # 移除目标列(如果在特征中)
            if target_col in features:
                features.remove(target_col)
            
            if not features:
                raise ValueError("No features available for KNN imputation")
            
            # 准备特征矩阵
            X = df[features].copy()
            
            # 对分类特征进行编码
            categorical_features = X.select_dtypes(include=['object', 'category']).columns
            for cat_col in categorical_features:
                X[cat_col] = pd.Categorical(X[cat_col]).codes
            
            # 标准化数值特征
            numeric_features = X.select_dtypes(include=[np.number]).columns
            if len(numeric_features) > 0:
                scaler = StandardScaler()
                X[numeric_features] = scaler.fit_transform(X[numeric_features])
            
            # 初始化KNN填充器
            imputer = KNNImputer(
                n_neighbors=n_neighbors,
                weights=weights,
                copy=True
            )
            
            # 准备要填充的数据
            data_to_impute = df[[target_col]].copy()
            if pd.api.types.is_numeric_dtype(data_to_impute[target_col]):
                # 对于数值列，直接进行KNN填充
                data_to_impute = pd.DataFrame(
                    imputer.fit_transform(pd.concat([data_to_impute, X], axis=1))[:, 0],
                    index=df.index,
                    columns=[target_col]
                )
            else:
                # 对于分类列，先转换为数值
                le = LabelEncoder()
                non_missing_mask = ~data_to_impute[target_col].isna()
                temp_values = data_to_impute[target_col].copy()
                temp_values[non_missing_mask] = le.fit_transform(temp_values[non_missing_mask])
                temp_values = temp_values.astype(float)
                
                # 进行KNN填充
                temp_values = pd.DataFrame(
                    imputer.fit_transform(pd.concat([pd.DataFrame(temp_values), X], axis=1))[:, 0],
                    index=df.index,
                    columns=[target_col]
                )
                
                # 将填充的数值转换回分类
                temp_values[target_col] = le.inverse_transform(temp_values[target_col].round().astype(int))
                data_to_impute = temp_values
            
            # 更新原始数据框中的值
            df.loc[df[target_col].isna(), target_col] = data_to_impute.loc[df[target_col].isna(), target_col]
        
    return df

def remove_columns_tools(
    data: pd.DataFrame,
    strategy: Union[str, List[str], None] = None,
    columns: Optional[List[str]] = None,
    threshold: Union[float, Dict[str, float]] = 0.5,
    exclude_columns: Optional[List[str]] = None,
    min_unique_ratio: float = 0.01,
    correlation_threshold: float = 0.95
) -> pd.DataFrame:
    """
    通用的列删除函数,支持多种删除策略
    
    Args:
        data: 输入数据框
        strategy: 删除策略,可以是单个策略或策略列表
            - 'missing': 基于缺失值比例删除
            - 'constant': 基于唯一值比例删除
            - 'correlation': 基于相关性删除
            - 'variance': 基于方差删除
            - None: 仅使用columns参数指定要删除的列
        columns: 要直接删除的列名列表
        threshold: 各策略的阈值
            - missing: 最大允许的缺失比例
            - constant: 最大允许的常值比例
            - correlation: 最大允许的相关系数
            - variance: 最小允许的方差
        exclude_columns: 不需要检查的列
        min_unique_ratio: 最小唯一值比例
        correlation_threshold: 相关性阈值
        
    Returns:
        处理后的数据框
    """
    df = data.copy()
    if isinstance(strategy, str):
        strategy = [strategy]
    if exclude_columns is None:
        exclude_columns = []
        
    columns_to_drop = set()
    
    # 添加直接指定要删除的列
    if columns:
        columns_to_drop.update([col for col in columns if col in df.columns])
    
    # 只有当strategy不为None时才执行策略based删除
    if strategy is not None:
        for strat in strategy:
            if strat == 'missing':
                # 删除缺失值过多的列
                missing_ratio = df.isnull().mean()
                cols = missing_ratio[
                    (missing_ratio > threshold) & 
                    (~missing_ratio.index.isin(exclude_columns))
                ].index
                columns_to_drop.update(cols)
                
            elif strat == 'constant':
                # 删除常值列
                for col in df.columns:
                    if col in exclude_columns:
                        continue
                    unique_ratio = df[col].nunique() / len(df)
                    if unique_ratio < min_unique_ratio:
                        columns_to_drop.add(col)
                        
            elif strat == 'correlation':
                # 删除高相关列
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                corr_matrix = df[numeric_cols].corr().abs()
                
                # 获取需要删除的高相关列
                upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
                to_drop = [column for column in upper.columns if any(upper[column] > correlation_threshold)]
                
                # 排除指定列
                to_drop = [col for col in to_drop if col not in exclude_columns]
                columns_to_drop.update(to_drop)
                
            elif strat == 'variance':
                # 删除低方差列
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                for col in numeric_cols:
                    if col in exclude_columns:
                        continue
                    if df[col].var() < threshold:
                        columns_to_drop.add(col)
                        
    if columns_to_drop:
        warnings.warn(f"Removing columns: {list(columns_to_drop)}")
        df = df.drop(columns=list(columns_to_drop))
        
    return df

def handle_outliers_tools(
    data: pd.DataFrame,
    target_columns: Union[str, List[str]],
    method: str = 'iqr',
    strategy: str = 'clip',
    sensitivity: str = 'medium',
    group_columns: Optional[Union[str, List[str]]] = None,
    params: Optional[Dict[str, Any]] = None
) -> pd.DataFrame:
    """
    通用的异常值处理函数
    
    Args:
        data: 输入数据框
        target_columns: 目标列
        method: 异常值检测方法
            - 'iqr': 四分位数法
            - 'zscore': Z分数法
            - 'isolation_forest': 隔离森林
            - 'dbscan': DBSCAN聚类
            - 'mad': 中位数绝对偏差法
        strategy: 处理策略 'clip' 或 'remove'
        sensitivity: 异常值检测的敏感度
            - 'low': 宽松的阈值，只检测极端异常值
            - 'medium': 中等阈值（默认）
            - 'high': 严格的阈值，检测更多的异常值
        group_columns: 分组列
        params: 各方法的参数字典
    """
    # 定义不同敏感度下的参数配置
    sensitivity_params = {
        'low': {
            'iqr': {'threshold': 3.0},
            'zscore': {'threshold': 4.0},
            'isolation_forest': {'contamination': 0.05},
            'dbscan': {'eps': 0.8, 'min_samples': 3},
            'mad': {'threshold': 5.0}
        },
        'medium': {
            'iqr': {'threshold': 1.5},
            'zscore': {'threshold': 3.0},
            'isolation_forest': {'contamination': 0.1},
            'dbscan': {'eps': 0.5, 'min_samples': 5},
            'mad': {'threshold': 3.5}
        },
        'high': {
            'iqr': {'threshold': 1.0},
            'zscore': {'threshold': 2.0},
            'isolation_forest': {'contamination': 0.15},
            'dbscan': {'eps': 0.3, 'min_samples': 7},
            'mad': {'threshold': 2.5}
        }
    }

    # 验证sensitivity参数
    if sensitivity not in sensitivity_params:
        raise ValueError(
            f"Invalid sensitivity: '{sensitivity}'. "
            f"Please use one of: {list(sensitivity_params.keys())}"
        )

    # 获取对应敏感度的默认参数
    default_params = sensitivity_params[sensitivity][method]
    
    # 合并用户自定义参数和默认参数
    params = params or {}
    params = {**default_params, **params}  # 用户参数优先级更高

    # 如果method是'clip'，自动修正为'iqr'
    if method == 'clip':
        warnings.warn("'clip' was passed as method but it's a strategy. Using default method 'iqr' instead.")
        method = 'iqr'

    # 验证method参数
    valid_methods = {
        'iqr': '四分位数法 - 使用四分位距来识别异常值',
        'zscore': 'Z分数法 - 基于标准差识别异常值',
        'isolation_forest': '隔离森林 - 基于孤立树算法识别异常值',
        'dbscan': 'DBSCAN聚类 - 基于密度聚类识别异常值',
        'mad': '中位数绝对偏差法 - 基于MAD识别异常值'
    }
    
    valid_strategies = {
        'clip': '将异常值限制在合理范围内',
        'remove': '删除包含异常值的行'
    }
    
    if method not in valid_methods:
        methods_description = "\n".join([f"- '{k}': {v}" for k, v in valid_methods.items()])
        error_msg = f"Invalid method: '{method}'\n"
        
        # 检查是否将strategy误写为method
        if method in valid_strategies:
            error_msg += (
                f"\nNOTE: It seems you might have confused 'method' with 'strategy'.\n"
                f"'{method}' is a valid strategy, not a method.\n"
                f"Did you mean to write:\n"
                f"    handle_outliers_tools(data, target_columns, method='iqr', strategy='{method}')\n\n"
            )
        
        error_msg += (
            f"Please use one of the following methods:\n{methods_description}\n"
            f"Example usage: handle_outliers_tools(data, 'column1', method='iqr', strategy='clip')"
        )
        raise ValueError(error_msg)
    
    # 验证strategy参数
    if strategy not in valid_strategies:
        strategies_description = "\n".join([f"- '{k}': {v}" for k, v in valid_strategies.items()])
        error_msg = f"Invalid strategy: '{strategy}'\n"
        
        # 检查是否将method误写为strategy
        if strategy in valid_methods:
            error_msg += (
                f"\nNOTE: It seems you might have confused 'strategy' with 'method'.\n"
                f"'{strategy}' is a valid method, not a strategy.\n"
                f"Did you mean to write:\n"
                f"    handle_outliers_tools(data, target_columns, method='{strategy}', strategy='clip')\n\n"
            )
            
        error_msg += (
            f"Please use one of the following strategies:\n{strategies_description}\n"
            f"Example usage: handle_outliers_tools(data, 'column1', method='iqr', strategy='clip')"
        )
        raise ValueError(error_msg)

    df = data.copy()
    if isinstance(target_columns, str):
        target_columns = [target_columns]
    if isinstance(group_columns, str):
        group_columns = [group_columns]
        
    for target_col in target_columns:
        if pd.api.types.is_numeric_dtype(df[target_col]):
            df[target_col] = df[target_col].astype('float64')
        else:
            warnings.warn(f"Column {target_col} is not numeric, skipping")
            continue
            
        # 分组处理
        if group_columns:
            if method == 'iqr':
                # 使用transform一次性计算所有分组的统计量
                Q1 = df.groupby(group_columns)[target_col].transform('quantile', 0.25)
                Q3 = df.groupby(group_columns)[target_col].transform('quantile', 0.75)
                IQR = Q3 - Q1
                threshold = params.get('threshold', 1.5)
                lower = Q1 - threshold * IQR
                upper = Q3 + threshold * IQR
                
                if strategy == 'clip':
                    df[target_col] = df[target_col].clip(lower=lower, upper=upper)
                else:  # remove
                    outlier_mask = (df[target_col] < lower) | (df[target_col] > upper)
                    df = df.loc[~outlier_mask]
                    
            else:
                # 对于其他方法，使用transform计算每个组的异常值掩码
                def detect_group_outliers(x):
                    return detect_outliers_tools(x, method=method, params=params)
                
                outlier_mask = df.groupby(group_columns)[target_col].transform(detect_group_outliers)
                
                if strategy == 'clip':
                    # 计算每个组的正常值均值
                    normal_values = df[~outlier_mask].groupby(group_columns)[target_col].transform('mean')
                    # 一次性替换所有异常值
                    df.loc[outlier_mask, target_col] = normal_values[outlier_mask]
                else:  # remove
                    df = df.loc[~outlier_mask]
        
        # 全局处理
        else:
            if method == 'iqr':
                Q1 = df[target_col].quantile(0.25)
                Q3 = df[target_col].quantile(0.75)
                IQR = Q3 - Q1
                threshold = params.get('threshold', 1.5)
                lower = Q1 - threshold * IQR
                upper = Q3 + threshold * IQR
                
                if strategy == 'clip':
                    # 这里也使用pandas的clip方法
                    df[target_col] = df[target_col].clip(lower=lower, upper=upper)
                else:  # remove
                    outlier_mask = (df[target_col] < lower) | (df[target_col] > upper)
                    df = df.loc[~outlier_mask]
            else:
                outlier_mask = detect_outliers_tools(df[target_col], method=method, params=params)
                
                if strategy == 'clip':
                    normal_values = df[target_col][~outlier_mask].mean()
                    df.loc[outlier_mask, target_col] = normal_values
                else:  # remove
                    df = df.drop(index=df[outlier_mask].index)
                
    return df

def detect_outliers_tools(
    series: pd.Series,
    method: str = 'iqr',
    params: Optional[Dict[str, Any]] = None
) -> pd.Series:
    """
    检测异常值的辅助函数
    
    Args:
        series: 输入数据列
        method: 检测方法
        params: 方法参数
        
    Returns:
        布尔序列,True表示异常值
    """
    params = params or {}
    
    if method == 'iqr':
        Q1 = series.quantile(0.25)
        Q3 = series.quantile(0.75)
        IQR = Q3 - Q1
        threshold = params.get('threshold', 1.5)
        return (series < (Q1 - threshold * IQR)) | (series > (Q3 + threshold * IQR))
        
    elif method == 'zscore':
        threshold = params.get('threshold', 3)
        z_scores = np.abs(stats.zscore(series))
        return z_scores > threshold
        
    elif method == 'mad':
        threshold = params.get('threshold', 3.5)
        median = series.median()
        mad = stats.median_abs_deviation(series)
        modified_zscore = 0.6745 * (series - median) / mad
        return np.abs(modified_zscore) > threshold
        
    elif method == 'isolation_forest':
        from sklearn.ensemble import IsolationForest
        iso = IsolationForest(
            contamination=params.get('contamination', 0.1),
            random_state=params.get('random_state', 42)
        )
        return iso.fit_predict(series.values.reshape(-1, 1)) == -1
        
    elif method == 'dbscan':
        from sklearn.cluster import DBSCAN
        dbscan = DBSCAN(
            eps=params.get('eps', 0.5),
            min_samples=params.get('min_samples', 5)
        )
        return dbscan.fit_predict(series.values.reshape(-1, 1)) == -1
        
    else:
        raise ValueError(f"Unknown method: {method}")

def encode_categorical_tools(data: pd.DataFrame, 
                      target_columns: Union[str, List[str]], 
                      method: str = 'auto',
                      group_columns: Optional[Union[str, List[str]]] = None,
                      handle_unknown: str = 'ignore',
                      keep_original: bool = True) -> pd.DataFrame:
    """
    通用的类别特征编码函数
    
    Args:
        data: 输入数据框
        target_columns: 需要编码的目标列
        method: 编码方法
            - 'auto': 自动选择(默认使用one-hot编码)
            - 'label': 标签编码
            - 'onehot': One-hot编码
            - 'frequency': 频率编码
            - 'count': 计数编码
        group_columns: 分组列(用于分组编码)
        handle_unknown: 处理未知类别的方式
        keep_original: 是否保留原始类别列，默认为True
        
    Returns:
        编码后的数据框
    """
    df = data.copy()
    if isinstance(target_columns, str):
        target_columns = [target_columns]
    
    # 过滤出真正需要编码的列
    columns_to_encode = []
    for col in target_columns:
        # 跳过不存在的列
        if col not in df.columns:
            warnings.warn(f"Column {col} not found in dataframe")
            continue
            
        # 检查列的类型
        if df[col].dtype == 'object':
            # 对象类型直接加入编码列表
            columns_to_encode.append(col)
        elif pd.api.types.is_numeric_dtype(df[col]):
            # 数值类型需要检查是否为分类变量
            unique_count = df[col].nunique()
            if unique_count < len(df[col]) * 0.05:  # 如果不同值的数量小于5%，认为是分类变量
                columns_to_encode.append(col)
                df[col] = df[col].astype(str)  # 转换为字符串
    
    for target_col in columns_to_encode:
        try:
            if method == 'auto' or method == 'onehot':
                dummies = pd.get_dummies(df[target_col], prefix=target_col, drop_first=False)
                df = pd.concat([df, dummies], axis=1)
                if not keep_original:
                    df.drop(columns=[target_col], inplace=True)
                    
            elif method == 'label':
                encoder = LabelEncoder()
                df[f"{target_col}_encoded"] = encoder.fit_transform(df[target_col].astype(str))
                if not keep_original:
                    df.drop(columns=[target_col], inplace=True)
                    
            elif method == 'frequency':
                freq = df[target_col].value_counts(normalize=True)
                df[f"{target_col}_freq"] = df[target_col].map(freq)
                if not keep_original:
                    df.drop(columns=[target_col], inplace=True)
                    
            elif method == 'count':
                if group_columns:
                    df[f"{target_col}_count"] = df.groupby(group_columns)[target_col].transform('count')
                else:
                    df[f"{target_col}_count"] = df[target_col].map(df[target_col].value_counts())
                if not keep_original:
                    df.drop(columns=[target_col], inplace=True)
                    
        except Exception as e:
            warnings.warn(f"Error encoding column {target_col}: {str(e)}")
            continue
                
    return df


###########################################
#FEATURE ENGINEERING
###########################################

def transform_features(data: pd.DataFrame,
                      columns: Union[str, List[str]],
                      method: str = 'standard',
                      params: Optional[dict] = None,
                      keep_original: bool = True,
                      scaler: Optional[object] = None) -> Tuple[pd.DataFrame, object]:
    """
    使用各种方法对特征进行变换和缩放。
    
    参数:
        data (pd.DataFrame): 输入的数据框
        columns (Union[str, List[str]]): 需要转换的列名或列名列表
        method (str): 转换方法，可选项：
            - 'standard': 标准化 (均值为0，方差为1)
            - 'minmax': 最小最大归一化 (缩放到[0,1]区间)
            - 'robust': 稳健缩放 (使用四分位数，对异常值不敏感)
            - 'log': 自然对数变换
            - 'sqrt': 平方根变换
            - 'power': 幂变换 (Yeo-Johnson变换)
        params (dict, optional): 转换器的额外参数
        keep_original (bool): 是否保留原始列，默认为True
        scaler: 已经训练好的scaler对象。如果为None，则创建新的scaler
    
    返回:
        Tuple[pd.DataFrame, object]: (转换后的数据框, 使用的scaler)
    """
    # 统一输入格式和验证
    columns = [columns] if isinstance(columns, str) else columns
    if missing := set(columns) - set(data.columns):
        raise ValueError(f"Columns not found: {missing}")
    if non_numeric := [col for col in columns if not pd.api.types.is_numeric_dtype(data[col])]:
        raise ValueError(f"Non-numeric columns: {non_numeric}")

    # 定义转换方法字典
    transform_methods = {
        'log': lambda: {
            'transform': lambda x: np.sign(x) * np.log1p(np.abs(x)),
            'method': 'log'
        },
        'sqrt': lambda: {
            'transform': lambda x: np.sign(x) * np.sqrt(np.abs(x)),
            'method': 'sqrt'
        }
    }

    # 处理无参数转换方法
    if method in transform_methods:
        scaler = transform_methods[method]() if scaler is None else scaler
        transformed_data = scaler['transform'](data[columns].values)
        if method == 'log':  # 处理log特有的无限值
            transformed_data = np.where(np.isinf(transformed_data),
                                      np.sign(transformed_data) * np.log1p(np.finfo(float).max),
                                      transformed_data)
    
    # 处理标准化方法
    elif method == 'standard':
        if scaler is None:
            standard_scaler = StandardScaler()
            robust_scaler = RobustScaler()
            transformed_data = standard_scaler.fit_transform(data[columns])
            
            if np.any(~np.isfinite(transformed_data)):
                warnings.warn("StandardScaler产生了无穷值或NaN，切换到稳健标准化")
                transformed_data = robust_scaler.fit_transform(data[columns])
                # 检查RobustScaler的结果
                if np.any(~np.isfinite(transformed_data)):
                    warnings.warn("RobustScaler也产生了异常值，使用0填充")
                    transformed_data = np.where(~np.isfinite(transformed_data), 0, transformed_data)
                scaler = robust_scaler
            elif np.any(extreme_columns := np.any(np.abs(transformed_data) > 10, axis=0)):
                extreme_cols = [col for col, is_extreme in zip(columns, extreme_columns) if is_extreme]
                warnings.warn(f"以下列包含极端值，对这些列使用稳健标准化: {extreme_cols}")
                robust_transformed = robust_scaler.fit_transform(data[extreme_cols])
                # 检查RobustScaler的结果
                if np.any(~np.isfinite(robust_transformed)):
                    warnings.warn("RobustScaler产生了异常值，使用0填充")
                    robust_transformed = np.where(~np.isfinite(robust_transformed), 0, robust_transformed)
                transformed_data[:, extreme_columns] = robust_transformed
                scaler = {'standard': standard_scaler, 'robust': robust_scaler,
                         'extreme_columns': extreme_columns, 'extreme_cols': extreme_cols}
            else:
                scaler = standard_scaler
        else:
            transformed_data = (scaler['standard'].transform(data[columns]) 
                              if isinstance(scaler, dict) 
                              else scaler.transform(data[columns]))
            if isinstance(scaler, dict) and np.any(scaler['extreme_columns']):
                transformed_data[:, scaler['extreme_columns']] = scaler['robust'].transform(
                    data[scaler['extreme_cols']]
                )

    # 处理其他缩放方法
    elif method in ['minmax', 'robust', 'power']:
        if scaler is None:
            scaler = (PowerTransformer(method='yeo-johnson') if method == 'power' 
                     else MinMaxScaler(**(params or {})) if method == 'minmax'
                     else RobustScaler(**(params or {})))
            transformed_data = scaler.fit_transform(data[columns])
            
            # 处理特殊情况
            if np.any(~np.isfinite(transformed_data)):
                if method == 'power':
                    warnings.warn("PowerTransformer产生了异常值，尝试使用稳健标准化")
                    robust_scaler = RobustScaler()
                    mask = ~np.isfinite(transformed_data)
                    robust_transformed = robust_scaler.fit_transform(data[columns].values)
                    
                    # 检查RobustScaler的结果
                    if np.any(~np.isfinite(robust_transformed)):
                        warnings.warn("RobustScaler也产生了异常值，使用0填充")
                        robust_transformed = np.where(~np.isfinite(robust_transformed), 0, robust_transformed)
                    
                    transformed_data[mask] = robust_transformed[mask]
                    scaler = {'power': scaler, 'robust': robust_scaler, 'mask': mask}
                else:
                    warnings.warn(f"{method.capitalize()}Scaler产生了异常值，使用0填充")
                    transformed_data = np.where(~np.isfinite(transformed_data), 0, transformed_data)
        else:
            if isinstance(scaler, dict) and method == 'power':
                transformed_data = scaler['power'].transform(data[columns])
                if np.any(scaler['mask']):
                    transformed_data[scaler['mask']] = scaler['robust'].transform(
                        data[columns].values
                    )[scaler['mask']]
            else:
                transformed_data = scaler.transform(data[columns])
    else:
        raise ValueError(f"Unknown transform method: {method}")

    # 创建结果数据框
    transformed_df = pd.DataFrame(transformed_data, 
                                columns=[f"{col}_{method}" for col in columns],
                                index=data.index)
    
    # 合并结果
    result = pd.concat(
        [data.copy(), transformed_df] if keep_original 
        else [data.drop(columns=columns), transformed_df], 
        axis=1
    )
    
    return result, scaler

def reduce_dimensions(data: pd.DataFrame,
                     method: str = 'pca',
                     n_components: Union[int, float] = 0.95,
                     target: Optional[pd.Series] = None,
                     keep_original: bool = True) -> pd.DataFrame:
    """
    使用PCA或LDA进行降维。
    
    参数:
        data (pd.DataFrame): 输入特征矩阵
        method (str): 降维方法 ('pca' 或 'lda')
        n_components (Union[int, float]): 保留的组件数
            - 如果是整数: 使用指定数量的组件
            - 如果是小于1的浮点数: 保留解释该比例方差的组件数
            注意：对于LDA，组件数不能超过min(特征数量, 类别数-1)
        target (pd.Series, optional): 目标变量，LDA方法需要
        keep_original (bool): 是否保留原始特征列，默认为True
    
    返回:
        pd.DataFrame: 降维后的数据框，如果keep_original=True，则包含原始特征
        
    异常:
        ValueError: 当指定了无效的方法或参数时
    """
    if method not in ['pca', 'lda']:
        raise ValueError("Method must be 'pca' or 'lda'")
        
    if method == 'lda':
        if target is None:
            raise ValueError("Target required for LDA")
        # 计算LDA的最大可能组件数
        n_classes = len(np.unique(target))
        max_components = min(data.shape[1], n_classes - 1)
        if isinstance(n_components, int) and n_components > max_components:
            n_components = max_components
            warnings.warn(f"n_components reduced to {max_components} for LDA")
    
    # Validate numeric features
    non_numeric = data.select_dtypes(exclude=['number']).columns
    if len(non_numeric):
        raise ValueError(f"Non-numeric columns found: {non_numeric}")
        
    if method == 'pca':
        reducer = PCA(n_components=n_components)
        transformed = reducer.fit_transform(data)
        
        # Create column names
        cols = [f'PC{i+1}' for i in range(transformed.shape[1])]
        
    else:  # LDA
        reducer = LinearDiscriminantAnalysis(n_components=n_components)
        transformed = reducer.fit_transform(data, target)
        
        # Create column names  
        cols = [f'LD{i+1}' for i in range(transformed.shape[1])]
    
    # 创建降维后的数据框
    transformed_df = pd.DataFrame(transformed, columns=cols, index=data.index)
    
    # 如果需要保留原始特征，则合并原始特征和降维特征
    if keep_original:
        return pd.concat([data, transformed_df], axis=1)
    else:
        return transformed_df

from multiprocessing import cpu_count
from functools import partial
from sklearn.linear_model import LassoCV

def select_features(data: pd.DataFrame,
                   target: Optional[pd.Series] = None,
                   method: str = 'variance',
                   n_features: Optional[int] = None,
                   params: Optional[dict] = None) -> List[str]:
    """
    使用各种方法进行特征选择。
    
    参数:
        data (pd.DataFrame): 输入特征矩阵
        target (pd.Series, optional): 目标变量，部分方法需要
        method (str): 特征选择方法:
            - 'variance': 移除低方差特征
            - 'correlation': 基于与目标变量的相关性选择
            - 'mutual_info': 基于互信息选择
            - 'rfe': 递归特征消除
            - 'lasso': 基于L1正则化的特征选择
        n_features (int, optional): 要选择的特征数量
            - 如果为None，则：
                variance: 使用阈值选择
                correlation: 使用阈值选择
                mutual_info: 默认选择10个
                rfe: 默认选择一半特征
                lasso: 使用alpha参数控制
        params (dict, optional): 选择器的额外参数:
            - variance: {'threshold': float}
            - correlation: {'threshold': float}
            - mutual_info: {'k': int}
            - rfe: {'step': int}
            - lasso: {'alpha': float}
    
    返回:
        List[str]: 被选中的特征名列表
        
    异常:
        ValueError: 当指定了无效的方法或缺少必需参数时
    """
    params = params or {}
    n_jobs = params.get('n_jobs', -1)
    if n_jobs == -1:
        n_jobs = cpu_count()
    
    df = data.copy()
    
    # 处理目标变量
    if target is not None:
        # 保存原始目标变量
        original_target = target.copy()
        
        # 如果是离散型变量，进行编码
        if not pd.api.types.is_numeric_dtype(target):
            encoder = LabelEncoder()
            target = pd.Series(
                encoder.fit_transform(target),
                index=target.index,
                name=target.name
            )
        
        # 如果target在特征中，移除它
        if target.name in df.columns:
            df = df.drop(columns=[target.name])
    
    # 数值类型转换
    numeric_cols = df.select_dtypes(include=np.number).columns
    #df[numeric_cols] = df[numeric_cols].astype('float32')
    
    if target is not None:
        target = target.astype('float32')
    
    if method in ['correlation', 'mutual_info', 'rfe', 'lasso'] and target is None:
        raise ValueError(f"Target required for method '{method}'")
    
    if n_features is not None and n_features <= 0:
        raise ValueError("n_features must be positive")
    
    if n_features is not None:
        if n_features > df.shape[1]:
            warnings.warn(f'n_features ({n_features}) adjusted to match maximum available features ({df.shape[1]})')
            n_features = df.shape[1]
        
    if method == 'variance':
        if n_features is None:
            threshold = params.get('threshold', 0.0)
            selector = VarianceThreshold(threshold=threshold)
            selector.fit(df)
            mask = selector.get_support()
        else:
            # 使用numpy操作避免pandas的类型推断
            variances = np.var(df.values, axis=0)
            idx = np.argsort(variances)[-n_features:]
            mask = df.columns[idx]
            
    elif method == 'correlation':
        if not pd.api.types.is_numeric_dtype(target):
            raise ValueError("Target must be numeric for correlation method")
            
        correlations = np.zeros(df.shape[1])
        for i in range(df.shape[1]):
            try:
                mask = ~np.isnan(df.iloc[:, i]) & ~np.isnan(target)
                if np.sum(mask) > 1:
                    correlations[i] = np.abs(stats.spearmanr(
                        df.iloc[mask, i],
                        target[mask]
                    )[0])
            except:
                correlations[i] = 0
                
        # 特征选择
        if n_features is None:
            threshold = params.get('threshold', 0.1)
            mask = df.columns[correlations > threshold]
        else:
            idx = np.argsort(-np.abs(correlations))[:n_features]
            mask = df.columns[idx]
            
    elif method == 'mutual_info':
        k = n_features if n_features is not None else params.get('k', 10)
        
        if pd.api.types.is_numeric_dtype(target):
            mi_func = mutual_info_regression
        else:
            mi_func = mutual_info_classif
            
        selector = SelectKBest(
            partial(mi_func, n_jobs=n_jobs),
            k=k
        )
        selector.fit(df, target)
        mask = selector.get_support()
        
    elif method == 'rfe':
        n_features_to_select = n_features if n_features is not None else df.shape[1] // 2
        step = params.get('step', 1)
        
        if pd.api.types.is_numeric_dtype(target):
            estimator = RandomForestRegressor(
                n_estimators=100,
                n_jobs=n_jobs
            )
        else:
            estimator = RandomForestClassifier(
                n_estimators=100,
                n_jobs=n_jobs
            )
            
        selector = RFE(
            estimator, 
            n_features_to_select=n_features_to_select, 
            step=step,
            n_jobs=n_jobs
        )
        selector.fit(df, target)
        mask = selector.support_
        
    elif method == 'lasso':
        if n_features is None:
            alpha = params.get('alpha', 1.0)
            if pd.api.types.is_numeric_dtype(target):
                selector = LassoCV(
                    cv=5,
                    n_jobs=n_jobs,
                    random_state=42
                )
            else:
                selector = LogisticRegression(
                    penalty='l1',
                    solver='saga',
                    C=1/alpha,
                    n_jobs=n_jobs
                )
            
            selector.fit(df, target)
            mask = np.abs(selector.coef_) > 1e-10
        else:
            if pd.api.types.is_numeric_dtype(target):
                selector = Lasso(alpha=0.01)
            else:
                selector = LogisticRegression(penalty='l1', solver='liblinear', C=100)
            
            selector.fit(df, target)
            coef_abs = np.abs(selector.coef_)
            idx = np.argsort(coef_abs)[-n_features:]
            mask = df.columns[idx]
    else:
        raise ValueError(f"Unknown selection method: {method}")
        
    if isinstance(mask, pd.Index):
        selected_columns = mask.tolist()
    else:
        selected_columns = df.columns[mask].tolist()

    return selected_columns

def create_polynomial_features(data: pd.DataFrame,
                             columns: Union[str, List[str]],
                             degree: int = 2,
                             interaction_only: bool = False,
                             keep_original: bool = True) -> pd.DataFrame:
    """
    创建多项式和交互特征。
    
    参数:
        data (pd.DataFrame): 输入数据框
        columns (Union[str, List[str]]): 用于创建多项式的列
        degree (int): 最高多项式次数
        interaction_only (bool): 如果为True，则只创建交互特征
        keep_original (bool): 是否保留原始列，默认为True
        
    返回:
        pd.DataFrame: 数据框
            - 如果keep_original=True，包含原始特征和新增多项式特征
            - 如果keep_original=False，只包含非指定原始列和新增多项式特征
        
    异常:
        ValueError: 当参数无效或列不是数值类型时
    """
    if isinstance(columns, str):
        columns = [columns]
        
    # Validate columns
    missing = set(columns) - set(data.columns)
    if missing:
        raise ValueError(f"Columns not found: {missing}")
        
    # Check numeric
    non_numeric = [col for col in columns if not pd.api.types.is_numeric_dtype(data[col])]
    if non_numeric:
        raise ValueError(f"Non-numeric columns: {non_numeric}")
        
    if degree < 1:
        raise ValueError("Degree must be >= 1")
        
    # 创建结果DataFrame
    result = data.copy()
    
    # 创建多项式特征
    poly_features = pd.DataFrame(index=data.index)
    
    # Create single column polynomials
    if not interaction_only:
        for col in columns:
            # 始终从2次项开始，因为1次项就是原始列
            start_degree = 2
            for d in range(start_degree, degree + 1):
                poly_features[f"{col}^{d}"] = data[col] ** d
            
            # 如果保留原始列，添加1次项（即原始列的副本）
            if keep_original:
                poly_features[col] = data[col]
                
    # Create interactions
    if len(columns) > 1:
        for d in range(2, degree + 1):
            for combo in combinations(columns, min(d, len(columns))):
                name = ' * '.join(combo)
                poly_features[name] = data[list(combo)].prod(axis=1)
    
    # 如果不保留原始列，从结果中删除这些列
    if not keep_original:
        result = result.drop(columns=columns)
    
    # 将多项式特征添加到结果中
    result = pd.concat([result, poly_features], axis=1)
    
    # 确保不重复添加原始列
    if keep_original:
        # 删除可能重复的列（保留第一个出现的）
        result = result.loc[:, ~result.columns.duplicated()]
                
    return result

def discretize_features(data: pd.DataFrame,
                       columns: Union[str, List[str]],
                       method: str = 'equal_width',
                       n_bins: int = 10,
                       labels: Optional[List[str]] = None,
                       keep_original: bool = True,
                       return_numeric: bool = True) -> pd.DataFrame:
    """
    将连续特征离散化为类别型数据。
    
    参数:
        data (pd.DataFrame): 输入数据框
        columns (Union[str, List[str]]): 需要离散化的列
        method (str): 分箱方法:
            - 'equal_width': 等宽分箱
            - 'equal_freq': 等频分箱
            - 'kmeans': K均值聚类分箱
        n_bins (int): 分箱数量
        labels (List[str], optional): 分箱的标签
        keep_original (bool): 是否保留原始列，默认为True
        return_numeric (bool): 是否返回数值型结果，默认为True
            - True: 返回0到n_bins-1的整数编码
            - False: 返回分类变量或区间对象
        
    返回:
        pd.DataFrame: 数据框
            - 如果keep_original=True，包含原始列和离散化后的列（带有_bin后缀）
            - 如果keep_original=False，只包含离散化后的列
        
    异常:
        ValueError: 当指定了无效的参数时
    """
    if isinstance(columns, str):
        columns = [columns]
        
    result = data.copy()
    
    for col in columns:
        if not pd.api.types.is_numeric_dtype(data[col]):
            raise ValueError(f"Column {col} must be numeric")
            
        # 创建新的列名，添加后缀
        new_col = f"{col}_bin" if keep_original else col
        
        # 如果需要数值型结果且没有提供标签，使用整数作为标签
        numeric_labels = None
        if return_numeric and labels is None:
            numeric_labels = list(range(n_bins))
            
        if method == 'equal_width':
            # 使用pd.cut进行等宽分箱
            result[new_col] = pd.cut(data[col], bins=n_bins, labels=labels or numeric_labels)
        elif method == 'equal_freq':
            try:
                # 尝试使用pd.qcut进行等频分箱，自动处理重复值
                result[new_col] = pd.qcut(data[col], q=n_bins, labels=labels or numeric_labels, duplicates='drop')
            except ValueError as e:
                # 如果出现错误，打印警告并使用等宽分箱作为后备方案
                import warnings
                warnings.warn(f"等频分箱失败: {str(e)}. 使用等宽分箱作为替代方案。")
                result[new_col] = pd.cut(data[col], bins=n_bins, labels=labels or numeric_labels)
        elif method == 'kmeans':
            from sklearn.cluster import KMeans
            kmeans = KMeans(n_clusters=n_bins)
            result[new_col] = kmeans.fit_predict(data[col].values.reshape(-1, 1))
            if labels:
                result[new_col] = result[new_col].map(dict(enumerate(labels)))
        else:
            raise ValueError(f"Unknown discretization method: {method}")
            
        # 如果需要数值型结果但没有使用数值标签，将分类变量转换为数值
        if return_numeric and labels is not None and not pd.api.types.is_numeric_dtype(result[new_col]):
            # 创建类别到数字的映射
            cat_to_num = {cat: i for i, cat in enumerate(result[new_col].unique())}
            result[new_col] = result[new_col].map(cat_to_num)
            
        # 如果结果是Interval类型，转换为整数
        if return_numeric and pd.api.types.is_interval_dtype(result[new_col]):
            # 使用区间的索引作为数值
            result[new_col] = result[new_col].cat.codes
        
        # 如果不保留原始列，删除原始列
        if not keep_original:
            result = result.drop(columns=[col])
            
    return result