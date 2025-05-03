import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import useMindMapStore from '@/store';
import Connection from './Connection';
import RelationshipLine from './RelationshipLine';
import Toolbar from '../Toolbar';
import { addDebugNode } from '@/core/operations/node-operations';
import NodeReferenceMenu from './NodeReferenceMenu';
import { Input, InputRef } from 'antd';
import { NodePosition } from '@/types/mindmap';
import { 
  findClosestNode, 
  calculateAnimatedPosition, 
  easeOutElastic,
  updateNodeRelationship
} from '@/core/utils/drag-utils';

// 导入自定义样式
import '@/styles/mindmap.css';

// 为window对象扩展自定义属性
declare global {
  interface Window {
    tabKeyHandled?: boolean;
    shiftTabKeyHandled?: boolean;
    keyEventHandled?: boolean;
    logKeyboardEvent?: (source: string, event: KeyboardEvent, handled?: boolean) => void;
    debugShortcuts?: boolean;
  }
}

// 在文件开头添加全局变量声明
let isProcessingKeyDown = false;

// 节点拖拽和吸附相关类型
type DraggingState = {
  isDragging: boolean;
  nodeId: string | null;
  startPosition: NodePosition | null;
  currentPosition: NodePosition | null;
  snapTarget: { 
    nodeId: string; 
    distance: number 
  } | null;
};

// 节流函数，限制函数执行频率
const throttle = <F extends (nodeId: string) => void>(func: F, waitTime: number) => {
  let lastExecTime = 0;
  
  return (nodeId: string): void => {
    const now = Date.now();
    if (now - lastExecTime > waitTime) {
      func(nodeId);
      lastExecTime = now;
    }
  };
};

// 声明SVG相关类型
type SVGPoint = {
  x: number;
  y: number;
};

// 右键菜单相关类型
type ContextMenuInfo = {
  visible: boolean;
  position: { x: number; y: number };
  nodeId: string | null;
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
  user-select: none;
  
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

// 编辑输入框容器
const EditingContainer = styled.foreignObject`
  overflow: visible;
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
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuInfo>({
    visible: false,
    position: { x: 0, y: 0 },
    nodeId: null
  });
  
  // 添加编辑相关状态
  const [editingContent, setEditingContent] = useState('');
  const editInputRef = useRef<InputRef>(null);
  
  // 键盘事件处理函数引用
  const keydownHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  
  // 添加拖拽相关状态
  const [draggingState, setDraggingState] = useState<DraggingState>(() => ({
    isDragging: false,
    nodeId: null,
    startPosition: null,
    currentPosition: null,
    snapTarget: null
  }));
  
  // 动画相关参数
  const animationRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const animationStartPosRef = useRef<NodePosition | null>(null);
  const animationTargetPosRef = useRef<NodePosition | null>(null);
  
  // 吸附距离阈值和动画时间
  const SNAP_THRESHOLD = 50;
  const SNAP_ANIMATION_DURATION = 300;
  
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
  
  // 处理节点点击
  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 双击开始编辑
    if (e.detail === 2) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setEditingContent(node.content);
        setSelectedNodeIds([nodeId]);
        useMindMapStore.getState().setEditingNodeId(nodeId);
        setTimeout(() => {
          if (editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
          }
        }, 0);
      }
      return;
    }
    
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
  
  // 处理节点右键点击
  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 计算右键菜单位置，考虑SVG缩放和平移
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    
    // 设置菜单位置为鼠标点击位置
    setContextMenu({
      visible: true,
      position: { 
        x: e.clientX - svgRect.left, 
        y: e.clientY - svgRect.top 
      },
      nodeId
    });
  };
  
  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu({
      visible: false,
      position: { x: 0, y: 0 },
      nodeId: null
    });
  };
  
  // 背景点击时关闭右键菜单
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setSelectedNodeIds([]);
      closeContextMenu();
    }
  };
  
  // 背景右键点击时阻止默认行为
  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    closeContextMenu();
  };
  
  // 获取当前右键菜单对应的节点
  const getContextMenuNode = () => {
    if (!contextMenu.nodeId) return null;
    return nodes.find(node => node.id === contextMenu.nodeId) || null;
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
  
  // 节点编辑完成提交处理
  const handleEditSubmit = useCallback(() => {
    const state = useMindMapStore.getState();
    if (state.editingNodeId && editingContent.trim() !== '') {
      state.updateNodeContent(state.editingNodeId, editingContent);
    }
    state.setEditingNodeId(null);
  }, [editingContent]);

  // 处理键盘事件
  useEffect(() => {
    // 使用节流函数来处理Tab键
    const addChildNodeThrottled = throttle((nodeId: string) => {
      console.log('执行添加子节点操作', nodeId, new Date().toISOString());
      const { addChildNode } = useMindMapStore.getState();
      addChildNode(nodeId);
    }, 300);
    
    // 使用节流函数来处理Shift+Tab键
    const addSiblingNodeThrottled = throttle((nodeId: string) => {
      console.log('执行添加兄弟节点操作', nodeId, new Date().toISOString());
      const { addSiblingNode } = useMindMapStore.getState();
      addSiblingNode(nodeId);
    }, 300);
    
    // 使用节流函数来处理Delete键
    const deleteNodeThrottled = throttle((nodeId: string) => {
      const { deleteNode } = useMindMapStore.getState();
      deleteNode(nodeId);
    }, 300);
    
    // 创建新的处理函数
    keydownHandlerRef.current = (e: KeyboardEvent) => {
      // 记录键盘事件
      if (window.logKeyboardEvent) {
        window.logKeyboardEvent('MindMap', e, window.keyEventHandled);
      }
      
      // 详细快捷键调试
      if (window.debugShortcuts) {
        const isModKey = e.ctrlKey;
        if (isModKey) {
          console.log(`快捷键调试[MindMap] - 检测到修饰键+${e.key}组合`, {
            isMac: /Mac|iPod|iPhone|iPad/.test(navigator.platform),
            isModifierKey: isModKey,
            key: e.key,
            keyLower: e.key.toLowerCase(),
            handled: window.keyEventHandled,
            activeElement: document.activeElement?.tagName,
            editingNode: useMindMapStore.getState().editingNodeId !== null
          });
        }
      }
      
      // 如果事件已被其他组件处理，则跳过
      if (window.keyEventHandled === true) {
        console.log('MindMap组件：事件已被处理，跳过');
        return;
      }
      
      const { editingNodeId } = useMindMapStore.getState();
      
      // 如果正在编辑或正在处理中，跳过全局快捷键
      if (editingNodeId || isProcessingKeyDown) {
        return;
      }
      
      // 检测Ctrl键组合的文件操作快捷键
      const isModifierKeyPressed = e.ctrlKey;
      if (isModifierKeyPressed && ['n', 'o', 't', 'p', 'm', 'b', 'c', 's', '+', '=', '-', 'z', 'y'].includes(e.key.toLowerCase())) {
        console.log('MindMap组件：跳过文件操作修饰键快捷键', e.key);
        
        // 详细调试
        if (window.debugShortcuts) {
          console.log(`快捷键调试[MindMap] - 跳过处理修饰键+${e.key}组合（交由Toolbar处理）`);
        }
        return;
      }
      
      // 防止重复处理
      isProcessingKeyDown = true;
      
      // 只处理节点内容编辑相关的快捷键
      
      // 删除节点 (Delete/Backspace)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length > 0) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          window.keyEventHandled = true;
          console.log('MindMap组件: 处理Delete键');
          selectedNodeIds.forEach(id => deleteNodeThrottled(id));
        }
      }
      
      // Tab键添加子节点
      else if (e.key === 'Tab' && !e.shiftKey && selectedNodeIds.length === 1) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('MindMap组件: 处理Tab键');
        addChildNodeThrottled(selectedNodeIds[0]);
      }
      
      // Shift+Tab添加兄弟节点
      else if (e.key === 'Tab' && e.shiftKey && selectedNodeIds.length === 1) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('MindMap组件: 处理Shift+Tab键');
        addSiblingNodeThrottled(selectedNodeIds[0]);
      }
      
      // F2或Ctrl+E编辑节点
      else if ((e.key === 'F2' || (isModifierKeyPressed && e.key.toLowerCase() === 'e' && !e.shiftKey)) && selectedNodeIds.length === 1) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log(`MindMap组件: 处理${e.key === 'F2' ? 'F2' : 'Ctrl+E'}键 - 编辑节点`);
        const { setEditingNodeId } = useMindMapStore.getState();
        setEditingNodeId(selectedNodeIds[0]);
      }
      
      // 重置处理状态
      setTimeout(() => {
        isProcessingKeyDown = false;
      }, 300);
    };
    
    // 包装函数，确保使用最新的引用
    const globalKeyDownHandler = (e: KeyboardEvent) => {
      if (keydownHandlerRef.current) {
        keydownHandlerRef.current(e);
      }
    };
    
    // 移除旧的事件监听器
    document.removeEventListener('keydown', globalKeyDownHandler, true);
    
    // 添加新的事件监听器 - 在捕获阶段，保证事件处理顺序一致
    document.addEventListener('keydown', globalKeyDownHandler, true);
    
    console.log('已安装MindMap快捷键处理函数，选中节点数:', selectedNodeIds.length);
    
    return () => {
      document.removeEventListener('keydown', globalKeyDownHandler, true);
      console.log('已移除MindMap快捷键处理函数');
    };
  }, [selectedNodeIds]);
  
  // 处理节点编辑时的键盘事件
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    // 回车提交
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    }
    // ESC取消
    else if (e.key === 'Escape') {
      const { setEditingNodeId } = useMindMapStore.getState();
      setEditingNodeId(null);
    }
  };
  
  // 处理节点拖拽开始
  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    // 如果是右键点击或当前正在编辑，不启动拖拽
    if (e.button === 2 || useMindMapStore.getState().editingNodeId) return;
    
    e.stopPropagation();
    
    // 获取节点
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.position) return;
    
    // 设置为选中状态
    setSelectedNodeIds([nodeId]);
    
    // 设置拖拽状态
    setDraggingState({
      isDragging: true,
      nodeId,
      startPosition: { ...node.position },
      currentPosition: { ...node.position },
      snapTarget: null
    });
    
    console.log('开始拖拽节点:', nodeId);
  };
  
  // 处理拖拽移动
  const handleNodeDrag = (e: MouseEvent) => {
    if (!draggingState.isDragging || !draggingState.nodeId) return;
    
    // 转换鼠标坐标到SVG坐标
    const position = clientToSVGPoint(e.clientX, e.clientY);
    
    // 查找最近的吸附目标
    const closestResult = findClosestNode(
      nodes,
      draggingState.nodeId,
      position,
      SNAP_THRESHOLD
    );
    
    // 调试日志
    console.log('吸附检测:', closestResult ? `发现吸附目标: ${closestResult.node.id}, 距离: ${closestResult.distance}` : '无吸附目标');
    
    // 更新拖拽状态
    setDraggingState(prev => ({
      ...prev,
      currentPosition: position,
      snapTarget: closestResult ? {
        nodeId: closestResult.node.id,
        distance: closestResult.distance
      } : null
    }));
    
    // 更新节点位置
    updateNodeVisualPosition(draggingState.nodeId, position);
  };
  
  // 处理拖拽结束
  const handleNodeDragEnd = () => {
    if (!draggingState.isDragging || !draggingState.nodeId || !draggingState.currentPosition) return;
    
    console.log('拖拽结束:', {
      nodeId: draggingState.nodeId,
      hasSnapTarget: !!draggingState.snapTarget,
      currentPosition: draggingState.currentPosition
    });
    
    // 保存当前拖拽状态，避免状态重置导致信息丢失
    const currentDragState: DraggingState = {
      isDragging: draggingState.isDragging,
      nodeId: draggingState.nodeId,
      startPosition: draggingState.startPosition ? { ...draggingState.startPosition } : null,
      currentPosition: draggingState.currentPosition ? { ...draggingState.currentPosition } : null,
      snapTarget: draggingState.snapTarget ? {
        nodeId: draggingState.snapTarget.nodeId,
        distance: draggingState.snapTarget.distance
      } : null
    };
    
    // 如果有吸附目标，执行吸附动画
    if (currentDragState.snapTarget && currentDragState.currentPosition) {
      const targetNode = nodes.find(n => n.id === currentDragState.snapTarget!.nodeId);
      
      if (targetNode && targetNode.position) {
        console.log('开始吸附动画, 目标节点:', targetNode.id);
        // 确保位置属性是完整的
        const currentPosition = { 
          x: currentDragState.currentPosition.x,
          y: currentDragState.currentPosition.y 
        };
        
        // 设置动画参数
        animationStartTimeRef.current = Date.now();
        animationStartPosRef.current = currentPosition;
        animationTargetPosRef.current = { 
          x: targetNode.position.x,
          y: targetNode.position.y
        };
        
        // 启动动画
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = requestAnimationFrame(() => animateSnap(currentDragState));
      } else {
        console.warn('吸附失败: 找不到目标节点或位置为空');
        // 没找到目标节点或位置信息，直接保存当前位置
        if (currentDragState.nodeId && currentDragState.currentPosition) {
          saveNodePositionOnly(currentDragState.nodeId, currentDragState.currentPosition);
        }
      }
    } else {
      // 没有吸附目标，直接保存位置
      if (currentDragState.nodeId && currentDragState.currentPosition) {
        saveNodePositionOnly(currentDragState.nodeId, currentDragState.currentPosition);
      }
    }
    
    // 重置拖拽和吸附状态
    setDraggingState({
      isDragging: false,
      nodeId: null,
      startPosition: null,
      currentPosition: null,
      snapTarget: null
    });
    
    console.log('结束拖拽节点');
  };
  
  // 仅更新节点位置，不改变关系
  const saveNodePositionOnly = (nodeId: string, position: NodePosition) => {
    console.log('仅保存节点位置:', { nodeId, position });
    
    const { executeWithHistory } = useMindMapStore.getState();
    
    executeWithHistory(({ nodes, relationships }) => {
      const updatedNodes = [...nodes];
      const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId);
      
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          position: { ...position }
        };
      }
      
      return { nodes: updatedNodes, relationships };
    });
  };
  
  // 临时更新节点视觉位置
  const updateNodeVisualPosition = (nodeId: string, position: NodePosition) => {
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
  
  // 吸附动画 - 修改为接收当前拖拽状态的副本
  const animateSnap = (dragState: DraggingState) => {
    const now = Date.now();
    const startTime = animationStartTimeRef.current || now;
    const startPos = animationStartPosRef.current;
    const targetPos = animationTargetPosRef.current;
    
    if (!startPos || !targetPos || !dragState.nodeId) {
      console.error('吸附动画参数错误', { startPos, targetPos, nodeId: dragState.nodeId });
      return;
    }
    
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / SNAP_ANIMATION_DURATION, 1);
    
    // 计算当前位置
    const currentPos = calculateAnimatedPosition(
      startPos,
      targetPos,
      progress,
      easeOutElastic
    );
    
    // 更新节点视觉位置
    updateNodeVisualPosition(dragState.nodeId, currentPos);
    
    // 动画完成
    if (progress === 1) {
      console.log('🔄 吸附动画完成');
      
      // 确保有正确的吸附目标
      if (!dragState.snapTarget) {
        console.warn('⚠️ 动画完成但吸附目标为空');
        return;
      }
      
      console.log('📌 开始更新节点关系', {
        draggedNodeId: dragState.nodeId,
        targetNodeId: dragState.snapTarget.nodeId
      });
      
      // 使用状态管理更新节点位置和关系
      const { executeWithHistory } = useMindMapStore.getState();
      
      // 更新节点位置和父子关系
      executeWithHistory(({ nodes, relationships }) => {
        console.log('🔄 执行节点关系更新操作');
        
        // 1. 更新节点位置到目标位置
        let updatedNodes = [...nodes];
        const nodeIndex = updatedNodes.findIndex(n => n.id === dragState.nodeId);
        
        if (nodeIndex !== -1) {
          console.log('📍 更新拖拽节点位置到目标位置');
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            position: { x: targetPos.x, y: targetPos.y }
          };
        }
        
        // 2. 更新节点父子关系
        console.log('👨‍👧‍👦 更新节点父子关系');
        updatedNodes = updateNodeRelationship(
          updatedNodes,
          dragState.nodeId!,
          dragState.snapTarget!.nodeId
        );
        
        return { 
          nodes: updatedNodes, 
          relationships 
        };
      });
      
      // 显示吸附成功提示
      showSnapSuccessMessage(dragState.snapTarget.nodeId);
      
      // 延迟一段时间后触发布局刷新，确保UI更新完成
      setTimeout(() => {
        console.log('🔄 触发布局重新计算');
        const { calculateAndUpdateLayout } = useMindMapStore.getState();
        if (calculateAndUpdateLayout) {
          calculateAndUpdateLayout();
        }
      }, 500);
      
      // 重置动画参数
      animationStartTimeRef.current = null;
      animationStartPosRef.current = null;
      animationTargetPosRef.current = null;
      animationRef.current = null;
    } else {
      // 继续动画
      animationRef.current = requestAnimationFrame(() => animateSnap(dragState));
    }
  };
  
  // 显示吸附成功的视觉反馈
  const showSnapSuccessMessage = (targetNodeId: string) => {
    const targetNode = nodes.find(n => n.id === targetNodeId);
    if (!targetNode || !targetNode.position) return;
    
    // 创建一个临时元素显示吸附成功
    const messageElement = document.createElement('div');
    messageElement.className = 'snap-success-message';
    messageElement.textContent = '已设为父节点';
    messageElement.style.position = 'absolute';
    messageElement.style.left = `${targetNode.position.x + 100}px`;
    messageElement.style.top = `${targetNode.position.y - 30}px`;
    messageElement.style.backgroundColor = 'rgba(82, 196, 26, 0.8)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '4px 8px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.fontSize = '12px';
    messageElement.style.zIndex = '1000';
    messageElement.style.pointerEvents = 'none';
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(10px)';
    messageElement.style.transition = 'opacity 0.3s, transform 0.3s';
    
    document.body.appendChild(messageElement);
    
    // 显示消息
    setTimeout(() => {
      messageElement.style.opacity = '1';
      messageElement.style.transform = 'translateY(0)';
    }, 10);
    
    // 渐隐消息
    setTimeout(() => {
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        document.body.removeChild(messageElement);
      }, 300);
    }, 2000);
  };
  
  // 渲染节点
  const renderNodes = () => {
    console.log('renderNodes被调用，节点数量:', nodes.length);
    if (nodes.length === 0) {
      console.log('无节点可渲染');
      return [];
    }
    
    // 获取当前编辑中的节点ID
    const { editingNodeId } = useMindMapStore.getState();
    
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
      // 引用节点使用半透明背景
      const fillOpacity = node.isReference ? 0.8 : 1;
      const borderColor = selectedNodeIds.includes(node.id) ? '#1890ff' : (node.isReference ? '#722ed1' : (node.style.borderColor || '#cccccc'));
      const borderWidth = node.style.borderWidth || 1;
      
      const isEditing = editingNodeId === node.id;
      const isDragging = draggingState.nodeId === node.id;
      const isSnapTarget = draggingState.snapTarget ? draggingState.snapTarget.nodeId === node.id : false;
      
      console.log('渲染节点:', node.id, node.content, 'position:', x, y, '编辑状态:', isEditing);
      
      return (
        <g 
          key={node.id} 
          transform={`translate(${x}, ${y})`}
          onClick={(e) => handleNodeClick(node.id, e)}
          onMouseDown={(e) => handleNodeDragStart(e, node.id)}
          onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
          style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
          className={`${isSnapTarget ? 'snap-target' : ''} ${isDragging ? 'dragging-node' : ''}`}
        >
          {/* 节点背景 */}
          <rect
            x={-width/2}
            y={-height/2}
            width={width}
            height={height}
            fill={backgroundColor}
            fillOpacity={fillOpacity}
            stroke={isSnapTarget ? '#52c41a' : borderColor}
            strokeWidth={isSnapTarget ? 3 : borderWidth + 1}
            strokeDasharray={isSnapTarget ? '5,5' : 'none'}
            rx={5}
            ry={5}
          />
          
          {/* 吸附指示器：当接近目标时显示 */}
          {isSnapTarget && (
            <circle
              r={Math.min(width, height) / 2 + 10}
              fill="none"
              stroke="#52c41a"
              strokeWidth={2}
              strokeDasharray="5,5"
              opacity={0.7}
              className="snap-indicator"
            />
          )}
          
          {/* 节点内容或编辑框 */}
          {isEditing ? (
            <EditingContainer
              x={-width/2}
              y={-height/2}
              width={width}
              height={height}
            >
              <Input
                ref={editInputRef}
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onBlur={handleEditSubmit}
                onKeyDown={handleInputKeyDown}
                style={{
                  fontSize: `${node.style.fontSize || 14}px`,
                  fontWeight: node.style.fontWeight || 'normal',
                  color: node.style.fontColor || '#333333',
                  textAlign: 'center',
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: '2px solid #1890ff',
                  padding: '2px',
                  backgroundColor: 'transparent'
                }}
              />
            </EditingContainer>
          ) : (
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
          )}
          
          {/* 引用指示器 */}
          {node.isReference && (
            <text
              x={-width/2 + 12}
              y={-height/2 + 12}
              fontSize={12}
              fill="#722ed1"
            >
              ↗
            </text>
          )}
          
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
  
  // 添加全局事件监听
  useEffect(() => {
    // 只有在拖拽状态下才注册事件
    if (!draggingState.isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      handleNodeDrag(e);
    };
    
    const handleMouseUp = () => {
      handleNodeDragEnd();
    };
    
    // 添加全局事件监听
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingState.isDragging, draggingState.nodeId]);
  
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
        onContextMenu={handleBackgroundContextMenu}
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
        <>
          <DebugButton 
            onClick={handleAddDebugNode}
            style={{ bottom: '60px' }}
          >
            添加测试节点
          </DebugButton>
          
          <DebugButton 
            onClick={() => {
              // 测试吸附功能: 选择两个随机节点，模拟一个拖拽到另一个
              if (nodes.length < 2) {
                console.error('节点数量不足，无法测试');
                return;
              }
              
              // 找到两个不同的节点
              const randomIndex1 = Math.floor(Math.random() * nodes.length);
              let randomIndex2 = Math.floor(Math.random() * nodes.length);
              // 确保两个节点不同
              while (randomIndex1 === randomIndex2 || 
                    !nodes[randomIndex1].position || 
                    !nodes[randomIndex2].position) {
                randomIndex2 = Math.floor(Math.random() * nodes.length);
              }
              
              const dragNode = nodes[randomIndex1];
              const targetNode = nodes[randomIndex2];
              
              console.log('🧪 测试吸附功能:', {
                dragNode: {
                  id: dragNode.id,
                  content: dragNode.content,
                  parent: dragNode.parent
                },
                targetNode: {
                  id: targetNode.id,
                  content: targetNode.content,
                  children: targetNode.children.length
                }
              });
              
              // 模拟拖拽开始
              const currentDragState: DraggingState = {
                isDragging: true,
                nodeId: dragNode.id,
                startPosition: { ...dragNode.position! },
                currentPosition: { ...dragNode.position! },
                snapTarget: {
                  nodeId: targetNode.id,
                  distance: 10 // 模拟一个小距离
                }
              };
              
              // 设置动画参数
              animationStartTimeRef.current = Date.now();
              animationStartPosRef.current = { ...dragNode.position! };
              animationTargetPosRef.current = { ...targetNode.position! };
              
              // 启动动画
              if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
              }
              animationRef.current = requestAnimationFrame(() => animateSnap(currentDragState));
            }}
            style={{ bottom: '100px' }}
          >
            测试吸附功能
          </DebugButton>
        </>
      )}
      
      {/* 节点右键菜单 */}
      {contextMenu.visible && contextMenu.nodeId && (
        <NodeReferenceMenu
          node={getContextMenuNode()!}
          position={contextMenu.position}
          onClose={closeContextMenu}
        />
      )}
    </SVGContainer>
  );
};

export default MindMap;
