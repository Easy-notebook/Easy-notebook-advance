"""
流式Agent基类
支持模板化的流式输出
"""
import time
import pandas as pd
from typing import Dict, Any, Generator, List
from abc import ABC, abstractmethod
from app.core.template_parser import template_engine

class Agent(ABC):
    """流式Agent基类"""
    
    def __init__(self, 
                 agent_name: str,
                 template_name: str = None,
                 stream: bool = True):
        self.agent_name = agent_name
        self.template_name = template_name
        self.stream = stream
        self.template_engine = template_engine
        self.context = {}
        self.state_updates = {}
        
    def set_context(self, context: Dict[str, Any]):
        """设置模板上下文"""
        self.context.update(context)
    
    def add_context(self, key: str, value: Any):
        """添加单个上下文变量"""
        self.context[key] = value
    
    @abstractmethod
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """分析数据并返回结果"""
        pass
    
    def generate_streaming_response(self) -> Generator[Dict[str, Any], None, None]:
        """生成流式响应"""
        if not self.template_name:
            # 如果没有模板，使用传统方式
            yield from self._generate_traditional_response()
            return
        
        try:
            # 使用模板引擎生成流式响应
            for action in self.template_engine.render_template(self.template_name, self.context):
                # 添加agent信息
                action["agentName"] = self.agent_name
                action["timestamp"] = time.time()
                
                # 处理状态更新
                if action.get("action") == "update_state" and "state" in action:
                    self.state_updates.update(action["state"])
                    action["state"] = self.state_updates.copy()
                
                yield action
                
                # 模拟流式输出的延迟
                if self.stream:
                    time.sleep(0.1)
                    
        except Exception as e:
            # 错误处理
            yield {
                "action": "add",
                "content": f"❌ Agent执行出错: {str(e)}",
                "agentName": self.agent_name,
                "error": True
            }
    
    def _generate_traditional_response(self) -> Generator[Dict[str, Any], None, None]:
        """传统方式生成响应（兼容性）"""
        yield {
            "action": "is_thinking",
            "content": f"🤖 {self.agent_name} 正在分析...",
            "agentName": self.agent_name
        }
        
        # 执行分析
        result = self.analyze(self.context)
        
        yield {
            "action": "thinking", 
            "content": f"{self.agent_name} 分析过程: {result.get('thinking', '正在处理数据...')}",
            "agentName": self.agent_name
        }
        
        yield {
            "action": "add",
            "content": result.get("content", "分析完成"),
            "agentName": self.agent_name
        }
        
        if result.get("state"):
            yield {
                "action": "update_state",
                "state": result["state"],
                "agentName": self.agent_name
            }

class DataAnalysisAgent(Agent):
    """数据分析Agent"""
    
    def __init__(self, stream: bool = True):
        super().__init__(
            agent_name="Data Analysis Agent",
            template_name="data_analysis",
            stream=stream
        )
    
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """分析数据集"""
        csv_path = data.get("csv_file_path")
        if not csv_path:
            return {"error": "CSV文件路径未提供"}
        
        try:
            df = pd.read_csv(csv_path)
            
            # 执行数据分析
            analysis_result = self._perform_data_analysis(df)
            
            # 设置模板上下文
            self.set_context(analysis_result)
            
            return {"success": True, "analysis": analysis_result}
            
        except Exception as e:
            return {"error": f"数据分析失败: {str(e)}"}
    
    def _perform_data_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """执行详细的数据分析"""
        # 基础信息
        dataset_shape = f"{df.shape[0]:,} rows × {df.shape[1]} columns"
        feature_count = df.shape[1]
        target_variable = "SalePrice" if "SalePrice" in df.columns else "Unknown"
        
        # 缺失值分析
        missing_analysis = self._analyze_missing_values(df)
        
        # 特征分析
        feature_analysis = self._analyze_features(df)
        
        # 生成洞察
        insights = self._generate_insights(df, missing_analysis, feature_analysis)
        
        # 生成建议
        recommendations = self._generate_recommendations(df, missing_analysis)
        
        # 计算质量分数
        quality_score = self._calculate_quality_score(missing_analysis, feature_analysis)
        
        return {
            "dataset_shape": dataset_shape,
            "feature_count": feature_count,
            "target_variable": target_variable,
            "missing_values": missing_analysis,
            "feature_analysis": feature_analysis,
            "insights": insights,
            "recommendations": recommendations,
            "quality_score": quality_score,
            "next_steps": ["data_cleaning", "feature_engineering", "model_selection"]
        }
    
    def _analyze_missing_values(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析缺失值"""
        missing_counts = df.isnull().sum()
        total_missing = missing_counts.sum()
        
        if total_missing == 0:
            return {"total": 0, "columns": []}
        
        missing_columns = []
        for col in missing_counts[missing_counts > 0].index:
            missing_columns.append({
                "name": col,
                "count": int(missing_counts[col]),
                "percentage": f"{(missing_counts[col] / len(df) * 100):.1f}"
            })
        
        return {
            "total": int(total_missing),
            "columns": missing_columns
        }
    
    def _analyze_features(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """分析特征"""
        features = []
        
        for col in df.columns[:10]:  # 只分析前10个特征
            feature_info = {
                "name": col,
                "type": str(df[col].dtype),
                "unique_count": int(df[col].nunique()),
                "null_count": int(df[col].isnull().sum()),
                "quality_score": self._calculate_feature_quality(df[col])
            }
            features.append(feature_info)
        
        return features
    
    def _calculate_feature_quality(self, series: pd.Series) -> int:
        """计算特征质量分数"""
        score = 100
        
        # 缺失值惩罚
        null_ratio = series.isnull().sum() / len(series)
        if null_ratio > 0.5:
            score -= 40
        elif null_ratio > 0.2:
            score -= 20
        
        # 唯一值检查
        unique_ratio = series.nunique() / len(series)
        if unique_ratio == 1:  # 无变化
            score = 0
        elif unique_ratio > 0.95:  # 几乎全唯一
            score -= 30
        
        return max(0, score)
    
    def _generate_insights(self, df: pd.DataFrame, missing_analysis: Dict, feature_analysis: List) -> List[str]:
        """生成数据洞察"""
        insights = []
        
        # 数据规模洞察
        if df.shape[0] > 10000:
            insights.append("📊 大规模数据集，适合使用复杂模型和集成方法")
        elif df.shape[0] < 1000:
            insights.append("⚠️ 小规模数据集，需要注意过拟合风险")
        
        # 缺失值洞察
        if missing_analysis["total"] > 0:
            high_missing_cols = [col for col in missing_analysis["columns"] if float(col["percentage"]) > 20]
            if high_missing_cols:
                insights.append(f"🔍 {len(high_missing_cols)} 个特征缺失值超过20%，需要特殊处理")
        
        # 特征质量洞察
        low_quality_features = [f for f in feature_analysis if f["quality_score"] < 50]
        if low_quality_features:
            insights.append(f"⚠️ {len(low_quality_features)} 个特征质量较低，建议考虑移除或转换")
        
        # 目标变量洞察
        if "SalePrice" in df.columns:
            price_range = df["SalePrice"].max() - df["SalePrice"].min()
            insights.append(f"🎯 房价范围: ${df['SalePrice'].min():,.0f} - ${df['SalePrice'].max():,.0f}")
        
        return insights
    
    def _generate_recommendations(self, df: pd.DataFrame, missing_analysis: Dict) -> List[str]:
        """生成处理建议"""
        recommendations = []
        
        # 缺失值处理建议
        if missing_analysis["total"] > 0:
            recommendations.append("🔧 实施缺失值处理策略：中位数/众数填充或删除高缺失列")
        
        # 特征工程建议
        if "SalePrice" in df.columns and df["SalePrice"].skew() > 1:
            recommendations.append("📊 对目标变量进行对数变换以减少偏斜")
        
        # 模型选择建议
        if df.shape[1] > 50:
            recommendations.append("🤖 使用特征选择技术减少维度")
        
        recommendations.append("✅ 进行探索性数据分析以发现更多模式")
        recommendations.append("🚀 准备数据分割和交叉验证策略")
        
        return recommendations
    
    def _calculate_quality_score(self, missing_analysis: Dict, feature_analysis: List) -> int:
        """计算整体数据质量分数"""
        score = 100
        
        # 缺失值影响
        if missing_analysis["total"] > 0:
            missing_ratio = missing_analysis["total"] / (len(feature_analysis) * 1000)  # 假设1000行
            score -= min(30, missing_ratio * 100)
        
        # 特征质量影响
        if feature_analysis:
            avg_feature_quality = sum(f["quality_score"] for f in feature_analysis) / len(feature_analysis)
            score = int(score * (avg_feature_quality / 100))
        
        return max(0, min(100, score))

class MethodologyAgent(Agent):
    """方法论设计Agent"""
    
    def __init__(self, stream: bool = True):
        super().__init__(
            agent_name="Methodology Design Agent",
            template_name="methodology_design", 
            stream=stream
        )
    
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """设计机器学习方法论"""
        # 获取数据分析结果
        data_analysis = data.get("data_analysis_results", {})
        dataset_shape = data.get("dataset_shape", (0, 0))
        
        # 设计方法论
        methodology = self._design_methodology(data_analysis, dataset_shape)
        
        # 设置模板上下文
        self.set_context(methodology)
        
        return {"success": True, "methodology": methodology}
    
    def _design_methodology(self, data_analysis: Dict, shape: tuple) -> Dict[str, Any]:
        """设计完整的ML方法论"""
        # 分析问题复杂度
        complexity_analysis = self._analyze_complexity(data_analysis, shape)
        
        # 选择算法
        algorithms = self._select_algorithms(complexity_analysis)
        
        # 设计特征工程
        feature_engineering = self._design_feature_engineering(data_analysis)
        
        # 设计验证策略
        validation = self._design_validation_strategy(shape)
        
        return {
            "problem_type": "Regression",
            "complexity_level": complexity_analysis["level"],
            "data_size": complexity_analysis["size"],
            "primary_algorithms": algorithms["primary"],
            "ensemble_methods": algorithms["ensemble"],
            "preprocessing_steps": feature_engineering["preprocessing"],
            "feature_engineering": feature_engineering["creation"],
            "validation_method": validation["method"],
            "cv_folds": validation["folds"],
            "evaluation_metrics": validation["metrics"],
            "target_r2": 0.85,
            "target_rmse": 30000,
            "target_mae": 20000,
            "selected_algorithms": [alg["name"] for alg in algorithms["primary"]],
        }
    
    def _analyze_complexity(self, data_analysis: Dict, shape: tuple) -> Dict[str, Any]:
        """分析问题复杂度"""
        complexity = "medium"
        size = "medium"
        
        # 基于数据规模判断
        if shape[0] > 5000:
            size = "large"
        elif shape[0] < 1000:
            size = "small"
        
        # 基于特征数量和质量判断复杂度
        missing_total = data_analysis.get("missing_values", {}).get("total_missing", 0)
        if missing_total > shape[0] * 0.1 or shape[1] > 100:
            complexity = "high"
        elif missing_total == 0 and shape[1] < 20:
            complexity = "low"
        
        return {"level": complexity, "size": size}
    
    def _select_algorithms(self, complexity: Dict) -> Dict[str, List]:
        """选择合适的算法"""
        primary = [
            {"name": "Linear Regression", "description": "基础线性模型，高解释性", "use_case": "基线模型", "expected_performance": "中等"},
            {"name": "Random Forest", "description": "集成决策树，鲁棒性强", "use_case": "特征重要性分析", "expected_performance": "良好"},
            {"name": "Gradient Boosting", "description": "序列集成，高精度", "use_case": "性能优化", "expected_performance": "优秀"}
        ]
        
        ensemble = []
        if complexity["level"] in ["medium", "high"]:
            ensemble = [
                {"name": "Voting Regressor", "description": "多模型投票集成"},
                {"name": "Stacking Regressor", "description": "元学习集成方法"}
            ]
        
        return {"primary": primary, "ensemble": ensemble}
    
    def _design_feature_engineering(self, data_analysis: Dict) -> Dict[str, List]:
        """设计特征工程策略"""
        preprocessing = []
        creation = []
        
        # 基于缺失值情况设计预处理
        missing_info = data_analysis.get("missing_values", {})
        if missing_info.get("total_missing", 0) > 0:
            preprocessing.append({
                "name": "Missing Value Imputation",
                "description": "处理缺失值",
                "implementation": "使用中位数/众数填充或KNN插值"
            })
        
        # 基于目标变量特征设计转换
        target_info = data_analysis.get("target_analysis", {})
        if target_info.get("skewness", 0) > 1:
            preprocessing.append({
                "name": "Target Transformation", 
                "description": "目标变量对数变换",
                "implementation": "np.log1p(y)"
            })
        
        # 特征创建策略
        creation = [
            "多项式特征生成",
            "特征交互项创建", 
            "数值特征分箱",
            "类别特征编码"
        ]
        
        return {"preprocessing": preprocessing, "creation": creation}
    
    def _design_validation_strategy(self, shape: tuple) -> Dict[str, Any]:
        """设计验证策略"""
        if shape[0] < 1000:
            return {
                "method": "K-Fold Cross Validation",
                "folds": 3,
                "metrics": ["R²", "RMSE", "MAE"]
            }
        else:
            return {
                "method": "K-Fold Cross Validation", 
                "folds": 5,
                "metrics": ["R²", "RMSE", "MAE", "MAPE"]
            }

# 导出主要类
__all__ = ["Agent", "DataAnalysisAgent", "MethodologyAgent"]
