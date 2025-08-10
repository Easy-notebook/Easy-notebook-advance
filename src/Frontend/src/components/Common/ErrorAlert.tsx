import { AlertTriangle, X, RefreshCw, Info, AlertCircle } from 'lucide-react';
import { ErrorInfo } from '../../hooks/useErrorHandler';

interface ErrorAlertProps {
  error: ErrorInfo | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  canRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
  className?: string;
  showDetails?: boolean;
}

/**
 * 错误提示组件
 * 显示用户友好的错误信息和操作按钮
 */
export function ErrorAlert({
  error,
  onRetry,
  onDismiss,
  canRetry = false,
  retryCount = 0,
  maxRetries = 3,
  className = '',
  showDetails = false
}: ErrorAlertProps) {
  if (!error) return null;

  const { severity, message, code, timestamp } = error;

  // 根据严重程度选择样式
  const severityStyles = {
    low: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    },
    medium: {
      container: 'bg-orange-50 border-orange-200 text-orange-800',
      icon: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700'
    },
    high: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700'
    }
  };

  const styles = severityStyles[severity];

  // 选择图标
  const IconComponent = severity === 'high' ? AlertTriangle : 
                      severity === 'medium' ? AlertCircle : Info;

  // 获取用户友好的错误消息
  const getUserFriendlyMessage = (error: ErrorInfo): string => {
    const lowerMessage = error.message.toLowerCase();

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return '网络连接失败，请检查网络设置后重试';
    }

    if (lowerMessage.includes('timeout')) {
      return '请求超时，请稍后重试';
    }

    if (lowerMessage.includes('unauthorized')) {
      return '身份验证失败，请重新登录';
    }

    if (lowerMessage.includes('forbidden')) {
      return '权限不足，无法执行此操作';
    }

    if (lowerMessage.includes('not found')) {
      return '请求的资源不存在';
    }

    if (lowerMessage.includes('server') || lowerMessage.includes('internal')) {
      return '服务器内部错误，请稍后重试';
    }

    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return '输入数据无效，请检查后重试';
    }

    if (typeof code === 'number') {
      if (code === 429) {
        return '请求过于频繁，请稍后重试';
      }
      if (code >= 500) {
        return '服务器错误，请稍后重试';
      }
      if (code >= 400) {
        return '请求错误，请检查输入';
      }
    }

    return message || '操作失败，请重试';
  };

  const friendlyMessage = getUserFriendlyMessage(error);

  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`}>
      <div className="flex items-start">
        <IconComponent className={`w-5 h-5 ${styles.icon} mt-0.5 mr-3 flex-shrink-0`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium mb-1">
                {severity === 'high' ? '严重错误' : 
                 severity === 'medium' ? '操作失败' : '提示'}
              </h4>
              
              <p className="text-sm leading-relaxed mb-3">
                {friendlyMessage}
              </p>

              {/* 重试计数 */}
              {retryCount > 0 && (
                <p className="text-xs opacity-75 mb-3">
                  已重试 {retryCount}/{maxRetries} 次
                </p>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                {onRetry && canRetry && (
                  <button
                    onClick={onRetry}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-md transition-colors ${styles.button}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    重试
                  </button>
                )}

                {onRetry && !canRetry && retryCount >= maxRetries && (
                  <span className="text-xs opacity-75">
                    已达到最大重试次数
                  </span>
                )}
              </div>

              {/* 详细信息 */}
              {showDetails && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer font-medium opacity-75 hover:opacity-100">
                    技术详情
                  </summary>
                  <div className="mt-2 p-2 bg-white bg-opacity-50 rounded border space-y-1">
                    <div><strong>错误消息:</strong> {message}</div>
                    {code && <div><strong>错误代码:</strong> {code}</div>}
                    <div><strong>时间:</strong> {new Date(timestamp).toLocaleString()}</div>
                    <div><strong>严重程度:</strong> {severity}</div>
                    <div><strong>可重试:</strong> {error.retryable ? '是' : '否'}</div>
                  </div>
                </details>
              )}
            </div>

            {/* 关闭按钮 */}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-3 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 简化的错误提示组件
 * 只显示基本的错误信息
 */
export function SimpleErrorAlert({
  message,
  severity = 'medium',
  onDismiss,
  className = ''
}: {
  message: string;
  severity?: 'low' | 'medium' | 'high';
  onDismiss?: () => void;
  className?: string;
}) {
  const severityStyles = {
    low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800',
    high: 'bg-red-50 border-red-200 text-red-800'
  };

  const IconComponent = severity === 'high' ? AlertTriangle : 
                      severity === 'medium' ? AlertCircle : Info;

  return (
    <div className={`border rounded-lg p-3 ${severityStyles[severity]} ${className}`}>
      <div className="flex items-center">
        <IconComponent className="w-4 h-4 mr-2 flex-shrink-0" />
        <span className="text-sm flex-1">{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorAlert;
