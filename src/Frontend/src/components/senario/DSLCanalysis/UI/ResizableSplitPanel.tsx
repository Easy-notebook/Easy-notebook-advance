import React, { useState, useEffect, useRef } from 'react';

const Divider = ({
    setIsResizing,
    orientation = 'vertical', 
    dragEnabled = true,
    className = '',
    style = {},
    accentColor = '#e11d48', 
}) => {
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseDown = (e) => {
        if (!dragEnabled) return;
        e.preventDefault();
        setIsResizing(true);
    };

    const handleMouseEnter = () => {
        setIsHovering(true);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
    };

    const cursorStyle = orientation === 'vertical' ? 'cursor-col-resize' : 'cursor-row-resize';
    const dividerClasses = `group w-2 relative ${orientation === 'vertical' ? 'h-full' : 'w-full h-2'} ${dragEnabled ? cursorStyle : ''} -mr-1 z-30 grid place-items-center ${className}`;
    const lineColor = isHovering ? accentColor : '#d1d5db'; 
    const handleBorderColor = isHovering ? accentColor : '#d1d5db'; 
    const handleBgColor = isHovering ? accentColor : '#f9fafb'; 

    return (
        <div
            className={dividerClasses}
            onMouseDown={dragEnabled ? handleMouseDown : undefined}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={style}
        >
            <div
                className={`absolute ${orientation === 'vertical' ? 'top-0 bottom-0 right-1' : 'left-0 right-0 bottom-1'}`}
                style={{
                    width: orientation === 'vertical' ? (isHovering ? '1.5px' : '0.5px') : 'auto',
                    height: orientation === 'horizontal' ? (isHovering ? '1.5px' : '0.5px') : 'auto',
                    backgroundColor: lineColor,
                    transform: orientation === 'vertical'
                        ? (isHovering ? 'translateX(0.5px)' : 'none')
                        : (isHovering ? 'translateY(0.5px)' : 'none'),
                    transition: 'all 0.2s ease'
                }}
            />
            <div
                className={`${orientation === 'vertical' ? 'h-6 w-2' : 'w-6 h-2'} relative rounded-full border ${dragEnabled ? cursorStyle : ''}`}
                style={{
                    borderColor: handleBorderColor,
                    backgroundColor: handleBgColor,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease'
                }}
            />
        </div>
    );
};

const ResizablePanel = ({
    children,
    defaultSize = 250, // 默认宽度/高度
    minSize = 100, // 最小宽度/高度
    maxSize, // 最大宽度/高度
    resizePanel = 'left', // 'left', 'right', 'top', 'bottom'
    orientation = 'vertical', // 'vertical' 或 'horizontal'
    dragEnabled = true, // 是否允许拖拽
    showDivider = true, // 是否显示分割线
    accentColor = '#e11d48', // 高亮颜色，默认为rose-600
    className = '',
    style = {},
    onResize = null, // 拖拽时的回调函数
    onResizeComplete = null, // 拖拽完成的回调函数
}) => {
    const containerRef = useRef(null);
    const [size, setSize] = useState(defaultSize);
    const [isResizing, setIsResizing] = useState(false);
    const [containerDimension, setContainerDimension] = useState({ width: 0, height: 0 });

    // 控制哪一侧面板可调整大小
    const isFirstPanelResizable = ['left', 'top'].includes(resizePanel);

    // 初始化容器尺寸和监听尺寸变化
    useEffect(() => {
        if (!containerRef.current) return;

        const updateContainerDimension = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setContainerDimension({ width, height });
            }
        };

        // 初始化容器尺寸
        updateContainerDimension();

        // 监听窗口大小变化
        window.addEventListener('resize', updateContainerDimension);

        return () => {
            window.removeEventListener('resize', updateContainerDimension);
        };
    }, []);

    // 根据容器尺寸设置最大尺寸
    const effectiveMaxSize = React.useMemo(() => {
        if (maxSize !== undefined) return maxSize;
        return orientation === 'vertical' ? containerDimension.width - 4 : containerDimension.height - 4;
    }, [maxSize, orientation, containerDimension]);

    const isMaxSize = size >= effectiveMaxSize;

    // 处理拖动开始
    useEffect(() => {
        if (!isResizing || !dragEnabled) return;

        const handleMouseMove = (e) => {
            if (!containerRef.current) return;

            // 获取容器的位置
            const containerRect = containerRef.current.getBoundingClientRect();

            let newSize;
            let mousePosition;

            if (orientation === 'vertical') {
                // 垂直分割线，调整宽度
                mousePosition = e.clientX;
                if (isFirstPanelResizable) {
                    // 调整左侧面板
                    newSize = mousePosition - containerRect.left;
                } else {
                    // 调整右侧面板
                    newSize = containerRect.right - mousePosition;
                }
            } else {
                // 水平分割线，调整高度
                mousePosition = e.clientY;
                if (isFirstPanelResizable) {
                    newSize = mousePosition - containerRect.top;
                } else {
                    newSize = containerRect.bottom - mousePosition;
                }
            }

            // 限制在最小和最大尺寸之间
            const boundedSize = Math.max(minSize, Math.min(effectiveMaxSize, newSize));

            setSize(boundedSize);

            if (onResize) {
                onResize(boundedSize);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            // 调用拖拽完成回调函数
            if (onResizeComplete) {
                onResizeComplete(size);
            }
        };

        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, dragEnabled, orientation, isFirstPanelResizable, minSize, effectiveMaxSize, onResize, onResizeComplete, size]);

    const containerStyles = {
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'row' : 'column',
        position: 'relative',
        width: '100%',
        height: '100%',
        ...style
    };

    const getFirstPanelStyle = () => {
        const baseStyle = {
            overflow: 'auto',
            transition: 'none' 
        };

        if (orientation === 'vertical') {
            return {
                ...baseStyle,
                width: isFirstPanelResizable ? `${size}px` : undefined,
                flexGrow: isFirstPanelResizable ? 0 : 1,
                flexShrink: isFirstPanelResizable ? 0 : 1,
                height: '100%'
            };
        } else {
            return {
                ...baseStyle,
                height: isFirstPanelResizable ? `${size}px` : undefined,
                flexGrow: isFirstPanelResizable ? 0 : 1,
                flexShrink: isFirstPanelResizable ? 0 : 1,
                width: '100%'
            };
        }
    };

    const getSecondPanelStyle = () => {
        const baseStyle = {
            overflow: 'auto',
            transition: 'none' 
        };

        if (orientation === 'vertical') {
            return {
                ...baseStyle,
                width: !isFirstPanelResizable ? `${size}px` : undefined,
                flexGrow: !isFirstPanelResizable ? 0 : 1,
                flexShrink: !isFirstPanelResizable ? 0 : 1,
                height: '100%'
            };
        } else {
            return {
                ...baseStyle,
                height: !isFirstPanelResizable ? `${size}px` : undefined,
                flexGrow: !isFirstPanelResizable ? 0 : 1,
                flexShrink: !isFirstPanelResizable ? 0 : 1,
                width: '100%'
            };
        }
    };

    const childrenArray = React.Children.toArray(children).slice(0, 2);
    while (childrenArray.length < 2) {
        childrenArray.push(null);
    }

    return (
        <div
            ref={containerRef}
            className={`${className} w-full`}
            style={containerStyles}
        >
            <div style={getFirstPanelStyle()}
            >
                {childrenArray[0]}
            </div>

            {childrenArray[1] && showDivider && (
                <Divider
                    isResizing={isResizing}
                    setIsResizing={setIsResizing}
                    orientation={orientation}
                    dragEnabled={dragEnabled}
                    accentColor={accentColor}
                />
            )}

            {isMaxSize ? null : <div style={getSecondPanelStyle()}>
                {childrenArray[1]}
            </div>}
        </div>
    );
};

export default ResizablePanel;