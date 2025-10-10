import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Divider, Typography } from 'antd';
import { Code, Save, RotateCcw } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import { basicSetup } from '@uiw/codemirror-extensions-basic-setup';
import { autocompletion } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { BrainCellMeta } from '../utils/types';

const { Text } = Typography;

interface CodeEditorProps {
  brainCell: BrainCellMeta;
  onUpdate: (code: string, language: string) => void;
}

// BrainCell 代码模板 - 智能单元架构（基于 PCS 设计模式）
const codeTemplates = {
  Sensor: {
    javascript: `// Sensor BrainCell - 数据感知智能单元
class SensorBrainCell extends BrainCell {
  constructor(...args) {
    super(...args);
    this.name = "DataSensor";
    this.role = \`
      You are a data ingestion specialist responsible for collecting and preprocessing data.
    \`;

    this.responsibility = \`
      - Monitor and collect data from various sources
      - Perform initial data validation and quality checks
      - Transform raw data into structured formats
      - Signal data availability to downstream processors
    \`;

    this.policy = \`
      - Always validate data integrity before forwarding
      - Maintain data lineage and provenance information
      - Handle errors gracefully with appropriate fallback strategies
      - Respect rate limits and source system constraints
    \`;

    // Study abilities (skills)
    this.study({
      skill: 'DataIngestion',
      description: 'Collect data from external sources',
      post_parameters: {
        source_type: 'String',
        data_format: 'String',
        batch_size: 'Number'
      }
    });

    this.study({
      skill: 'DataValidation',
      description: 'Validate data quality and completeness',
      post_parameters: {
        validation_rules: 'Array',
        quality_threshold: 'Number'
      }
    });

    this.study({
      skill: 'Communication',
      description: 'Communicate with other brain cells',
      pre_parameters: {
        target_agent: 'String'
      },
      post_parameters: {
        message: 'String',
        data_payload: 'Object'
      }
    });

    this.study({
      skill: 'StatusUpdate',
      description: 'Update processing status',
      post_parameters: {
        status: 'String',
        progress: 'Number',
        metadata: 'Object'
      }
    });
  }

  // 主要行为逻辑
  async process(inputs) {
    const {
      signalFlow,      // 原始信号流
      memoryContext,   // 记忆上下文
      instructions,    // 指令/目标
      envFeedback      // 环境反馈
    } = inputs;

    // 1. 从记忆中恢复状态
    const previousState = await this.memory.recall('sensor_state');

    // 2. 处理多模态输入
    const rawData = await this.ingestData(signalFlow);
    const contextualData = this.applyMemoryContext(rawData, memoryContext);
    const filteredData = this.applyInstructions(contextualData, instructions);

    // 3. 执行感知处理
    const processedSignals = await this.detectPatterns(filteredData);
    const qualityScore = this.assessDataQuality(processedSignals);

    // 4. 更新记忆状态
    await this.memory.store('sensor_state', {
      lastProcessed: Date.now(),
      qualityHistory: [...(previousState?.qualityHistory || []), qualityScore],
      patternCache: processedSignals.patterns
    });

    // 5. 生成多层次输出
    return {
      // 计算结果
      computedResults: {
        signals: processedSignals.data,
        confidence: qualityScore,
        metadata: { processed_at: Date.now() }
      },

      // 状态更新
      stateUpdates: {
        memory: { sensor_state: 'updated' },
        forest: { node_status: 'active' }
      },

      // 行为信号
      behaviorSignals: {
        triggerNext: qualityScore > 0.8,
        alertLevel: qualityScore < 0.3 ? 'high' : 'normal'
      },

      // 副产物
      byproducts: {
        logs: [\`Processed \${processedSignals.data.length} signals\`],
        reasoning: 'Applied pattern detection and quality assessment',
        traceability: { input_hash: this.hashInput(rawData) }
      }
    };
  }

  // 能力实现
  async ingestData(signalFlow) {
    // 数据摄取能力
    return await this.connectors.input.receive(signalFlow);
  }

  detectPatterns(data) {
    // 模式检测能力
    return {
      data: data,
      patterns: data.filter(d => d.anomaly_score > 0.5)
    };
  }

  assessDataQuality(signals) {
    // 质量评估能力
    return signals.data.length > 0 ? 0.9 : 0.1;
  }

  applyMemoryContext(data, context) {
    // 应用记忆上下文
    return context ? data.map(d => ({...d, context})) : data;
  }

  applyInstructions(data, instructions) {
    // 应用指令约束
    if (instructions?.filter) {
      return data.filter(d => d.type === instructions.filter);
    }
    return data;
  }

  hashInput(data) {
    return btoa(JSON.stringify(data)).slice(0, 8);
  }
}

// 使用示例
export default SensorBrainCell;`,
    python: `# Sensor BrainCell - 感知智能单元
import asyncio
import hashlib
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

class SensorBrainCell:
    def __init__(self, config: Dict, memory, connectors):
        self.config = config
        self.memory = memory           # 记忆核
        self.connectors = connectors   # 连接器
        self.capabilities = [          # 能力集
            'data_ingestion',
            'pattern_detection',
            'signal_processing'
        ]
        self.meta = {
            'id': config['id'],
            'version': '1.0.0',
            'type': 'Sensor',
            'created': datetime.now().isoformat()
        }

    async def process(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """主要行为逻辑"""
        signal_flow = inputs.get('signalFlow')        # 原始信号流
        memory_context = inputs.get('memoryContext')  # 记忆上下文
        instructions = inputs.get('instructions')     # 指令/目标
        env_feedback = inputs.get('envFeedback')      # 环境反馈

        # 1. 从记忆中恢复状态
        previous_state = await self.memory.recall('sensor_state')

        # 2. 处理多模态输入
        raw_data = await self.ingest_data(signal_flow)
        contextual_data = self.apply_memory_context(raw_data, memory_context)
        filtered_data = self.apply_instructions(contextual_data, instructions)

        # 3. 执行感知处理
        processed_signals = await self.detect_patterns(filtered_data)
        quality_score = self.assess_data_quality(processed_signals)

        # 4. 更新记忆状态
        quality_history = previous_state.get('qualityHistory', []) if previous_state else []
        await self.memory.store('sensor_state', {
            'lastProcessed': datetime.now().isoformat(),
            'qualityHistory': quality_history + [quality_score],
            'patternCache': processed_signals['patterns']
        })

        # 5. 生成多层次输出
        return {
            # 计算结果
            'computedResults': {
                'signals': processed_signals['data'],
                'confidence': quality_score,
                'metadata': {'processed_at': datetime.now().isoformat()}
            },

            # 状态更新
            'stateUpdates': {
                'memory': {'sensor_state': 'updated'},
                'forest': {'node_status': 'active'}
            },

            # 行为信号
            'behaviorSignals': {
                'triggerNext': quality_score > 0.8,
                'alertLevel': 'high' if quality_score < 0.3 else 'normal'
            },

            # 副产物
            'byproducts': {
                'logs': [f"Processed {len(processed_signals['data'])} signals"],
                'reasoning': 'Applied pattern detection and quality assessment',
                'traceability': {'input_hash': self.hash_input(raw_data)}
            }
        }

    # 能力实现
    async def ingest_data(self, signal_flow):
        """数据摄取能力"""
        return await self.connectors.input.receive(signal_flow)

    async def detect_patterns(self, data):
        """模式检测能力"""
        return {
            'data': data,
            'patterns': [d for d in data if d.get('anomaly_score', 0) > 0.5]
        }

    def assess_data_quality(self, signals):
        """质量评估能力"""
        return 0.9 if len(signals['data']) > 0 else 0.1

    def apply_memory_context(self, data, context):
        """应用记忆上下文"""
        if context:
            return [{**d, 'context': context} for d in data]
        return data

    def apply_instructions(self, data, instructions):
        """应用指令约束"""
        if instructions and instructions.get('filter'):
            return [d for d in data if d.get('type') == instructions['filter']]
        return data

    def hash_input(self, data):
        """输入哈希"""
        return hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()[:8]`,
  },
  Processor: {
    javascript: `// Processor BrainCell - AI推理处理单元（类似PCS模式）
class ProcessorBrainCell extends BrainCell {
  constructor(...args) {
    super(...args);
    this.name = "AIProcessor";
    this.role = \`
      You are an AI reasoning specialist responsible for intelligent data processing and decision making.
    \`;

    this.responsibility = \`
      - Process complex data using AI models and algorithms
      - Make intelligent decisions based on input data and context
      - Generate structured outputs and recommendations
      - Coordinate with knowledge bases and external AI services
    \`;

    this.policy = \`
      - Always validate input data before processing
      - Use appropriate AI models based on task complexity
      - Maintain processing logs for audit and debugging
      - Ensure output quality meets specified thresholds
    \`;

    // Communication targets (other brain cells)
    this.communication_targets = {
      'data_cleaning': 'Brain cell for data preprocessing',
      'knowledge_base': 'Brain cell for knowledge retrieval',
      'model_evaluation': 'Brain cell for model performance assessment',
      'report_generator': 'Brain cell for report generation'
    };

    // Study AI processing abilities
    this.study({
      skill: 'AIReasoning',
      description: 'Perform AI-based reasoning and inference',
      post_parameters: {
        model_type: 'String',
        prompt_template: 'String',
        temperature: 'Number',
        max_tokens: 'Number'
      }
    });

    this.study({
      skill: 'KnowledgeRetrieval',
      description: 'Retrieve relevant knowledge from databases',
      post_parameters: {
        query: 'String',
        knowledge_source: 'String',
        similarity_threshold: 'Number'
      }
    });

    this.study({
      skill: 'Communication',
      description: 'Communicate with other brain cells',
      pre_parameters: {
        target_agent: 'String'
      },
      post_parameters: {
        message: 'String',
        task_request: 'Object'
      }
    });

    this.study({
      skill: 'UpdateWorkflow',
      description: 'Update processing workflow',
      post_parameters: {
        workflow_steps: 'Array',
        dependencies: 'Array'
      }
    });
  }

  async process(inputs) {
    const {
      signalFlow,      // 输入数据流
      memoryContext,   // 记忆上下文
      instructions,    // 处理指令
      envFeedback      // 环境反馈
    } = inputs;

    // 1. 恢复工作记忆和推理状态
    const workingMemory = await this.memory.recall('working_state');
    const reasoningHistory = await this.memory.recall('reasoning_chain');

    // 2. 多模态输入融合
    const fusedInput = await this.fuseInputs(signalFlow, memoryContext, envFeedback);
    const contextEnrichedInput = await this.enrichWithKnowledge(fusedInput);

    // 3. 执行推理处理
    const reasoningResult = await this.executeReasoning(
      contextEnrichedInput,
      instructions,
      reasoningHistory
    );

    // 4. 生成和验证输出
    const generatedOutput = await this.generateOutput(reasoningResult);
    const validatedOutput = await this.validateOutput(generatedOutput, instructions);

    // 5. 更新记忆状态
    await this.memory.store('working_state', {
      lastInput: fusedInput,
      lastOutput: validatedOutput,
      confidence: reasoningResult.confidence,
      timestamp: Date.now()
    });

    await this.memory.store('reasoning_chain', [
      ...(reasoningHistory || []).slice(-10), // 保留最近10步
      {
        step: reasoningResult.step,
        reasoning: reasoningResult.explanation,
        confidence: reasoningResult.confidence
      }
    ]);

    // 6. 生成多层次输出
    return {
      // 计算结果
      computedResults: {
        content: validatedOutput.content,
        reasoning: reasoningResult.explanation,
        confidence: reasoningResult.confidence,
        metadata: {
          tokens_used: reasoningResult.tokensUsed,
          processing_time: reasoningResult.processingTime
        }
      },

      // 状态更新
      stateUpdates: {
        memory: { working_state: 'updated', reasoning_chain: 'extended' },
        forest: {
          node_status: 'processed',
          knowledge_updated: validatedOutput.newKnowledge ? true : false
        }
      },

      // 行为信号
      behaviorSignals: {
        triggerNext: reasoningResult.confidence > 0.7,
        requiresHumanReview: reasoningResult.confidence < 0.5,
        propagateToParent: validatedOutput.escalate || false
      },

      // 副产物
      byproducts: {
        logs: [
          \`Processed input with \${reasoningResult.confidence} confidence\`,
          \`Generated \${generatedOutput.content?.length || 0} characters\`
        ],
        reasoning: reasoningResult.explanation,
        traceability: {
          input_hash: this.hashInput(fusedInput),
          reasoning_path: reasoningResult.reasoningPath,
          knowledge_sources: contextEnrichedInput.sources || []
        }
      }
    };
  }

  // 能力实现
  async fuseInputs(signalFlow, memoryContext, envFeedback) {
    // 多模态输入融合
    return {
      primary: signalFlow,
      context: memoryContext,
      feedback: envFeedback,
      timestamp: Date.now()
    };
  }

  async enrichWithKnowledge(input) {
    // 知识增强
    const relevantKnowledge = await this.connectors.knowledge.retrieve(input.primary);
    return {
      ...input,
      enrichedContext: relevantKnowledge,
      sources: relevantKnowledge.map(k => k.source)
    };
  }

  async executeReasoning(input, instructions, history) {
    // 执行AI推理
    const prompt = this.buildReasoningPrompt(input, instructions, history);
    const startTime = Date.now();

    const result = await this.connectors.ai.invoke({
      model: this.config.model || 'gpt-4',
      prompt: prompt,
      temperature: this.config.temperature || 0.7,
      maxTokens: this.config.maxTokens || 4096
    });

    return {
      content: result.content,
      explanation: result.reasoning || 'AI processing completed',
      confidence: this.calculateConfidence(result),
      tokensUsed: result.usage?.totalTokens || 0,
      processingTime: Date.now() - startTime,
      reasoningPath: result.steps || [],
      step: (history?.length || 0) + 1
    };
  }

  async generateOutput(reasoningResult) {
    // 输出生成和格式化
    return {
      content: reasoningResult.content,
      format: this.config.outputFormat || 'text',
      confidence: reasoningResult.confidence,
      metadata: {
        generated_at: Date.now(),
        reasoning_step: reasoningResult.step
      }
    };
  }

  async validateOutput(output, instructions) {
    // 输出验证
    const validationRules = instructions?.validation || {};
    let isValid = true;
    const issues = [];

    if (validationRules.minLength && output.content.length < validationRules.minLength) {
      isValid = false;
      issues.push('Content too short');
    }

    return {
      ...output,
      validated: isValid,
      issues: issues,
      escalate: !isValid && validationRules.escalateOnFail
    };
  }

  buildReasoningPrompt(input, instructions, history) {
    const historyContext = history ? history.slice(-3).map(h => h.reasoning).join('\\n') : '';
    return \`
Context: \${JSON.stringify(input.enrichedContext)}
Instructions: \${JSON.stringify(instructions)}
Recent reasoning: \${historyContext}
Input to process: \${JSON.stringify(input.primary)}
\`;
  }

  calculateConfidence(result) {
    // 简单的置信度计算
    if (result.confidence) return result.confidence;
    return result.content && result.content.length > 10 ? 0.8 : 0.3;
  }

  hashInput(input) {
    return btoa(JSON.stringify(input)).slice(0, 8);
  }
}

export default ProcessorBrainCell;`,
    python: `# Processor - AI处理单元
import json
from typing import Dict, Any, Optional
import asyncio

async def processor_logic(context: Dict[str, Any]) -> Dict[str, Any]:
    """AI处理器主逻辑"""
    input_data = context.get('input', {})
    config = context['config']
    ai = context['ai']
    utils = context['utils']

    try:
        # 获取输入数据
        data = input_data.get('data')
        control_signal = input_data.get('run')

        if not control_signal or not data:
            return {'done': {'status': 'skipped'}}

        # 构建提示词
        prompt = build_prompt(data, config['prompt'])

        # AI模型调用
        result = await ai.invoke({
            'model': config['tool'],
            'prompt': prompt,
            'temperature': config.get('temperature', 0.7),
            'max_tokens': config.get('max_tokens', 4096)
        })

        # 后处理
        processed_result = post_process(result, config)

        return {
            'data': processed_result,
            'done': {
                'status': 'completed',
                'processed_at': utils.now(),
                'tokens_used': result.get('usage', {}).get('total_tokens', 0)
            }
        }

    except Exception as e:
        return {
            'done': {
                'status': 'error',
                'error': str(e),
                'timestamp': utils.now()
            }
        }

def build_prompt(data: Any, template: str) -> str:
    """构建AI提示词"""
    return template.replace('{{data}}', json.dumps(data, ensure_ascii=False))

def post_process(result: Dict, config: Dict) -> Any:
    """结果后处理"""
    if config.get('output_format') == 'json':
        try:
            return json.loads(result['content'])
        except:
            return {'content': result['content']}
    return result['content']`,
  },
  Memory: {
    javascript: `// Memory - 知识存储单元
async function memoryLogic(context) {
  const { input, config, storage, embeddings } = context;

  const writeData = input.write;
  const readQuery = input.read;

  if (writeData) {
    // 写入操作
    return await writeToMemory(writeData, config, storage, embeddings);
  } else if (readQuery) {
    // 读取操作
    return await readFromMemory(readQuery, config, storage, embeddings);
  }

  return { out: null };
}

async function writeToMemory(data, config, storage, embeddings) {
  try {
    // 生成嵌入向量
    const vector = await embeddings.embed(JSON.stringify(data));

    // 存储数据
    const record = {
      id: generateId(),
      data: data,
      vector: vector,
      namespace: config.namespace,
      timestamp: Date.now(),
      metadata: {
        type: typeof data,
        size: JSON.stringify(data).length
      }
    };

    await storage.insert(record);

    return {
      out: {
        status: 'written',
        id: record.id,
        namespace: config.namespace
      }
    };
  } catch (error) {
    return {
      out: {
        status: 'error',
        error: error.message
      }
    };
  }
}

async function readFromMemory(query, config, storage, embeddings) {
  try {
    // 查询向量
    const queryVector = await embeddings.embed(JSON.stringify(query));

    // 向量搜索
    const results = await storage.search({
      vector: queryVector,
      namespace: config.namespace,
      limit: config.searchLimit || 10,
      threshold: config.similarity || 0.8
    });

    return {
      out: {
        status: 'found',
        results: results.map(r => ({
          data: r.data,
          similarity: r.score,
          id: r.id
        })),
        count: results.length
      }
    };
  } catch (error) {
    return {
      out: {
        status: 'error',
        error: error.message
      }
    };
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}`,
  },
  Actuator: {
    javascript: `// Actuator - 动作执行单元
async function actuatorLogic(context) {
  const { input, config, external } = context;

  const inputData = input.data;
  const controlSignal = input.do;

  if (!controlSignal || !inputData) {
    return { status: 'skipped' };
  }

  try {
    // 根据目标类型执行动作
    const result = await executeAction(inputData, config, external);

    return {
      status: 'completed',
      result: result,
      executedAt: Date.now()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: Date.now()
    };
  }
}

async function executeAction(data, config, external) {
  const target = config.target;

  switch (target) {
    case 'webhook':
      return await external.http.post(config.webhookUrl, data);

    case 'file':
      return await external.fs.writeFile(config.filePath, JSON.stringify(data));

    case 'email':
      return await external.email.send({
        to: config.emailTo,
        subject: config.emailSubject,
        body: formatEmailBody(data, config.emailTemplate)
      });

    case 'slack':
      return await external.slack.sendMessage({
        channel: config.slackChannel,
        message: formatSlackMessage(data, config.slackTemplate)
      });

    default:
      throw new Error(\`Unsupported target: \${target}\`);
  }
}

function formatEmailBody(data, template) {
  return template.replace(/\\{\\{data\\}\\}/g, JSON.stringify(data, null, 2));
}

function formatSlackMessage(data, template) {
  return template.replace(/\\{\\{data\\}\\}/g, JSON.stringify(data));
}`,
  },
  Router: {
    javascript: `// PCS BrainCell - 规划协调调度单元（完整PCS模式实现）
class PCSBrainCell extends BrainCell {
  constructor(...args) {
    super(...args);
    this.name = "PCS";
    this.role = \`
      You are a BrainCell planner, coordinator, and scheduler responsible for planning workflows.
    \`;

    this.responsibility = \`
      - Update the title to describe the entire task
      - Add text to describe tasks divided into several stages
      - Communicate with other brain cells and tell them what to do
      - Update the workflow to describe the order of tasks
    \`;

    this.policy = \`
      - Ensure workflow is reasonable and task order is correct
      - Every stage must be necessary - do not overthink
      - Use correct agent names in communication tags
      - Follow proper output format for all actions
    \`;

    // Communication targets (available brain cells)
    this.communication_targets = {
      'eda': 'Brain cell for exploratory data analysis',
      'data_cleaning': 'Brain cell for data cleaning',
      'model_training': 'Brain cell for model training',
      'model_evaluation': 'Brain cell for model evaluation',
      'report': 'Brain cell for report generation'
    };

    // Workflow stages
    this.workflow_stages = {
      'data_processing': 'Stage for data processing operations',
      'analysis': 'Stage for data analysis',
      'modeling': 'Stage for model development',
      'evaluation': 'Stage for model evaluation',
      'reporting': 'Stage for report generation'
    };

    // Study core abilities
    this.study({
      skill: 'UpdateTitle',
      description: 'Update the title of the notebook',
      post_parameters: {
        title: 'String'
      }
    });

    this.study({
      skill: 'AddText',
      description: 'Add text to the notebook',
      post_parameters: {
        text: 'String'
      }
    });

    this.study({
      skill: 'Communication',
      description: 'Communicate with other brain cells',
      pre_parameters: {
        target_agent: 'String'
      },
      post_parameters: {
        message: 'String'
      }
    });

    this.study({
      skill: 'UpdateWorkflow',
      description: 'Update the workflow of the notebook',
      post_parameters: {
        workflow: 'Array'
      }
    });

    this.study({
      skill: 'NewChapter',
      description: 'Create a new chapter in the document',
      post_parameters: {
        title: 'String'
      }
    });
  }

  // Main processing logic following PCS output format
  async process(inputs) {
    const task_description = inputs.signalFlow?.task || inputs.instructions?.description;

    // Analyze task and generate plan
    const plan = await this.analyzeTasks(task_description);

    // Execute planning actions using proper format
    const outputs = [];

    // 1. Update title
    outputs.push(\`<update-title>\${plan.title}</update-title>\`);

    // 2. Add descriptive text
    outputs.push(\`<add-text>\${plan.description}</add-text>\`);

    // 3. Communicate with relevant brain cells
    for (const communication of plan.communications) {
      outputs.push(\`<communication to="\${communication.target}">\${communication.message}</communication>\`);
    }

    // 4. Update workflow
    outputs.push(\`<update-workflow>\${JSON.stringify(plan.workflow)}</update-workflow>\`);

    return {
      computedResults: {
        planning_output: outputs.join('\\n'),
        structured_plan: plan,
        confidence: 0.9
      },
      stateUpdates: {
        memory: { workflow_plan: 'updated' },
        forest: { planning_status: 'completed' }
      },
      behaviorSignals: {
        triggerNext: true,
        initiateWorkflow: true
      },
      byproducts: {
        logs: [\`Generated plan for: \${task_description}\`],
        reasoning: 'Applied PCS planning methodology',
        traceability: { plan_id: this.generatePlanId() }
      }
    };
  }

  async analyzeTasks(description) {
    // Intelligent task analysis and planning
    return {
      title: "Data Science Workflow Plan",
      description: "Comprehensive data analysis pipeline with multiple stages",
      communications: [
        { target: "eda", message: "Perform exploratory data analysis on the dataset" },
        { target: "data_cleaning", message: "Clean and preprocess the data based on EDA findings" },
        { target: "model_training", message: "Train predictive models using cleaned data" }
      ],
      workflow: ["data_processing", "analysis", "modeling", "evaluation", "reporting"]
    };
  }

  generatePlanId() {
    return 'plan_' + Date.now().toString(36);
  }
}

export default PCSBrainCell;`,
  },
  Memory: {
    javascript: `// Router - 条件路由单元
async function routerLogic(context) {
  const { input, config, utils } = context;

  const inputData = input.data;
  const controlSignal = input.go;

  if (!controlSignal) {
    return {
      data: inputData,
      true: { routed: false },
      false: { routed: false }
    };
  }

  try {
    // 执行条件表达式
    const condition = evaluateCondition(inputData, config.expr, utils);

    if (condition) {
      return {
        data: inputData,
        true: {
          routed: true,
          condition: config.expr,
          result: true,
          timestamp: Date.now()
        },
        false: { routed: false }
      };
    } else {
      return {
        data: inputData,
        true: { routed: false },
        false: {
          routed: true,
          condition: config.expr,
          result: false,
          timestamp: Date.now()
        }
      };
    }
  } catch (error) {
    return {
      data: inputData,
      true: { routed: false },
      false: {
        routed: true,
        error: error.message,
        timestamp: Date.now()
      }
    };
  }
}

function evaluateCondition(data, expression, utils) {
  // 安全的表达式求值
  const safeEval = new Function('data', 'utils', \`
    "use strict";
    try {
      return \${expression};
    } catch (e) {
      throw new Error('Expression evaluation failed: ' + e.message);
    }
  \`);

  return safeEval(data, utils);
}`,
  }
};

export function CodeEditor({ brainCell, onUpdate }: CodeEditorProps) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const template = codeTemplates[brainCell.kind]?.[language] || '// 代码模板加载中...';
    setCode(template);
    setHasChanges(false);
  }, [brainCell.kind, language]);

  const handleCodeChange = (value: string) => {
    setCode(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(code, language);
    setHasChanges(false);
  };


  const handleReset = () => {
    const template = codeTemplates[brainCell.kind]?.[language] || '';
    setCode(template);
    setHasChanges(false);
  };

  const getLanguageExtensions = () => {
    const langExtension = language === 'javascript' ? javascript() : python();
    return [
      basicSetup({
        lineNumbers: true,
        foldGutter: true,
        dropCursor: false,
        allowMultipleSelections: false,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        highlightSelectionMatches: false,
        searchKeymap: true
      }),
      langExtension,
      autocompletion({
        activateOnTyping: true,
        maxRenderedOptions: 10
      }),
      bracketMatching()
    ];
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2 px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Code className="h-3 w-3 text-gray-500" />
            <span className="text-xs text-gray-600">{brainCell.kind}</span>
          </div>
          <Select
            value={language}
            onChange={setLanguage}
            size="small"
            variant="borderless"
            className="w-24"
          >
            <Select.Option value="javascript">JS</Select.Option>
            <Select.Option value="python">PY</Select.Option>
          </Select>
        </div>

        <Space size="small">
          <Button
            size="small"
            icon={<RotateCcw className="h-3 w-3" />}
            onClick={handleReset}
            disabled={!hasChanges}
            type="text"
          />
          <Button
            size="small"
            icon={<Save className="h-3 w-3" />}
            onClick={handleSave}
            type="primary"
            disabled={!hasChanges}
          />
        </Space>
      </div>

      <div className="flex-1 bg-white border border-gray-200 overflow-hidden">
        <CodeMirror
          value={code}
          onChange={handleCodeChange}
          extensions={[
            ...getLanguageExtensions(),
            EditorView.theme({
              '&': {
                fontSize: '14px',
                height: '100%',
                fontFamily: 'Monaco, Menlo, "JetBrains Mono", "Ubuntu Mono", monospace'
              },
              '.cm-content': {
                padding: '12px',
                minHeight: '100%'
              },
              '.cm-focused': {
                outline: 'none'
              },
              '.cm-editor': {
                height: '100%'
              },
              '.cm-scroller': {
                height: '100%'
              },
              '.cm-line': {
                padding: '0',
                lineHeight: '1.5'
              },
              '.cm-gutters': {
                backgroundColor: '#fafbfc',
                border: 'none'
              },
              '.cm-lineNumbers': {
                color: '#94a3b8',
                fontSize: '12px'
              },
              '.cm-activeLineGutter': {
                backgroundColor: '#e2e8f0'
              },
              '.cm-activeLine': {
                backgroundColor: '#f8fafc'
              },
              '.cm-selectionBackground, ::selection': {
                backgroundColor: '#dbeafe !important'
              }
            })
          ]}
          placeholder={`编写${language === 'javascript' ? 'JavaScript' : 'Python'}代码...`}
          height="100%"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}