"""
Agent Communication Knowledge Tree - Manages inter-agent communication protocols.

This module handles agent communication knowledge, including protocols for
communicating with other agents, message formats, and interaction patterns.
"""

from ..core.forest_base import StructuredKnowledgeTree
from typing import Dict, Any, List


class AgentCommunicationTree(StructuredKnowledgeTree):
    """
    Knowledge tree for agent-to-agent communication protocols.
    
    Manages information about how to communicate with other agents,
    available agents, and communication protocols.
    """
    
    def __init__(self):
        """Initialize the agent communication knowledge tree."""
        super().__init__(
            tree_name="How to Communicate with Other Agents",
            tree_description="Inter-agent communication protocols and available agents"
        )
    
    def format_knowledge_section(self) -> str:
        """
        Format agent communication knowledge into instruction section.
        
        Returns:
            Formatted agent communication section for agent instructions
        """
        if self.is_empty():
            return ""
        
        output_parts = []
        
        # Add simple communication guidelines
        if self.knowledge_items:
            formatted_comm = []
            for comm_item in self.knowledge_items:
                formatted_comm.append(f"- {comm_item}")
            output_parts.append(f"\n{self.get_section_title()}\n" + "\n".join(formatted_comm))
        
        # Add structured agent information
        if self.structured_items:
            available_agents = self._format_available_agents()
            if available_agents:
                output_parts.append(available_agents)
            
            received_tasks = self._format_received_tasks()
            if received_tasks:
                output_parts.append(received_tasks)
                
            agent_messages = self._format_agent_messages()
            if agent_messages:
                output_parts.append(agent_messages)
        
        return "\n".join(output_parts) + "\n" if output_parts else ""
    
    def add_communication_protocol(self, protocol: str) -> 'AgentCommunicationTree':
        """
        Add a communication protocol or guideline.
        
        Args:
            protocol: The communication protocol description
            
        Returns:
            Self for method chaining
        """
        return self.add_knowledge(protocol)
    
    def add_available_agent(self, agent_name: str, description: str, 
                          capabilities: str = "") -> 'AgentCommunicationTree':
        """
        Add information about an available agent for collaboration.
        
        Args:
            agent_name: Name of the available agent
            description: Description of the agent's purpose
            capabilities: Optional capabilities description
            
        Returns:
            Self for method chaining
        """
        agent_info = {
            "type": "available_agent",
            "name": agent_name,
            "description": description,
            "capabilities": capabilities
        }
        return self.add_structured_knowledge(agent_info)
    
    def add_received_task(self, task: str, from_agent: str = "", 
                         priority: str = "") -> 'AgentCommunicationTree':
        """
        Add a task received from another agent.
        
        Args:
            task: The task description
            from_agent: Agent that sent the task
            priority: Priority level of the task
            
        Returns:
            Self for method chaining
        """
        task_info = {
            "type": "received_task",
            "task": task,
            "from": from_agent,
            "priority": priority
        }
        return self.add_structured_knowledge(task_info)
    
    def add_agent_message(self, message: str, from_agent: str, 
                         message_type: str = "info") -> 'AgentCommunicationTree':
        """
        Add a message received from another agent.
        
        Args:
            message: The message content
            from_agent: Agent that sent the message
            message_type: Type of message (info, warning, update, etc.)
            
        Returns:
            Self for method chaining
        """
        message_info = {
            "type": "agent_message",
            "message": message,
            "from": from_agent,
            "message_type": message_type
        }
        return self.add_structured_knowledge(message_info)
    
    def _format_available_agents(self) -> str:
        """Format available agents section."""
        agents = [item for item in self.structured_items if item.get("type") == "available_agent"]
        if not agents:
            return ""
        
        formatted_agents = []
        for agent in agents:
            agent_str = f"- \"{agent['name']}\": {agent['description']}"
            if agent.get('capabilities'):
                agent_str += f" (Capabilities: {agent['capabilities']})"
            formatted_agents.append(agent_str)
        
        return f"\n## Available Agents\n" + "\n".join(formatted_agents) + "\n"
    
    def _format_received_tasks(self) -> str:
        """Format received tasks section.""" 
        tasks = [item for item in self.structured_items if item.get("type") == "received_task"]
        if not tasks:
            return ""
        
        formatted_tasks = []
        for task in tasks:
            task_str = f"- {task['task']}"
            if task.get('from'):
                task_str += f" (from: {task['from']})"
            if task.get('priority'):
                task_str += f" [Priority: {task['priority']}]"
            formatted_tasks.append(task_str)
        
        return f"\n## Received Tasks\n" + "\n".join(formatted_tasks) + "\n"
    
    def _format_agent_messages(self) -> str:
        """Format agent messages section."""
        messages = [item for item in self.structured_items if item.get("type") == "agent_message"]
        if not messages:
            return ""
        
        formatted_messages = []
        for msg in messages:
            msg_str = f"- [{msg.get('message_type', 'INFO').upper()}] {msg['message']} (from: {msg['from']})"
            formatted_messages.append(msg_str)
        
        return f"\n## Messages from Other Agents\n" + "\n".join(formatted_messages) + "\n"