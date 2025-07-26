import os
import shutil
import queue
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import asyncio
from jupyter_client import KernelManager
from asyncio import Lock
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)



# Constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
EXECUTION_TIMEOUT = 300  # 5 minutes timeout for code execution
HEARTBEAT_INTERVAL = 5  # Seconds between heartbeat checks
MAX_NOTEBOOK_AGE_HOURS = 24
ALLOWED_MIME_TYPES = {
    'image': ['image/jpeg', 'image/png', 'image/gif'],
    'document': [
        'application/pdf',
        'application/msword',
        'text/plain',
        'text/csv',
        'text/markdown',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg']
}

# Kernel Execution Manager
class KernelExecutionManager:
    def __init__(self, kernel_name: str = 'python3', work_dir: str = None):
        self.kernel_name = kernel_name
        self.km = None
        self.kc = None
        self.execution_queue = queue.Queue()
        self.outputs = []
        self._initialized = False
        self.work_dir = work_dir
        self.last_activity = datetime.now()
        self._lock = Lock()
        self._current_execution = None
        self._execution_start_time = None
        self.execution_status = 'idle'  # 'idle', 'running', 'cancelled'
        self._cancelled = False

    @asynccontextmanager
    async def execution_lock(self):
        """Provides async state manager for execution locking."""
        try:
            await self._lock.acquire()
            yield
        finally:
            self._lock.release()

    async def initialize_kernel(self):
        """Initialize the IPython kernel with proper error handling and logging."""
        async with self.execution_lock():
            if self._initialized:
                return True

            self.shutdown_kernel()  # Ensure clean state
            try:
                if self.work_dir:
                    os.makedirs(self.work_dir, exist_ok=True)
                
                if not Path(self.work_dir).resolve().is_relative_to(Path("./notebooks").resolve()):
                    raise ValueError("Invalid working directory path")

                self.km = KernelManager(kernel_name=self.kernel_name)
                
                env = os.environ.copy()
                env['IPYTHONDIR'] = self.work_dir
                
                self.km.start_kernel(cwd=self.work_dir, env=env)
                
                self.kc = self.km.client()
                self.kc.start_channels()
                await asyncio.get_event_loop().run_in_executor(None, self.kc.wait_for_ready, 30)
                
                self.kc.execute(f"import os; os.chdir('{self.work_dir}')")
                
                self._initialized = True
                self.last_activity = datetime.now()
                logger.info(f"Kernel {self.kernel_name} initialized successfully in {self.work_dir}")
                return True
            except Exception as e:
                logger.error(f"Failed to initialize kernel: {str(e)}")
                self._initialized = False
                raise

    def shutdown_kernel(self):
        """Safely shutdown the kernel and cleanup resources."""
        try:
            if self.kc:
                self.kc.stop_channels()
            if self.km:
                self.km.shutdown_kernel()
            if self.work_dir and os.path.exists(self.work_dir):
                try:
                    shutil.rmtree(self.work_dir)
                except Exception as e:
                    logger.error(f"Error cleaning up working directory: {str(e)}")
        except Exception as e:
            logger.error(f"Error shutting down kernel: {str(e)}")
        finally:
            self.kc = None
            self.km = None
            self._initialized = False
            self.execution_status = 'idle'

    async def cancel_execution(self):
        """Cancel the current execution."""
        self._cancelled = True
        if self.km and self.kc:
            try:
                self.km.interrupt_kernel()
                return {'status': 'ok', 'message': 'Execution cancelled'}
            except Exception as e:
                logger.error(f"Error cancelling execution: {str(e)}")
                return {'status': 'error', 'message': str(e)}

    def _process_output(self, msg_type: str, content: Dict) -> Dict:
        """Process different types of kernel outputs."""
        timestamp = datetime.now().isoformat()
        
        if msg_type == 'stream':
            return {
                'type': 'text',
                'content': content['text'],
                'timestamp': timestamp
            }
        elif msg_type == 'display_data':
            return self._handle_display_data(content)
        elif msg_type == 'execute_result':
            return self._handle_execute_result(content)
        elif msg_type == 'error':
            return {
                'type': 'error',
                'content': '\n'.join(content['traceback']),
                'timestamp': timestamp
            }
        
        return {
            'type': 'unknown',
            'content': str(content),
            'timestamp': timestamp
        }

    def _handle_display_data(self, content: Dict) -> Dict:
        """Handle display data with proper validation."""
        try:
            data = content['data']
            timestamp = datetime.now().isoformat()
            
            if 'text/html' in data:
                return {
                    'type': 'html',
                    'content': data['text/html'],
                    'timestamp': timestamp
                }
            elif 'image/png' in data:
                return {
                    'type': 'image',
                    'content': f"data:image/png;base64,{data['image/png']}",
                    'timestamp': timestamp
                }
            elif 'text/plain' in data:
                return {
                    'type': 'text',
                    'content': data['text/plain'],
                    'timestamp': timestamp
                }
        except Exception as e:
            logger.error(f"Error handling display data: {str(e)}")
            return {
                'type': 'error',
                'content': f"Error processing display data: {str(e)}",
                'timestamp': datetime.now().isoformat()
            }

    def _handle_execute_result(self, content: Dict) -> Dict:
        """Handle execution results with proper validation."""
        try:
            data = content['data']
            timestamp = datetime.now().isoformat()
            
            if 'text/html' in data:
                return {
                    'type': 'html',
                    'content': data['text/html'],
                    'timestamp': timestamp
                }
            elif 'text/plain' in data:
                return {
                    'type': 'text',
                    'content': data['text/plain'],
                    'timestamp': timestamp
                }
        except Exception as e:
            logger.error(f"Error handling execute result: {str(e)}")
            return {
                'type': 'error',
                'content': f"Error processing execute result: {str(e)}",
                'timestamp': datetime.now().isoformat()
            }

    async def execute_code_with_progress(self, code: str) -> Dict[str, Any]:
        """Execute code with progress updates and cancellation support."""
        if not self._initialized:
            await self.initialize_kernel()

        async with self.execution_lock():
            try:
                self._cancelled = False
                self.execution_status = 'running'
                self._execution_start_time = datetime.now()
                self._current_execution = {
                    'status': 'running',
                    'start_time': self._execution_start_time,
                    'outputs': [],
                    'elapsed_time': 0
                }

                msg_id = self.kc.execute(code)
                outputs = []
                
                while True:
                    if self._cancelled:
                        raise InterruptedError("Execution cancelled by user")

                    try:
                        msg = await asyncio.get_event_loop().run_in_executor(
                            None, 
                            self.kc.get_iopub_msg, 
                            1  # 1 second timeout
                        )
                        
                        if msg['parent_header'].get('msg_id') != msg_id:
                            continue

                        msg_type = msg['header']['msg_type']
                        content = msg['content']

                        # Update execution status
                        current_time = datetime.now()
                        elapsed_seconds = (current_time - self._execution_start_time).total_seconds()
                        self._current_execution['elapsed_time'] = elapsed_seconds

                        if msg_type == 'status':
                            if content['execution_state'] == 'idle':
                                break
                        elif msg_type in ['stream', 'display_data', 'execute_result', 'error']:
                            output = self._process_output(msg_type, content)
                            outputs.append(output)
                            self._current_execution['outputs'] = outputs

                        # Check for timeout
                        if elapsed_seconds > EXECUTION_TIMEOUT:
                            raise TimeoutError("Execution timeout exceeded")

                    except queue.Empty:
                        continue

                self.execution_status = 'idle'
                return {
                    'status': 'ok',
                    'outputs': outputs,
                    'elapsed_time': self._current_execution['elapsed_time'],
                    'timestamp': datetime.now().isoformat()
                }

            except InterruptedError as e:
                self.execution_status = 'cancelled'
                return {
                    'status': 'cancelled',
                    'outputs': outputs,
                    'error': str(e),
                    'elapsed_time': self._current_execution['elapsed_time'],
                    'timestamp': datetime.now().isoformat()
                }
            except Exception as e:
                self.execution_status = 'error'
                return {
                    'status': 'error',
                    'outputs': outputs,
                    'error': str(e),
                    'elapsed_time': self._current_execution['elapsed_time'],
                    'timestamp': datetime.now().isoformat()
                }
            finally:
                self._cancelled = False

    async def get_execution_status(self) -> Dict[str, Any]:
        """Get current execution status with elapsed time."""
        if not self._current_execution:
            return {
                'status': self.execution_status,
                'elapsed_time': 0,
                'timestamp': datetime.now().isoformat()
            }
        
        current_time = datetime.now()
        elapsed_time = (current_time - self._current_execution['start_time']).total_seconds()
        
        return {
            'status': self.execution_status,
            'start_time': self._current_execution['start_time'].isoformat(),
            'elapsed_time': elapsed_time,
            'outputs': self._current_execution['outputs'],
            'timestamp': current_time.isoformat()
        }
    
    async def restartKernel(self):
        """Restart the kernel."""
        async with self.execution_lock():
            self.shutdown_kernel()
            await self.initialize_kernel()
            return {'status': 'ok', 'message': 'Kernel restarted successfully'}
