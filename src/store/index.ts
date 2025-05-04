import { create } from 'zustand';
import { MindNode, NodeStyle, ConnectionStyle, NodeIcon, NodeImage, Relationship, BackgroundConfig } from '@/types/mindmap';
import { createInitialMindMap, flattenNodes, createNode } from '@/core/models/mindmap';
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

// IndexedDB数据库名和版本
const DB_NAME = 'mindmapDB';
const DB_VERSION = 1;
const STORE_NAME = 'mindmaps';
const CURRENT_MAP_KEY = 'currentMap';
const TEMPLATES_STORE = 'templates';

// 打开IndexedDB连接
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB打开失败:', event);
      reject(new Error('无法打开IndexedDB数据库'));
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建思维导图存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        console.log(`创建存储: ${STORE_NAME}`);
      }
      
      // 创建模板存储
      if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
        db.createObjectStore(TEMPLATES_STORE, { keyPath: 'id' });
        console.log(`创建存储: ${TEMPLATES_STORE}`);
      }
    };
  });
};

// 保存思维导图到IndexedDB
const saveMindMapToDB = async (id: string, data: { nodes: MindNode[], relationships: Relationship[], background: BackgroundConfig }): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // 保存思维导图数据
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id,
        ...data,
        updatedAt: new Date().toISOString()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event);
    });
    
    // 设置为当前思维导图
    await new Promise<void>((resolve, reject) => {
      const settingsTransaction = db.transaction(STORE_NAME, 'readwrite');
      const settingsStore = settingsTransaction.objectStore(STORE_NAME);
      const request = settingsStore.put({
        id: CURRENT_MAP_KEY,
        currentMapId: id,
        updatedAt: new Date().toISOString()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event);
    });
    
    console.log(`思维导图 ${id} 已保存到IndexedDB`);
  } catch (error) {
    console.error('保存思维导图失败:', error);
  }
};

// 从IndexedDB加载思维导图
const loadMindMapFromDB = async (id: string): Promise<{ nodes: MindNode[], relationships: Relationship[], background: BackgroundConfig } | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          const { nodes, relationships, background } = request.result;
          resolve({ nodes, relationships, background });
        } else {
          resolve(null);
        }
      };
      
      request.onerror = (event) => reject(event);
    });
  } catch (error) {
    console.error('加载思维导图失败:', error);
    return null;
  }
};

// 加载当前思维导图ID
const loadCurrentMapId = async (): Promise<string | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(CURRENT_MAP_KEY);
      
      request.onsuccess = () => {
        if (request.result && request.result.currentMapId) {
          resolve(request.result.currentMapId);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = (event) => reject(event);
    });
  } catch (error) {
    console.error('加载当前思维导图ID失败:', error);
    return null;
  }
};

// 保存模板到IndexedDB
const saveTemplateToDb = async (template: { id: string, name: string, nodes: MindNode[], relationships: Relationship[], background?: BackgroundConfig }): Promise<void> => {
  let db: IDBDatabase | null = null;
  
  try {
    console.log('打开IndexedDB以保存模板...');
    db = await openDB();
    
    // 创建一个独立的事务
    console.log('创建写入事务...');
    const transaction = db.transaction(TEMPLATES_STORE, 'readwrite');
    
    // 为事务设置处理程序
    transaction.oncomplete = () => {
      console.log('模板保存事务完成:', template.id);
    };
    
    transaction.onerror = (event) => {
      console.error('模板保存事务错误:', event);
    };
    
    transaction.onabort = (event) => {
      console.error('模板保存事务中止:', event);
    };
    
    // 获取对象存储
    const store = transaction.objectStore(TEMPLATES_STORE);
    
    console.log('准备将模板写入数据库:', template.id);
    
    // 执行写入操作并等待事务完成
    return new Promise((resolve, reject) => {
      const templateData = {
        ...template,
        createdAt: new Date().toISOString()
      };
      
      console.log('写入模板数据:', templateData);
      const request = store.put(templateData);
      
      request.onsuccess = () => {
        console.log('模板数据写入请求成功:', template.id);
      };
      
      request.onerror = (event) => {
        console.error('写入模板数据失败:', event);
        reject(new Error('写入模板数据失败'));
      };
      
      // 使用事务完成事件来确定是否成功
      transaction.oncomplete = () => {
        console.log('保存模板事务完成:', template.id);
        resolve();
      };
      
      transaction.onerror = (event) => {
        console.error('保存模板事务发生错误:', event);
        reject(new Error('保存模板事务发生错误'));
      };
      
      transaction.onabort = (event) => {
        console.error('保存模板事务被中止:', event);
        reject(new Error('保存模板事务被中止'));
      };
    });
  } catch (error) {
    console.error('保存模板过程中发生错误:', error);
    if (db) db.close();
    throw error;
  }
};

// 加载所有模板
const loadTemplates = async (): Promise<{ id: string, name: string, nodes: MindNode[], relationships: Relationship[], background?: BackgroundConfig }[]> => {
  try {
    console.log('打开IndexedDB以加载模板列表...');
    const db = await openDB();
    
    console.log('创建只读事务...');
    const transaction = db.transaction(TEMPLATES_STORE, 'readonly');
    const store = transaction.objectStore(TEMPLATES_STORE);
    
    // 使用getAll获取所有模板
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const templates = request.result || [];
        console.log(`成功加载了${templates.length}个模板`);
        
        // 映射结果数组，包含必要的字段
        const mappedTemplates = templates.map(template => ({
          id: template.id,
          name: template.name,
          nodes: template.nodes,
          relationships: template.relationships,
          background: template.background
        }));
        
        resolve(mappedTemplates);
      };
      
      request.onerror = (event) => {
        console.error('加载模板列表失败:', event);
        reject(event);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('加载模板列表过程中发生错误:', error);
    return [];
  }
};

// 从IndexedDB中删除模板
const deleteTemplateFromDb = async (templateId: string): Promise<boolean> => {
  let db: IDBDatabase | null = null;
  
  try {
    console.log('打开IndexedDB以删除模板...');
    db = await openDB();
    
    // 不允许删除默认模板
    if (templateId === 'default-example-template') {
      console.error('不能删除默认示例模板');
      return false;
    }
    
    // 创建一个写入事务
    console.log('创建删除事务...');
    const transaction = db.transaction(TEMPLATES_STORE, 'readwrite');
    
    // 获取对象存储
    const store = transaction.objectStore(TEMPLATES_STORE);
    
    return new Promise((resolve, reject) => {
      // 先检查模板是否存在
      const checkRequest = store.get(templateId);
      
      checkRequest.onsuccess = () => {
        if (!checkRequest.result) {
          console.error('要删除的模板不存在:', templateId);
          resolve(false);
          return;
        }
        
        // 模板存在，执行删除
        console.log('执行删除操作...');
        const deleteRequest = store.delete(templateId);
        
        deleteRequest.onsuccess = () => {
          console.log('模板删除成功:', templateId);
          resolve(true);
        };
        
        deleteRequest.onerror = (event) => {
          console.error('删除模板失败:', event);
          reject(new Error('删除模板失败'));
        };
      };
      
      checkRequest.onerror = (event) => {
        console.error('检查模板是否存在失败:', event);
        reject(new Error('检查模板是否存在失败'));
      };
      
      // 设置事务完成、错误和中止的处理程序
      transaction.oncomplete = () => {
        console.log('删除模板事务完成');
      };
      
      transaction.onerror = (event) => {
        console.error('删除模板事务出错:', event);
      };
      
      transaction.onabort = (event) => {
        console.error('删除模板事务被中止:', event);
      };
    });
  } catch (error) {
    console.error('删除模板过程中发生错误:', error);
    if (db) db.close();
    return false;
  }
};

// 默认背景配置
const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: 'color',
  color: '#f5f5f5',
  opacity: 1
};

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
  background: BackgroundConfig; // 背景配置
  undoStack: {
    nodes: MindNode[];
    relationships: Relationship[];
  }[];
  redoStack: {
    nodes: MindNode[];
    relationships: Relationship[];
  }[];
  isAddingNode: boolean; // 添加节点操作状态标志
  currentMapId: string; // 当前思维导图ID
  
  // 节点操作
  setNodes: (nodes: MindNode[]) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setEditingNodeId: (id: string | null) => void;
  setTheme: (theme: string) => void;
  setZoom: (zoom: number) => void;
  setConnectionStyle: (style: ConnectionStyle) => void;
  setBackground: (background: Partial<BackgroundConfig>) => void; // 设置背景
  
  // 内部操作
  executeWithHistory: (operation: (state: { 
    nodes: MindNode[]; 
    relationships: Relationship[]; 
  }) => { 
    nodes: MindNode[]; 
    relationships: Relationship[];
  }) => void;
  
  // 布局操作
  calculateAndUpdateLayout: () => void;
  
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
  createNodeReference: (sourceNodeId: string, targetParentId: string) => void;
  
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
  
  // 导入
  importFromJSON: (jsonString: string) => boolean;
  
  // 本地存储
  saveToLocalStorage: () => Promise<void>;
  loadFromLocalStorage: () => Promise<boolean>;
  createNewMindMap: () => boolean;
  createEmptyMindMap: () => boolean;
  
  // 模板功能
  saveAsTemplate: (name: string) => Promise<string>;
  loadTemplates: () => Promise<{ id: string, name: string, background?: BackgroundConfig }[]>;
  createFromTemplate: (templateId: string) => Promise<boolean>;
  createDefaultTemplates: () => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<boolean>;
  
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
  background: DEFAULT_BACKGROUND, // 默认背景
  undoStack: [],
  redoStack: [],
  isAddingNode: false,
  currentMapId: uuidv4(), // 默认生成一个新的思维导图ID
  
  // 基础状态设置
  setNodes: (nodes) => set({ nodes }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  setEditingNodeId: (id) => set({ editingNodeId: id }),
  setTheme: (theme) => set({ theme }),
  setZoom: (zoom) => set({ zoom }),
  setConnectionStyle: (style) => set({ connectionStyle: { ...get().connectionStyle, ...style } }),
  setBackground: (background) => set({ background: { ...get().background, ...background } }),
  
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
      
      // 自动保存到本地存储
      setTimeout(() => {
        get().saveToLocalStorage();
      }, 100); // 短暂延迟，避免频繁保存
    }
  },
  
  // 添加子节点
  addChildNode: (parentId, content = '新节点') => {
    const state = get();
    
    // 检查是否有正在进行的添加操作
    if (state.isAddingNode) {
      console.log('检测到正在进行的节点添加操作，跳过');
      return;
    }
    
    // 设置添加操作标志
    set({ isAddingNode: true });
    
    // 使用延时执行操作
    setTimeout(() => {
      get().executeWithHistory(({ nodes, relationships }) => ({
        nodes: addChildNode(nodes, parentId, content),
        relationships
      }));
      
      // 重置标志
      set({ isAddingNode: false });
    }, 50);
  },
  
  // 添加兄弟节点
  addSiblingNode: (siblingId, content = '新节点') => {
    const state = get();
    
    // 检查是否有正在进行的添加操作
    if (state.isAddingNode) {
      console.log('检测到正在进行的节点添加操作，跳过');
      return;
    }
    
    // 设置添加操作标志
    set({ isAddingNode: true });
    
    // 使用延时执行操作
    setTimeout(() => {
      get().executeWithHistory(({ nodes, relationships }) => ({
        nodes: addSiblingNodeFunc(nodes, siblingId, content),
        relationships
      }));
      
      // 重置标志
      set({ isAddingNode: false });
    }, 50);
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
  createNodeReference: (sourceNodeId: string, targetParentId: string) => {
    get().executeWithHistory(({ nodes, relationships }) => {
      const sourceNode = findNodeById(nodes, sourceNodeId);
      if (!sourceNode) return { nodes, relationships };
      
      const targetParent = findNodeById(nodes, targetParentId);
      if (!targetParent) return { nodes, relationships };
      
      // 创建引用节点
      const referenceNode: MindNode = {
        ...JSON.parse(JSON.stringify(sourceNode)), // 深拷贝源节点
        id: uuidv4(), // 新ID
        parent: targetParentId,
        refId: sourceNodeId, // 指向源节点
        isReference: true,
        children: [] // 引用节点初始不包含子节点
      };
      
      // 为引用节点设置一个与原节点稍微不同的位置，避免完全重叠
      if (targetParent.position) {
        const parentX = targetParent.position.x;
        const parentY = targetParent.position.y;
        
        // 根据方向设置位置，确保在父节点右侧或左侧显示
        const direction = targetParent.direction || 'right';
        const xOffset = direction === 'right' ? 150 : -150;
        
        referenceNode.position = {
          x: parentX + xOffset,
          y: parentY + targetParent.children.length * 50 // 根据子节点数量确定垂直位置
        };
      }
      
      // 更新父节点的children数组
      const parentIndex = nodes.findIndex(node => node.id === targetParentId);
      if (parentIndex !== -1) {
        nodes[parentIndex].children.push(referenceNode);
        nodes[parentIndex].expanded = true; // 确保父节点展开
      }
      
      // 添加引用节点到数组
      const updatedNodes = [...nodes, referenceNode];
      
      console.log('已创建引用节点:', referenceNode.id, '引用源:', sourceNodeId);
      
      return { 
        nodes: updatedNodes, 
        relationships 
      };
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
    const { nodes, relationships, background } = get();
    return JSON.stringify({ nodes, relationships, background });
  },
  
  // 导入JSON数据
  importFromJSON: (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      
      // 验证数据格式
      if (!data.nodes || !Array.isArray(data.nodes)) {
        console.error('无效的JSON格式: 缺少nodes数组');
        return false;
      }
      
      // 导入数据
      set({ 
        nodes: data.nodes, 
        relationships: data.relationships || [],
        background: data.background || DEFAULT_BACKGROUND,
        undoStack: [],
        redoStack: []
      });
      
      // 重新计算布局
      get().calculateAndUpdateLayout();
      
      console.log('成功导入思维导图数据');
      console.log('节点数量:', data.nodes.length);
      console.log('关系数量:', (data.relationships || []).length);
      if (data.background) console.log('背景设置: 类型-', data.background.type);
      
      return true;
    } catch (error) {
      console.error('导入JSON失败:', error);
      return false;
    }
  },
  
  // 导出为图片
  exportToImage: () => {
    // 这里需要实现SVG转换为图片的逻辑
    // 可以使用html-to-image库
    return '';
  },
  
  // 本地存储相关方法
  saveToLocalStorage: async () => {
    const { nodes, relationships, currentMapId, background } = get();
    await saveMindMapToDB(currentMapId, { nodes, relationships, background });
  },
  
  loadFromLocalStorage: async () => {
    try {
      // 先尝试加载当前思维导图ID
      const currentId = await loadCurrentMapId();
      if (!currentId) {
        console.log('没有找到当前思维导图ID，使用默认思维导图');
        return false;
      }
      
      // 加载思维导图数据
      const mapData = await loadMindMapFromDB(currentId);
      if (!mapData) {
        console.log('没有找到思维导图数据，使用默认思维导图');
        return false;
      }
      
      // 更新状态
      set({ 
        nodes: mapData.nodes, 
        relationships: mapData.relationships,
        background: mapData.background || DEFAULT_BACKGROUND, // 加载背景配置，如果不存在则使用默认值
        currentMapId: currentId,
        undoStack: [],
        redoStack: []
      });
      
      console.log(`已从IndexedDB加载思维导图: ${currentId}`);
      return true;
    } catch (error) {
      console.error('从本地存储加载失败:', error);
      return false;
    }
  },
  
  // 创建新的思维导图
  createNewMindMap: () => {
    try {
      console.log('开始创建示例思维导图...');
      const newMapId = uuidv4();
      const initialRoot = createInitialMindMap();
      const layoutedRoot = calculateMindMapLayout(initialRoot);
      const flatNodes = flattenNodes(layoutedRoot);
      
      console.log('示例思维导图创建完成，节点数量:', flatNodes.length);
      
      set({ 
        nodes: flatNodes,
        relationships: [],
        undoStack: [],
        redoStack: [],
        currentMapId: newMapId,
        selectedNodeIds: []
      });
      
      // 自动保存到IndexedDB
      setTimeout(() => {
        get().saveToLocalStorage();
      }, 100);
      
      console.log('示例思维导图已保存, ID:', newMapId);
      return true;
    } catch (error) {
      console.error('创建示例思维导图失败:', error);
      return false;
    }
  },
  
  // 创建只有一个中心主题的新思维导图
  createEmptyMindMap: () => {
    try {
      console.log('开始创建空白思维导图...');
      const newMapId = uuidv4();
      
      // 创建只有一个根节点的思维导图
      const rootNode = createNode('中心主题', undefined, 0);
      rootNode.children = []; // 确保没有子节点
      
      // 计算布局
      const layoutedRoot = calculateMindMapLayout(rootNode);
      const flatNodes = flattenNodes(layoutedRoot);
      
      console.log('空白思维导图创建完成，节点数量:', flatNodes.length);
      console.log('根节点ID:', rootNode.id);
      
      // 更新状态
      set({ 
        nodes: flatNodes,
        relationships: [],
        undoStack: [],
        redoStack: [],
        currentMapId: newMapId,
        selectedNodeIds: [rootNode.id] // 默认选中根节点
      });
      
      // 自动保存到IndexedDB
      setTimeout(() => {
        get().saveToLocalStorage();
      }, 100);
      
      console.log('空白思维导图已保存, ID:', newMapId);
      return true;
    } catch (error) {
      console.error('创建空白思维导图失败:', error);
      return false;
    }
  },
  
  // 保存为模板
  saveAsTemplate: async (name: string) => {
    try {
      console.log('开始保存模板:', name);
      const { nodes, relationships, background } = get();
      const templateId = uuidv4();
      
      console.log('准备保存的模板数据:', {
        id: templateId,
        name,
        nodesCount: nodes.length,
        relationshipsCount: relationships.length,
        backgroundType: background.type
      });
      
      // 保存模板数据
      await saveTemplateToDb({
        id: templateId,
        name,
        nodes,
        relationships,
        background
      });
      
      console.log(`模板保存成功: ${name}，ID: ${templateId}`);
      return templateId;
    } catch (error) {
      console.error('保存模板失败:', error);
      throw error; // 向上传递错误
    }
  },
  
  // 加载所有模板
  loadTemplates: async () => {
    try {
      const templates = await loadTemplates();
      return templates.map(({ id, name, background }) => ({ id, name, background }));
    } catch (error) {
      console.error('加载模板列表失败:', error);
      return [];
    }
  },
  
  // 从模板创建思维导图
  createFromTemplate: async (templateId: string) => {
    try {
      if (typeof window !== 'undefined' && window.debugTemplates) {
        console.log(`🔍 模板调试: 开始从模板创建思维导图, 模板ID: ${templateId}`);
      }
      
      const db = await openDB();
      const transaction = db.transaction(TEMPLATES_STORE, 'readonly');
      const store = transaction.objectStore(TEMPLATES_STORE);
      
      return new Promise((resolve, reject) => {
        const request = store.get(templateId);
        
        request.onsuccess = () => {
          if (request.result) {
            const { nodes, relationships, background } = request.result;
            
            if (typeof window !== 'undefined' && window.debugTemplates) {
              console.log(`🔍 模板调试: 成功获取模板数据`, {
                模板ID: templateId,
                模板名称: request.result.name,
                节点数量: nodes.length,
                关系数量: relationships.length,
                背景设置: background ? background.type : '默认'
              });
            }
            
            const newMapId = uuidv4();
            
            set({ 
              nodes, 
              relationships,
              background: background || DEFAULT_BACKGROUND,
              currentMapId: newMapId,
              undoStack: [],
              redoStack: [],
              selectedNodeIds: []
            });
            
            // 自动保存到IndexedDB
            get().saveToLocalStorage();
            console.log(`已从模板创建思维导图:`, templateId);
            
            if (typeof window !== 'undefined' && window.debugTemplates) {
              console.log(`🔍 模板调试: 思维导图创建完成，已设置新的ID: ${newMapId}`);
            }
            
            resolve(true);
          } else {
            console.error('未找到指定模板:', templateId);
            
            if (typeof window !== 'undefined' && window.debugTemplates) {
              console.error(`❌ 模板调试: 未找到指定模板`, templateId);
            }
            
            resolve(false);
          }
        };
        
        request.onerror = (event) => {
          console.error('从模板创建思维导图失败:', event);
          reject(event);
        };
      });
    } catch (error) {
      console.error('从模板创建思维导图失败:', error);
      return false;
    }
  },
  
  // 创建默认模板
  createDefaultTemplates: async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(TEMPLATES_STORE, 'readonly');
      const store = transaction.objectStore(TEMPLATES_STORE);
      
      // 检查是否已存在默认模板
      const defaultTemplateId = 'default-example-template';
      const request = store.get(defaultTemplateId);
      
      return new Promise<void>((resolve) => {
        request.onsuccess = async () => {
          if (!request.result) {
            console.log('创建默认示例模板...');
            
            // 创建示例思维导图作为默认模板
            const initialRoot = createInitialMindMap();
            const layoutedRoot = calculateMindMapLayout(initialRoot);
            const flatNodes = flattenNodes(layoutedRoot);
            
            // 保存为默认模板
            await saveTemplateToDb({
              id: defaultTemplateId,
              name: '示例思维导图',
              nodes: flatNodes,
              relationships: [],
              background: DEFAULT_BACKGROUND
            });
            
            console.log('默认示例模板创建完成');
          } else {
            console.log('默认示例模板已存在');
          }
          resolve();
        };
        
        request.onerror = (event) => {
          console.error('检查默认模板失败:', event);
          resolve();
        };
      });
    } catch (error) {
      console.error('创建默认模板失败:', error);
    }
  },
  
  // 初始化思维导图
  initialize: async () => {
    console.log('正在初始化思维导图...');
    
    // 创建默认模板
    await get().createDefaultTemplates();
    
    // 尝试从本地存储加载
    const loadSuccess = await get().loadFromLocalStorage();
    
    // 如果加载失败，创建新的思维导图
    if (!loadSuccess) {
      const initialRoot = createInitialMindMap();
      const layoutedRoot = calculateMindMapLayout(initialRoot);
      const flatNodes = flattenNodes(layoutedRoot);
      
      set({ 
        nodes: flatNodes,
        relationships: []
      });
      
      // 自动保存到本地存储
      await get().saveToLocalStorage();
    }
    
    console.log('思维导图初始化成功');
  },
  
  // 布局操作
  calculateAndUpdateLayout: () => {
    const { nodes } = get();
    console.log('重新计算思维导图布局...');
    
    // 查找根节点
    const rootNode = findNodeById(nodes, nodes.find(n => n.level === 0)?.id || '');
    if (!rootNode) {
      console.error('无法找到根节点，布局计算失败');
      return;
    }
    
    console.log('找到根节点:', rootNode.id, rootNode.content);
    
    // 执行布局计算（保持思维导图的原始形状）
    const layoutedRoot = calculateMindMapLayout(rootNode);
    
    // 将树状结构展平为节点数组
    const flatNodes = flattenNodes(layoutedRoot);
    
    console.log('布局计算完成，更新节点数量:', flatNodes.length);
    
    // 更新状态
    set({ nodes: flatNodes });
  },
  
  // 删除模板
  deleteTemplate: async (templateId: string): Promise<boolean> => {
    try {
      return await deleteTemplateFromDb(templateId);
    } catch (error) {
      console.error('删除模板失败:', error);
      return false;
    }
  }
}));

export default useMindMapStore;
