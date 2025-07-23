from DCLSAgents import GeneralAgent

async def generate_question_choice_map(context, lang: str = "en"):
    general_agent = GeneralAgent(lang=lang)
    question_choice_map = general_agent.generate_question_choice_map_cli(context)
    return question_choice_map
