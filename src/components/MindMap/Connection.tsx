import React from 'react';
import styled from 'styled-components';
import { MindNode } from '@/types/mindmap';

interface ConnectionProps {
  sourceNode: MindNode;
  targetNode: MindNode;
}

// 连接线路径样式
const ConnectionPath = styled.path`
  stroke: #c0c0c0;
  stroke-width: 1.5px;
  fill: none;
`;

const Connection: React.FC<ConnectionProps> = ({ sourceNode, targetNode }) => {
  // 计算连接线路径
  const pathData = generateConnectionPath(sourceNode, targetNode);
  
  return <ConnectionPath d={pathData} />;
};

// 生成连接线路径
const generateConnectionPath = (sourceNode: MindNode, targetNode: MindNode): string => {
  const sourceX = sourceNode.position?.x || 0;
  const sourceY = sourceNode.position?.y || 0;
  const targetX = targetNode.position?.x || 0;
  const targetY = targetNode.position?.y || 0;
  
  // 源节点的宽度
  const sourceWidth = sourceNode.style.width || 120;
  
  // 目标节点的宽度
  const targetWidth = targetNode.style.width || 120;
  
  // 计算连接点（源节点的右侧中心和目标节点的左侧中心）
  const direction = targetNode.direction || 'right';
  
  let sourcePointX: number;
  let sourcePointY: number;
  let targetPointX: number;
  
  // 根据方向确定连接点
  if (direction === 'right') {
    // 源节点右侧，目标节点左侧
    sourcePointX = sourceX + sourceWidth / 2;
    sourcePointY = sourceY;
    targetPointX = targetX - targetWidth / 2;
  } else {
    // 源节点左侧，目标节点右侧
    sourcePointX = sourceX - sourceWidth / 2;
    sourcePointY = sourceY;
    targetPointX = targetX + targetWidth / 2;
  }
  
  // 水平中间点
  const midX = (sourceX + targetX) / 2;
  
  // 如果垂直距离很小，直接使用水平线连接
  if (Math.abs(sourceY - targetY) < 10) {
    return `M ${sourcePointX} ${sourcePointY} H ${targetPointX}`;
  }
  
  // 计算拐角点坐标
  const corner1X = midX;
  const corner2Y = targetY; 
  
  return `
    M ${sourcePointX} ${sourcePointY}
    H ${corner1X}
    V ${corner2Y}
    H ${targetPointX}
  `;
};

export default Connection;
