import React from 'react';
import styled from 'styled-components';
import { MindNode, ConnectionStyle } from '@/types/mindmap';

// 连接线接口
export interface ConnectionProps {
  sourceNode: MindNode;
  targetNode: MindNode;
  style?: ConnectionStyle;
}

// 连接线样式
const ConnectionPath = styled.path<{ 
  lineColor: string;
  lineWidth: number;
  lineStyle: string;
}>`
  fill: none;
  stroke: ${props => props.lineColor};
  stroke-width: ${props => props.lineWidth}px;
  stroke-dasharray: ${props => props.lineStyle === 'dashed' ? '5,5' : 
                       props.lineStyle === 'dotted' ? '1,5' : 'none'};
`;

// 默认连接线样式
const DEFAULT_CONNECTION_STYLE: ConnectionStyle = {
  lineColor: '#c0c0c0',
  lineWidth: 1.5,
  lineStyle: 'straight',
  lineType: 'solid',
};

const Connection: React.FC<ConnectionProps> = ({ sourceNode, targetNode, style = DEFAULT_CONNECTION_STYLE }) => {
  // 确保节点有位置信息
  if (!sourceNode.position || !targetNode.position) {
    return null;
  }
  
  const { lineColor = '#c0c0c0', lineWidth = 1.5, lineType = 'solid' } = style;
  const lineStyle = lineType || 'solid';
  
  // 计算节点尺寸（可根据节点的样式计算）
  const sourceWidth = sourceNode.style.width || 120;
  const sourceHeight = sourceNode.style.height || 40;
  const targetWidth = targetNode.style.width || 120;
  const targetHeight = targetNode.style.height || 40;
  
  // 获取节点位置
  const sourceX = sourceNode.position.x;
  const sourceY = sourceNode.position.y;
  const targetX = targetNode.position.x;
  const targetY = targetNode.position.y;
  
  // 计算连接线路径
  const path = generatePath(
    { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight },
    { x: targetX, y: targetY, width: targetWidth, height: targetHeight },
    style.lineStyle || 'curved'
  );
  
  return (
    <ConnectionPath
      d={path}
      lineColor={lineColor}
      lineWidth={lineWidth}
      lineStyle={lineStyle}
    />
  );
};

// 连接线路径生成
interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 生成不同样式的连接线路径
const generatePath = (
  source: NodeBox,
  target: NodeBox,
  style: string
): string => {
  // 基于方向计算连接点
  const isTargetRight = target.x > source.x;
  
  // 源节点连接点
  const sourceX = source.x + (isTargetRight ? source.width / 2 : -source.width / 2);
  const sourceY = source.y;
  
  // 目标节点连接点
  const targetX = target.x + (isTargetRight ? -target.width / 2 : target.width / 2);
  const targetY = target.y;
  
  // 根据样式生成不同的路径
  let path: string;
  
  switch (style) {
    case 'straight': 
      // 直线
      path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
      break;
      
    case 'orthogonal': {
      // 正交线 (直角连接)
      const midX = (sourceX + targetX) / 2;
      path = `M ${sourceX} ${sourceY} 
              L ${midX} ${sourceY} 
              L ${midX} ${targetY} 
              L ${targetX} ${targetY}`;
      break;
    }
      
    case 'curved':
    default: {
      // 贝塞尔曲线 (平滑曲线)
      const controlPointOffset = Math.abs(targetX - sourceX) * 0.5;
      const sourceControlX = sourceX + (isTargetRight ? controlPointOffset : -controlPointOffset);
      const targetControlX = targetX - (isTargetRight ? controlPointOffset : -controlPointOffset);
      
      path = `M ${sourceX} ${sourceY} 
              C ${sourceControlX} ${sourceY}, 
                ${targetControlX} ${targetY}, 
                ${targetX} ${targetY}`;
      break;
    }
  }
  
  return path;
};

export default Connection;
