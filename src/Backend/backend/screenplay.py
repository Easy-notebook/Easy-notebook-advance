# examples/basic/compute_node.py
from scenarios.scenario_handle_user_command import handle_user_command
from scenarios.scenario_handle_user_questions import handle_user_questions
from scenarios.scenairo_handle_code_output import handle_code_output
from scenarios.scenairo_handle_code_debug import handle_code_debug

import json

async def generate_response(operation, lang="en"):
    
    if operation["type"] == "ping":
        yield json.dumps({
            "type": "ok",
            "data": {
                "status": "completed",
                "message": "pong"
            }
        }) + "\n"
        
    
    if operation["type"] == "user_command":
        print("Operation received user_command")
        async for response in handle_user_command(operation, lang):
            yield response
    
    if operation["type"] == "user_question":
        print("Operation received user_question")
        async for response in handle_user_questions(operation, lang):
            yield response
            
    if operation["type"] == "code_output":
        print("Operation received code_output")
        async for response in handle_code_output(operation, lang):
            yield response
            
    if operation["type"] == "code_error_should_debug":
        print("Operation received code_error_should_debug")
        async for response in handle_code_debug(operation, lang):
            yield response
                
    yield json.dumps({
        "type": "ok",
        "data": {
            "status": "completed",
            "message": f"Operation {operation} completed" 
        }
    }) + "\n"
