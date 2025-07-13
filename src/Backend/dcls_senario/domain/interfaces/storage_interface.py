from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class StorageType(Enum):
    FILE = "file"
    MEMORY = "memory"
    DATABASE = "database"
    CLOUD = "cloud"


@dataclass
class StorageMetadata:
    created_at: datetime
    modified_at: datetime
    size: int
    checksum: str
    content_type: str
    tags: Dict[str, str]


@dataclass
class StorageItem:
    key: str
    content: Any
    metadata: StorageMetadata


class IStorage(ABC):
    """Abstract interface for storage operations"""
    
    @abstractmethod
    def save(self, key: str, data: Any, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Save data with given key"""
        pass
    
    @abstractmethod
    def load(self, key: str) -> Optional[Any]:
        """Load data by key"""
        pass
    
    @abstractmethod
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        pass
    
    @abstractmethod
    def delete(self, key: str) -> bool:
        """Delete data by key"""
        pass
    
    @abstractmethod
    def list_keys(self, prefix: str = "") -> List[str]:
        """List all keys with optional prefix filter"""
        pass
    
    @abstractmethod
    def get_metadata(self, key: str) -> Optional[StorageMetadata]:
        """Get metadata for key"""
        pass
    
    @abstractmethod
    def update_metadata(self, key: str, metadata: Dict[str, Any]) -> bool:
        """Update metadata for key"""
        pass


class IFileStorage(IStorage):
    """Interface for file-based storage"""
    
    @abstractmethod
    def get_file_path(self, key: str) -> str:
        """Get full file path for key"""
        pass
    
    @abstractmethod
    def save_file(self, key: str, file_path: str) -> bool:
        """Save file to storage"""
        pass
    
    @abstractmethod
    def load_file(self, key: str, destination_path: str) -> bool:
        """Load file from storage to destination"""
        pass


class IDatasetRepository(ABC):
    """Repository interface for dataset management"""
    
    @abstractmethod
    def save_dataset(self, dataset_id: str, dataset_path: str, metadata: Dict[str, Any]) -> bool:
        """Save dataset with metadata"""
        pass
    
    @abstractmethod
    def load_dataset(self, dataset_id: str) -> Optional[str]:
        """Load dataset and return path"""
        pass
    
    @abstractmethod
    def get_dataset_metadata(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Get dataset metadata"""
        pass
    
    @abstractmethod
    def list_datasets(self, filter_criteria: Optional[Dict[str, Any]] = None) -> List[str]:
        """List available datasets"""
        pass
    
    @abstractmethod
    def delete_dataset(self, dataset_id: str) -> bool:
        """Delete dataset"""
        pass


class IExperimentRepository(ABC):
    """Repository interface for experiment management"""
    
    @abstractmethod
    def save_experiment(self, experiment_id: str, experiment_data: Dict[str, Any]) -> bool:
        """Save experiment data"""
        pass
    
    @abstractmethod
    def load_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Load experiment data"""
        pass
    
    @abstractmethod
    def update_experiment_status(self, experiment_id: str, status: str) -> bool:
        """Update experiment status"""
        pass
    
    @abstractmethod
    def add_experiment_result(self, experiment_id: str, step: str, result: Dict[str, Any]) -> bool:
        """Add result for experiment step"""
        pass
    
    @abstractmethod
    def get_experiment_results(self, experiment_id: str) -> Dict[str, Any]:
        """Get all experiment results"""
        pass
    
    @abstractmethod
    def list_experiments(self, filter_criteria: Optional[Dict[str, Any]] = None) -> List[str]:
        """List experiments"""
        pass
    
    @abstractmethod
    def delete_experiment(self, experiment_id: str) -> bool:
        """Delete experiment"""
        pass


class IModelRepository(ABC):
    """Repository interface for model management"""
    
    @abstractmethod
    def save_model(self, model_id: str, model_data: Any, metadata: Dict[str, Any]) -> bool:
        """Save trained model"""
        pass
    
    @abstractmethod
    def load_model(self, model_id: str) -> Optional[Any]:
        """Load trained model"""
        pass
    
    @abstractmethod
    def get_model_metadata(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get model metadata"""
        pass
    
    @abstractmethod
    def list_models(self, filter_criteria: Optional[Dict[str, Any]] = None) -> List[str]:
        """List available models"""
        pass
    
    @abstractmethod
    def delete_model(self, model_id: str) -> bool:
        """Delete model"""
        pass
    
    @abstractmethod
    def update_model_performance(self, model_id: str, metrics: Dict[str, float]) -> bool:
        """Update model performance metrics"""
        pass


class IResultsRepository(ABC):
    """Repository interface for results management"""
    
    @abstractmethod
    def save_analysis_result(self, result_id: str, result_data: Dict[str, Any]) -> bool:
        """Save analysis result"""
        pass
    
    @abstractmethod
    def load_analysis_result(self, result_id: str) -> Optional[Dict[str, Any]]:
        """Load analysis result"""
        pass
    
    @abstractmethod
    def save_visualization(self, viz_id: str, viz_data: bytes, metadata: Dict[str, Any]) -> bool:
        """Save visualization"""
        pass
    
    @abstractmethod
    def load_visualization(self, viz_id: str) -> Optional[bytes]:
        """Load visualization"""
        pass
    
    @abstractmethod
    def link_result_to_experiment(self, result_id: str, experiment_id: str) -> bool:
        """Link result to experiment"""
        pass
    
    @abstractmethod
    def get_experiment_results(self, experiment_id: str) -> List[Dict[str, Any]]:
        """Get all results for experiment"""
        pass


class IStorageFactory(ABC):
    """Abstract factory for creating storage instances"""
    
    @abstractmethod
    def create_file_storage(self, base_path: str) -> IFileStorage:
        """Create file storage instance"""
        pass
    
    @abstractmethod
    def create_dataset_repository(self, storage_config: Dict[str, Any]) -> IDatasetRepository:
        """Create dataset repository"""
        pass
    
    @abstractmethod
    def create_experiment_repository(self, storage_config: Dict[str, Any]) -> IExperimentRepository:
        """Create experiment repository"""
        pass
    
    @abstractmethod
    def create_model_repository(self, storage_config: Dict[str, Any]) -> IModelRepository:
        """Create model repository"""
        pass
    
    @abstractmethod
    def create_results_repository(self, storage_config: Dict[str, Any]) -> IResultsRepository:
        """Create results repository"""
        pass