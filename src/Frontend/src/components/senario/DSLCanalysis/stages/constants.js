// 全局API和操作常量
const constants = 
{
    // API URL常量
    API: {
        FEEDBACK_API_URL: 'http://localhost:28600/v1/reflection',
        SEQUENCE_API_URL: 'http://localhost:28600/v1/actions',
        GENERATE_API_URL: 'http://localhost:28600/v1/generate',
        WORKFLOW_BASE_URL: 'http://localhost:28600/api/workflow'
    },
    // API: {
    //     FEEDBACK_API_URL: 'https://easy-notebook.silan.tech/api/dcls_agents/v1/reflection',
    //     SEQUENCE_API_URL: 'https://easy-notebook.silan.tech/api/dcls_agents/v1/actions',
    //     GENERATE_API_URL: 'https://easy-notebook.silan.tech/api/dcls_agents/v1/generate',
    //     WORKFLOW_BASE_URL: 'https://easy-notebook.silan.tech/api/dcls_agents/api/workflow/'
    // },

    // 延迟时间常量
    DELAY: {
        OPERATION_BUFFER_DELAY: 10,
        API_REQUEST_DELAY: 10,
        FEEDBACK_CLEAR_DELAY: 10
    },

    // UI相关常量
    UI: {
        DEFAULT_COUNTDOWN: 5
    }
};

export default constants;