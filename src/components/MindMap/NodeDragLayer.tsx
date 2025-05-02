import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { MindNode, NodePosition } from '@/types/mindmap';
import useMindMapStore from '@/store';
import { 
  findClosestNode, 
  calculateAnimatedPosition, 
  easeOutElastic 
} from '@/core/utils/drag-utils';

// 吸附距离阈值（像素）
const SNAP_THRESHOLD = 50;

// 吸附动画持续时间（毫秒）
const SNAP_ANIMATION_DURATION = 300;

// 拖拽状态类型
interface DragState {
  isDragging: boolean;
  node: MindNode | null;
  startPosition: NodePosition | null;
  currentPosition: NodePosition | null;
  snapTarget: { 
    node: MindNode; 
    distance: number 
  } | null;
}

// 拖拽轨迹线
const DragPath = styled.path`
  stroke: #1890ff;
  stroke-width: 1.5;
  stroke-dasharray: 5, 5;
  opacity: 0.5;
  pointer-events: none;
`;

// 吸附指示器
const SnapIndicator = styled.circle`
  fill: none;
  stroke: #52c41a;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
  opacity: 0.7;
  animation: blink 1.2s ease-in-out infinite;
  pointer-events: none;
`;

interface NodeDragLayerProps {
  nodes: MindNode[];
  setNodes: (nodes: MindNode[]) => void;
}

const NodeDragLayer: React.FC<NodeDragLayerProps> = ({ nodes, setNodes }, ref) => {
  // 拖拽状态
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    node: null,
    startPosition: null,
    currentPosition: null,
    snapTarget: null
  });
  
  // 动画参数
  const animationRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const animationStartPosRef = useRef<NodePosition | null>(null);
  const animationTargetPosRef = useRef<NodePosition | null>(null);
  
  // 初始化拖拽处理
  const startDrag = (node: MindNode) => {
    if (!node.position) return;
    
    // 设置拖拽状态
    setDragState({
      isDragging: true,
      node,
      startPosition: { ...node.position },
      currentPosition: { ...node.position },
      snapTarget: null
    });
    
    console.log('开始拖拽节点:', node.id);
  };
  
  // 处理拖拽移动
  const handleDrag = (position: NodePosition) => {
    if (!dragState.isDragging || !dragState.node) return;
    
    // 查找最近的吸附目标
    const closestNodeResult = findClosestNode(
      nodes,
      dragState.node.id,
      position,
      SNAP_THRESHOLD
    );
    
    // 更新拖拽状态
    setDragState(prev => ({
      ...prev,
      currentPosition: position,
      snapTarget: closestNodeResult
    }));
    
    // 更新节点位置
    updateNodePosition(dragState.node.id, position);
  };
  
  // 处理拖拽结束
  const endDrag = () => {
    if (!dragState.isDragging || !dragState.node || !dragState.currentPosition) return;
    
    // 如果有吸附目标，执行吸附动画
    if (dragState.snapTarget) {
      startSnapAnimation();
    } else {
      // 没有吸附目标，直接保存位置
      saveNodePosition();
    }
    
    // 重置拖拽状态
    setDragState({
      isDragging: false,
      node: null,
      startPosition: null,
      currentPosition: null,
      snapTarget: null
    });
    
    console.log('结束拖拽节点');
  };
  
  // 更新临时节点位置
  const updateNodePosition = (nodeId: string, position: NodePosition) => {
    const updatedNodes = [...nodes];
    const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId);
    
    if (nodeIndex !== -1) {
      updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        position: { ...position }
      };
      setNodes(updatedNodes);
    }
  };
  
  // 保存节点位置到状态管理
  const saveNodePosition = () => {
    if (!dragState.node || !dragState.currentPosition) return;
    
    // 使用状态管理更新节点位置
    const { executeWithHistory } = useMindMapStore.getState();
    
    executeWithHistory(({ nodes, relationships }) => {
      const updatedNodes = [...nodes];
      const nodeIndex = updatedNodes.findIndex(n => n.id === dragState.node!.id);
      
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          position: { ...dragState.currentPosition! }
        };
      }
      
      return { nodes: updatedNodes, relationships };
    });
    
    console.log('已保存节点位置:', dragState.currentPosition);
  };
  
  // 开始吸附动画
  const startSnapAnimation = () => {
    if (!dragState.currentPosition || !dragState.snapTarget?.node.position) return;
    
    // 设置动画参数
    animationStartTimeRef.current = Date.now();
    animationStartPosRef.current = { ...dragState.currentPosition };
    animationTargetPosRef.current = { ...dragState.snapTarget.node.position };
    
    // 启动动画
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animateSnap);
  };
  
  // 吸附动画
  const animateSnap = () => {
    const now = Date.now();
    const startTime = animationStartTimeRef.current || now;
    const startPos = animationStartPosRef.current;
    const targetPos = animationTargetPosRef.current;
    
    if (!startPos || !targetPos || !dragState.node) return;
    
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / SNAP_ANIMATION_DURATION, 1);
    
    // 计算当前位置
    const currentPos = calculateAnimatedPosition(
      startPos,
      targetPos,
      progress,
      easeOutElastic
    );
    
    // 更新节点位置
    updateNodePosition(dragState.node.id, currentPos);
    
    // 动画完成
    if (progress === 1) {
      saveNodePosition();
      
      // 重置动画参数
      animationStartTimeRef.current = null;
      animationStartPosRef.current = null;
      animationTargetPosRef.current = null;
      animationRef.current = null;
    } else {
      // 继续动画
      animationRef.current = requestAnimationFrame(animateSnap);
    }
  };
  
  // 暴露给外部使用的方法
  React.useImperativeHandle(
    ref,
    () => ({
      startDrag,
      handleDrag,
      endDrag,
      isDragging: dragState.isDragging,
      draggedNodeId: dragState.node?.id || null,
      snapTargetId: dragState.snapTarget?.node.id || null
    }),
    [dragState]
  );
  
  // 渲染拖拽轨迹和吸附指示
  return (
    <>
      {/* 拖拽轨迹线 */}
      {dragState.isDragging && dragState.startPosition && dragState.currentPosition && (
        <DragPath
          d={`M${dragState.startPosition.x},${dragState.startPosition.y} L${dragState.currentPosition.x},${dragState.currentPosition.y}`}
          className="drag-path"
        />
      )}
      
      {/* 吸附目标指示器 */}
      {dragState.snapTarget && dragState.snapTarget.node.position && (
        <SnapIndicator
          cx={dragState.snapTarget.node.position.x}
          cy={dragState.snapTarget.node.position.y}
          r={40}
          className="snap-indicator"
        />
      )}
    </>
  );
};

export default React.forwardRef<
  {
    startDrag: (node: MindNode) => void;
    handleDrag: (position: NodePosition) => void;
    endDrag: () => void;
    isDragging: boolean;
    draggedNodeId: string | null;
    snapTargetId: string | null;
  },
  NodeDragLayerProps
>((props, ref) => <NodeDragLayer {...props} ref={ref} />); 