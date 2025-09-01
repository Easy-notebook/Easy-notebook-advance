import time
from typing import Dict, List, Any
from datetime import datetime, timedelta
import threading
from collections import defaultdict

class AgentMemorySystem:
    """Agent记忆系统 - 基于目标的智能记忆管理"""
    
    def __init__(self):
        self.memories = {}  # 主记忆存储
        self.goal_memories = defaultdict(list)  # 基于目标的记忆索引
        self.session_memories = defaultdict(dict)  # 会话级记忆
        self.global_context = {}  # 全局上下文
        self.memory_lock = threading.Lock()
        
        # 记忆配置
        self.max_memories_per_goal = 100
        self.memory_retention_days = 30
        self.auto_cleanup_interval = 3600  # 1小时
        
        # 启动自动清理
        self._start_auto_cleanup()
    
    def store_goal_memory(self, goal: str, memory_type: str, content: Dict[str, Any], 
                         session_id: str = None, agent_name: str = None) -> str:
        """存储基于目标的记忆"""
        with self.memory_lock:
            memory_id = f"{goal}_{memory_type}_{int(time.time())}"
            
            memory_entry = {
                "id": memory_id,
                "goal": goal,
                "type": memory_type,
                "content": content,
                "agent_name": agent_name,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat(),
                "access_count": 0,
                "last_accessed": datetime.now().isoformat()
            }
            
            # 存储到主记忆库
            self.memories[memory_id] = memory_entry
            
            # 添加到目标索引
            self.goal_memories[goal].append(memory_id)
            
            # 限制每个目标的记忆数量
            if len(self.goal_memories[goal]) > self.max_memories_per_goal:
                # 移除最旧的记忆
                oldest_id = self.goal_memories[goal].pop(0)
                if oldest_id in self.memories:
                    del self.memories[oldest_id]
            
            return memory_id
    
    def retrieve_goal_memories(self, goal: str, memory_type: str = None, 
                              limit: int = 10) -> List[Dict[str, Any]]:
        """检索基于目标的记忆"""
        with self.memory_lock:
            goal_memory_ids = self.goal_memories.get(goal, [])
            memories = []
            
            for memory_id in reversed(goal_memory_ids[-limit:]):  # 最新的记忆优先
                if memory_id in self.memories:
                    memory = self.memories[memory_id]
                    
                    # 过滤记忆类型
                    if memory_type is None or memory["type"] == memory_type:
                        # 更新访问统计
                        memory["access_count"] += 1
                        memory["last_accessed"] = datetime.now().isoformat()
                        memories.append(memory.copy())
            
            return memories
    
    def store_analysis_result(self, goal: str, stage: str, analysis_type: str, 
                            result: Dict[str, Any], agent_name: str = None) -> str:
        """存储分析结果"""
        content = {
            "stage": stage,
            "analysis_type": analysis_type,
            "result": result,
            "metadata": {
                "stage": stage,
                "analysis_type": analysis_type,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        return self.store_goal_memory(
            goal=goal,
            memory_type="analysis_result",
            content=content,
            agent_name=agent_name
        )
    
    def store_data_insight(self, goal: str, insight_type: str, insight: Dict[str, Any], 
                          confidence: float = 1.0, agent_name: str = None) -> str:
        """存储数据洞察"""
        content = {
            "insight_type": insight_type,
            "insight": insight,
            "confidence": confidence,
            "metadata": {
                "insight_type": insight_type,
                "confidence": confidence,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        return self.store_goal_memory(
            goal=goal,
            memory_type="data_insight",
            content=content,
            agent_name=agent_name
        )
    
    def store_decision_context(self, goal: str, decision_type: str, context: Dict[str, Any], 
                              reasoning: str = None, agent_name: str = None) -> str:
        """存储决策上下文"""
        content = {
            "decision_type": decision_type,
            "context": context,
            "reasoning": reasoning,
            "metadata": {
                "decision_type": decision_type,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        return self.store_goal_memory(
            goal=goal,
            memory_type="decision_context",
            content=content,
            agent_name=agent_name
        )
    
    def get_goal_context(self, goal: str) -> Dict[str, Any]:
        """获取目标的完整上下文"""
        with self.memory_lock:
            context = {
                "goal": goal,
                "analysis_results": self.retrieve_goal_memories(goal, "analysis_result"),
                "data_insights": self.retrieve_goal_memories(goal, "data_insight"),
                "decision_contexts": self.retrieve_goal_memories(goal, "decision_context"),
                "all_memories": self.retrieve_goal_memories(goal),
                "memory_count": len(self.goal_memories.get(goal, [])),
                "last_updated": datetime.now().isoformat()
            }
            
            return context
    
    def update_session_state(self, session_id: str, state_key: str, state_value: Any):
        """更新会话状态"""
        with self.memory_lock:
            if session_id not in self.session_memories:
                self.session_memories[session_id] = {}
            
            self.session_memories[session_id][state_key] = {
                "value": state_value,
                "timestamp": datetime.now().isoformat()
            }
    
    def get_session_state(self, session_id: str, state_key: str = None) -> Any:
        """获取会话状态"""
        with self.memory_lock:
            session_data = self.session_memories.get(session_id, {})
            
            if state_key is None:
                return {k: v["value"] for k, v in session_data.items()}
            else:
                state_entry = session_data.get(state_key)
                return state_entry["value"] if state_entry else None
    
    def create_memory_summary(self, goal: str) -> Dict[str, Any]:
        """创建记忆摘要"""
        context = self.get_goal_context(goal)
        
        summary = {
            "goal": goal,
            "total_memories": context["memory_count"],
            "analysis_count": len(context["analysis_results"]),
            "insight_count": len(context["data_insights"]),
            "decision_count": len(context["decision_contexts"]),
            "key_insights": [],
            "recent_decisions": [],
            "data_characteristics": {},
            "generated_at": datetime.now().isoformat()
        }
        
        # 提取关键洞察
        for insight in context["data_insights"][-5:]:  # 最近5个洞察
            if insight["content"]["confidence"] > 0.7:
                summary["key_insights"].append({
                    "type": insight["content"]["insight_type"],
                    "insight": insight["content"]["insight"],
                    "confidence": insight["content"]["confidence"]
                })
        
        # 提取最近决策
        for decision in context["decision_contexts"][-3:]:  # 最近3个决策
            summary["recent_decisions"].append({
                "type": decision["content"]["decision_type"],
                "reasoning": decision["content"]["reasoning"],
                "timestamp": decision["timestamp"]
            })
        
        return summary
    
    def export_goal_memory(self, goal: str) -> Dict[str, Any]:
        """导出目标记忆（用于前端同步）"""
        context = self.get_goal_context(goal)
        summary = self.create_memory_summary(goal)
        
        export_data = {
            "goal": goal,
            "summary": summary,
            "full_context": context,
            "export_timestamp": datetime.now().isoformat(),
            "format_version": "1.0"
        }
        
        return export_data
    
    def import_frontend_state(self, goal: str, frontend_state: Dict[str, Any]):
        """从前端导入状态"""
        if not frontend_state:
            return
        
        # 存储前端状态作为决策上下文
        self.store_decision_context(
            goal=goal,
            decision_type="frontend_state_sync",
            context=frontend_state,
            reasoning="State synchronized from frontend",
            agent_name="Frontend"
        )
        
        # 更新全局上下文
        self.global_context[f"frontend_state_{goal}"] = {
            "state": frontend_state,
            "timestamp": datetime.now().isoformat()
        }
    
    def cleanup_old_memories(self):
        """清理过期记忆"""
        with self.memory_lock:
            cutoff_date = datetime.now() - timedelta(days=self.memory_retention_days)
            cutoff_timestamp = cutoff_date.isoformat()
            
            memories_to_remove = []
            
            for memory_id, memory in self.memories.items():
                if memory["timestamp"] < cutoff_timestamp:
                    memories_to_remove.append(memory_id)
            
            # 移除过期记忆
            for memory_id in memories_to_remove:
                memory = self.memories[memory_id]
                goal = memory["goal"]
                
                # 从主存储移除
                del self.memories[memory_id]
                
                # 从目标索引移除
                if memory_id in self.goal_memories[goal]:
                    self.goal_memories[goal].remove(memory_id)
            
            print(f"🧹 Cleaned up {len(memories_to_remove)} old memories")
    
    def _start_auto_cleanup(self):
        """启动自动清理线程"""
        def cleanup_worker():
            while True:
                time.sleep(self.auto_cleanup_interval)
                try:
                    self.cleanup_old_memories()
                except Exception as e:
                    print(f"❌ Error in memory cleanup: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """获取记忆系统统计信息"""
        with self.memory_lock:
            stats = {
                "total_memories": len(self.memories),
                "goals_tracked": len(self.goal_memories),
                "active_sessions": len(self.session_memories),
                "memory_types": defaultdict(int),
                "agent_activity": defaultdict(int),
                "recent_activity": []
            }
            
            # 统计记忆类型
            for memory in self.memories.values():
                stats["memory_types"][memory["type"]] += 1
                if memory["agent_name"]:
                    stats["agent_activity"][memory["agent_name"]] += 1
            
            # 最近活动
            recent_memories = sorted(
                self.memories.values(),
                key=lambda x: x["timestamp"],
                reverse=True
            )[:10]
            
            for memory in recent_memories:
                stats["recent_activity"].append({
                    "goal": memory["goal"],
                    "type": memory["type"],
                    "agent": memory["agent_name"],
                    "timestamp": memory["timestamp"]
                })
            
            return dict(stats)

# 全局记忆系统实例
global_memory_system = AgentMemorySystem()

def get_memory_system() -> AgentMemorySystem:
    """获取全局记忆系统实例"""
    return global_memory_system
