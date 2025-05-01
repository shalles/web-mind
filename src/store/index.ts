import { create } from 'zustand';
import { MindNode, NodeStyle, ConnectionStyle } from '@/types/mindmap';
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

export interface MindMapState {
  // 数据状态
  nodes: MindNode[];
  selectedNodeIds: string[];
  editingNodeId: string | null;
  rootNode?: MindNode;
  theme: string;
  zoom: number;
  connectionStyle: ConnectionStyle;
  undoStack: MindNode[][];
  redoStack: MindNode[][];
  
  // 节点操作
  setNodes: (nodes: MindNode[]) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setEditingNodeId: (id: string | null) => void;
  setTheme: (theme: string) => void;
  setZoom: (zoom: number) => void;
  setConnectionStyle: (style: ConnectionStyle) => void;
  
  // 内部操作
  executeWithHistory: (operation: (nodes: MindNode[]) => MindNode[]) => void;
  
  // 高级节点操作
  addChildNode: (parentId: string, content?: string) => void;
  addSiblingNode: (siblingId: string, content?: string) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeContent: (nodeId: string, content: string) => void;
  updateNodeStyle: (nodeId: string, style: Partial<NodeStyle>) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  
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
  executeWithHistory: (operation: (nodes: MindNode[]) => MindNode[]) => {
    const { nodes, undoStack } = get();
    // 保存当前状态到撤销栈
    const newUndoStack = [...undoStack, [...nodes]];
    
    // 执行操作并更新状态
    const newNodes = operation(nodes);
    
    // 清空重做栈，因为有了新的操作
    set({
      nodes: newNodes,
      undoStack: newUndoStack,
      redoStack: []
    });
    
    // 重新布局
    const rootNode = findNodeById(newNodes, newNodes.find(n => n.level === 0)?.id || '');
    if (rootNode) {
      const layoutedRoot = calculateMindMapLayout(rootNode);
      const flatNodes = flattenNodes(layoutedRoot);
      set({ nodes: flatNodes });
    }
  },
  
  // 添加子节点
  addChildNode: (parentId, content = '新节点') => {
    get().executeWithHistory((nodes: MindNode[]) => addChildNode(nodes, parentId, content));
  },
  
  // 添加兄弟节点
  addSiblingNode: (siblingId, content = '新节点') => {
    get().executeWithHistory((nodes: MindNode[]) => addSiblingNodeFunc(nodes, siblingId, content));
  },
  
  // 删除节点
  deleteNode: (nodeId) => {
    get().executeWithHistory((nodes: MindNode[]) => deleteNodeFunc(nodes, nodeId));
    // 如果删除的是当前选中的节点，清除选择
    const { selectedNodeIds } = get();
    if (selectedNodeIds.includes(nodeId)) {
      set({ selectedNodeIds: selectedNodeIds.filter(id => id !== nodeId) });
    }
  },
  
  // 更新节点内容
  updateNodeContent: (nodeId, content) => {
    get().executeWithHistory((nodes: MindNode[]) => updateNodeContentFunc(nodes, nodeId, content));
  },
  
  // 更新节点样式
  updateNodeStyle: (nodeId, style) => {
    get().executeWithHistory((nodes: MindNode[]) => updateNodeStyleFunc(nodes, nodeId, style));
  },
  
  // 切换节点展开/折叠状态
  toggleNodeExpanded: (nodeId) => {
    get().executeWithHistory((nodes: MindNode[]) => toggleNodeExpandedFunc(nodes, nodeId));
  },
  
  // 撤销操作
  undo: () => {
    const { undoStack, nodes, redoStack } = get();
    if (undoStack.length === 0) return;
    
    // 弹出最后一个状态
    const newUndoStack = [...undoStack];
    const previousState = newUndoStack.pop()!;
    
    // 当前状态推入重做栈
    const newRedoStack = [...redoStack, [...nodes]];
    
    // 恢复之前的状态
    set({
      nodes: previousState,
      undoStack: newUndoStack,
      redoStack: newRedoStack
    });
  },
  
  // 重做操作
  redo: () => {
    const { redoStack, nodes, undoStack } = get();
    if (redoStack.length === 0) return;
    
    // 弹出最后一个状态
    const newRedoStack = [...redoStack];
    const nextState = newRedoStack.pop()!;
    
    // 当前状态推入撤销栈
    const newUndoStack = [...undoStack, [...nodes]];
    
    // 恢复之后的状态
    set({
      nodes: nextState,
      undoStack: newUndoStack,
      redoStack: newRedoStack
    });
  },
  
  // 导出为JSON
  exportToJSON: () => {
    const { nodes } = get();
    return JSON.stringify(nodes);
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
      selectedNodeIds: [],
      editingNodeId: null,
      undoStack: [],
      redoStack: []
    });
  }
}));

export default useMindMapStore;
