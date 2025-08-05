"""
Simple PCS Agent Usage Examples
Demonstrates the simplified Yes/No decision structure that fixes workflow parsing issues
"""

from DCLSAgents.agents.pcs_agent_simple import SimplePCSAgent

# Example 1: Simple Workflow Generation with Yes/No Structure  
def example_simple_workflow_generation():
    """
    Example of how the simple PCS agent generates workflows using Yes/No decisions
    """
    
    agent = SimplePCSAgent(
        problem_description="House price prediction using Ames Iowa dataset with 82 features",
        context_description="Real estate market analysis for investment decisions"
    )
    
    user_goal = "Build an accurate house price prediction model to help investors make buying decisions"
    
    # The agent will return simple, clean JSON structure
    result = agent.generate_workflow_cli(
        user_goal=user_goal,
        problem_description="House price prediction using Ames Iowa dataset with 82 features", 
        context_description="Real estate market analysis for investment decisions"
    )
    
    # Expected clean structure:
    # {
    #   "minimal_workflow": ["Data Existence Establishment", "Data Integrity Assurance", 
    #                       "Methodology Strategy Formulation", "Model Implementation Execution"],
    #   "promise": "Based on your goal of building an accurate house price prediction model..."
    # }
    
    print("Simple Workflow Analysis Result:")
    print(f"Minimal Workflow: {result.get('minimal_workflow', [])}")
    print(f"Agent Promise: {result.get('promise', '')}")
    print(f"Response Type: {type(result)}")
    
    return result

# Example 2: Simple Stage Action Selection with Yes/No Decisions
def example_simple_action_selection():
    """
    Example of simple action selection for a specific stage
    """
    
    agent = SimplePCSAgent(
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
    
    # Expected simple structure:
    # {
    #   "selected_actions": [
    #     {"action_id": "section_2_data_structure_discovery", "necessity": "essential", "contribution_to_goal": "..."},
    #     {"action_id": "section_5_variable_relevance_assessment", "necessity": "essential", "contribution_to_goal": "..."}
    #   ],
    #   "execution_order": ["section_1_workflow_initialization", "section_2_data_structure_discovery", ...],
    #   "skip_actions": [{"action_id": "section_4_observation_unit_identification", "skip_reason": "Not needed for user goal"}],
    #   "stage_execution_plan": "Execute selected actions to achieve user goal"
    # }
    
    print("Simple Action Selection Result:")
    print(f"Selected Actions: {len(result.get('selected_actions', []))}")
    print(f"Skipped Actions: {len(result.get('skip_actions', []))}")
    print(f"Execution Order: {result.get('execution_order', [])}")
    print(f"Response Type: {type(result)}")
    
    return result

# Example 3: Simple Hypothesis Generation
def example_simple_hypothesis_generation():
    """
    Example of simple VDS-aware hypothesis generation
    """
    
    agent = SimplePCSAgent(
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
    
    # Expected simple structure:
    # {
    #   "hypothesis": "Missing values in GarageArea may indicate houses without garages affecting price predictions",
    #   "verification_method": "EDAToolkit.missing_value_analysis()",
    #   "expected_outcome": "If confirmed, missing GarageArea correlates with lower prices"
    # }
    
    print("Simple Hypothesis Generation Result:")
    print(f"Hypothesis: {result.get('hypothesis', '')}")
    print(f"VDS Verification: {result.get('verification_method', '')}")
    print(f"Expected Outcome: {result.get('expected_outcome', '')}")
    print(f"Response Type: {type(result)}")
    
    return result

# Example 4: Test Workflow Parsing (The Fix)
def test_workflow_parsing_fix():
    """
    Test that the simplified approach fixes the workflow parsing issue
    """
    
    agent = SimplePCSAgent(
        problem_description="Multi-class classification for customer segmentation",
        context_description="E-commerce customer behavior analysis"
    )
    
    result = agent.generate_workflow_cli(
        user_goal="Create customer segments for targeted marketing campaigns",
        problem_description="Multi-class classification for customer segmentation",
        context_description="E-commerce customer behavior analysis"
    )
    
    # Verify the response structure is parseable
    print("Workflow Parsing Test:")
    print(f"Response is dict: {isinstance(result, dict)}")
    print(f"Has minimal_workflow: {'minimal_workflow' in result}")
    print(f"Has promise: {'promise' in result}")
    print(f"No complex nested structure: {'enhanced_analysis' not in result}")
    
    # This should now be parseable by the workflow manager
    minimal_workflow = result.get('minimal_workflow', [])
    print(f"Workflow stages found: {len(minimal_workflow)}")
    for stage in minimal_workflow:
        print(f"  - {stage}")
    
    return result

if __name__ == "__main__":
    print("=== Simple PCS Agent Examples ===\n")
    
    print("1. Simple Workflow Generation Example:")
    example_simple_workflow_generation()
    print("\n" + "="*50 + "\n")
    
    print("2. Simple Action Selection Example:")
    example_simple_action_selection()
    print("\n" + "="*50 + "\n")
    
    print("3. Simple Hypothesis Generation Example:")
    example_simple_hypothesis_generation()
    print("\n" + "="*50 + "\n")
    
    print("4. Workflow Parsing Fix Test:")
    test_workflow_parsing_fix()
    print("\n" + "="*50 + "\n")
    
    print("Simple PCS Agent examples completed!")
    print("This approach should fix the workflow parsing issue by using clean, simple JSON responses.")