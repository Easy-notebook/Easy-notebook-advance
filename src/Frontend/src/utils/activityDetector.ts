// src/utils/activityDetector.ts
import { EVENT_TYPES, EventType, AgentType } from '../store/AIAgentStore';

/**
 * Intelligently detect activity types and Agent types corresponding to user input
 */
export interface ActivityDetectionResult {
  eventType: EventType;
  agentType: AgentType;
  agentName: string;
  taskDescription: string;
}

/**
 * Intelligently identify activity types based on user input content
 * @param command Commands or questions entered by the user
 * @returns Detection results
 */
export const detectActivityType = (command: string): ActivityDetectionResult => {
  const lowerCommand = command.toLowerCase().trim();
  
  // Image generation detection
  if (lowerCommand.includes('/image') || 
      lowerCommand.includes('draw') ||
      lowerCommand.includes('generate image') ||
      lowerCommand.includes('create image') ||
      lowerCommand.includes('make image') ||
      lowerCommand.includes('produce image')) {
    return {
      eventType: EVENT_TYPES.USER_REQUEST_IMAGE,
      agentType: 'image_generator',
      agentName: 'Image Generator',
      taskDescription: `Generating image: ${command.replace(/^\/image\s*/, '').substring(0, 50)}`
    };
  }

  // Video generation detection
  if (lowerCommand.includes('/video') ||
      lowerCommand.includes('video') ||
      lowerCommand.includes('animation') ||
      lowerCommand.includes('generate video') ||
      lowerCommand.includes('create video') ||
      lowerCommand.includes('make video')) {
    return {
      eventType: EVENT_TYPES.USER_REQUEST_VIDEO,
      agentType: 'video_generator',
      agentName: 'Video Generator',
      taskDescription: `Generating video: ${command.replace(/^\/video\s*/, '').substring(0, 50)}`
    };
  }

  // Webpage generation detection
  if (lowerCommand.includes('/webpage') ||
      lowerCommand.includes('html') ||
      lowerCommand.includes('website') ||
      lowerCommand.includes('web page') ||
      lowerCommand.includes('generate webpage') ||
      lowerCommand.includes('create website')) {
    return {
      eventType: EVENT_TYPES.USER_REQUEST_WEBPAGE,
      agentType: 'webpage_generator',
      agentName: 'Webpage Generator',
      taskDescription: `Generating webpage: ${command.replace(/^\/webpage\s*/, '').substring(0, 50)}`
    };
  }

  // Code generation detection
  if (lowerCommand.includes('/code') ||
      lowerCommand.includes('code') ||
      lowerCommand.includes('program') ||
      lowerCommand.includes('programming') ||
      lowerCommand.includes('write code') ||
      lowerCommand.includes('function') ||
      lowerCommand.includes('class') ||
      lowerCommand.includes('algorithm') ||
      lowerCommand.includes('implement') ||
      lowerCommand.includes('develop') ||
      lowerCommand.includes('create function')) {
    return {
      eventType: EVENT_TYPES.USER_REQUEST_CODE,
      agentType: 'code_generator',
      agentName: 'Code Generator',
      taskDescription: `Writing code: ${command.substring(0, 50)}`
    };
  }

  // Text creation detection (poetry, articles, etc.)
  if (lowerCommand.includes('poem') ||
      lowerCommand.includes('write a') ||
      lowerCommand.includes('create') ||
      lowerCommand.includes('article') ||
      lowerCommand.includes('story') ||
      lowerCommand.includes('novel') ||
      lowerCommand.includes('essay') ||
      lowerCommand.includes('compose') ||
      lowerCommand.includes('draft')) {
    return {
      eventType: EVENT_TYPES.USER_REQUEST_TEXT,
      agentType: 'text_creator',
      agentName: 'Text Creator',
      taskDescription: `Creating content: ${command.substring(0, 50)}`
    };
  }

  // Data analysis related detection
  if (lowerCommand.includes('data') ||
      lowerCommand.includes('analysis') ||
      lowerCommand.includes('analyze') ||
      lowerCommand.includes('dataset') ||
      lowerCommand.includes('csv') ||
      lowerCommand.includes('statistics') ||
      lowerCommand.includes('visualization') ||
      lowerCommand.includes('visualize') ||
      lowerCommand.includes('chart') ||
      lowerCommand.includes('plot')) {
    return {
      eventType: EVENT_TYPES.PCS_AGENT_ANALYZING,
      agentType: 'pcs',
      agentName: 'PCS Agent',
      taskDescription: `Analyzing data: ${command.substring(0, 50)}`
    };
  }

  // Debug related detection
  if (lowerCommand.includes('debug') ||
      lowerCommand.includes('fix') ||
      lowerCommand.includes('error') ||
      lowerCommand.includes('bug') ||
      lowerCommand.includes('troubleshoot') ||
      lowerCommand.includes('resolve') ||
      lowerCommand.includes('issue')) {
    return {
      eventType: EVENT_TYPES.AI_FIXING_BUGS,
      agentType: 'debug_assistant',
      agentName: 'Debug Assistant',
      taskDescription: `Debugging: ${command.substring(0, 50)}`
    };
  }

  // Workflow planning detection
  if (lowerCommand.includes('plan') ||
      lowerCommand.includes('planning') ||
      lowerCommand.includes('workflow') ||
      lowerCommand.includes('process') ||
      lowerCommand.includes('strategy') ||
      lowerCommand.includes('organize') ||
      lowerCommand.includes('structure')) {
    return {
      eventType: EVENT_TYPES.PCS_AGENT_PLANNING,
      agentType: 'pcs',
      agentName: 'PCS Agent',
      taskDescription: `Planning workflow: ${command.substring(0, 50)}`
    };
  }

  // Default to general Q&A but with more specific detection
  // Check for identity/greeting questions
  if (lowerCommand.includes('who are you') ||
      lowerCommand.includes('what are you') ||
      lowerCommand.includes('introduce') ||
      lowerCommand.includes('introduction') ||
      lowerCommand.includes('hello') ||
      lowerCommand.includes('hi ') ||
      lowerCommand.includes('greetings') ||
      lowerCommand.includes('about you')) {
    return {
      eventType: EVENT_TYPES.AI_REPLYING_QUESTION,
      agentType: 'general',
      agentName: 'General Assistant',
      taskDescription: `Answering general question: ${command.substring(0, 50)}`
    };
  }

  // Default for other questions
  return {
    eventType: EVENT_TYPES.USER_ASK_QUESTION,
    agentType: 'general',
    agentName: 'General Assistant',
    taskDescription: `Processing question: ${command.substring(0, 50)}`
  };
};

/**
 * Get corresponding activity information based on operation type returned by backend
 * @param operationType Backend operation type
 * @param content Operation content
 * @returns Activity information
 */
export const getActivityFromOperation = (operationType: string, content: string = ''): ActivityDetectionResult => {
  switch (operationType) {
    case 'trigger_image_generation':
      return {
        eventType: EVENT_TYPES.AI_GENERATING_IMAGE,
        agentType: 'image_generator',
        agentName: 'Image Generator',
        taskDescription: `Generating image: ${content.substring(0, 50)}`
      };
    
    case 'trigger_video_generation':
      return {
        eventType: EVENT_TYPES.AI_GENERATING_VIDEO,
        agentType: 'video_generator',
        agentName: 'Video Generator',
        taskDescription: `Generating video: ${content.substring(0, 50)}`
      };
    
    case 'trigger_webpage_generation':
      return {
        eventType: EVENT_TYPES.AI_GENERATING_WEBPAGE,
        agentType: 'webpage_generator',
        agentName: 'Webpage Generator',
        taskDescription: `Generating webpage: ${content.substring(0, 50)}`
      };
    
    case 'runCurrentCodeCell':
      return {
        eventType: EVENT_TYPES.AI_RUNNING_CODE,
        agentType: 'code_generator',
        agentName: 'Code Executor',
        taskDescription: `Executing code`
      };
      
    case 'workflow_stage_change':
      return {
        eventType: EVENT_TYPES.WORKFLOW_STAGE_CHANGE,
        agentType: 'workflow_manager',
        agentName: 'Workflow Manager',
        taskDescription: `Workflow stage changed: ${content}`
      };
      
    default:
      return {
        eventType: EVENT_TYPES.SYSTEM_EVENT,
        agentType: 'general',
        agentName: 'System Assistant',
        taskDescription: content || 'Processing operation'
      };
  }
};

/**
 * Get more detailed stage descriptions based on workflow context
 * @param chapter Chapter ID
 * @param section Section ID
 * @returns Stage description
 */
export const getWorkflowStageDescription = (chapter?: string, section?: string): string => {
  const stageMap: Record<string, string> = {
    'chapter_0_planning': 'Workflow Planning',
    'chapter_1_data_existence_establishment': 'Data Existence Establishment',
    'chapter_2_data_integrity_assurance': 'Data Integrity Assurance',
    'chapter_3_data_insight_acquisition': 'Data Insight Acquisition',
    'chapter_4_methodology_strategy_formulation': 'Methodology Strategy Formulation',
    'chapter_5_model_implementation_execution': 'Model Implementation Execution',
    'chapter_6_stability_validation': 'Stability Validation',
    'chapter_7_results_evaluation_confirmation': 'Results Evaluation Confirmation'
  };

  return stageMap[chapter || ''] || chapter || 'Unknown Stage';
};