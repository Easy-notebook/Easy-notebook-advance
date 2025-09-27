"""
Enhanced PCS Agent Usage Examples
Demonstrates the new multi-answer structure and problem decomposition capabilities
"""

from DCLSAgents.agents.pcs_agent_enhanced import EnhancedPCSAgent

# Example 1: Workflow Generation with Multi-Answer Structure
def example_workflow_generation():
    """
    Example of how the enhanced PCS agent generates workflows using multi-answer decomposition
    """
    
    agent = EnhancedPCSAgent(
        problem_description="House price prediction using Ames Iowa dataset with 82 features",
        context_description="Real estate market analysis for investment decisions"
    )
    
    user_goal = "Build an accurate house price prediction model to help investors make buying decisions"
    
    # The agent will now return structured multi-answer analysis
    result = agent.generate_workflow_cli(
        user_goal=user_goal,
        problem_description="House price prediction using Ames Iowa dataset with 82 features", 
        context_description="Real estate market analysis for investment decisions"
    )
    
    # Expected structure:
    # {
    #   "minimal_workflow": ["Data Existence Establishment", "Data Integrity Assurance", 
    #                       "Methodology Strategy Formulation", "Model Implementation Execution"],
    #   "promise": "Based on your goal of building an accurate house price prediction model...",
    #   "enhanced_analysis": {
    #     "goal_decomposition": {...},
    #     "dependency_analysis": {...},
    #     "execution_plan": {...},
    #     "commitment": {...}
    #   }
    # }
    
    print("Workflow Analysis Result:")
    print(f"Minimal Workflow: {result.get('minimal_workflow', [])}")
    print(f"Agent Promise: {result.get('promise', '')}")
    
    return result

# Example 2: Stage Action Selection with Problem Decomposition  
def example_action_selection():
    """
    Example of enhanced action selection for a specific stage
    """
    
    agent = EnhancedPCSAgent(
        problem_description="House price prediction model",
        context_description="Investment decision support system"
    )
    
    # Available actions for Data Existence Establishment stage
    available_actions = [
        "section_1_workflow_initialization",
        "section_2_data_structure_discovery", 
        "section_3_variable_semantic_analysis",
        "section_4_observation_unit_identification",
        "section_5_variable_relevance_assessment",
        "section_6_pcs_hypothesis_generation"
    ]
    
    result = agent.select_stage_actions_cli(
        stage_name="Data Existence Establishment",
        stage_goal="Establish variable definitions, observation units, and form PCS hypothesis",
        available_actions=available_actions,
        current_data_state="Raw CSV with 82 columns, some missing values",
        user_goal="Build accurate house price prediction model for investment decisions"
    )
    
    # Expected enhanced structure:
    # {
    #   "goal_relevance_analysis": "This stage establishes foundation for prediction model...",
    #   "selected_actions": [
    #     {"action_id": "section_2_data_structure_discovery", "necessity": "essential", ...},
    #     {"action_id": "section_5_variable_relevance_assessment", "necessity": "essential", ...}
    #   ],
    #   "execution_order": ["section_1_workflow_initialization", "section_2_data_structure_discovery", ...],
    #   "skip_actions": [{"action_id": "section_4_observation_unit_identification", "skip_reason": "..."}],
    #   "enhanced_analysis": {
    #     "goal_context": {...},
    #     "necessity_analysis": {...},
    #     "execution_strategy": {...}
    #   }
    # }
    
    print("Action Selection Result:")
    print(f"Selected Actions: {len(result.get('selected_actions', []))}")
    print(f"Skipped Actions: {len(result.get('skip_actions', []))}")
    print(f"Execution Order: {result.get('execution_order', [])}")
    
    return result

# Example 3: Enhanced Hypothesis Generation with VDS Integration
def example_hypothesis_generation():
    """
    Example of VDS-aware hypothesis generation
    """
    
    agent = EnhancedPCSAgent(
        problem_description="House price prediction with 2930 records, 82 columns",
        context_description="Ames Iowa housing market dataset"
    )
    
    # Mock variables and analysis data
    variables = ["SalePrice", "LotArea", "YearBuilt", "Neighborhood", "GarageArea"]
    relevance_analysis = "Found high correlation between garage area and sale price"
    
    result = agent.evaluate_problem_definition_cli(
        problem_description="House price prediction with 2930 records, 82 columns",
        context_description="Ames Iowa housing market dataset",
        var_json=variables,
        unit_check="Individual house sales",
        relative_analysis=relevance_analysis
    )
    
    # Expected VDS-integrated structure:
    # {
    #   "hypothesis": "Missing values in GarageArea may indicate houses without garages...",
    #   "verification_method": "Use EDAToolkit.missing_value_analysis() to examine patterns",
    #   "expected_outcome": "If confirmed, missing GarageArea correlates with lower prices",
    #   "enhanced_analysis": {
    #     "risk_assessment": {...},
    #     "vds_tools_needed": ["EDAToolkit", "DataPreview"],
    #     "validation_strategy": {...}
    #   }
    # }
    
    print("Hypothesis Generation Result:")
    print(f"Hypothesis: {result.get('hypothesis', '')}")
    print(f"VDS Verification: {result.get('verification_method', '')}")
    
    return result

# Example 4: Backwards Reasoning Analysis
def example_backwards_reasoning():
    """
    Example of backwards reasoning for complex problem solving
    """
    
    agent = EnhancedPCSAgent(
        problem_description="Multi-model ensemble for house price prediction",
        context_description="High-stakes investment decision system"
    )
    
    result = agent.backwards_reasoning_analysis(
        target_outcome="Deploy reliable house price prediction API with 95% accuracy",
        problem_context="Investment firm needs automated valuation for portfolio decisions"
    )
    
    # Expected backwards reasoning chain:
    # {
    #   "success_state": "Deployed API with 95% accuracy",
    #   "immediate_prerequisites": ["Validated model performance", "API infrastructure"],
    #   "dependency_chain": [...],
    #   "minimal_execution_plan": [...]
    # }
    
    print("Backwards Reasoning Result:")
    if result and not result.get('error'):
        print("Successfully generated backwards reasoning chain")
    else:
        print("Backwards reasoning analysis failed")
    
    return result

if __name__ == "__main__":
    print("=== Enhanced PCS Agent Examples ===\n")
    
    print("1. Workflow Generation Example:")
    example_workflow_generation()
    print("\n" + "="*50 + "\n")
    
    print("2. Action Selection Example:")
    example_action_selection()
    print("\n" + "="*50 + "\n")
    
    print("3. Hypothesis Generation Example:")
    example_hypothesis_generation()
    print("\n" + "="*50 + "\n")
    
    print("4. Backwards Reasoning Example:")
    example_backwards_reasoning()
    print("\n" + "="*50 + "\n")
    
    print("Enhanced PCS Agent examples completed!")