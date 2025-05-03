import React, { useState, useEffect, useRef } from 'react';
import { MindNode } from '@/types/mindmap';
import useMindMapStore from '@/store';
import { Input, Tooltip, InputRef } from 'antd';
import { 
  PlusOutlined, 
  MinusOutlined,
  FileImageOutlined,
  MessageOutlined,
  LinkOutlined
} from '@ant-design/icons';

// 节点接口
interface NodeProps {
  node: MindNode;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const SimpleNode: React.FC<NodeProps> = ({ node, isSelected, onClick }) => {
  const { 
    editingNodeId, 
    setEditingNodeId, 
    updateNodeContent, 
    toggleNodeExpanded 
  } = useMindMapStore();
  
  const [tempContent, setTempContent] = useState(node.content);
  const inputRef = useRef<InputRef>(null);
  
  // 在组件挂载时记录日志
  useEffect(() => {
    console.log(`节点挂载: ${node.id}, 内容: ${node.content}, 位置:`, node.position);
  }, [node.id, node.content, node.position]);
  
  // 处理节点点击
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(e);
    console.log(`节点被点击: ${node.id}, 内容: ${node.content}`);
    
    // 双击激活编辑
    if (e.detail === 2) {
      setEditingNodeId(node.id);
    }
  };
  
  // 处理编辑提交
  const handleInputSubmit = () => {
    if (tempContent.trim() !== '') {
      updateNodeContent(node.id, tempContent);
    }
    setEditingNodeId(null);
  };
  
  // 处理输入框按键
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setTempContent(node.content);
      setEditingNodeId(null);
    }
  };
  
  // 处理折叠/展开按钮点击
  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpanded(node.id);
  };
  
  // 当节点进入编辑状态时，聚焦输入框
  useEffect(() => {
    if (editingNodeId === node.id && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingNodeId, node.id]);
  
  // 获取样式值
  const {
    backgroundColor = '#ffffff',
    borderColor = '#cccccc',
    borderWidth = 1,
    borderRadius = 4,
    fontSize = 14,
    fontColor = '#333333',
    fontWeight = 'normal'
  } = node.style;
  
  // 获取位置
  const x = node.position?.x || 0;
  const y = node.position?.y || 0;
  
  // 获取图标组件 (简化版)
  const getIconComponent = () => {
    if (!node.icon) return null;
    
    return <div style={{ color: node.icon.color, fontSize: node.icon.size }}>
      {node.icon.type === 'message' && <MessageOutlined />}
      {node.icon.type === 'file' && <FileImageOutlined />}
      {node.icon.type === 'link' && <LinkOutlined />}
    </div>;
  };
  
  // 定义容器样式，增强视觉效果以便于调试
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    transform: `translate(${x}px, ${y}px)`,
    backgroundColor: backgroundColor,
    border: `${borderWidth + 1}px solid ${isSelected ? '#1890ff' : node.isReference ? '#722ed1' : '#333333'}`, // 加粗边框
    borderRadius: `${borderRadius}px`,
    padding: '12px', // 增加内边距
    minWidth: '100px', // 增加最小宽度
    maxWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)', // 添加阴影
    cursor: 'pointer',
    userSelect: 'none',
    zIndex: 100, // 提高z-index确保在最上层
    overflow: 'visible' // 确保内容溢出也可见
  };
  
  // 创建渐变背景样式 (用于引用节点)
  if (node.isReference) {
    containerStyle.backgroundImage = 'linear-gradient(45deg, rgba(114, 46, 209, 0.05) 25%, transparent 25%, transparent 50%, rgba(114, 46, 209, 0.05) 50%, rgba(114, 46, 209, 0.05) 75%, transparent 75%, transparent)';
    containerStyle.backgroundSize = '10px 10px';
  }
  
  // 节点内容样式
  const contentStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    color: fontColor,
    fontWeight: fontWeight,
    textAlign: 'center',
    width: '100%',
    wordBreak: 'break-word',
    outline: editingNodeId === node.id ? '2px solid #1890ff' : 'none',
    padding: '2px',
    userSelect: editingNodeId === node.id ? 'text' : 'none'
  };
  
  // 图片容器样式
  const imageContainerStyle: React.CSSProperties = {
    marginBottom: '8px',
    maxWidth: '100%',
    display: 'flex',
    justifyContent: 'center'
  };
  
  // 图标容器样式
  const iconContainerStyle: React.CSSProperties = {
    marginBottom: '8px',
    fontSize: '20px',
    display: 'flex',
    justifyContent: 'center'
  };
  
  // 备注指示器样式
  const noteIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    top: '2px',
    right: '2px',
    color: '#1890ff',
    fontSize: '12px'
  };
  
  // 引用指示器样式
  const referenceIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    top: '2px',
    left: '2px',
    color: '#722ed1',
    fontSize: '12px'
  };
  
  // 展开/折叠按钮样式
  const getExpandButtonStyle = (direction: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    bottom: '50%',
    [direction]: '-15px',
    width: '16px',
    height: '16px',
    backgroundColor: '#fff',
    border: '1px solid #d9d9d9',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '10px',
    transform: 'translateY(50%)'
  });
  
  // 调试信息样式
  const debugInfoStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '-20px',
    left: '0',
    fontSize: '10px',
    color: '#999',
    whiteSpace: 'nowrap'
  };
  
  return (
    <div style={containerStyle} onClick={handleClick}>
      {/* 图标显示 */}
      {node.icon && (
        <div style={iconContainerStyle}>
          {getIconComponent()}
        </div>
      )}
      
      {/* 图片显示 */}
      {node.image && (
        <div style={imageContainerStyle}>
          <img 
            src={node.image.src} 
            alt={node.image.alt || node.content} 
            style={{
              maxWidth: '100%',
              maxHeight: node.image.height,
              width: 'auto',
              height: 'auto'
            }}
          />
        </div>
      )}
      
      {/* 节点内容 */}
      <div style={contentStyle}>
        {editingNodeId === node.id ? (
          <Input
            ref={inputRef}
            value={tempContent}
            onChange={(e) => setTempContent(e.target.value)}
            onBlur={handleInputSubmit}
            onKeyDown={handleInputKeyDown}
            style={{ userSelect: 'text' }}
          />
        ) : (
          node.content || '空节点'
        )}
      </div>
      
      {/* 备注指示 */}
      {node.note && (
        <div style={noteIndicatorStyle}>
          <Tooltip title="节点有备注">
            <MessageOutlined />
          </Tooltip>
        </div>
      )}
      
      {/* 引用指示 */}
      {node.isReference && (
        <div style={referenceIndicatorStyle}>
          <Tooltip title="引用节点">
            <LinkOutlined />
          </Tooltip>
        </div>
      )}
      
      {/* 展开/折叠按钮 */}
      {node.children.length > 0 && (
        <div 
          style={getExpandButtonStyle(node.direction || 'right')}
          onClick={handleExpandClick}
        >
          {node.expanded ? <MinusOutlined /> : <PlusOutlined />}
        </div>
      )}
      
      {/* 调试信息 */}
      <div style={debugInfoStyle}>
        ID: {node.id.substring(0, 6)}... | 位置: ({Math.round(x)}, {Math.round(y)})
      </div>
    </div>
  );
};

export default SimpleNode; 