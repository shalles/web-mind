import React from 'react';
import styled from 'styled-components';
import { MindNode, Relationship } from '@/types/mindmap';
import useMindMapStore from '@/store';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Popover, Input, Button, ColorPicker, Select, InputNumber } from 'antd';

interface RelationshipLineProps {
  relationship: Relationship;
  sourceNode: MindNode;
  targetNode: MindNode;
}

// 控制点容器
const ControlPointContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &:hover {
    border-color: #1890ff;
    color: #1890ff;
  }
`;

// 关系线路径
const RelationshipPath = styled.path<{ 
  selected: boolean; 
  relationshipStyle: Relationship['style'];
}>`
  stroke: ${(props) => props.relationshipStyle.lineColor || '#999'};
  stroke-width: ${(props) => props.relationshipStyle.lineWidth || 1.5}px;
  stroke-dasharray: ${(props) =>
    props.relationshipStyle.lineType === 'dashed'
      ? '5,5'
      : props.relationshipStyle.lineType === 'dotted'
      ? '2,2'
      : 'none'};
  fill: none;
  cursor: pointer;
  
  &:hover {
    stroke-width: ${(props) => (props.relationshipStyle.lineWidth || 1.5) + 1}px;
  }
  
  ${(props) => props.selected && `
    stroke-width: 3px;
    filter: drop-shadow(0 0 2px rgba(24, 144, 255, 0.5));
  `}
`;

// 箭头标记
const ArrowMarker = styled.marker<{ markerColor: string }>`
  fill: ${(props) => props.markerColor || '#999'};
`;

// 编辑面板
const EditPanel = styled.div`
  width: 250px;
  padding: 10px;
`;

const RelationshipLine: React.FC<RelationshipLineProps> = ({ relationship, sourceNode, targetNode }) => {
  const { 
    selectedNodeIds, 
    setSelectedNodeIds, 
    updateRelationship, 
    deleteRelationship 
  } = useMindMapStore();
  
  // 是否选中当前连线
  const isSelected = selectedNodeIds.includes(`rel_${relationship.id}`);
  
  // 获取两个节点的位置
  const sourceX = sourceNode.position?.x || 0;
  const sourceY = sourceNode.position?.y || 0;
  const targetX = targetNode.position?.x || 0;
  const targetY = targetNode.position?.y || 0;
  
  // 计算控制点（贝塞尔曲线的控制点）
  const controlX = (sourceX + targetX) / 2;
  const controlY = (sourceY + targetY) / 2 - 30; // 稍微上移，使曲线显得自然
  
  // 计算连线路径
  const pathData = generatePathData(
    sourceX, sourceY, 
    targetX, targetY, 
    controlX, controlY,
    relationship.style.lineStyle
  );
  
  // 计算标签位置
  const labelX = controlX;
  const labelY = controlY;
  
  // 处理点击事件
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeIds([`rel_${relationship.id}`]);
  };
  
  // 处理删除关系
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteRelationship(relationship.id);
  };
  
  // 处理更新标签
  const handleUpdateLabel = (value: string) => {
    updateRelationship(relationship.id, { label: value });
  };
  
  // 处理更新样式
  const handleUpdateStyle = (style: Partial<Relationship['style']>) => {
    updateRelationship(relationship.id, { 
      style: { ...relationship.style, ...style } 
    });
  };
  
  // 编辑面板内容
  const editPanelContent = (
    <EditPanel>
      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 5 }}>关系描述:</div>
        <Input 
          value={relationship.label || ''} 
          onChange={(e) => handleUpdateLabel(e.target.value)}
          placeholder="输入关系描述"
        />
      </div>
      
      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 5 }}>线条颜色:</div>
        <ColorPicker 
          value={relationship.style.lineColor}
          onChange={(color) => handleUpdateStyle({ lineColor: color.toHexString() })}
        />
      </div>
      
      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 5 }}>线条粗细:</div>
        <InputNumber 
          min={1} 
          max={5} 
          value={relationship.style.lineWidth} 
          onChange={(value) => handleUpdateStyle({ lineWidth: value as number })}
        />
      </div>
      
      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 5 }}>线条样式:</div>
        <Select
          value={relationship.style.lineType}
          style={{ width: '100%' }}
          onChange={(value) => handleUpdateStyle({ lineType: value })}
          options={[
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
            { value: 'dotted', label: '点线' }
          ]}
        />
      </div>
      
      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 5 }}>线条形状:</div>
        <Select
          value={relationship.style.lineStyle}
          style={{ width: '100%' }}
          onChange={(value) => handleUpdateStyle({ lineStyle: value })}
          options={[
            { value: 'straight', label: '直线' },
            { value: 'curved', label: '曲线' },
            { value: 'orthogonal', label: '正交线' },
            { value: 'orthogonalRounded', label: '带圆角的正交线' }
          ]}
        />
      </div>
      
      <Button 
        danger 
        icon={<DeleteOutlined />}
        onClick={handleDelete}
        style={{ marginTop: 10 }}
      >
        删除关系连线
      </Button>
    </EditPanel>
  );
  
  return (
    <g onClick={handleClick}>
      {/* 箭头标记定义 */}
      <defs>
        <ArrowMarker
          id={`arrowhead-${relationship.id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerColor={relationship.style.lineColor || '#999'}
        >
          <polygon points="0 0, 10 3.5, 0 7" />
        </ArrowMarker>
      </defs>
      
      {/* 关系连线 */}
      <RelationshipPath
        d={pathData}
        markerEnd={`url(#arrowhead-${relationship.id})`}
        relationshipStyle={relationship.style}
        selected={isSelected}
      />
      
      {/* 关系标签 */}
      {relationship.label && (
        <foreignObject
          x={labelX - 50}
          y={labelY - 15}
          width="100"
          height="30"
          style={{ overflow: 'visible' }}
        >
          <Popover
            content={editPanelContent}
            title="编辑关系连线"
            trigger="click"
            open={isSelected}
          >
            <ControlPointContainer>
              {relationship.label}
              {isSelected && (
                <EditOutlined style={{ marginLeft: 5 }} />
              )}
            </ControlPointContainer>
          </Popover>
        </foreignObject>
      )}
      
      {/* 如果没有标签但被选中，显示编辑按钮 */}
      {!relationship.label && isSelected && (
        <foreignObject
          x={labelX - 15}
          y={labelY - 15}
          width="30"
          height="30"
          style={{ overflow: 'visible' }}
        >
          <Popover
            content={editPanelContent}
            title="编辑关系连线"
            trigger="click"
            open={isSelected}
          >
            <ControlPointContainer>
              <EditOutlined />
            </ControlPointContainer>
          </Popover>
        </foreignObject>
      )}
    </g>
  );
};

// 生成路径数据
const generatePathData = (
  sourceX: number, 
  sourceY: number, 
  targetX: number, 
  targetY: number, 
  controlX: number, 
  controlY: number,
  lineStyle: string = 'curved'
) => {
  // 根据线条样式生成不同的路径
  switch (lineStyle) {
    case 'straight':
      return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    
    case 'orthogonal': {
      const midX = (sourceX + targetX) / 2;
      return `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;
    }
    
    case 'orthogonalRounded': {
      const midX = (sourceX + targetX) / 2;
      const radius = 10; // 圆角半径
      
      // 如果垂直距离很小，直接使用水平线连接
      if (Math.abs(sourceY - targetY) < radius * 2) {
        return `M ${sourceX} ${sourceY} H ${targetX}`;
      }
      
      // 垂直方向标识 (上或下)
      const verticalDirection = sourceY > targetY ? -1 : 1;
      
      // 计算拐角点坐标
      const corner1Y = sourceY;
      const corner1X = midX;
      const corner2Y = targetY; 
      const corner2X = midX;
      
      return `
        M ${sourceX} ${sourceY}
        H ${corner1X - radius * Math.sign(corner1X - sourceX)}
        A ${radius} ${radius} 0 0 ${verticalDirection > 0 ? 1 : 0} ${corner1X} ${corner1Y + radius * verticalDirection}
        V ${corner2Y - radius * verticalDirection}
        A ${radius} ${radius} 0 0 ${midX < targetX ? 1 : 0} ${corner2X + radius * Math.sign(targetX - corner2X)} ${corner2Y}
        H ${targetX}
      `;
    }
    
    case 'curved':
    default:
      return `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
  }
};

export default RelationshipLine; 