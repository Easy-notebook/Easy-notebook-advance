import pandas as pd
import json
import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from domain.interfaces import IDataCleaningAgent, ILLMProvider, AgentConfig, AgentResult
from infrastructure.agents.base import ConversationalAgent


@dataclass
class CleaningOperation:
    operation_type: str
    column: str
    method: str
    parameters: Dict[str, Any]
    description: str


class DataCleaningAgent(ConversationalAgent, IDataCleaningAgent):
    """Data cleaning agent implementation using new architecture"""
    
    def __init__(
        self,
        llm_provider: ILLMProvider,
        config: AgentConfig,
        problem_description: str = "",
        context_description: str = ""
    ):
        system_message = self._build_system_message(problem_description, context_description)
        super().__init__(
            name="DataCleaningAgent",
            llm_provider=llm_provider,
            config=config,
            system_message=system_message
        )
        
        self._problem_description = problem_description
        self._context_description = context_description
    
    def _build_system_message(self, problem_description: str, context_description: str) -> str:
        """Build system message for the agent"""
        return f"""You are an expert data cleaning agent. Your role is to analyze datasets, identify data quality issues, and propose comprehensive cleaning solutions.

Problem Context: {problem_description}
Domain Context: {context_description}

Your responsibilities:
1. Analyze dataset structure and identify data quality issues
2. Generate appropriate cleaning strategies based on the problem context
3. Execute cleaning operations safely and effectively
4. Validate cleaned data quality
5. Provide clear documentation of all cleaning steps

Always consider the specific problem context when making cleaning decisions. Focus on preserving data integrity while addressing quality issues."""
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "dataset_analysis",
            "issue_identification", 
            "cleaning_plan_generation",
            "cleaning_execution",
            "data_validation",
            "quality_assessment"
        ]
    
    def validate_input(self, input_data: Any) -> bool:
        """Validate input for data cleaning operations"""
        if isinstance(input_data, str):
            # Assume it's a file path
            return os.path.exists(input_data) and input_data.endswith('.csv')
        elif isinstance(input_data, dict):
            # Validate required keys for different operations
            return 'dataset_path' in input_data
        return False
    
    def analyze_dataset(self, dataset_path: str) -> AgentResult:
        """Analyze dataset structure and quality"""
        try:
            # Load and analyze dataset
            df = pd.read_csv(dataset_path)
            
            analysis = {
                'shape': df.shape,
                'columns': list(df.columns),
                'dtypes': df.dtypes.to_dict(),
                'missing_values': df.isnull().sum().to_dict(),
                'missing_percentage': (df.isnull().sum() / len(df) * 100).to_dict(),
                'duplicate_rows': df.duplicated().sum(),
                'memory_usage': df.memory_usage(deep=True).sum(),
                'basic_stats': df.describe().to_dict()
            }
            
            # Generate LLM analysis
            prompt = f"""Analyze this dataset structure and provide insights:

Dataset Info:
- Shape: {analysis['shape']}
- Columns: {analysis['columns']}
- Missing values: {analysis['missing_values']}
- Duplicate rows: {analysis['duplicate_rows']}

Provide a comprehensive analysis of:
1. Data quality assessment
2. Potential issues identified
3. Recommendations for cleaning
4. Variables suitable for the given problem context

Format your response as JSON with keys: quality_assessment, issues_identified, cleaning_recommendations, variable_analysis"""
            
            llm_response = self._call_llm_json(prompt)
            
            return AgentResult(
                success=True,
                data={
                    'basic_analysis': analysis,
                    'llm_insights': llm_response
                },
                message="Dataset analysis completed successfully",
                execution_time=0,
                tokens_used=self._llm_provider.count_tokens(prompt),
                cost=0,
                metadata={'dataset_path': dataset_path}
            )
            
        except Exception as e:
            self._logger.error(f"Dataset analysis failed: {str(e)}")
            raise
    
    def generate_data_summary(self, dataset_path: str) -> AgentResult:
        """Generate comprehensive data summary"""
        analysis_result = self.analyze_dataset(dataset_path)
        
        if not analysis_result.success:
            return analysis_result
        
        # Generate detailed summary using LLM
        prompt = f"""Based on the dataset analysis, generate a comprehensive summary:

Analysis Results: {json.dumps(analysis_result.data, indent=2)}

Create a detailed summary including:
1. Dataset overview and characteristics
2. Data quality score (0-100)
3. Key findings and patterns
4. Readiness for analysis assessment
5. Priority actions needed

Format as JSON with keys: overview, quality_score, key_findings, readiness_assessment, priority_actions"""
        
        summary_response = self._call_llm_json(prompt)
        
        return AgentResult(
            success=True,
            data={
                'analysis': analysis_result.data,
                'summary': summary_response
            },
            message="Data summary generated successfully",
            execution_time=0,
            tokens_used=self._llm_provider.count_tokens(prompt),
            cost=0,
            metadata={'dataset_path': dataset_path}
        )
    
    def identify_issues(self, dataset_path: str) -> AgentResult:
        """Identify data quality issues"""
        df = pd.read_csv(dataset_path)
        
        # Programmatic issue detection
        issues = []
        
        # Missing values
        missing_cols = df.columns[df.isnull().sum() > 0]
        for col in missing_cols:
            missing_count = df[col].isnull().sum()
            missing_pct = (missing_count / len(df)) * 100
            issues.append({
                'type': 'missing_values',
                'column': col,
                'severity': 'high' if missing_pct > 20 else 'medium' if missing_pct > 5 else 'low',
                'description': f'{missing_count} missing values ({missing_pct:.1f}%)',
                'count': missing_count,
                'percentage': missing_pct
            })
        
        # Duplicate rows
        if df.duplicated().sum() > 0:
            issues.append({
                'type': 'duplicate_rows',
                'column': 'all',
                'severity': 'medium',
                'description': f'{df.duplicated().sum()} duplicate rows found',
                'count': df.duplicated().sum()
            })
        
        # Data type inconsistencies
        for col in df.columns:
            if df[col].dtype == 'object':
                # Check for mixed types
                try:
                    pd.to_numeric(df[col], errors='raise')
                    issues.append({
                        'type': 'type_inconsistency',
                        'column': col,
                        'severity': 'low',
                        'description': f'Column {col} appears numeric but stored as object'
                    })
                except:
                    pass
        
        # Use LLM for advanced issue detection
        prompt = f"""Analyze this dataset for advanced data quality issues:

Dataset shape: {df.shape}
Column info: {df.dtypes.to_dict()}
Sample data: {df.head().to_dict()}

Detected issues so far: {issues}

Identify additional issues like:
1. Outliers and anomalies
2. Inconsistent formatting
3. Invalid values
4. Encoding problems
5. Business rule violations

Return JSON with additional_issues array containing: type, column, severity, description"""
        
        llm_response = self._call_llm_json(prompt)
        
        if 'additional_issues' in llm_response:
            issues.extend(llm_response['additional_issues'])
        
        return AgentResult(
            success=True,
            data={'issues': issues},
            message=f"Identified {len(issues)} data quality issues",
            execution_time=0,
            tokens_used=self._llm_provider.count_tokens(prompt),
            cost=0,
            metadata={'dataset_path': dataset_path}
        )
    
    def generate_cleaning_plan(self, dataset_path: str, issues: List[str]) -> AgentResult:
        """Generate data cleaning plan"""
        # Get detailed issue analysis if not provided
        if isinstance(issues, list) and len(issues) > 0 and isinstance(issues[0], str):
            issues_result = self.identify_issues(dataset_path)
            detailed_issues = issues_result.data['issues']
        else:
            detailed_issues = issues
        
        # Generate cleaning plan using LLM
        prompt = f"""Create a comprehensive data cleaning plan for the following issues:

Problem Context: {self._problem_description}
Issues identified: {json.dumps(detailed_issues, indent=2)}

Generate a step-by-step cleaning plan with:
1. Priority order of operations
2. Specific methods for each issue
3. Parameters and thresholds
4. Risk assessment for each operation
5. Validation steps

Format as JSON with cleaning_operations array containing:
- operation_type: str
- column: str
- method: str
- parameters: dict
- description: str
- priority: int (1-5)
- risk_level: str (low/medium/high)
"""
        
        plan_response = self._call_llm_json(prompt)
        
        return AgentResult(
            success=True,
            data=plan_response,
            message="Cleaning plan generated successfully",
            execution_time=0,
            tokens_used=self._llm_provider.count_tokens(prompt),
            cost=0,
            metadata={'dataset_path': dataset_path, 'issues_count': len(detailed_issues)}
        )
    
    def execute_cleaning(self, dataset_path: str, cleaning_plan: Dict[str, Any]) -> AgentResult:
        """Execute data cleaning operations"""
        try:
            df = pd.read_csv(dataset_path)
            original_shape = df.shape
            cleaning_log = []
            
            operations = cleaning_plan.get('cleaning_operations', [])
            
            # Sort operations by priority
            operations.sort(key=lambda x: x.get('priority', 5))
            
            for op in operations:
                try:
                    op_result = self._execute_single_operation(df, op)
                    df = op_result['dataframe']
                    cleaning_log.append(op_result['log'])
                except Exception as e:
                    error_log = {
                        'operation': op,
                        'status': 'failed',
                        'error': str(e)
                    }
                    cleaning_log.append(error_log)
                    self._logger.warning(f"Operation failed: {op['operation_type']} - {str(e)}")
            
            # Save cleaned dataset
            cleaned_path = dataset_path.replace('.csv', '_cleaned.csv')
            df.to_csv(cleaned_path, index=False)
            
            return AgentResult(
                success=True,
                data={
                    'cleaned_dataset_path': cleaned_path,
                    'original_shape': original_shape,
                    'final_shape': df.shape,
                    'cleaning_log': cleaning_log,
                    'operations_completed': len([log for log in cleaning_log if log.get('status') == 'success'])
                },
                message=f"Cleaning completed. Shape changed from {original_shape} to {df.shape}",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={'dataset_path': dataset_path}
            )
            
        except Exception as e:
            self._logger.error(f"Cleaning execution failed: {str(e)}")
            raise
    
    def _execute_single_operation(self, df: pd.DataFrame, operation: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single cleaning operation"""
        op_type = operation['operation_type']
        column = operation['column']
        method = operation['method']
        params = operation.get('parameters', {})
        
        initial_shape = df.shape
        
        if op_type == 'missing_values':
            if method == 'drop':
                df = df.dropna(subset=[column])
            elif method == 'fill_mean':
                df[column] = df[column].fillna(df[column].mean())
            elif method == 'fill_median':
                df[column] = df[column].fillna(df[column].median())
            elif method == 'fill_mode':
                df[column] = df[column].fillna(df[column].mode().iloc[0] if not df[column].mode().empty else 'Unknown')
            elif method == 'fill_value':
                df[column] = df[column].fillna(params.get('value', 'Unknown'))
        
        elif op_type == 'duplicate_rows':
            if method == 'drop':
                df = df.drop_duplicates()
        
        elif op_type == 'type_conversion':
            if method == 'to_numeric':
                df[column] = pd.to_numeric(df[column], errors='coerce')
            elif method == 'to_datetime':
                df[column] = pd.to_datetime(df[column], errors='coerce')
        
        elif op_type == 'outlier_removal':
            if method == 'iqr':
                Q1 = df[column].quantile(0.25)
                Q3 = df[column].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                df = df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]
        
        return {
            'dataframe': df,
            'log': {
                'operation': operation,
                'status': 'success',
                'initial_shape': initial_shape,
                'final_shape': df.shape,
                'rows_affected': initial_shape[0] - df.shape[0]
            }
        }
    
    def validate_cleaned_data(self, original_path: str, cleaned_path: str) -> AgentResult:
        """Validate cleaned data quality"""
        original_df = pd.read_csv(original_path)
        cleaned_df = pd.read_csv(cleaned_path)
        
        validation = {
            'shape_comparison': {
                'original': original_df.shape,
                'cleaned': cleaned_df.shape,
                'rows_removed': original_df.shape[0] - cleaned_df.shape[0],
                'columns_removed': original_df.shape[1] - cleaned_df.shape[1]
            },
            'missing_values': {
                'original_total': original_df.isnull().sum().sum(),
                'cleaned_total': cleaned_df.isnull().sum().sum(),
                'improvement': original_df.isnull().sum().sum() - cleaned_df.isnull().sum().sum()
            },
            'duplicates': {
                'original': original_df.duplicated().sum(),
                'cleaned': cleaned_df.duplicated().sum()
            }
        }
        
        # Generate quality assessment using LLM
        prompt = f"""Assess the quality of data cleaning based on this validation:

Validation Results: {json.dumps(validation, indent=2)}

Provide assessment including:
1. Overall cleaning effectiveness (0-100 score)
2. Data integrity preservation
3. Potential issues or concerns
4. Recommendations for further cleaning

Format as JSON with keys: effectiveness_score, integrity_assessment, concerns, recommendations"""
        
        assessment = self._call_llm_json(prompt)
        
        return AgentResult(
            success=True,
            data={
                'validation_metrics': validation,
                'quality_assessment': assessment
            },
            message="Data validation completed",
            execution_time=0,
            tokens_used=self._llm_provider.count_tokens(prompt),
            cost=0,
            metadata={'original_path': original_path, 'cleaned_path': cleaned_path}
        )
    
    def _execute_internal(self, input_data: Any, **kwargs) -> Any:
        """Internal execution logic for generic tasks"""
        if isinstance(input_data, str):
            # Assume it's a dataset path for analysis
            return self.analyze_dataset(input_data)
        elif isinstance(input_data, dict):
            operation = input_data.get('operation', 'analyze')
            dataset_path = input_data['dataset_path']
            
            if operation == 'analyze':
                return self.analyze_dataset(dataset_path)
            elif operation == 'identify_issues':
                return self.identify_issues(dataset_path)
            elif operation == 'generate_plan':
                issues = input_data.get('issues', [])
                return self.generate_cleaning_plan(dataset_path, issues)
            elif operation == 'execute_cleaning':
                cleaning_plan = input_data['cleaning_plan']
                return self.execute_cleaning(dataset_path, cleaning_plan)
            elif operation == 'validate':
                original_path = input_data['original_path']
                return self.validate_cleaned_data(original_path, dataset_path)
        
        raise ValueError(f"Unsupported input format: {type(input_data)}")