
from DCLSAgents.agents.general_agent import GeneralAgent
from app.core.config import llm

async def generate_question_choice_map(context):
    general_agent = GeneralAgent(llm=llm)
    question_choice_map = general_agent.generate_question_choice_map_cli(context)
    return question_choice_map
