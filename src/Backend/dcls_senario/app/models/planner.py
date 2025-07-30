from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field

class SequenceRequest(BaseModel):
    stage_id: str
    step_index: Union[int, str]  # 支持数字索引和字符串section_id
    state: Dict[str, Any] = Field(default_factory=dict, description="全局上下文，可包含checklist、plan、thinking等信息")
    stream: bool = Field(default=True, description="是否启用流式输出")
    notebook_id: Optional[str] = None

class FeedbackRequest(BaseModel):
    stage_id: str
    step_index: Union[int, str]  # 支持数字索引和字符串section_id
    state: Dict[str, Any] = Field(default_factory=dict, description="全局上下文，包含checklist、plan、thinking等信息")
    notebook_id: Optional[str] = None

class StepData(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    stepId: str
    state: Dict[str, Any] = Field(default_factory=dict, description="全局上下文，可包含checklist、plan、thinking等信息")

class SequenceResponse(BaseModel):
    stage_id: str
    step: StepData
    sequence: Dict[str, Any]
    next_step: Optional[int] = None
    state: Dict[str, Any] = Field(default_factory=dict, description="全局上下文，可包含checklist、plan、thinking等信息")

class FeedbackResponse(BaseModel):
    status: str
    message: str
    targetAchieved: bool
    state: Dict[str, Any] = Field(default_factory=dict, description="全局上下文，可包含checklist、plan、thinking等信息")

class GenerateRequest(BaseModel):
    issue: str
    context: Any

class GenerateResponse(BaseModel):
    status: str
    message: List[Dict[str, Any]]