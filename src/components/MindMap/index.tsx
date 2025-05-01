import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import useMindMapStore from '@/store';
import Connection from './Connection';
import RelationshipLine from './RelationshipLine';
import Toolbar from '../Toolbar';
import { addDebugNode } from '@/core/operations/node-operations';

// 声明SVG相关类型
type SVGPoint = {
  x: number;
  y: number;
};

// SVG容器样式
const SVGContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
  overflow: hidden;
  position: relative;
`;

// 思维导图SVG
const MindMapSVG = styled.svg`
  width: 100%;
  height: 100%;
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
`;

// 工具栏包装器
const ToolbarWrapper = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 100;
`;

// 调试按钮
const DebugButton = styled.button`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: #ff4d4f;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  z-index: 100;
  
  &:hover {
    background-color: #ff7875;
  }
`;

const MindMap: React.FC = () => {
  // 状态管理
  const { 
    nodes, 
    selectedNodeIds, 
    setSelectedNodeIds,
    zoom,
    setZoom,
    initialize,
    relationships,
    setNodes
  } = useMindMapStore();
  
  // SVG容器引用
  const svgRef = useRef<SVGSVGElement>(null);
  
  // 本地状态
  const [viewBox, setViewBox] = useState({ x: -500, y: -300, width: 1000, height: 600 });
  const [dragStart, setDragStart] = useState<SVGPoint | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  
  // 初始化思维导图
  useEffect(() => {
    if (nodes.length === 0) {
      console.log('MindMap组件：初始化节点');
      initialize();
    } else {
      console.log('MindMap组件：节点已存在', nodes.length);
    }
  }, [nodes.length, initialize]);
  
  // 添加测试节点的函数（仅供调试使用）
  const handleAddDebugNode = () => {
    console.log('手动添加调试节点');
    setNodes(addDebugNode(nodes));
  };
  
  // 切换调试模式
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };
  
  // 转换客户端坐标到SVG坐标
  const clientToSVGPoint = (clientX: number, clientY: number): SVGPoint => {
    if (!svgRef.current) {
      return { x: 0, y: 0 };
    }
    
    const point = svgRef.current.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) {
      return { x: 0, y: 0 };
    }
    
    const svgPoint = point.matrixTransform(ctm.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  };
  
  // 处理背景拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setDragStart(clientToSVGPoint(e.clientX, e.clientY));
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart) {
      const current = clientToSVGPoint(e.clientX, e.clientY);
      const dx = current.x - dragStart.x;
      const dy = current.y - dragStart.y;
      
      setViewBox(prev => ({
        ...prev,
        x: prev.x - dx * 0.5,
        y: prev.y - dy * 0.5,
      }));
    }
  };
  
  const handleMouseUp = () => {
    setDragStart(null);
  };
  
  // 处理缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.5), 2);
    
    // 更新应用缩放比例
    setZoom(newZoom);
    
    // 计算缩放后的视口
    setViewBox(prev => {
      const mousePoint = clientToSVGPoint(e.clientX, e.clientY);
      const zoomRatio = 1 / zoomFactor;
      
      return {
        x: mousePoint.x - (mousePoint.x - prev.x) * zoomRatio,
        y: mousePoint.y - (mousePoint.y - prev.y) * zoomRatio,
        width: prev.width * zoomRatio,
        height: prev.height * zoomRatio,
      };
    });
  };
  
  // 处理节点选择
  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 处理多选 (Ctrl/Cmd键)
    if (e.ctrlKey || e.metaKey) {
      if (selectedNodeIds.includes(nodeId)) {
        setSelectedNodeIds(selectedNodeIds.filter(id => id !== nodeId));
      } else {
        setSelectedNodeIds([...selectedNodeIds, nodeId]);
      }
    } else {
      // 单选
      setSelectedNodeIds([nodeId]);
    }
  };
  
  // SVG 背景点击时清除选择
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setSelectedNodeIds([]);
    }
  };
  
  // 渲染节点连接线
  const renderConnections = () => {
    const result: React.ReactNode[] = [];
    
    // 对每个节点，如果有子节点，则渲染连接线
    nodes.forEach(node => {
      if (node.children.length > 0 && node.expanded) {
        node.children.forEach(childNode => {
          // 在 nodes 数组中找到对应的子节点
          const targetNode = nodes.find(n => n.id === childNode.id);
          
          if (targetNode && node.position && targetNode.position) {
            result.push(
              <Connection
                key={`${node.id}-${targetNode.id}`}
                sourceNode={node}
                targetNode={targetNode}
              />
            );
          }
        });
      }
    });
    
    return result;
  };
  
  // 渲染自定义关系连线
  const renderRelationships = () => {
    return relationships.map(relationship => {
      const sourceNode = nodes.find(n => n.id === relationship.sourceId);
      const targetNode = nodes.find(n => n.id === relationship.targetId);
      
      if (sourceNode && targetNode && sourceNode.position && targetNode.position) {
        return (
          <RelationshipLine
            key={`rel-${relationship.id}`}
            relationship={relationship}
            sourceNode={sourceNode}
            targetNode={targetNode}
          />
        );
      }
      
      return null;
    });
  };
  
  // 渲染节点
  const renderNodes = () => {
    console.log('renderNodes被调用，节点数量:', nodes.length);
    if (nodes.length === 0) {
      console.log('无节点可渲染');
      return [];
    }
    
    return nodes.map(node => {
      if (!node || !node.id) {
        console.log('发现无效节点:', node);
        return null;
      }
      
      // 使用SVG绘制节点，而不是DOM元素
      const x = node.position?.x || 0;
      const y = node.position?.y || 0;
      const width = node.style.width || 120;
      const height = node.style.height || 40;
      
      // 节点样式
      const backgroundColor = node.style.backgroundColor || '#ffffff';
      const borderColor = selectedNodeIds.includes(node.id) ? '#1890ff' : (node.isReference ? '#722ed1' : (node.style.borderColor || '#cccccc'));
      const borderWidth = node.style.borderWidth || 1;
      
      console.log('渲染节点:', node.id, node.content, 'position:', x, y);
      
      return (
        <g 
          key={node.id} 
          transform={`translate(${x}, ${y})`}
          onClick={(e) => handleNodeClick(node.id, e)}
          style={{ cursor: 'pointer' }}
        >
          {/* 节点背景 */}
          <rect
            x={-width/2}
            y={-height/2}
            width={width}
            height={height}
            fill={backgroundColor}
            stroke={borderColor}
            strokeWidth={borderWidth + 1}
            rx={5}
            ry={5}
          />
          
          {/* 节点内容 */}
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={node.style.fontSize || 14}
            fontWeight={node.style.fontWeight || 'normal'}
            fill={node.style.fontColor || '#333333'}
          >
            {node.content}
          </text>
          
          {/* 调试信息 */}
          <text
            x={0}
            y={height/2 + 15}
            textAnchor="middle"
            fontSize={10}
            fill="#999"
          >
            ID: {node.id.substring(0, 6)}...
          </text>
        </g>
      );
    });
  };
  
  return (
    <SVGContainer className="mindmap-container">
      <ToolbarWrapper>
        <Toolbar />
      </ToolbarWrapper>
      
      <MindMapSVG
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBackgroundClick}
        onWheel={handleWheel}
      >
        <g transform={`scale(${zoom})`}>
          {renderConnections()}
          {renderRelationships()}
          {renderNodes()}
        </g>
      </MindMapSVG>
      
      {/* 调试按钮 */}
      <DebugButton onClick={toggleDebugMode}>
        {debugMode ? '关闭调试' : '开启调试'}
      </DebugButton>
      
      {/* 调试模式下显示添加节点按钮 */}
      {debugMode && (
        <DebugButton 
          onClick={handleAddDebugNode}
          style={{ bottom: '60px' }}
        >
          添加测试节点
        </DebugButton>
      )}
    </SVGContainer>
  );
};

export default MindMap;
