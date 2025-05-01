import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Input, InputRef } from 'antd';
import { MindNode } from '@/types/mindmap';
import useMindMapStore from '@/store';

// 节点接口
export interface NodeProps {
  node: MindNode;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

// 节点容器样式
const NodeContainer = styled.g<{ isSelected: boolean }>`
  cursor: pointer;
  
  &:hover .node-rect {
    stroke: #1890ff;
    stroke-width: 2px;
  }
`;

// 节点矩形样式
const NodeRect = styled.rect<{ 
  backgroundColor: string; 
  borderColor: string; 
  borderWidth: number;
  isSelected: boolean;
}>`
  fill: ${props => props.backgroundColor};
  stroke: ${props => props.isSelected ? '#1890ff' : props.borderColor};
  stroke-width: ${props => props.isSelected ? 2 : props.borderWidth}px;
  rx: 5px;
  ry: 5px;
`;

// 节点文本样式
const NodeText = styled.text<{ 
  fontColor: string; 
  fontSize: number; 
  fontWeight: string | number;
}>`
  fill: ${props => props.fontColor};
  font-size: ${props => props.fontSize}px;
  font-weight: ${props => props.fontWeight};
  dominant-baseline: middle;
  text-anchor: middle;
  user-select: none;
  pointer-events: none;
`;

// 节点折叠按钮样式
const CollapseButton = styled.g`
  cursor: pointer;
  
  &:hover circle {
    fill: #e6f7ff;
  }
`;

// 外部编辑框样式
const ForeignObject = styled.foreignObject`
  overflow: visible;
`;

const Node: React.FC<NodeProps> = ({ node, isSelected, onClick }) => {
  // 获取状态管理
  const { 
    toggleNodeExpanded, 
    updateNodeContent, 
    editingNodeId, 
    setEditingNodeId 
  } = useMindMapStore();
  
  // 本地状态
  const [editValue, setEditValue] = useState(node.content);
  const inputRef = useRef<InputRef>(null);
  
  // 节点尺寸和样式
  const width = node.style.width || 120;
  const height = node.style.height || 40;
  const {
    backgroundColor = '#ffffff',
    borderColor = '#d9d9d9',
    borderWidth = 1,
    fontColor = '#333333',
    fontSize = 14,
    fontWeight = 'normal',
  } = node.style;
  
  // 节点位置
  const x = node.position?.x || 0;
  const y = node.position?.y || 0;
  
  // 文本截断处理
  const truncateText = (text: string, maxLength: number = 20): string => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };
  
  // 处理折叠/展开按钮点击
  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpanded(node.id);
  };
  
  // 是否显示折叠按钮 (有子节点时显示)
  const showCollapseButton = node.children.length > 0;
  
  // 折叠按钮位置
  const buttonX = x + width / 2 + 10;
  const buttonY = y;
  
  // 处理双击编辑
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditValue(node.content);
  };
  
  // 处理编辑完成
  const handleEditComplete = () => {
    if (editingNodeId === node.id) {
      updateNodeContent(node.id, editValue);
      setEditingNodeId(null);
    }
  };
  
  // 处理按键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditComplete();
    } else if (e.key === 'Escape') {
      setEditingNodeId(null);
    }
  };
  
  // 自动聚焦编辑框
  useEffect(() => {
    if (editingNodeId === node.id && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingNodeId, node.id]);
  
  // 绘制展开/折叠按钮
  const renderCollapseButton = () => {
    if (!showCollapseButton) return null;
    
    return (
      <CollapseButton onClick={handleCollapseClick}>
        <circle
          cx={buttonX}
          cy={buttonY}
          r={8}
          fill="#f0f0f0"
          stroke="#d9d9d9"
          strokeWidth="1"
        />
        {/* 绘制 +/- 符号 */}
        <line
          x1={buttonX - 4}
          y1={buttonY}
          x2={buttonX + 4}
          y2={buttonY}
          stroke="#595959"
          strokeWidth="1.5"
        />
        {!node.expanded && (
          <line
            x1={buttonX}
            y1={buttonY - 4}
            x2={buttonX}
            y2={buttonY + 4}
            stroke="#595959"
            strokeWidth="1.5"
          />
        )}
      </CollapseButton>
    );
  };
  
  // 编辑模式
  const isEditing = editingNodeId === node.id;
  
  return (
    <NodeContainer 
      isSelected={isSelected} 
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
    >
      <NodeRect
        className="node-rect"
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        backgroundColor={backgroundColor}
        borderColor={borderColor}
        borderWidth={borderWidth}
        isSelected={isSelected}
      />
      
      {isEditing ? (
        <ForeignObject
          x={x - width / 2}
          y={y - height / 2}
          width={width}
          height={height}
        >
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditComplete}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              height: '100%',
              textAlign: 'center',
              border: 'none',
              outline: 'none',
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              color: fontColor,
              backgroundColor: 'transparent',
            }}
          />
        </ForeignObject>
      ) : (
        <NodeText
          x={x}
          y={y}
          fontColor={fontColor}
          fontSize={fontSize}
          fontWeight={fontWeight}
        >
          {truncateText(node.content)}
        </NodeText>
      )}
      
      {renderCollapseButton()}
    </NodeContainer>
  );
};

export default Node;
