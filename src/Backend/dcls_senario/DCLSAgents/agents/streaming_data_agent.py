"""
Streaming Data Science Agent with real-time tool calling
Enhanced for real-time analysis and streaming responses
"""

from .base_agent import BaseAgent
from typing import Dict, Any, List, AsyncGenerator
import asyncio

class StreamingDataAgent(BaseAgent):
    def __init__(self, model: str = "gpt-4o"):
        system_prompt = """You are a streaming data science expert with real-time analysis capabilities.

## 🎯 Core Expertise
- **Real-time Data Analysis**: Streaming data insights and pattern discovery
- **Interactive Feature Engineering**: Live feature creation and validation
- **Dynamic Model Development**: Adaptive model building and tuning
- **Streaming Visualization**: Real-time chart and dashboard creation
- **Live Statistical Analysis**: Continuous hypothesis testing and validation

## 🚀 Streaming Capabilities
You can provide real-time analysis through tool calling:

**Analysis Tools:**
- <analyze-data source="data_path" method="streaming_eda"/>: Real-time EDA
- <analyze-data source="data_path" method="live_correlation"/>: Live correlation analysis
- <analyze-data source="data_path" method="streaming_distribution"/>: Real-time distribution analysis

**Visualization Tools:**
- <create-visualization type="live_histogram" data="column_name"/>: Live histograms
- <create-visualization type="streaming_scatter" data="x,y_columns"/>: Real-time scatter plots
- <create-visualization type="dynamic_correlation_matrix" data="dataframe"/>: Live correlation heatmap

**Interactive Tools:**
- <thinking>Show real-time reasoning process</thinking>
- <add-text>Provide streaming insights</add-text>
- <add-code language="python">Generate live analysis code</add-code>
- <call-execute event="streaming_analysis">Execute real-time analysis</call-execute>
- <remember type="streaming_insight">Store live insights</remember>

## 📊 Streaming Workflow
1. **Stream Analysis**: Provide continuous data insights
2. **Live Feedback**: Real-time user interaction
3. **Dynamic Adaptation**: Adjust analysis based on streaming results
4. **Continuous Learning**: Update insights as data flows
5. **Real-time Validation**: Immediate result verification

Always provide streaming insights with immediate value and continuous improvement."""

        super().__init__(
            name="StreamingDataAgent",
            model=model,
            system_prompt=system_prompt
        )
    
    def get_capabilities(self) -> List[str]:
        return [
            "streaming_analysis",
            "real_time_eda",
            "live_feature_engineering",
            "dynamic_modeling",
            "streaming_visualization",
            "continuous_validation",
            "interactive_insights",
            "adaptive_learning"
        ]
    
    def get_available_tools(self) -> List[str]:
        return [
            'add_text', 'add_code', 'thinking', 'call_execute',
            'get_variable', 'set_variable', 'remember', 'update_todo',
            'analyze_data', 'create_visualization', 'validate',
            'streaming_analysis', 'live_feedback', 'dynamic_adaptation'
        ]
    
    async def stream_data_analysis(self, data_info: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
        """Perform streaming data analysis with real-time tool calling"""
        task = f"""
🔄 **Streaming Data Analysis Task**

## Data Information
{data_info}

## Real-time Analysis Requirements
Provide continuous, streaming analysis with immediate insights:

1. **Live Data Loading**
   - Stream data loading progress
   - Real-time validation feedback
   - Immediate error detection

2. **Streaming EDA**
   - Live statistical summaries
   - Real-time pattern detection
   - Continuous quality assessment

3. **Interactive Insights**
   - Immediate findings communication
   - Live hypothesis generation
   - Real-time recommendation updates

4. **Dynamic Visualization**
   - Streaming chart creation
   - Live dashboard updates
   - Interactive plot generation

5. **Continuous Learning**
   - Adaptive analysis refinement
   - Real-time insight accumulation
   - Dynamic strategy adjustment

Use your streaming tools to provide immediate, valuable insights with continuous improvement.
"""
        
        async for result in self.process_task_with_streaming(task, data_info):
            yield result
    
    async def live_feature_analysis(self, feature_context: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
        """Perform live feature analysis with streaming insights"""
        task = f"""
⚡ **Live Feature Analysis**

## Feature Context
{feature_context}

## Streaming Feature Tasks
Provide real-time feature engineering insights:

1. **Live Feature Discovery**
   - Stream feature type identification
   - Real-time importance scoring
   - Continuous correlation analysis

2. **Dynamic Feature Creation**
   - Live polynomial feature generation
   - Real-time interaction detection
   - Streaming aggregation features

3. **Interactive Feature Selection**
   - Live selection criteria application
   - Real-time performance feedback
   - Continuous optimization updates

4. **Streaming Validation**
   - Live feature quality assessment
   - Real-time business logic validation
   - Continuous statistical testing

Use streaming tools to provide immediate feature engineering value.
"""
        
        async for result in self.process_task_with_streaming(task, feature_context):
            yield result
    
    async def interactive_model_development(self, model_context: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
        """Interactive model development with streaming feedback"""
        task = f"""
🤖 **Interactive Model Development**

## Model Context
{model_context}

## Streaming Model Tasks
Provide real-time model development insights:

1. **Live Algorithm Selection**
   - Stream algorithm recommendations
   - Real-time performance predictions
   - Continuous complexity assessment

2. **Dynamic Hyperparameter Tuning**
   - Live parameter optimization
   - Real-time validation feedback
   - Streaming performance metrics

3. **Interactive Model Training**
   - Live training progress
   - Real-time loss monitoring
   - Continuous convergence analysis

4. **Streaming Model Evaluation**
   - Live performance metrics
   - Real-time validation results
   - Continuous improvement suggestions

Provide immediate modeling insights with continuous optimization.
"""
        
        async for result in self.process_task_with_streaming(task, model_context):
            yield result
    
    async def real_time_chat(self, messages: List[Dict[str, str]]) -> AsyncGenerator[Dict[str, Any], None]:
        """Real-time chat with streaming tool calling"""
        async for result in self.chat_with_streaming(messages, stream=True):
            yield result
    
    def get_streaming_status(self) -> Dict[str, Any]:
        """Get current streaming status and metrics"""
        capabilities = self.get_streaming_capabilities()
        
        return {
            'agent_name': self.name,
            'streaming_active': True,
            'tools_available': len(capabilities['available_tools']),
            'streaming_tools': len(capabilities['streaming_tools']),
            'performance_metrics': capabilities['performance_metrics'],
            'current_task': self.current_task,
            'tool_history_count': len(self.tool_history),
            'memory_entries': len(self.memory.get('domain_knowledge', [])),
            'status': 'ready_for_streaming'
        }
    
    async def demonstrate_streaming_capabilities(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Demonstrate streaming capabilities with example analysis"""
        demo_task = """
🎯 **Streaming Capabilities Demonstration**

Let me show you my real-time analysis capabilities:

<thinking>
I'll demonstrate my streaming analysis capabilities by showing:
1. Real-time data processing
2. Live tool calling
3. Streaming insights generation
4. Interactive feedback loops
</thinking>

<add-text>🚀 **Starting Streaming Data Science Demo**</add-text>

<add-text>📊 **Step 1: Live Data Analysis**</add-text>
<analyze-data source="demo_data" method="streaming_eda"/>

<add-code language="python">
# Streaming data analysis demonstration
import pandas as pd
import numpy as np
from datetime import datetime

print("🔄 Streaming Data Analysis Demo")
print("=" * 50)
print(f"⏰ Start time: {datetime.now()}")

# Simulate streaming data processing
for i in range(3):
    print(f"📊 Processing batch {i+1}/3...")
    # Simulate analysis work
    data_batch = np.random.randn(100, 5)
    print(f"   ✅ Batch {i+1} processed: {data_batch.shape}")
    
print("🎉 Streaming analysis complete!")
</add-code>

<call-execute event="demo_streaming">
# Execute streaming demo
print("Executing streaming demonstration...")
</call-execute>

<create-visualization type="live_histogram" data="demo_column"/>

<remember type="streaming_demo">
Demonstrated streaming capabilities including:
- Real-time data processing
- Live tool calling
- Streaming visualization
- Interactive feedback
</remember>

<add-text>✅ **Streaming Demo Complete!** Ready for real-time data science tasks.</add-text>
"""
        
        async for result in self.process_task_with_streaming(demo_task, {}):
            yield result
