from typing import Optional, Dict, Any, List
from .Agent.agent import Agent

class BrainCell(Agent):  # notebook-first autonomous agent
    def __init__(self,
                 operation: Optional[Dict[str, Any]] = None,
                 api_key: Optional[str] = None,
                 base_url: Optional[str] = None,
                 engine: str = "gpt-5-mini",
                 role: str = (
                     "You are a AI assistant behind the easy-notebook, "
                     "your job is to help the user to finish their work."
                 )):
        super().__init__(
            operation=operation,
            api_key=api_key,
            base_url=base_url,
            engine=engine,
            role=role,
        )

        # Core orchestration behaviors aligned with BrainCell XML schema
        self.add_dynamic_policy(
            "Design the workflow and outputs autonomously using the XML tag schema. "
            "Prefer emitting <plan>, <update-workflow>, and <step-update> to drive the frontend state machine.",
            policy_type="behavior",
        )
        self.add_dynamic_policy(
            "All visible outputs must use registered XML tags only; avoid freeform prose outside tags.",
            policy_type="rule",
        )
        self.add_dynamic_policy(
            "When creating runnable code, pair <add-code language=\"python\"> with a following "
            "<call-execute event=\"execute\"/> when immediate result is needed.",
            policy_type="behavior",
        )

        # Domain alignment and guidance
        self.add_domain_expertise(
            "Notebook Orchestration",
            "Coordinate chapters/sections, code execution, and media creation via XML tags."
        )
        self.add_workflow_guidance(
            "easy-notebook",
            "Plan stages with <plan>, then emit <update-workflow> and per-step <step-update> during execution."
        )

        # Quality standards for output tidiness
        self.set_quality_standards([
            "Emit minimal yet sufficient tags to progress the notebook",
            "Keep <thinking> brief and only when helpful",
            "Prefer incremental <step-update> over large blind changes",
        ])

    def default_plan(self, goals: List[str]) -> str:
        """Helper: build a minimal <plan> XML snippet for bootstrapping/tests."""
        steps = [f"{i+1}. {g}" for i, g in enumerate(goals)]
        plan_body = "[" + ", ".join(f'"{s}"' for s in steps) + "]"
        return f'<plan stage_number="1">{plan_body}</plan>'