from typing import Dict, Any, List, Optional

from domain.interfaces import IDataStructureAgent, ILLMProvider, AgentConfig, AgentResult
from infrastructure.agents.base import ConversationalAgent


class DataStructureAgent(ConversationalAgent, IDataStructureAgent):
    """数据结构探索Agent - 迁移到新架构"""
    
    def __init__(
        self,
        llm_provider: ILLMProvider,
        config: AgentConfig,
        system_prompt: str = "你是一个数据科学专家，专注于进行降维和聚类分析，探索数据结构。"
    ):
        super().__init__(
            name="DataStructureAgent",
            llm_provider=llm_provider,
            config=config,
            system_message=system_prompt
        )
        
        self._logger.info("DataStructureAgent initialized")
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "dimensionality_reduction",
            "clustering_analysis",
            "data_structure_exploration",
            "pattern_discovery",
            "feature_analysis",
            "data_visualization"
        ]
    
    def validate_input(self, input_data: Any) -> bool:
        """Validate input data"""
        if isinstance(input_data, dict):
            return 'dataset_path' in input_data or 'data' in input_data
        return isinstance(input_data, str)  # Accept dataset path as string
    
    def perform_dimensionality_reduction(self, dataset_path: str, method: str = "pca") -> AgentResult:
        """执行降维分析"""
        try:
            self._logger.info(f"Performing {method} dimensionality reduction on {dataset_path}")
            
            prompt = f"""
请对以下数据集进行{method}降维分析：

数据集路径：{dataset_path}

请执行以下任务：
1. 加载数据集并进行基本预处理
2. 应用{method}降维方法
3. 分析降维后的特征重要性
4. 创建降维可视化图表
5. 解释降维结果和发现的模式

请生成完整的Python代码来执行这些任务，并提供详细的分析报告。
"""
            
            response = self._call_llm(prompt)
            
            return AgentResult(
                success=True,
                data={
                    "analysis_type": "dimensionality_reduction",
                    "method": method,
                    "code": response,
                    "dataset_path": dataset_path
                },
                message=f"{method}降维分析完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"method": method, "analysis_type": "dimensionality_reduction"}
            )
            
        except Exception as e:
            self._logger.error(f"Dimensionality reduction failed: {str(e)}")
            raise
    
    def perform_clustering(self, dataset_path: str, algorithm: str = "kmeans") -> AgentResult:
        """执行聚类分析"""
        try:
            self._logger.info(f"Performing {algorithm} clustering on {dataset_path}")
            
            prompt = f"""
请对以下数据集进行{algorithm}聚类分析：

数据集路径：{dataset_path}

请执行以下任务：
1. 加载数据集并进行必要的预处理
2. 选择合适的特征进行聚类
3. 应用{algorithm}聚类算法
4. 确定最佳聚类数量（如适用）
5. 分析聚类结果和每个聚类的特征
6. 创建聚类可视化图表
7. 提供聚类质量评估指标

请生成完整的Python代码来执行这些任务，并提供详细的聚类分析报告。
"""
            
            response = self._call_llm(prompt)
            
            return AgentResult(
                success=True,
                data={
                    "analysis_type": "clustering",
                    "algorithm": algorithm,
                    "code": response,
                    "dataset_path": dataset_path
                },
                message=f"{algorithm}聚类分析完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"algorithm": algorithm, "analysis_type": "clustering"}
            )
            
        except Exception as e:
            self._logger.error(f"Clustering analysis failed: {str(e)}")
            raise
    
    def explore_data_structure(self, dataset_path: str) -> AgentResult:
        """执行全面的数据结构探索"""
        try:
            self._logger.info(f"Exploring data structure for {dataset_path}")
            
            prompt = f"""
请对以下数据集进行全面的数据结构探索：

数据集路径：{dataset_path}

请执行以下任务：
1. 数据基本信息分析（形状、类型、缺失值等）
2. 特征相关性分析
3. 特征分布分析
4. 异常值检测
5. 数据模式发现
6. 特征重要性评估
7. 数据质量评估
8. 结构化数据可视化

请生成完整的Python代码来执行这些任务，并提供详细的数据结构探索报告。
"""
            
            response = self._call_llm(prompt)
            
            return AgentResult(
                success=True,
                data={
                    "analysis_type": "structure_exploration",
                    "code": response,
                    "dataset_path": dataset_path,
                    "exploration_areas": [
                        "basic_info", "correlations", "distributions", 
                        "outliers", "patterns", "feature_importance", "quality_assessment"
                    ]
                },
                message="数据结构探索完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"analysis_type": "structure_exploration"}
            )
            
        except Exception as e:
            self._logger.error(f"Data structure exploration failed: {str(e)}")
            raise
    
    def analyze_dataset(self, dataset_path: str) -> AgentResult:
        """分析数据集（继承自IDataProcessingAgent）"""
        return self.explore_data_structure(dataset_path)
    
    def generate_data_summary(self, dataset_path: str) -> AgentResult:
        """生成数据摘要（继承自IDataProcessingAgent）"""
        try:
            self._logger.info(f"Generating data summary for {dataset_path}")
            
            prompt = f"""
请为以下数据集生成简洁的数据摘要：

数据集路径：{dataset_path}

请提供：
1. 数据集基本统计信息
2. 主要特征描述
3. 数据质量概述
4. 关键发现要点
5. 建议的后续分析方向

请以结构化的方式组织摘要，便于快速理解数据集特征。
"""
            
            response = self._call_llm(prompt)
            
            return AgentResult(
                success=True,
                data={
                    "summary": response,
                    "dataset_path": dataset_path,
                    "summary_type": "comprehensive"
                },
                message="数据摘要生成完成",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={"summary_type": "comprehensive"}
            )
            
        except Exception as e:
            self._logger.error(f"Data summary generation failed: {str(e)}")
            raise
    
    def _execute_internal(self, input_data: Any, **kwargs) -> Any:
        """Internal execution logic"""
        if isinstance(input_data, str):
            # If input is just a dataset path, perform general structure exploration
            return self.explore_data_structure(input_data)
        
        if isinstance(input_data, dict):
            operation = input_data.get('operation', 'explore_structure')
            dataset_path = input_data.get('dataset_path')
            
            if not dataset_path:
                raise ValueError("dataset_path is required")
            
            if operation == 'dimensionality_reduction':
                method = input_data.get('method', 'pca')
                return self.perform_dimensionality_reduction(dataset_path, method)
            elif operation == 'clustering':
                algorithm = input_data.get('algorithm', 'kmeans')
                return self.perform_clustering(dataset_path, algorithm)
            elif operation == 'explore_structure':
                return self.explore_data_structure(dataset_path)
            elif operation == 'generate_summary':
                return self.generate_data_summary(dataset_path)
        
        raise ValueError(f"Unsupported input format: {type(input_data)}")