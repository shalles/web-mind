import { create } from 'zustand';
import { MindNode, NodeStyle, ConnectionStyle, NodeIcon, NodeImage, Relationship } from '@/types/mindmap';
import { createInitialMindMap, flattenNodes } from '@/core/models/mindmap';
import { calculateMindMapLayout } from '@/core/layouts/mindmap-layout';
import {
  addChildNode,
  addSiblingNodeFunc,
  deleteNodeFunc,
  updateNodeContentFunc,
  updateNodeStyleFunc,
  toggleNodeExpandedFunc,
  findNodeById
} from '@/core/operations/node-operations';
import { v4 as uuidv4 } from 'uuid';

export interface MindMapState {
  // 数据状态
  nodes: MindNode[];
  selectedNodeIds: string[];
  editingNodeId: string | null;
  rootNode?: MindNode;
  theme: string;
  zoom: number;
  connectionStyle: ConnectionStyle;
  relationships: Relationship[];
  undoStack: {
    nodes: MindNode[];
    relationships: Relationship[];
  }[];
  redoStack: {
    nodes: MindNode[];
    relationships: Relationship[];
  }[];
  
  // 节点操作
  setNodes: (nodes: MindNode[]) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setEditingNodeId: (id: string | null) => void;
  setTheme: (theme: string) => void;
  setZoom: (zoom: number) => void;
  setConnectionStyle: (style: ConnectionStyle) => void;
  
  // 内部操作
  executeWithHistory: (operation: (state: { 
    nodes: MindNode[]; 
    relationships: Relationship[]; 
  }) => { 
    nodes: MindNode[]; 
    relationships: Relationship[];
  }) => void;
  
  // 高级节点操作
  addChildNode: (parentId: string, content?: string) => void;
  addSiblingNode: (siblingId: string, content?: string) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeContent: (nodeId: string, content: string) => void;
  updateNodeStyle: (nodeId: string, style: Partial<NodeStyle>) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  updateNodeNote: (nodeId: string, note: string) => void;
  updateNodeIcon: (nodeId: string, icon: NodeIcon | undefined) => void;
  updateNodeImage: (nodeId: string, image: NodeImage | undefined) => void;
  createNodeReference: (sourceNodeId: string, targetLocation: string) => void;
  
  // 关系连线操作
  addRelationship: (sourceId: string, targetId: string, label?: string) => void;
  updateRelationship: (relationshipId: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (relationshipId: string) => void;
  
  // 历史操作
  undo: () => void;
  redo: () => void;
  
  // 导出
  exportToJSON: () => string;
  exportToImage: () => string;
  
  // 初始化
  initialize: () => void;
}

const DEFAULT_CONNECTION_STYLE: ConnectionStyle = {
  lineColor: '#c0c0c0',
  lineWidth: 1.5,
  lineStyle: 'curved',
  lineType: 'solid',
};

const useMindMapStore = create<MindMapState>((set, get) => ({
  // 初始状态
  nodes: [],
  selectedNodeIds: [],
  editingNodeId: null,
  theme: 'default',
  zoom: 1,
  connectionStyle: DEFAULT_CONNECTION_STYLE,
  relationships: [],
  undoStack: [],
  redoStack: [],
  
  // 基础状态设置
  setNodes: (nodes) => set({ nodes }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  setEditingNodeId: (id) => set({ editingNodeId: id }),
  setTheme: (theme) => set({ theme }),
  setZoom: (zoom) => set({ zoom }),
  setConnectionStyle: (style) => set({ connectionStyle: { ...get().connectionStyle, ...style } }),
  
  // 记录历史状态的操作封装
  executeWithHistory: (operation) => {
    const { nodes, relationships, undoStack } = get();
    // 保存当前状态到撤销栈
    const newUndoStack = [...undoStack, { nodes: [...nodes], relationships: [...relationships] }];
    
    // 执行操作并更新状态
    const newState = operation({ nodes, relationships });
    
    // 清空重做栈，因为有了新的操作
    set({
      nodes: newState.nodes,
      relationships: newState.relationships,
      undoStack: newUndoStack,
      redoStack: []
    });
    
    // 重新布局
    const rootNode = findNodeById(newState.nodes, newState.nodes.find(n => n.level === 0)?.id || '');
    if (rootNode) {
      const layoutedRoot = calculateMindMapLayout(rootNode);
      const flatNodes = flattenNodes(layoutedRoot);
      set({ nodes: flatNodes });
    }
  },
  
  // 添加子节点
  addChildNode: (parentId, content = '新节点') => {
    get().executeWithHistory(({ nodes, relationships }) => ({
      nodes: addChildNode(nodes, parentId, content),
      relationships
    }));
  },
  
  // 添加兄弟节点
  addSiblingNode: (siblingId, content = '新节点') => {
    get().executeWithHistory(({ nodes, relationships }) => ({
      nodes: addSiblingNodeFunc(nodes, siblingId, content),
      relationships
    }));
  },
  
  // 删除节点
  deleteNode: (nodeId) => {
    const { selectedNodeIds } = get();
    
    get().executeWithHistory(({ nodes, relationships }) => {
      // 过滤掉涉及该节点的所有关系连线
      const updatedRelationships = relationships.filter(
        r => r.sourceId !== nodeId && r.targetId !== nodeId
      );
      
      return {
        nodes: deleteNodeFunc(nodes, nodeId),
        relationships: updatedRelationships
      };
    });
    
    // 如果删除的是当前选中的节点，清除选择
    if (selectedNodeIds.includes(nodeId)) {
      set({ selectedNodeIds: selectedNodeIds.filter(id => id !== nodeId) });
    }
  },
  
  // 更新节点内容
  updateNodeContent: (nodeId, content) => {
    get().executeWithHistory(({ nodes, relationships }) => ({
      nodes: updateNodeContentFunc(nodes, nodeId, content),
      relationships
    }));
  },
  
  // 更新节点样式
  updateNodeStyle: (nodeId, style) => {
    get().executeWithHistory(({ nodes, relationships }) => ({
      nodes: updateNodeStyleFunc(nodes, nodeId, style),
      relationships
    }));
  },
  
  // 切换节点展开/折叠状态
  toggleNodeExpanded: (nodeId) => {
    get().executeWithHistory(({ nodes, relationships }) => ({
      nodes: toggleNodeExpandedFunc(nodes, nodeId),
      relationships
    }));
  },
  
  // 更新节点备注
  updateNodeNote: (nodeId, note) => {
    get().executeWithHistory(({ nodes, relationships }) => {
      const updatedNodes = [...nodes];
      const nodeIndex = updatedNodes.findIndex(node => node.id === nodeId);
      
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          note
        };
      }
      
      return { nodes: updatedNodes, relationships };
    });
  },
  
  // 更新节点图标
  updateNodeIcon: (nodeId, icon) => {
    get().executeWithHistory(({ nodes, relationships }) => {
      const updatedNodes = [...nodes];
      const nodeIndex = updatedNodes.findIndex(node => node.id === nodeId);
      
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          icon
        };
      }
      
      return { nodes: updatedNodes, relationships };
    });
  },
  
  // 更新节点图片
  updateNodeImage: (nodeId, image) => {
    get().executeWithHistory(({ nodes, relationships }) => {
      const updatedNodes = [...nodes];
      const nodeIndex = updatedNodes.findIndex(node => node.id === nodeId);
      
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          image
        };
      }
      
      return { nodes: updatedNodes, relationships };
    });
  },
  
  // 创建节点引用
  createNodeReference: (sourceNodeId, targetParentId) => {
    get().executeWithHistory(({ nodes, relationships }) => {
      const sourceNode = findNodeById(nodes, sourceNodeId);
      if (!sourceNode) return { nodes, relationships };
      
      const targetParent = findNodeById(nodes, targetParentId);
      if (!targetParent) return { nodes, relationships };
      
      // 创建引用节点
      const referenceNode: MindNode = {
        ...sourceNode,
        id: uuidv4(), // 新ID
        parent: targetParentId,
        refId: sourceNodeId, // 指向源节点
        isReference: true,
        children: [] // 引用节点初始不包含子节点
      };
      
      // 计算新节点的插入位置
      const updatedNodes = [...nodes];
      
      // 更新父节点的children数组
      const parentIndex = updatedNodes.findIndex(node => node.id === targetParentId);
      if (parentIndex !== -1) {
        updatedNodes[parentIndex].children.push(referenceNode);
      }
      
      // 添加引用节点到数组
      updatedNodes.push(referenceNode);
      
      return { nodes: updatedNodes, relationships };
    });
  },
  
  // 添加关系连线
  addRelationship: (sourceId, targetId, label = '') => {
    get().executeWithHistory(({ nodes, relationships }) => {
      // 检查是否已存在相同的关系连线
      const existingRelationship = relationships.find(
        r => r.sourceId === sourceId && r.targetId === targetId
      );
      
      if (existingRelationship) return { nodes, relationships };
      
      // 创建新关系连线
      const newRelationship: Relationship = {
        id: uuidv4(),
        sourceId,
        targetId,
        label,
        style: { ...DEFAULT_CONNECTION_STYLE }
      };
      
      return {
        nodes,
        relationships: [...relationships, newRelationship]
      };
    });
  },
  
  // 更新关系连线
  updateRelationship: (relationshipId, updates) => {
    get().executeWithHistory(({ nodes, relationships }) => {
      const updatedRelationships = relationships.map(relationship => 
        relationship.id === relationshipId
          ? { ...relationship, ...updates }
          : relationship
      );
      
      return { nodes, relationships: updatedRelationships };
    });
  },
  
  // 删除关系连线
  deleteRelationship: (relationshipId) => {
    get().executeWithHistory(({ nodes, relationships }) => {
      const updatedRelationships = relationships.filter(
        relationship => relationship.id !== relationshipId
      );
      
      return { nodes, relationships: updatedRelationships };
    });
  },
  
  // 撤销操作
  undo: () => {
    const { undoStack, nodes, relationships, redoStack } = get();
    if (undoStack.length === 0) return;
    
    // 弹出最后一个状态
    const newUndoStack = [...undoStack];
    const previousState = newUndoStack.pop()!;
    
    // 当前状态推入重做栈
    const newRedoStack = [...redoStack, { nodes: [...nodes], relationships: [...relationships] }];
    
    // 恢复之前的状态
    set({
      nodes: previousState.nodes,
      relationships: previousState.relationships,
      undoStack: newUndoStack,
      redoStack: newRedoStack
    });
  },
  
  // 重做操作
  redo: () => {
    const { redoStack, nodes, relationships, undoStack } = get();
    if (redoStack.length === 0) return;
    
    // 弹出最后一个状态
    const newRedoStack = [...redoStack];
    const nextState = newRedoStack.pop()!;
    
    // 当前状态推入撤销栈
    const newUndoStack = [...undoStack, { nodes: [...nodes], relationships: [...relationships] }];
    
    // 恢复之后的状态
    set({
      nodes: nextState.nodes,
      relationships: nextState.relationships,
      undoStack: newUndoStack,
      redoStack: newRedoStack
    });
  },
  
  // 导出为JSON
  exportToJSON: () => {
    const { nodes, relationships } = get();
    return JSON.stringify({ nodes, relationships });
  },
  
  // 导出为图片
  exportToImage: () => {
    // 这里需要实现SVG转换为图片的逻辑
    // 可以使用html-to-image库
    return '';
  },
  
  // 初始化思维导图
  initialize: () => {
    const initialRoot = createInitialMindMap();
    const layoutedRoot = calculateMindMapLayout(initialRoot);
    const flatNodes = flattenNodes(layoutedRoot);
    set({ 
      nodes: flatNodes,
      relationships: []
    });
    
    // 打印调试信息
    console.log('初始化思维导图成功');
    console.log('节点数量:', flatNodes.length);
    console.log('根节点:', layoutedRoot);
  }
}));

export default useMindMapStore;
