import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import useMindMapStore from '@/store';
import Connection from './Connection';
import RelationshipLine from './RelationshipLine';
import Toolbar from '../Toolbar';
import { addDebugNode } from '@/core/operations/node-operations';
import NodeReferenceMenu from './NodeReferenceMenu';
import { Input, InputRef } from 'antd';

// 为window对象扩展自定义属性
declare global {
  interface Window {
    tabKeyHandled?: boolean;
    shiftTabKeyHandled?: boolean;
  }
}

// 在文件开头添加全局变量声明
let isProcessingKeyDown = false;

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
  const keydownHandlerRef = useRef<(e: KeyboardEvent) => void>();
  
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
  
  // 处理编辑提交
  const handleEditSubmit = useCallback(() => {
    const { editingNodeId, updateNodeContent, setEditingNodeId } = useMindMapStore.getState();
    if (editingNodeId && editingContent.trim() !== '') {
      updateNodeContent(editingNodeId, editingContent);
    }
    setEditingNodeId(null);
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
      const { editingNodeId } = useMindMapStore.getState();
      
      // 如果正在编辑或正在处理中，跳过全局快捷键
      if (editingNodeId || isProcessingKeyDown) return;
      
      // 防止重复处理
      isProcessingKeyDown = true;
      
      // 删除节点 (Delete/Backspace)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length > 0) {
        e.preventDefault();
        selectedNodeIds.forEach(id => deleteNodeThrottled(id));
      }
      
      // Tab键添加子节点
      if (e.key === 'Tab' && !e.shiftKey && selectedNodeIds.length === 1) {
        e.preventDefault();
        addChildNodeThrottled(selectedNodeIds[0]);
      }
      
      // Shift+Tab添加兄弟节点
      if (e.key === 'Tab' && e.shiftKey && selectedNodeIds.length === 1) {
        e.preventDefault();
        addSiblingNodeThrottled(selectedNodeIds[0]);
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
    document.removeEventListener('keydown', globalKeyDownHandler);
    
    // 添加新的事件监听器
    document.addEventListener('keydown', globalKeyDownHandler);
    
    return () => {
      document.removeEventListener('keydown', globalKeyDownHandler);
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
      
      console.log('渲染节点:', node.id, node.content, 'position:', x, y, '编辑状态:', isEditing);
      
      return (
        <g 
          key={node.id} 
          transform={`translate(${x}, ${y})`}
          onClick={(e) => handleNodeClick(node.id, e)}
          onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
          style={{ cursor: 'pointer' }}
        >
          {/* 节点背景 */}
          <rect
            x={-width/2}
            y={-height/2}
            width={width}
            height={height}
            fill={backgroundColor}
            fillOpacity={fillOpacity}
            stroke={borderColor}
            strokeWidth={borderWidth + 1}
            rx={5}
            ry={5}
          />
          
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
        <DebugButton 
          onClick={handleAddDebugNode}
          style={{ bottom: '60px' }}
        >
          添加测试节点
        </DebugButton>
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
