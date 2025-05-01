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
  let targetPointY: number;
  
  // 根据方向确定连接点
  if (direction === 'right') {
    // 源节点右侧，目标节点左侧
    sourcePointX = sourceX + sourceWidth / 2;
    sourcePointY = sourceY;
    targetPointX = targetX - targetWidth / 2;
    targetPointY = targetY;
  } else {
    // 源节点左侧，目标节点右侧
    sourcePointX = sourceX - sourceWidth / 2;
    sourcePointY = sourceY;
    targetPointX = targetX + targetWidth / 2;
    targetPointY = targetY;
  }
  
  // 计算控制点（为了创建曲线）
  const controlPointDistance = Math.abs(targetX - sourceX) * 0.5;
  
  let sourceControlX: number;
  let targetControlX: number;
  
  if (direction === 'right') {
    sourceControlX = sourcePointX + controlPointDistance;
    targetControlX = targetPointX - controlPointDistance;
  } else {
    sourceControlX = sourcePointX - controlPointDistance;
    targetControlX = targetPointX + controlPointDistance;
  }
  
  // 生成二次贝塞尔曲线路径
  return `
    M ${sourcePointX} ${sourcePointY}
    C ${sourceControlX} ${sourcePointY}, ${targetControlX} ${targetPointY}, ${targetPointX} ${targetPointY}
  `;
};

export default Connection;
