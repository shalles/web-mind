import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import useMindMapStore from '@/store';
import Node from './Node';
import Connection from './Connection';
import Toolbar from '../Toolbar';

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

const MindMap: React.FC = () => {
  // 状态管理
  const { 
    nodes, 
    selectedNodeIds, 
    setSelectedNodeIds,
    zoom,
    setZoom,
    initialize 
  } = useMindMapStore();
  
  // SVG容器引用
  const svgRef = useRef<SVGSVGElement>(null);
  
  // 本地状态
  const [viewBox, setViewBox] = useState({ x: -500, y: -300, width: 1000, height: 600 });
  const [dragStart, setDragStart] = useState<SVGPoint | null>(null);
  
  // 初始化思维导图
  useEffect(() => {
    if (nodes.length === 0) {
      initialize();
    }
  }, [nodes.length, initialize]);
  
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
  
  // 渲染节点
  const renderNodes = () => {
    return nodes.map(node => (
      <Node
        key={node.id}
        node={node}
        isSelected={selectedNodeIds.includes(node.id)}
        onClick={(e) => handleNodeClick(node.id, e)}
      />
    ));
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
          {renderNodes()}
        </g>
      </MindMapSVG>
    </SVGContainer>
  );
};

export default MindMap;
