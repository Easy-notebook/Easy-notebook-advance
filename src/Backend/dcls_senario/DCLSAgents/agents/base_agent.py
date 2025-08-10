from DCLSAgents.utils.oracle import Oracle
from DCLSAgents.utils.logger import ModernLogger
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime
import re
import json
import threading
import asyncio
from concurrent.futures import ThreadPoolExecutor

class BaseAgent(ModernLogger):
    def __init__(self, name: str, model: str = "", system_prompt: str = None,
                 agent_memory: Optional[Dict[str, Any]] = None, max_workers: int = 3):
        super().__init__()
        self.name = name
        self.model_name = model
        self.model = Oracle(model) if model else Oracle("gpt-4o-mini")
        self.system_prompt = system_prompt

        # Agent memory for learning and context storage
        self.agent_memory = agent_memory or {}
        self._initialize_memory()

        # Concurrency support
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self._lock = threading.Lock()

        # Performance tracking
        self.performance_metrics = {
            'total_queries': 0,
            'successful_queries': 0,
            'failed_queries': 0,
            'average_response_time': 0.0,
            'tools_used': 0,
            'tasks_completed': 0,
            'last_updated': datetime.now().isoformat()
        }

        # Tool calling support
        self.tool_history = []
        self.current_task = None

        # Memory system
        self.memory = {
            'domain_knowledge': [],
            'conversation_history': [],
            'insights': [],
            'decisions': []
        }

    # Abstract methods for tool calling support
    def get_capabilities(self) -> List[str]:
        """Return list of agent capabilities - can be overridden by subclasses"""
        return ["analysis", "reasoning", "problem_solving"]

    def get_available_tools(self) -> List[str]:
        """Return list of available tools for this agent - can be overridden by subclasses"""
        return [
            'add_text', 'add_code', 'thinking', 'call_execute',
            'get_variable', 'set_variable', 'remember', 'update_todo'
        ]

    def get_enhanced_system_prompt(self) -> str:
        """Return enhanced system prompt with tool calling instructions"""
        base_prompt = self.system_prompt or ""

        tool_instructions = f"""
You are a super documentation wirter behide the easy-notebook.
## You output must following format to express your analysis:
- <add-text>Display text to user</add-text>
- <add-code language="python">the code you want to write</add-code>
- <thinking>Show reasoning process, or if no tag is suitable.</thinking>
- <call-execute event="name">if you need run and get code result immediately use this tag.</call-execute>
- <get-variable variable="name" default="value"/>
- <set-variable variable="name" value="value" type="str"/>
- <remember type="insight">Important information</remember>
- <update-todo action="add" event="next">things you need to do</update-todo>
"""

        return f"{base_prompt}\n\n{tool_instructions}"

    def update_memory(self, memory_type: str, content: Any):
        """Update agent memory with new content"""
        if memory_type not in self.memory:
            self.memory[memory_type] = []

        memory_entry = {
            'content': content,
            'timestamp': datetime.now().isoformat(),
            'source': 'agent_update'
        }

        self.memory[memory_type].append(memory_entry)

        # Limit memory size to prevent overflow
        if len(self.memory[memory_type]) > 100:
            self.memory[memory_type] = self.memory[memory_type][-50:]  # Keep last 50 entries

    def get_relevant_memory(self, query: str, memory_type: str = 'domain_knowledge', limit: int = 5) -> List[Dict[str, Any]]:
        """Get relevant memory entries for a query"""
        if memory_type not in self.memory:
            return []

        # Simple relevance scoring based on keyword matching
        # In a real implementation, you might use embeddings or more sophisticated matching
        query_words = set(query.lower().split())
        scored_memories = []

        for memory in self.memory[memory_type]:
            content_str = str(memory['content']).lower()
            content_words = set(content_str.split())

            # Calculate simple overlap score
            overlap = len(query_words.intersection(content_words))
            if overlap > 0:
                scored_memories.append((overlap, memory))

        # Sort by relevance and return top entries
        scored_memories.sort(key=lambda x: x[0], reverse=True)
        return [memory for _, memory in scored_memories[:limit]]

    async def process_task_with_tools(self, task: str, context: Dict[str, Any] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Process task with tool calling support"""
        try:
            self.current_task = task
            self.performance_metrics['tasks_completed'] += 1

            # Build enhanced prompt
            enhanced_prompt = self._build_enhanced_prompt(task, context or {})

            # Get response from model
            response = await self._get_model_response_async(enhanced_prompt)

            # Parse and execute tool calls
            async for result in self._parse_and_execute_tools(response):
                yield result

        except Exception as e:
            self.error(f"Error in process_task_with_tools: {str(e)}")
            yield {
                'type': 'error',
                'error': str(e),
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

    def _build_enhanced_prompt(self, task: str, context: Dict[str, Any]) -> str:
        """Build enhanced prompt with context and tool instructions"""
        enhanced_system_prompt = self.get_enhanced_system_prompt()

        prompt_parts = [enhanced_system_prompt]

        # Add context information
        if context:
            context_info = []
            for key, value in context.items():
                if isinstance(value, (str, int, float, bool)):
                    context_info.append(f"- {key}: {value}")
                elif isinstance(value, (list, dict)):
                    context_info.append(f"- {key}: {json.dumps(value, indent=2)}")

            if context_info:
                prompt_parts.append(f"## Context Information\n" + "\n".join(context_info))

        # Add current task
        prompt_parts.append(f"## Current Task\n{task}")

        # Add memory context
        relevant_memories = self.get_relevant_memory(task)
        if relevant_memories:
            memory_context = "## Relevant Previous Context\n"
            for memory in relevant_memories[:3]:  # Limit to 3 most relevant
                memory_context += f"- {memory['content']}\n"
            prompt_parts.append(memory_context)

        return "\n\n".join(prompt_parts)

    async def _get_model_response_async(self, prompt: str) -> str:
        """Get response from model asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            lambda: self.model.query(self.system_prompt, prompt)
        )

    async def _get_model_response_stream_async(self, prompt: str) -> AsyncGenerator[str, None]:
        """Get streaming response from model asynchronously"""
        try:
            async for chunk in self.model.query_stream_async(self.system_prompt, prompt):
                yield chunk
        except Exception as e:
            self.error(f"Streaming response failed: {str(e)}")
            yield f"STREAM_ERROR: {str(e)}"

    async def process_task_with_streaming(self, task: str, context: Dict[str, Any] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Process task with streaming tool calling support"""
        try:
            self.current_task = task
            self.performance_metrics['tasks_completed'] += 1

            # Build enhanced prompt
            enhanced_prompt = self._build_enhanced_prompt(task, context or {})

            # Start streaming response
            accumulated_content = ""
            processed_positions = set()

            async for chunk in self._get_model_response_stream_async(enhanced_prompt):
                if chunk.startswith("STREAM_ERROR:"):
                    yield {
                        'type': 'error',
                        'error': chunk,
                        'agent': self.name,
                        'timestamp': datetime.now().isoformat()
                    }
                    break

                accumulated_content += chunk

                # Parse and execute any complete tool calls
                async for result in self._parse_and_execute_streaming_tools(accumulated_content, processed_positions):
                    yield result

            # Final processing of any remaining content
            final_clean_text = self.model.extract_clean_text(accumulated_content)
            if final_clean_text.strip():
                yield {
                    'type': 'text',
                    'content': final_clean_text,
                    'agent': self.name,
                    'timestamp': datetime.now().isoformat()
                }

        except Exception as e:
            self.error(f"Error in process_task_with_streaming: {str(e)}")
            yield {
                'type': 'error',
                'error': str(e),
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

    async def _parse_and_execute_streaming_tools(self, content: str, processed_positions: set) -> AsyncGenerator[Dict[str, Any], None]:
        """Parse and execute tool calls from streaming content"""
        try:
            # Parse tool calls from current content
            tool_calls = self.model.parse_tool_calls_from_stream(content)

            # Execute only new tool calls
            for tool_call in tool_calls:
                position_key = f"{tool_call['position'][0]}-{tool_call['position'][1]}"

                if position_key not in processed_positions:
                    processed_positions.add(position_key)

                    try:
                        result = await self._execute_single_tool_streaming(tool_call)
                        if result:
                            self.performance_metrics['tools_used'] += 1
                            self.tool_history.append({
                                'tool': tool_call['tool'],
                                'timestamp': datetime.now().isoformat(),
                                'success': True,
                                'params': tool_call['parsed_params']
                            })
                            yield result
                    except Exception as e:
                        self.error(f"Tool execution failed: {str(e)}")
                        yield {
                            'type': 'error',
                            'error': f"Tool {tool_call['tool']} failed: {str(e)}",
                            'agent': self.name,
                            'timestamp': datetime.now().isoformat()
                        }

        except Exception as e:
            self.error(f"Tool parsing failed: {str(e)}")
            yield {
                'type': 'error',
                'error': f"Tool parsing failed: {str(e)}",
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

    async def _parse_and_execute_tools(self, response: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Parse tool calls from response and execute them"""
        # Define tool patterns
        tool_patterns = {
            'add_text': r'<add-text>(.*?)</add-text>',
            'add_code': r'<add-code(?:\s+language="([^"]*)")?>(.*?)</add-code>',
            'thinking': r'<thinking>(.*?)</thinking>',
            'call_execute': r'<call-execute(?:\s+event="([^"]*)")?>(.*?)</call-execute>',
            'get_variable': r'<get-variable\s+variable="([^"]*)"(?:\s+default="([^"]*)")?/>',
            'set_variable': r'<set-variable\s+variable="([^"]*)"\s+value="([^"]*)"(?:\s+type="([^"]*)")?/>',
            'remember': r'<remember(?:\s+type="([^"]*)")?>(.*?)</remember>',
            'update_todo': r'<update-todo\s+action="([^"]*)"(?:\s+event="([^"]*)")?>(.*?)</update-todo>'
        }

        # Extract clean text (without tool calls)
        clean_text = response
        tool_calls = []

        # Find all tool calls
        for tool_name, pattern in tool_patterns.items():
            matches = re.finditer(pattern, response, re.DOTALL | re.IGNORECASE)
            for match in matches:
                tool_call = {
                    'tool': tool_name,
                    'position': match.span(),
                    'groups': match.groups(),
                    'full_match': match.group(0)
                }
                tool_calls.append(tool_call)
                # Remove from clean text
                clean_text = clean_text.replace(match.group(0), '')

        # Sort tool calls by position
        tool_calls.sort(key=lambda x: x['position'][0])

        # Yield clean text first if there's any
        clean_text = clean_text.strip()
        if clean_text:
            yield {
                'type': 'text',
                'content': clean_text,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        # Execute tool calls
        for tool_call in tool_calls:
            try:
                result = await self._execute_single_tool(tool_call)
                if result:
                    self.performance_metrics['tools_used'] += 1
                    self.tool_history.append({
                        'tool': tool_call['tool'],
                        'timestamp': datetime.now().isoformat(),
                        'success': True
                    })
                    yield result
            except Exception as e:
                self.error(f"Tool execution failed: {str(e)}")
                yield {
                    'type': 'error',
                    'error': f"Tool {tool_call['tool']} failed: {str(e)}",
                    'agent': self.name,
                    'timestamp': datetime.now().isoformat()
                }

    async def _execute_single_tool(self, tool_call: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Execute a single tool call"""
        tool_name = tool_call['tool']
        groups = tool_call['groups']

        if tool_name == 'add_text':
            return {
                'type': 'action',
                'action': {
                    'action': 'add',
                    'shotType': 'DIALOGUE',
                    'content': groups[0].strip(),
                    'delay': 0
                },
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'add_code':
            language = groups[0] if groups[0] else 'python'
            code = groups[1] if len(groups) > 1 else groups[0]
            return {
                'type': 'action',
                'action': {
                    'action': 'add',
                    'shotType': 'CODE',
                    'content': code.strip(),
                    'language': language,
                    'delay': 0
                },
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'thinking':
            return {
                'type': 'action',
                'action': {
                    'action': 'is_thinking',
                    'shotType': 'thinking',
                    'textArray': [groups[0].strip()],
                    'delay': 1000
                },
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'call_execute':
            event = groups[0] if groups[0] else 'default'
            code = groups[1] if len(groups) > 1 else groups[0]
            return {
                'type': 'action',
                'action': {
                    'action': 'exec_code',
                    'shotType': 'CODE',
                    'content': code.strip(),
                    'event_tag': event,
                    'delay': 0
                },
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'remember':
            memory_type = groups[0] if groups[0] else 'general'
            content = groups[1] if len(groups) > 1 else groups[0]

            # Store in agent memory
            self.update_memory('domain_knowledge', {
                'type': memory_type,
                'content': content,
                'source': 'agent_tool_call'
            })

            return {
                'type': 'memory',
                'memory_type': memory_type,
                'content': content,
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name in ['get_variable', 'set_variable', 'update_todo']:
            # These tools require integration with the platform state
            # Return a placeholder for now
            return {
                'type': 'platform_action',
                'tool': tool_name,
                'params': groups,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        else:
            self.warning(f"Unknown tool: {tool_name}")
            return None

    async def _execute_single_tool_streaming(self, tool_call: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Execute a single tool call for streaming mode"""
        tool_name = tool_call['tool']
        params = tool_call['parsed_params']

        if tool_name == 'add_text':
            return {
                'type': 'action',
                'action': {
                    'action': 'add',
                    'shotType': 'DIALOGUE',
                    'content': params.get('content', ''),
                    'delay': 0
                },
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'add_code':
            return {
                'type': 'action',
                'action': {
                    'action': 'add',
                    'shotType': 'CODE',
                    'content': params.get('code', ''),
                    'language': params.get('language', 'python'),
                    'delay': 0
                },
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'thinking':
            return {
                'type': 'action',
                'action': {
                    'action': 'is_thinking',
                    'shotType': 'thinking',
                    'textArray': [params.get('content', '')],
                    'delay': 1000
                },
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'call_execute':
            return {
                'type': 'action',
                'action': {
                    'action': 'exec_code',
                    'shotType': 'CODE',
                    'content': params.get('code', ''),
                    'event_tag': params.get('event', 'default'),
                    'delay': 0
                },
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'remember':
            # Store in agent memory
            self.update_memory('domain_knowledge', {
                'type': params.get('type', 'general'),
                'content': params.get('content', ''),
                'source': 'agent_tool_call'
            })

            return {
                'type': 'memory',
                'memory_type': params.get('type', 'general'),
                'content': params.get('content', ''),
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'analyze_data':
            return {
                'type': 'analysis',
                'analysis_type': 'data_analysis',
                'source': params.get('source', ''),
                'method': params.get('method', 'eda'),
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'create_visualization':
            return {
                'type': 'visualization',
                'viz_type': params.get('type', 'scatter'),
                'data': params.get('data', ''),
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'validate':
            return {
                'type': 'validation',
                'condition': params.get('condition', ''),
                'error_message': params.get('error', 'Validation failed'),
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name == 'plan':
            return {
                'type': 'planning',
                'goal': params.get('goal', ''),
                'horizon': params.get('horizon', ''),
                'constraints': params.get('constraints', ''),
                'content': params.get('content', ''),
                'tool': tool_name,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        elif tool_name in ['get_variable', 'set_variable', 'update_todo']:
            # These tools require integration with the platform state
            return {
                'type': 'platform_action',
                'tool': tool_name,
                'params': params,
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

        else:
            self.warning(f"Unknown streaming tool: {tool_name}")
            return None

    def get_streaming_capabilities(self) -> Dict[str, Any]:
        """Get streaming capabilities information"""
        return {
            'supports_streaming': True,
            'supports_tool_calling': True,
            'available_tools': self.get_available_tools(),
            'streaming_tools': [
                'add_text', 'add_code', 'thinking', 'call_execute',
                'remember', 'analyze_data', 'create_visualization',
                'validate', 'plan', 'get_variable', 'set_variable', 'update_todo'
            ],
            'performance_metrics': self.performance_metrics
        }

    async def chat_with_streaming(self, messages: List[Dict[str, str]], stream: bool = True) -> AsyncGenerator[Dict[str, Any], None]:
        """Chat with conversation history using streaming"""
        try:
            if stream:
                accumulated_content = ""
                processed_positions = set()

                # Get streaming response
                stream_generator = self.model.chat_with_history(messages, stream=True)

                for chunk in stream_generator:
                    if chunk.startswith("CHAT_ERROR:"):
                        yield {
                            'type': 'error',
                            'error': chunk,
                            'agent': self.name,
                            'timestamp': datetime.now().isoformat()
                        }
                        break

                    accumulated_content += chunk

                    # Parse and execute any complete tool calls
                    async for result in self._parse_and_execute_streaming_tools(accumulated_content, processed_positions):
                        yield result

                # Final clean text
                final_clean_text = self.model.extract_clean_text(accumulated_content)
                if final_clean_text.strip():
                    yield {
                        'type': 'text',
                        'content': final_clean_text,
                        'agent': self.name,
                        'timestamp': datetime.now().isoformat()
                    }
            else:
                # Non-streaming mode
                response = self.model.chat_with_history(messages, stream=False)
                if response.startswith("CHAT_ERROR:"):
                    yield {
                        'type': 'error',
                        'error': response,
                        'agent': self.name,
                        'timestamp': datetime.now().isoformat()
                    }
                else:
                    yield {
                        'type': 'text',
                        'content': response,
                        'agent': self.name,
                        'timestamp': datetime.now().isoformat()
                    }

        except Exception as e:
            self.error(f"Chat streaming failed: {str(e)}")
            yield {
                'type': 'error',
                'error': str(e),
                'agent': self.name,
                'timestamp': datetime.now().isoformat()
            }

    def _initialize_memory(self):
        """Initialize agent memory structure."""
        if not isinstance(self.agent_memory, dict):
            self.agent_memory = {}

        # Initialize memory sections
        memory_sections = [
            'conversation_history',   # Store conversation context
            'learning_patterns',      # Store learned patterns and insights
            'error_recovery',         # Store error patterns and solutions
            'performance_insights',   # Store performance optimization insights
            'domain_knowledge',       # Store domain-specific knowledge
            'user_preferences',       # Store user interaction preferences
            'execution_context'       # Store execution context and results
        ]

        for section in memory_sections:
            if section not in self.agent_memory:
                self.agent_memory[section] = []

    def update_memory(self, section: str, content: Dict[str, Any], max_entries: int = 100):
        """Update agent memory with new information."""
        with self._lock:
            if section not in self.agent_memory:
                self.agent_memory[section] = []

            memory_entry = {
                'timestamp': datetime.now().isoformat(),
                'agent_name': self.name,
                'content': content
            }

            self.agent_memory[section].append(memory_entry)

            # Keep memory size manageable
            if len(self.agent_memory[section]) > max_entries:
                self.agent_memory[section] = self.agent_memory[section][-max_entries:]

    def get_memory(self, section: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve recent entries from agent memory."""
        with self._lock:
            if section not in self.agent_memory:
                return []
            return self.agent_memory[section][-limit:] if limit > 0 else self.agent_memory[section]

    def get_relevant_memory(self, query: str, sections: List[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Get memory entries relevant to the current query."""
        if sections is None:
            sections = ['conversation_history', 'learning_patterns', 'domain_knowledge']

        relevant_memories = []
        query_lower = query.lower()

        with self._lock:
            for section in sections:
                if section in self.agent_memory:
                    for entry in self.agent_memory[section][-20:]:  # Check recent entries
                        content_str = str(entry.get('content', '')).lower()
                        # Simple relevance check - can be enhanced with embeddings
                        if any(word in content_str for word in query_lower.split() if len(word) > 3):
                            relevant_memories.append({
                                'section': section,
                                'timestamp': entry['timestamp'],
                                'content': entry['content']
                            })

        # Sort by timestamp and return most recent relevant memories
        relevant_memories.sort(key=lambda x: x['timestamp'], reverse=True)
        return relevant_memories[:limit]

    def clear_memory(self, section: str = None):
        """Clear agent memory (specific section or all)."""
        with self._lock:
            if section:
                if section in self.agent_memory:
                    self.agent_memory[section] = []
            else:
                self.agent_memory = {}
                self._initialize_memory()

    def answer(self, question: str, use_memory: bool = True) -> str:
        """Enhanced answer method with memory integration and performance tracking."""
        start_time = datetime.now()

        try:
            # Update performance metrics
            with self._lock:
                self.performance_metrics['total_queries'] += 1

            # Get relevant memory context if enabled
            memory_context = ""
            if use_memory:
                relevant_memories = self.get_relevant_memory(question)
                if relevant_memories:
                    memory_context = "\n\nRelevant context from previous interactions:\n"
                    for memory in relevant_memories:
                        memory_context += f"- {memory['content']}\n"

            # Enhance question with memory context
            enhanced_question = question + memory_context if memory_context else question

            response = self.model.query(self.system_prompt, enhanced_question)
            self.debug(f"Response: {response}")

            # Handle dict response format from Oracle
            if isinstance(response, dict):
                answer = response.get("answer", "")
                if answer.startswith('QUERY_FAILED:'):
                    self._handle_query_failure(answer, question)
                    return answer

                # Store successful interaction in memory
                if use_memory:
                    self.update_memory('conversation_history', {
                        'question': question,
                        'answer': answer,
                        'response_time': (datetime.now() - start_time).total_seconds()
                    })

                self._update_performance_metrics(start_time, success=True)
                self.debug(f"Question: {question}")
                self.debug(f"Response: {answer}")
                return answer
            else:
                # Handle string response (backward compatibility)
                if response.startswith('QUERY_FAILED:'):
                    self._handle_query_failure(response, question)
                    return response

                # Store successful interaction in memory
                if use_memory:
                    self.update_memory('conversation_history', {
                        'question': question,
                        'answer': response,
                        'response_time': (datetime.now() - start_time).total_seconds()
                    })

                self._update_performance_metrics(start_time, success=True)
                self.debug(f"Question: {question}")
                self.debug(f"Response: {response}")
                return response

        except Exception as e:
            self._handle_query_failure(str(e), question)
            self._update_performance_metrics(start_time, success=False)
            return f"QUERY_FAILED: {str(e)}"

    def _handle_query_failure(self, error: str, question: str):
        """Handle query failures and store in memory for learning."""
        self.error(f"Query failed for model {self.model_name} with error: {error}")
        self.update_memory('error_recovery', {
            'error': error,
            'question': question,
            'model': self.model_name
        })

    def _update_performance_metrics(self, start_time: datetime, success: bool):
        """Update performance metrics."""
        response_time = (datetime.now() - start_time).total_seconds()

        with self._lock:
            if success:
                self.performance_metrics['successful_queries'] += 1
            else:
                self.performance_metrics['failed_queries'] += 1

            # Update average response time
            total_successful = self.performance_metrics['successful_queries']
            if total_successful > 0:
                current_avg = self.performance_metrics['average_response_time']
                self.performance_metrics['average_response_time'] = (
                    (current_avg * (total_successful - 1) + response_time) / total_successful
                )

            self.performance_metrics['last_updated'] = datetime.now().isoformat()
    
    def answer_multiple(self, questions: List[str], use_memory: bool = True,
                       concurrent: bool = True) -> List[str]:
        """Enhanced multiple question answering with concurrency support."""
        if not concurrent or len(questions) <= 1:
            # Sequential processing
            return [self.answer(q, use_memory) for q in questions]

        # Concurrent processing
        try:
            futures = []
            for question in questions:
                future = self.executor.submit(self.answer, question, use_memory)
                futures.append(future)

            responses = []
            for future in futures:
                try:
                    response = future.result(timeout=30)  # 30 second timeout per query
                    responses.append(response)
                except Exception as e:
                    self.error(f"Concurrent query failed: {e}")
                    responses.append(f"QUERY_FAILED: {str(e)}")

            return responses

        except Exception as e:
            self.error(f"Concurrent processing failed, falling back to sequential: {e}")
            return [self.answer(q, use_memory) for q in questions]

    async def answer_async(self, question: str, use_memory: bool = True) -> str:
        """Async version of answer method."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, self.answer, question, use_memory)

    async def answer_multiple_async(self, questions: List[str],
                                   use_memory: bool = True) -> List[str]:
        """Async version of answer_multiple method."""
        tasks = [self.answer_async(q, use_memory) for q in questions]
        return await asyncio.gather(*tasks, return_exceptions=True)

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics."""
        with self._lock:
            return self.performance_metrics.copy()

    def reset_performance_metrics(self):
        """Reset performance metrics."""
        with self._lock:
            self.performance_metrics = {
                'total_queries': 0,
                'successful_queries': 0,
                'failed_queries': 0,
                'average_response_time': 0.0,
                'last_updated': datetime.now().isoformat()
            }
    
    def _parse_json(self, response):
        """Parse JSON data from LLM response with multiple fallback strategies"""
        self.info(f"Parsing JSON from response: {response}")
        
        # Strategy 1: Try standard markdown code block format
        code_match = re.search(r"```json\n(.*?)\n```", response, re.DOTALL)
        if code_match:
            try:
                json_str = code_match.group(1).strip()
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                self.error(f"JSON decode error in markdown block: {e}")
        
        # Strategy 2: Try without markdown formatting (direct JSON)
        try:
            # Remove potential markdown artifacts and whitespace
            cleaned_response = response.strip()
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith('```'):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
            
            return json.loads(cleaned_response)
        except json.JSONDecodeError:
            self.error(f"JSON decode error in markdown block: {e}")
        
        # Strategy 3: Extract JSON-like content using regex
        json_pattern = r'\{.*\}'
        json_match = re.search(json_pattern, response, re.DOTALL)
        if json_match:
            try:
                json_str = json_match.group(0)
                return json.loads(json_str)
            except json.JSONDecodeError:
                self.error(f"JSON decode error in regex: {e}")
        
        # All strategies failed
        self.error(f"Failed to parse JSON from response using all strategies. Response: {response[:500]}...")
        return None
    
    def _parse_code(self, response):
        code_match = re.search(r"```python\n(.*)\n```", response, re.DOTALL)
        if code_match:
            return code_match.group(1).strip()
        self.error(f"Failed to parse code from response: {response}")
        return response
    
    def coding(self, question:str) -> str:
        response = self.answer(question)
        if response.startswith('QUERY_FAILED:'):
            response = self.answer(question)
        return self._parse_code(response)
    
    def analyzing(self, question:str) -> str:
        max_retries = 3
        for attempt in range(max_retries):
            response = self.answer(question)
            
            # If query failed, try again
            if response.startswith('QUERY_FAILED:'):
                self.warning(f"Query failed on attempt {attempt + 1}: {response}")
                if attempt < max_retries - 1:
                    continue
                else:
                    self.error(f"All {max_retries} query attempts failed")
                    raise ValueError(f"Model query failed after {max_retries} attempts: {response}")
            
            # Try to parse JSON response
            parsed_result = self._parse_json(response)
            if parsed_result is not None:
                return parsed_result
            
            # If JSON parsing failed, log and retry
            self.warning(f"JSON parsing failed on attempt {attempt + 1}")
            if attempt < max_retries - 1:
                continue
        
        # All attempts failed
        self.error(f"JSON parsing failed completely after {max_retries} attempts for question: {question[:100]}...")
        raise ValueError(f"Failed to parse JSON response from LLM after {max_retries} attempts")
    
    def code_multiple(self, questions:List[str]) -> List[str]:
        responses = self.model.query_all(self.system_prompt, questions)
        multiple_code = []
        for response in responses:
            if response.startswith('QUERY_FAILED:'):
                response = self.answer(response)
            multiple_code.append(self._parse_code(response))
        return multiple_code
    
    def analyze_multiple(self, questions:List[str]) -> List[str]:
        responses = self.model.query_all(self.system_prompt, questions)
        multiple_analyze = []
        for response in responses:
            if response.startswith('QUERY_FAILED:'):
                response = self.answer(response)
            parsed_result = self._parse_json(response)
            if parsed_result is None:
                self.error(f"JSON parsing failed in batch analysis")
                raise ValueError("Failed to parse JSON response in batch analysis")
            multiple_analyze.append(parsed_result)
        return multiple_analyze