import { useState, useEffect, useRef } from 'react';

const AgentThinkingIndicator = ({
    agentName = "AI",
    customText = null,
    textArray = []
}) => {
    const [seconds, setSeconds] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [opacity, setOpacity] = useState(1);
    const [textIndex, setTextIndex] = useState(0);
    const animationRef = useRef(null);

    // 处理时间计数
    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // 使用requestAnimationFrame处理旋转动画，实现更平滑的顺时针旋转
    useEffect(() => {
        const animate = () => {
            setRotation(prev => (prev + 1) % 360);
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // 处理脉动效果
    useEffect(() => {
        const pulseTimer = setInterval(() => {
            setOpacity(prev => prev === 1 ? 0.8 : 1);
        }, 800);

        return () => clearInterval(pulseTimer);
    }, []);

    // 处理文本切换
    useEffect(() => {
        if (textArray && textArray.length > 1) {
            const textSwitchTimer = setInterval(() => {
                setTextIndex(prev => (prev + 1) % textArray.length);
            }, 3000); // 每3秒切换一次文本

            return () => clearInterval(textSwitchTimer);
        }
    }, [textArray]);

    // 确定显示的文本
    const displayText = () => {
        if (customText) {
            return customText;
        } else if (textArray && textArray.length > 0) {
            return textArray[textIndex];
        } else {
            return `${agentName} agent is thinking`;
        }
    };

    // 控制背景流动效果
    const [gradientPosition, setGradientPosition] = useState(0);
    const animationFrameRef = useRef(null);
    const lastTimeRef = useRef(0);
    const speedRef = useRef(0.05); // 每毫秒移动的像素

    // 使用requestAnimationFrame实现更平滑的背景流动效果
    useEffect(() => {
        const animate = (timestamp) => {
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            const deltaTime = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;

            // 更平滑地更新位置
            setGradientPosition(prev => {
                const newPosition = prev - speedRef.current * deltaTime;
                // 确保值在0-200之间循环
                return ((newPosition % 200) + 200) % 200;
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <div className="w-full relative overflow-hidden rounded-full">
            {/* 流动渐变效果的整行背景 - 从右向左流动，无过渡以避免卡顿 */}
            <div
                className="absolute inset-0 w-full h-full"
                style={{
                    background: `linear-gradient(90deg, 
                    rgba(255,255,255,0) 0%, 
                    rgba(201,63,107,0.08) 20%, 
                    rgba(201,63,107,0.12) 50%, 
                    rgba(201,63,107,0.08) 80%, 
                    rgba(255,255,255,0) 100%)`,
                    backgroundSize: '200% 100%',
                    backgroundPosition: `${gradientPosition}% 0%`
                }}
            />

            {/* 指示器容器 */}
            <div className="w-full flex items-center justify-start py-1 relative z-10">
                <div className="inline-flex items-center px-3 py-1 rounded-full"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.6)',
                        border: '1px solid #c93f6b',
                        opacity: opacity,
                        transition: 'opacity 0.3s ease'
                    }}>
                    {/* 旋转的加载指示器 */}
                    <div className="mr-2 flex-shrink-0">
                        <div className="w-4 h-4 relative">
                            <div
                                className="absolute inset-0 border-2 rounded-full border-transparent"
                                style={{
                                    borderLeftColor: '#c93f6b',
                                    borderTopColor: '#c93f6b',
                                    transform: `rotate(${rotation}deg)`
                                }}
                            />
                        </div>
                    </div>

                    {/* 文本部分 */}
                    <div className="flex items-center">
                        <span
                            className="text-xs font-medium"
                            style={{ color: '#c93f6b' }}
                        >
                            {displayText()}
                            <span className="inline-block ml-1">
                                {'.'.repeat(1 + (seconds % 3))}
                            </span>
                        </span>

                        {/* 显示思考时间 */}
                        <span
                            className="text-xs ml-2 font-medium"
                            style={{ color: '#c93f6b' }}
                        >
                            {seconds}s
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentThinkingIndicator;