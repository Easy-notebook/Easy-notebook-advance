from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum


class DatasetType(Enum):
    TRAINING = "training"
    TESTING = "testing"
    VALIDATION = "validation"
    FULL = "full"


class DataQuality(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


@dataclass
class ColumnInfo:
    name: str
    data_type: str
    missing_count: int
    missing_percentage: float
    unique_count: int
    is_categorical: bool
    is_numeric: bool
    statistics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DataQualityIssue:
    issue_type: str
    severity: str
    description: str
    affected_columns: List[str]
    suggested_action: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DatasetStatistics:
    row_count: int
    column_count: int
    missing_values_total: int
    missing_percentage: float
    duplicate_rows: int
    memory_usage: float
    categorical_columns: List[str]
    numeric_columns: List[str]
    datetime_columns: List[str]
    column_info: Dict[str, ColumnInfo] = field(default_factory=dict)


@dataclass
class Dataset:
    id: str
    name: str
    file_path: str
    dataset_type: DatasetType
    created_at: datetime
    modified_at: datetime
    size_bytes: int
    
    # Data structure info
    statistics: Optional[DatasetStatistics] = None
    quality_issues: List[DataQualityIssue] = field(default_factory=list)
    quality_score: Optional[DataQuality] = None
    
    # Metadata
    description: str = ""
    source: str = ""
    version: str = "1.0"
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Processing info
    is_processed: bool = False
    processing_steps: List[str] = field(default_factory=list)
    parent_dataset_id: Optional[str] = None
    
    def add_quality_issue(self, issue: DataQualityIssue) -> None:
        """Add a data quality issue"""
        self.quality_issues.append(issue)
    
    def remove_quality_issue(self, issue_type: str) -> None:
        """Remove quality issues of specific type"""
        self.quality_issues = [
            issue for issue in self.quality_issues 
            if issue.issue_type != issue_type
        ]
    
    def get_issues_by_severity(self, severity: str) -> List[DataQualityIssue]:
        """Get issues by severity level"""
        return [
            issue for issue in self.quality_issues 
            if issue.severity == severity
        ]
    
    def calculate_quality_score(self) -> DataQuality:
        """Calculate overall data quality score"""
        if not self.statistics:
            return DataQuality.UNKNOWN
        
        score = 100
        
        # Deduct points for missing values
        if self.statistics.missing_percentage > 20:
            score -= 30
        elif self.statistics.missing_percentage > 10:
            score -= 15
        elif self.statistics.missing_percentage > 5:
            score -= 5
        
        # Deduct points for duplicate rows
        if self.statistics.duplicate_rows > 0:
            duplicate_percentage = (self.statistics.duplicate_rows / self.statistics.row_count) * 100
            if duplicate_percentage > 10:
                score -= 20
            elif duplicate_percentage > 5:
                score -= 10
        
        # Deduct points for critical issues
        critical_issues = self.get_issues_by_severity("critical")
        high_issues = self.get_issues_by_severity("high")
        
        score -= len(critical_issues) * 25
        score -= len(high_issues) * 10
        
        # Determine quality level
        if score >= 80:
            self.quality_score = DataQuality.HIGH
        elif score >= 60:
            self.quality_score = DataQuality.MEDIUM
        else:
            self.quality_score = DataQuality.LOW
        
        return self.quality_score
    
    def add_processing_step(self, step: str) -> None:
        """Add a processing step to history"""
        self.processing_steps.append(step)
        self.modified_at = datetime.now()
    
    def is_suitable_for_analysis(self) -> bool:
        """Check if dataset is suitable for analysis"""
        if not self.statistics:
            return False
        
        # Check basic requirements
        if self.statistics.row_count < 10:
            return False
        
        if self.statistics.column_count < 2:
            return False
        
        # Check for blocking issues
        critical_issues = self.get_issues_by_severity("critical")
        if critical_issues:
            return False
        
        # Check missing data threshold
        if self.statistics.missing_percentage > 50:
            return False
        
        return True
    
    def get_target_column_candidates(self) -> List[str]:
        """Get potential target columns for prediction tasks"""
        if not self.statistics:
            return []
        
        candidates = []
        
        # Look for binary or categorical columns with reasonable cardinality
        for col_name, col_info in self.statistics.column_info.items():
            if col_info.is_categorical and col_info.unique_count <= 20:
                candidates.append(col_name)
            elif col_info.is_numeric and col_info.unique_count > 10:
                candidates.append(col_name)
        
        return candidates
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert dataset to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "file_path": self.file_path,
            "dataset_type": self.dataset_type.value,
            "created_at": self.created_at.isoformat(),
            "modified_at": self.modified_at.isoformat(),
            "size_bytes": self.size_bytes,
            "statistics": self.statistics.__dict__ if self.statistics else None,
            "quality_issues": [issue.__dict__ for issue in self.quality_issues],
            "quality_score": self.quality_score.value if self.quality_score else None,
            "description": self.description,
            "source": self.source,
            "version": self.version,
            "tags": self.tags,
            "metadata": self.metadata,
            "is_processed": self.is_processed,
            "processing_steps": self.processing_steps,
            "parent_dataset_id": self.parent_dataset_id
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Dataset':
        """Create dataset from dictionary"""
        # This would need proper implementation for datetime parsing and object reconstruction
        # Simplified version for demonstration
        dataset = cls(
            id=data["id"],
            name=data["name"],
            file_path=data["file_path"],
            dataset_type=DatasetType(data["dataset_type"]),
            created_at=datetime.fromisoformat(data["created_at"]),
            modified_at=datetime.fromisoformat(data["modified_at"]),
            size_bytes=data["size_bytes"]
        )
        
        # Set optional fields
        dataset.description = data.get("description", "")
        dataset.source = data.get("source", "")
        dataset.version = data.get("version", "1.0")
        dataset.tags = data.get("tags", [])
        dataset.metadata = data.get("metadata", {})
        dataset.is_processed = data.get("is_processed", False)
        dataset.processing_steps = data.get("processing_steps", [])
        dataset.parent_dataset_id = data.get("parent_dataset_id")
        
        return dataset