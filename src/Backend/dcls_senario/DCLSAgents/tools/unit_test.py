from langchain.tools import BaseTool
from langchain.pydantic_v1 import BaseModel, Field
from langchain.base_language import BaseLanguageModel
import pandas as pd
import os
from typing import Dict, List, Tuple

class UnitTestInput(BaseModel):
    """输入参数模型"""
    phase: str = Field(..., description="测试阶段(如'数据清理','特征工程'等)")
    data_path: str = Field(..., description="清理后的数据文件路径")
    original_data_path: str = Field(None, description="原始数据文件路径(可选)")

class DataCleaningTest:
    """数据清理阶段的测试集合"""
    @staticmethod
    def test_file_readable(data_path: str) -> Dict:
        """测试文件是否可读"""
        try:
            if not os.path.exists(data_path):
                return {
                    "name": "文件可读性测试",
                    "passed": False,
                    "message": f"文件不存在: {data_path}"
                }
            
            pd.read_csv(data_path)
            return {
                "name": "文件可读性测试",
                "passed": True,
                "message": "文件存在且可以正确读取"
            }
        except Exception as e:
            return {
                "name": "文件可读性测试",
                "passed": False,
                "message": f"文件读取失败: {str(e)}"
            }

    @staticmethod
    def test_empty_dataset(data_path: str) -> Dict:
        """测试数据集是否为空（只有列名没有内容）"""
        try:
            df = pd.read_csv(data_path)
            if len(df) == 0:
                return {
                    "name": "数据集空值测试",
                    "passed": False,
                    "message": "数据集只有列名，没有实际内容"
                }
            return {
                "name": "数据集空值测试",
                "passed": True,
                "message": f"数据集包含 {len(df)} 行数据"
            }
        except Exception as e:
            return {
                "name": "数据集空值测试",
                "passed": False,
                "message": f"测试执行失败: {str(e)}"
            }

    @staticmethod
    def test_missing_values(data_path: str) -> Dict:
        """测试是否存在缺失值"""
        try:
            df = pd.read_csv(data_path)
            missing_info = df.isnull().sum()
            missing_columns = missing_info[missing_info > 0]
            
            if missing_columns.empty:
                return {
                    "name": "缺失值测试",
                    "passed": True,
                    "message": "数据中没有缺失值"
                }
            else:
                missing_details = []
                for col, count in missing_columns.items():
                    percentage = (count / len(df)) * 100
                    missing_details.append(f"{col}: {count}个 ({percentage:.2f}%)")
                
                return {
                    "name": "缺失值测试",
                    "passed": False,
                    "message": f"发现缺失值:\n" + "\n".join(missing_details)
                }
        except Exception as e:
            return {
                "name": "缺失值测试",
                "passed": False,
                "message": f"测试执行失败: {str(e)}"
            }

    @staticmethod
    def test_duplicated_features(data_path: str) -> Dict:
        """测试是否存在重复的特征列"""
        try:
            df = pd.read_csv(data_path)
            duplicated_features = df.columns[df.columns.duplicated()].tolist()
            
            if not duplicated_features:
                return {
                    "name": "重复特征测试",
                    "passed": True,
                    "message": "没有重复的特征列"
                }
            else:
                return {
                    "name": "重复特征测试",
                    "passed": False,
                    "message": f"发现重复的特征列: {', '.join(duplicated_features)}"
                }
        except Exception as e:
            return {
                "name": "重复特征测试",
                "passed": False,
                "message": f"测试执行失败: {str(e)}"
            }

    @staticmethod
    def test_data_consistency(data_path: str, original_path: str) -> Dict:
        """测试清理后的数据与原始数据的一致性"""
        try:
            cleaned_df = pd.read_csv(data_path)
            original_df = pd.read_csv(original_path)
            
            # 检查行数
            if len(cleaned_df) > len(original_df):
                return {
                    "name": "数据一致性测试",
                    "passed": False,
                    "message": f"清理后的数据行数({len(cleaned_df)})超过原始数据行数({len(original_df)})"
                }
            
            # 检查共同的列
            common_columns = set(original_df.columns) & set(cleaned_df.columns)
            if not common_columns:
                return {
                    "name": "数据一致性测试",
                    "passed": False,
                    "message": "清理后的数据与原始数据没有共同的列"
                }
            
            return {
                "name": "数据一致性测试",
                "passed": True,
                "message": f"数据一致性检查通过，保留了{len(common_columns)}个原始特征"
            }
        except Exception as e:
            return {
                "name": "数据一致性测试",
                "passed": False,
                "message": f"测试执行失败: {str(e)}"
            }

    @staticmethod
    def test_duplicated_rows(data_path: str) -> Dict:
        """测试是否存在重复的行"""
        try:
            df = pd.read_csv(data_path)
            duplicated_count = df.duplicated().sum()
            
            if duplicated_count == 0:
                return {
                    "name": "重复行测试",
                    "passed": True,
                    "message": "没有重复的行"
                }
            else:
                # 获取重复行的索引
                duplicated_rows = df[df.duplicated(keep='first')].index.tolist()
                return {
                    "name": "重复行测试",
                    "passed": False,
                    "message": f"发现{duplicated_count}行重复数据，重复行的索引为: {duplicated_rows}"
                }
        except Exception as e:
            return {
                "name": "重复行测试",
                "passed": False,
                "message": f"测试执行失败: {str(e)}"
            }

    @staticmethod
    def test_numeric_conversion(data_path: str) -> Dict:
        """测试是否所有离散型变量都已转换为数值型"""
        try:
            df = pd.read_csv(data_path)
            non_numeric_cols = df.select_dtypes(exclude=['int64', 'float64']).columns.tolist()
            
            if not non_numeric_cols:
                return {
                    "name": "数值转换测试",
                    "passed": True,
                    "message": "所有变量都是数值型"
                }
            else:
                return {
                    "name": "数值转换测试",
                    "passed": False,
                    "message": f"发现非数值型变量: {', '.join(non_numeric_cols)}"
                }
        except Exception as e:
            return {
                "name": "数值转换测试",
                "passed": False,
                "message": f"测试执行失败: {str(e)}"
            }
from typing import ClassVar, Dict


class UnitTestTool(BaseTool):
    name: str = "unit_test"
    description: str = "执行不同阶段的单元测试"
    args_schema: type[BaseModel] = UnitTestInput
    
    # 定义各阶段的测试函数映射
    PHASE_TESTS:ClassVar[Dict[str, list]] = {
        "数据清理": [
            DataCleaningTest.test_file_readable,
            DataCleaningTest.test_empty_dataset,
            DataCleaningTest.test_missing_values,
            DataCleaningTest.test_duplicated_features,
            DataCleaningTest.test_duplicated_rows,
            DataCleaningTest.test_data_consistency,
            #DataCleaningTest.test_numeric_conversion,
        ]
    }
    
    def _generate_report(self, results: Dict) -> str:
        """生成测试报告"""
        report = [f"{results['phase']}测试报告:"]
        report.append(f"通过: {results['passed']}, 失败: {results['failed']}\n")
        
        for test in results["tests"]:
            status = "✓" if test["passed"] else "✗"
            report.append(f"{status} {test['name']}: {test['message']}")
            
        return "\n".join(report)

    def _run(self, phase: str, data_path: str, original_data_path: str = None) -> Dict:
        """运行指定阶段的单元测试"""
        results = {
            "phase": phase,
            "tests": [],
            "passed": 0,
            "failed": 0,
            "all_passed": False,
            "report": ""
        }
        
        # 获取当前阶段的测试函数列表
        test_functions = self.PHASE_TESTS.get(phase, [])
        if not test_functions:
            results["tests"].append({
                "name": "阶段检查",
                "passed": False,
                "message": f"未实现的测试阶段: {phase}"
            })
            results["failed"] = 1
            results["report"] = self._generate_report(results)
            return results
            
        # 执行测试
        for test_func in test_functions:
            if test_func == DataCleaningTest.test_data_consistency and original_data_path:
                test_result = test_func(data_path, original_data_path)
            else:
                test_result = test_func(data_path)
                
            results["tests"].append(test_result)
            if test_result["passed"]:
                results["passed"] += 1
            else:
                results["failed"] += 1
        
        # 判断是否全部通过
        results["all_passed"] = results["failed"] == 0
        # 生成报告
        results["report"] = self._generate_report(results)
                
        return results