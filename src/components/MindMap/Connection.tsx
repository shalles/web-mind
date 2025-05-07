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
  // 获取节点位置
  const sourceX = sourceNode.position?.x || 0;
  const sourceY = sourceNode.position?.y || 0;
  const targetX = targetNode.position?.x || 0;
  const targetY = targetNode.position?.y || 0;
  
  // 节点尺寸 - 用于计算连接点
  const sourceWidth = sourceNode.style.width || 120;
  const targetWidth = targetNode.style.width || 120;
  
  // 确定方向
  const direction = targetNode.direction || 'right';
  
  // 计算实际连接点
  let sourcePointX: number, targetPointX: number;
  
  if (direction === 'right') {
    // 右侧连接 - 源节点右边，目标节点左边
    sourcePointX = sourceX + sourceWidth / 2;
    targetPointX = targetX - targetWidth / 2;
  } else {
    // 左侧连接 - 源节点左边，目标节点右边
    sourcePointX = sourceX - sourceWidth / 2;
    targetPointX = targetX + targetWidth / 2;
  }
  
  // 使用三段式直角连线，强制使用节点本身的Y坐标
  // 这确保连线始终从节点的中心点出发，而不受视觉位置影响
  const turnX = (sourcePointX + targetPointX) / 2;
  
  return `
    M ${sourcePointX} ${sourceY}
    H ${turnX}
    V ${targetY}
    H ${targetPointX}
  `;
};

export default Connection;
