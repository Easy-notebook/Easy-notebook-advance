import logging
import sys
from datetime import datetime
from pathlib import Path

# 创建日志目录
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# 当前日期作为文件名
current_date = datetime.now().strftime("%Y-%m-%d")
STREAM_LOG_FILE = LOG_DIR / f"stream_{current_date}.log"

# 配置流式输出日志
stream_logger = logging.getLogger("stream")
stream_logger.setLevel(logging.DEBUG)

# 文件处理器
file_handler = logging.FileHandler(STREAM_LOG_FILE, encoding="utf-8")
file_handler.setLevel(logging.DEBUG)
file_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(file_formatter)

# 控制台处理器
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_formatter = logging.Formatter('%(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(console_formatter)

# 添加处理器
stream_logger.addHandler(file_handler)
stream_logger.addHandler(console_handler)

def log_stream_start(stage_id, step_index, stream_enabled):
    """记录流式响应开始"""
    stream_logger.info(f"流式响应启动: stage={stage_id}, step={step_index}, stream_enabled={stream_enabled}")

def log_header_sent(header_data):
    """记录发送响应头部"""
    stream_logger.info(f"发送响应头部: {header_data}")

def log_action_generated(action_index, total_actions, action_type, delay):
    """记录生成操作"""
    stream_logger.debug(f"生成操作 {action_index+1}/{total_actions}: 类型={action_type}, 延迟={delay}秒")

def log_action_sent(action_data):
    """记录发送操作数据"""
    stream_logger.info(f"发送操作: {action_data[:100]}...")  # 只记录前100个字符

def log_stream_complete():
    """记录流式响应完成"""
    stream_logger.info("流式响应完成") 