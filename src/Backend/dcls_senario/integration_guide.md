# DCLS 新架构集成指南

## 🎯 **架构升级完成**

您的DCLS项目已成功升级到新的面向对象架构，**完全兼容现有前端协议和API接口**。

## 📁 **新增文件结构**

```
/domain/                          # 领域层（核心业务逻辑）
├── interfaces/                   # 业务接口定义
│   ├── agent_interface.py       # Agent接口
│   ├── llm_interface.py         # LLM接口
│   └── storage_interface.py     # 存储接口
└── models/                      # 领域模型
    ├── dataset.py               # 数据集模型
    └── experiment.py            # 实验模型

/infrastructure/                  # 基础设施层
├── agents/                      # Agent实现
│   ├── base/                   # 基础Agent类
│   ├── specialized/            # 专门化Agent
│   │   ├── data_cleaning_agent.py
│   │   ├── problem_definition_agent.py
│   │   └── prediction_inference_agent.py
│   └── factory/                # Agent工厂
└── llm/                        # LLM提供者
    ├── openai_provider.py      # 您的OpenAI引擎集成
    └── llm_factory.py          # LLM工厂

/presentation/                   # 表示层
├── api/                        # API接口
│   ├── step_template_adapter.py # StepTemplate适配器
│   └── new_planner.py          # 新架构API端点
└── ...

/shared/                        # 共享组件
├── config/                     # 配置管理
├── exceptions/                 # 异常定义
└── di_container.py            # 依赖注入容器

/legacy_bridge.py              # 向后兼容桥接层
/main_new.py                   # 新架构主入口
```

## 🔄 **三种使用方式**

### 1. **原有方式（零修改）**
您的现有代码可以继续工作，无需任何修改：

```python
# 原有代码继续有效
from agents import ProblemDefinitionAndDataCollectionAgent, DataCleaningAndEDA_Agent

problem_agent = ProblemDefinitionAndDataCollectionAgent(memory=ConversationBufferMemory(), llm=llm)
```

### 2. **桥接方式（推荐过渡）**
使用桥接层获得新架构的好处，但保持原有接口：

```python
# 使用桥接层
from legacy_bridge import ProblemDefinitionAndDataCollectionAgent, DataCleaningAndEDA_Agent

# 接口完全相同，但底层使用新架构
problem_agent = ProblemDefinitionAndDataCollectionAgent(memory=None, llm=None)
result = problem_agent.execute_problem_definition(csv_path, problem_desc, context_desc)
```

### 3. **新架构方式（推荐新项目）**
直接使用新的面向对象架构：

```python
# 新架构方式
from shared.config.settings import load_config_from_env
from infrastructure.llm.llm_factory import LLMFactory
from infrastructure.agents.factory.agent_factory import AgentFactory

config = load_config_from_env()
llm_factory = LLMFactory()
llm_provider = llm_factory.create_from_config(config.llm)

agent_factory = AgentFactory(llm_provider)
problem_agent = agent_factory.create_problem_definition_agent(
    config=AgentConfig(),
    problem_description="您的问题描述",
    context_description="上下文描述"
)

result = problem_agent.execute(input_data)
```

## 🌐 **前端API兼容性**

### 现有API端点保持不变：
- `POST /actions` - 获取操作序列（现在使用新架构）
- `POST /reflection` - 反馈处理
- `POST /generate` - 响应生成

### StepTemplate完全兼容：
```python
# 新架构生成的StepTemplate格式完全相同
from presentation.api.step_template_adapter import create_step_template_from_agent_result

step_template = create_step_template_from_agent_result(
    step_data, state, agent_result, "Agent名称", "任务描述"
)
```

## ⚙️ **配置管理**

### 环境变量配置：
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
DCLS_ENVIRONMENT=development
DCLS_LLM_API_KEY=your-api-key
DCLS_LLM_PROVIDER=openai
DCLS_LLM_MODEL=gpt-4
```

### 配置文件方式：
```python
# 使用配置文件
from shared.config.settings import load_config_from_file
config = load_config_from_file("config/development.json")
```

## 🚀 **启动新架构**

### 方式1：使用新主入口
```bash
python main_new.py \
  --csv_path "data/your_dataset.csv" \
  --problem_description "预测客户流失" \
  --context_description "银行客户数据分析" \
  --workflow data_cleaning
```

### 方式2：API服务器（推荐）
```bash
# 修改 app/api/endpoints/planner.py 导入
from presentation.api.new_planner import router as new_router

# 或者直接替换路由
app.include_router(new_router, prefix="/api/v2")
```

## 🔧 **自定义扩展**

### 添加新Agent：
```python
# 1. 创建Agent接口
class ICustomAgent(IAgent):
    @abstractmethod
    def custom_method(self, data: Any) -> AgentResult:
        pass

# 2. 实现Agent
class CustomAgent(BaseAgent, ICustomAgent):
    def custom_method(self, data: Any) -> AgentResult:
        # 实现逻辑
        pass

# 3. 注册到工厂
agent_factory.register_agent_type('custom', CustomAgent)
```

### 添加新LLM提供者：
```python
# 1. 实现ILLMProvider接口
class CustomLLMProvider(ILLMProvider):
    # 实现所有抽象方法
    pass

# 2. 注册到工厂
llm_factory.register_provider('custom_llm', CustomLLMProvider, config_schema)
```

## 📊 **性能和监控**

新架构提供：
- **依赖注入**：减少对象创建开销
- **配置缓存**：避免重复配置加载  
- **Agent复用**：单例模式减少内存使用
- **类型安全**：编译时错误检查
- **结构化日志**：更好的调试信息

## 🔍 **调试和故障排除**

### 启用详细日志：
```bash
export DCLS_LOG_LEVEL=DEBUG
export DCLS_FEATURE_DETAILED_LOGGING=true
```

### 检查服务状态：
```python
from shared.di_container import get_service_provider
provider = get_service_provider()
print(provider.get_service_info())
```

### 验证配置：
```python
from shared.config.settings import get_config
config = get_config()
errors = config.validate()
if errors:
    print("配置错误:", errors)
```

## 🔄 **迁移策略**

### 阶段1：兼容运行（当前）✅
- 新架构已部署
- 原有代码继续工作
- 可以选择性使用新功能

### 阶段2：逐步迁移（建议）
- 新功能使用新架构
- 逐步重构现有模块
- 保持向后兼容

### 阶段3：完全迁移（未来）
- 移除Legacy bridge
- 统一使用新架构
- 清理旧代码

## 🎉 **立即享受的好处**

1. **更好的错误处理**：结构化异常信息
2. **配置管理**：环境分离，安全的密钥管理
3. **类型安全**：IDE自动补全和类型检查
4. **依赖注入**：松耦合，易于测试
5. **模块化**：清晰的职责分离
6. **可扩展性**：易于添加新功能

## 📚 **相关文档**

- `architecture_design.md` - 详细架构设计
- `shared/config/environments/` - 环境配置示例
- `domain/interfaces/` - 接口定义
- `infrastructure/agents/` - Agent实现

---

您的项目现在拥有了现代化的面向对象架构，同时保持了完全的向后兼容性！🎊