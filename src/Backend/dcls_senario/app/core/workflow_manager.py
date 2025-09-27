from typing import Dict, Any, List, Optional

class WorkflowManager:
    # 定义默认工作流入口点
    DEFAULT_WORKFLOW_ENTRY = {
        "chapter_id": "chapter_0_planning",
        "section_id": "section_1_design_workflow",
        "description": "智能工作流规划 - 所有数据科学项目的起始点"
    }

    # 定义可用章节和对应的actions - 增强版数据科学工作流
    AVAILABLE_CHAPTERS = {
        # 保持向后兼容性 - 旧的章节名称
        "chapter_0_planning": {
            "name": "Workflow Planning",
            "description": "PCS agent designs customized workflow based on user goals using existence first principles",
            "sections": [
                "section_1_design_workflow"
            ]
        },
        # 新的增强章节
        "chapter_0_problem_formulation_planning": {
            "name": "Problem Formulation & Planning",
            "description": "Collaborative problem definition with domain experts and comprehensive project planning",
            "sections": [
                "section_1_design_workflow",
                "section_2_problem_definition_refinement",
                "section_3_success_criteria_establishment",
                "section_4_resource_constraint_analysis"
            ]
        },
        "chapter_1_data_existence_establishment": {
            "name": "Data Existence Establishment",
            "description": "Systematic data discovery, structure analysis, and relevance assessment",
            "sections": [
                "section_1_workflow_initialization",        # BrainCell Agent 自主设计工作流
                "section_2_data_structure_discovery",
                "section_3_variable_semantic_analysis",
                "section_4_observation_unit_identification",
                "section_5_variable_relevance_assessment",
                "section_6_pcs_hypothesis_generation"
            ]
        },
        "chapter_2_data_integrity_assurance": {
            "name": "Data Integrity Assurance",
            "description": "Comprehensive data cleaning, validation, and quality assurance",
            "sections": [
                "section_1_data_integrity_initialization",  # BrainCell Agent 自主设计工作流
                "section_2_dimensional_integrity_validation",
                "section_3_value_validity_assurance",
                "section_4_completeness_integrity_restoration",
                "section_5_comprehensive_integrity_verification"
            ]
        },
        "chapter_3_data_insight_acquisition": {
            "name": "Data Insight Acquisition",
            "description": "Deep data exploration, pattern discovery, and insight generation",
            "sections": [
                "section_1_data_insight_initialization",  # 重命名避免重复
                "section_2_current_data_state_assessment",
                "section_3_targeted_inquiry_generation",
                "section_4_analytical_insight_extraction",
                "section_5_comprehensive_insight_consolidation"
            ]
        },
        "chapter_4_methodology_strategy_formulation": {
            "name": "Methodology Strategy Formulation",
            "description": "Comprehensive modeling strategy including algorithm selection and validation design",
            "sections": [
                "section_1_workflow_initialization",  # 保持现有文件名
                "section_2_feature_and_model_method_proposal",
                "section_3_training_evaluation_strategy_development",
                "section_4_methodology_strategy_consolidation"
            ]
        },
        "chapter_5_model_implementation_execution": {
            "name": "Model Implementation Execution",
            "description": "Model training, optimization, and performance evaluation",
            "sections": [
                "section_1_workflow_initialization",  # 保持现有文件名
                "section_2_feature_engineering_integration",
                "section_3_modeling_method_integration",
                "section_4_model_training_execution"
            ]
        },
        "chapter_6_stability_validation": {
            "name": "Stability Validation",
            "description": "Comprehensive stability testing and robustness validation",
            "sections": [
                "section_1_workflow_initialization",  # 保持现有文件名
                "section_2_multi_variation_evaluation_execution",
                "section_3_stability_analysis_consolidation"
            ]
        },
        "chapter_7_results_evaluation_confirmation": {
            "name": "Results Evaluation Confirmation",
            "description": "Final evaluation, reporting, and actionable recommendations",
            "sections": [
                "section_1_workflow_initialization",  # 保持现有文件名
                "section_2_test_dataset_generation_validation",
                "section_3_final_dcls_report_generation"
            ]
        },
        "general_behavior": {
            "name": "General Behavior",
            "description": "General behavior for the project",
            "sections": [
                "section_1_workflow_initialization",  # 保持现有文件名
            ]
        }
        
    }
    
    @classmethod
    def list_available_chapters(cls) -> Dict[str, Any]:
        """罗列所有可用的章节"""
        return cls.AVAILABLE_CHAPTERS
        
    @classmethod
    def list_chapter_sections(cls, chapter_id: str) -> List[str]:
        """获取指定章节的可用sections"""
        chapter = cls.AVAILABLE_CHAPTERS.get(chapter_id, {})
        return chapter.get("sections", [])
        
    @classmethod
    def validate_workflow(cls, workflow_dict: Dict[str, Any]) -> bool:
        """验证workflow配置是否有效"""
        if "chapters" not in workflow_dict:
            return False
            
        for chapter in workflow_dict["chapters"]:
            chapter_id = chapter.get("id")
            if not chapter_id or chapter_id not in cls.AVAILABLE_CHAPTERS:
                return False
                
            # 验证sections是否存在
            for section in chapter.get("sections", []):
                if section not in cls.AVAILABLE_CHAPTERS[chapter_id]["sections"]:
                    return False
        return True
        
    @classmethod
    def get_next_chapter(cls, workflow_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        基于前端传递的状态获取下一个需要执行的章节
        支持动态workflow和静态workflow
        :param workflow_state: 前端传递的完整状态JSON
        :return: 下一个章节的配置信息
        """
        # 检查是否有动态workflow配置
        dynamic_workflow = workflow_state.get("dynamic_workflow")
        if dynamic_workflow:
            selected_chapters = dynamic_workflow.get("selected_chapters", [])
            chapter_progress = workflow_state.get("chapter_progress", {})
            
            # 按顺序返回未完成的章节
            for chapter_id in selected_chapters:
                if not chapter_progress.get(chapter_id, {}).get("completed", False):
                    return {
                        "id": chapter_id,
                        "name": cls.AVAILABLE_CHAPTERS.get(chapter_id, {}).get("name", chapter_id),
                        "sections": cls.AVAILABLE_CHAPTERS.get(chapter_id, {}).get("sections", []),
                        "dynamic": True
                    }
            return {}
        
        # 原有逻辑：静态workflow
        current_workflow = workflow_state.get("current_workflow", {})
        chapter_progress = workflow_state.get("chapter_progress", {})
        
        if not current_workflow:
            return {}
            
        chapters = current_workflow.get("chapters", [])
        for chapter in chapters:
            chapter_id = chapter.get("id")
            if not chapter_progress.get(chapter_id, {}).get("completed", False):
                return chapter
        return {}
        
    @classmethod
    def get_chapter_sections_from_state(cls, workflow_state: Dict[str, Any], chapter_id: str) -> List[str]:
        """
        从状态中获取指定章节的小节列表
        :param workflow_state: 前端传递的完整状态JSON
        :param chapter_id: 章节ID
        :return: 小节列表
        """
        current_workflow = workflow_state.get("current_workflow", {})
        
        # 首先从当前workflow获取
        chapters = current_workflow.get("chapters", [])
        for chapter in chapters:
            if chapter.get("id") == chapter_id:
                return chapter.get("sections", [])
                
        # 如果workflow中没有，返回默认的所有sections
        return cls.AVAILABLE_CHAPTERS.get(chapter_id, {}).get("sections", [])
        
    @classmethod
    def get_next_section_in_chapter(cls, workflow_state: Dict[str, Any], chapter_id: str) -> Optional[str]:
        """
        获取章节中下一个需要执行的section
        :param workflow_state: 前端传递的完整状态JSON
        :param chapter_id: 章节ID
        :return: 下一个section ID
        """
        sections = cls.get_chapter_sections_from_state(workflow_state, chapter_id)
        chapter_progress = workflow_state.get("chapter_progress", {})
        completed_sections = chapter_progress.get(chapter_id, {}).get("sections", {})
        
        for section in sections:
            if not completed_sections.get(section, {}).get("completed", False):
                return section
        return None
        
    @classmethod
    def mark_chapter_completed(cls, workflow_state: Dict[str, Any], chapter_id: str) -> Dict[str, Any]:
        """
        标记章节为已完成，返回更新后的状态
        :param workflow_state: 前端传递的完整状态JSON
        :param chapter_id: 章节ID
        :return: 更新后的状态JSON
        """
        new_state = workflow_state.copy()
        
        if "chapter_progress" not in new_state:
            new_state["chapter_progress"] = {}
        if chapter_id not in new_state["chapter_progress"]:
            new_state["chapter_progress"][chapter_id] = {}
            
        new_state["chapter_progress"][chapter_id]["completed"] = True
        return new_state
        
    @classmethod
    def mark_section_completed(cls, workflow_state: Dict[str, Any], chapter_id: str, section_id: str) -> Dict[str, Any]:
        """
        标记小节为已完成，返回更新后的状态
        :param workflow_state: 前端传递的完整状态JSON
        :param chapter_id: 章节ID
        :param section_id: 小节ID
        :return: 更新后的状态JSON
        """
        new_state = workflow_state.copy()
        
        if "chapter_progress" not in new_state:
            new_state["chapter_progress"] = {}
        if chapter_id not in new_state["chapter_progress"]:
            new_state["chapter_progress"][chapter_id] = {"sections": {}}
        if "sections" not in new_state["chapter_progress"][chapter_id]:
            new_state["chapter_progress"][chapter_id]["sections"] = {}
            
        new_state["chapter_progress"][chapter_id]["sections"][section_id] = {"completed": True}
        
        # 检查章节是否全部完成
        sections = cls.get_chapter_sections_from_state(new_state, chapter_id)
        completed_sections = new_state["chapter_progress"][chapter_id]["sections"]
        if all(completed_sections.get(s, {}).get("completed", False) for s in sections):
            new_state["chapter_progress"][chapter_id]["completed"] = True
            
        return new_state
        
    @classmethod
    def get_workflow_progress(cls, workflow_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        获取工作流执行进度
        :param workflow_state: 前端传递的完整状态JSON
        :return: 进度信息
        """
        current_workflow = workflow_state.get("current_workflow", {})
        chapter_progress = workflow_state.get("chapter_progress", {})
        
        total_chapters = len(current_workflow.get("chapters", []))
        completed_chapters = sum(1 for progress in chapter_progress.values() 
                               if progress.get("completed", False))
        
        return {
            "current_workflow": current_workflow,
            "chapter_progress": chapter_progress,
            "progress_summary": {
                "total_chapters": total_chapters,
                "completed_chapters": completed_chapters,
                "completion_rate": completed_chapters / total_chapters if total_chapters > 0 else 0
            }
        }
    
    @classmethod
    def get_default_entry_point(cls, user_context: Dict[str, Any] = None) -> Dict[str, str]:
        """
        根据用户上下文确定默认工作流入口点

        Args:
            user_context: 用户上下文信息，包含目标、数据文件等

        Returns:
            包含 chapter_id 和 section_id 的字典
        """
        if not user_context:
            return cls.DEFAULT_WORKFLOW_ENTRY

        # 如果用户已经有明确的数据文件，可以跳过规划直接开始数据分析
        if user_context.get("csv_file_path") and user_context.get("target_variable"):
            return {
                "chapter_id": "chapter_1_data_existence_establishment",
                "section_id": "section_1_workflow_initialization",
                "description": "数据存在性建立 - 直接开始数据分析"
            }

        # 如果用户只有目标描述，需要先进行智能规划
        if user_context.get("user_goal"):
            return cls.DEFAULT_WORKFLOW_ENTRY

        # 默认从规划开始
        return cls.DEFAULT_WORKFLOW_ENTRY

    @classmethod
    def get_next_logical_step(cls, current_chapter_id: str, current_section_id: str,
                             completion_status: Dict[str, Any] = None) -> Optional[Dict[str, str]]:
        """
        获取下一个逻辑步骤

        Args:
            current_chapter_id: 当前章节ID
            current_section_id: 当前步骤ID
            completion_status: 当前步骤的完成状态

        Returns:
            下一个步骤的信息，如果没有则返回None
        """
        current_chapter = cls.AVAILABLE_CHAPTERS.get(current_chapter_id)
        if not current_chapter:
            return None

        sections = current_chapter["sections"]
        try:
            current_index = sections.index(current_section_id)

            # 检查当前章节是否还有下一个步骤
            if current_index + 1 < len(sections):
                next_section = sections[current_index + 1]
                return {
                    "chapter_id": current_chapter_id,
                    "section_id": next_section,
                    "description": f"继续当前章节的下一步: {next_section}"
                }
            else:
                # 当前章节完成，移动到下一个章节
                chapter_ids = list(cls.AVAILABLE_CHAPTERS.keys())
                try:
                    current_chapter_index = chapter_ids.index(current_chapter_id)
                    if current_chapter_index + 1 < len(chapter_ids):
                        next_chapter_id = chapter_ids[current_chapter_index + 1]
                        next_chapter = cls.AVAILABLE_CHAPTERS[next_chapter_id]
                        first_section = next_chapter["sections"][0]
                        return {
                            "chapter_id": next_chapter_id,
                            "section_id": first_section,
                            "description": f"开始下一章节: {next_chapter['name']}"
                        }
                except ValueError:
                    pass
        except ValueError:
            pass

        return None

    @classmethod
    def execute_workflow_step(cls, chapter_id: str, section_id: str) -> Dict[str, Any]:
        """
        执行工作流步骤的接口
        :param chapter_id: 章节ID
        :param section_id: 小节ID
        :return: 执行结果
        """
        # 验证章节和小节是否有效
        if chapter_id not in cls.AVAILABLE_CHAPTERS:
            return {"success": False, "error": f"Invalid chapter: {chapter_id}"}
            
        available_sections = cls.AVAILABLE_CHAPTERS[chapter_id]["sections"]
        if section_id not in available_sections:
            return {"success": False, "error": f"Invalid section: {section_id} in chapter: {chapter_id}"}
        
        # Build dynamic import path from stages package
        module_path = f"app.stages.{chapter_id}.{section_id}"
        
        return {
            "success": True,
            "module_path": module_path,
            "chapter_id": chapter_id,
            "section_id": section_id,
            "chapter_info": cls.AVAILABLE_CHAPTERS[chapter_id]
        }
    
    @classmethod
    def create_workflow_from_chapters(cls, selected_chapters: List[str]) -> Dict[str, Any]:
        """
        根据选择的章节创建工作流
        :param selected_chapters: 选择的章节ID列表
        :return: 工作流配置
        """
        workflow = {"chapters": []}
        
        for chapter_id in selected_chapters:
            if chapter_id in cls.AVAILABLE_CHAPTERS:
                chapter_config = {
                    "id": chapter_id,
                    "name": cls.AVAILABLE_CHAPTERS[chapter_id]["name"],
                    "description": cls.AVAILABLE_CHAPTERS[chapter_id]["description"],
                    "sections": cls.AVAILABLE_CHAPTERS[chapter_id]["sections"]
                }
                workflow["chapters"].append(chapter_config)
        
        return workflow
    
    @classmethod
    def create_initial_state(cls, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建初始的工作流状态
        :param workflow: 工作流配置
        :return: 初始状态JSON
        """
        return {
            "current_workflow": workflow,
            "chapter_progress": {},
            "workflow_state": {
                "created": True,
                "total_chapters": len(workflow.get("chapters", []))
            }
        }