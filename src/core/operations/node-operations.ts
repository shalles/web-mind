import { MindNode } from '@/types/mindmap';
import { createNode } from '@/core/models/mindmap';

export class NodeOperations {
  private undoStack: MindNode[][] = [];
  private redoStack: MindNode[][] = [];

  constructor(private nodes: MindNode[]) {}

  // 执行操作并保存历史
  private execute(operation: (nodes: MindNode[]) => MindNode[]): MindNode[] {
    this.undoStack.push([...this.nodes]);
    this.redoStack = [];
    const newNodes = operation(this.nodes);
    this.nodes = newNodes;
    return newNodes;
  }

  // 添加节点
  addNode(parentId: string, content: string): MindNode[] {
    return this.execute(nodes => {
      return addChildNode(nodes, parentId, content);
    });
  }

  // 添加兄弟节点
  addSiblingNode(siblingId: string, content: string): MindNode[] {
    return this.execute(nodes => {
      return addSiblingNodeFunc(nodes, siblingId, content);
    });
  }

  // 删除节点
  deleteNode(nodeId: string): MindNode[] {
    return this.execute(nodes => {
      return deleteNodeFunc(nodes, nodeId);
    });
  }

  // 更新节点内容
  updateNodeContent(nodeId: string, content: string): MindNode[] {
    return this.execute(nodes => {
      return updateNodeContentFunc(nodes, nodeId, content);
    });
  }

  // 更新节点样式
  updateNodeStyle(nodeId: string, style: Partial<MindNode['style']>): MindNode[] {
    return this.execute(nodes => {
      return updateNodeStyleFunc(nodes, nodeId, style);
    });
  }

  // 切换节点展开/折叠状态
  toggleNodeExpanded(nodeId: string): MindNode[] {
    return this.execute(nodes => {
      return toggleNodeExpandedFunc(nodes, nodeId);
    });
  }

  // 撤销操作
  undo(): MindNode[] | null {
    if (this.undoStack.length === 0) return null;
    const previousNodes = this.undoStack.pop()!;
    this.redoStack.push([...this.nodes]);
    this.nodes = previousNodes;
    return previousNodes;
  }

  // 重做操作
  redo(): MindNode[] | null {
    if (this.redoStack.length === 0) return null;
    const nextNodes = this.redoStack.pop()!;
    this.undoStack.push([...this.nodes]);
    this.nodes = nextNodes;
    return nextNodes;
  }
}

// 查找节点
export const findNodeById = (nodes: MindNode[], id: string): MindNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    
    if (node.children.length > 0) {
      const foundNode = findNodeById(node.children, id);
      if (foundNode) {
        return foundNode;
      }
    }
  }
  
  return null;
};

// 添加子节点
export const addChildNode = (
  nodes: MindNode[],
  parentId: string,
  content: string = '新节点'
): MindNode[] => {
  const updatedNodes = [...nodes];
  const parentNode = findNodeById(updatedNodes, parentId);
  
  if (parentNode) {
    const level = parentNode.level + 1;
    const direction = parentNode.direction || 'right';
    const newNode = createNode(content, parentId, level, direction);
    
    parentNode.children.push(newNode);
    parentNode.expanded = true; // 确保父节点展开
    
    // 将新节点添加到扁平数组
    updatedNodes.push(newNode);
  }
  
  return updatedNodes;
};

// 添加一个调试用的节点，直接添加到根节点下
export const addDebugNode = (nodes: MindNode[]): MindNode[] => {
  // 创建一个新的节点数组，避免直接修改原数组
  const updatedNodes = [...nodes];
  
  // 找到根节点(level = 0)
  const rootNode = updatedNodes.find(node => node.level === 0);
  
  if (rootNode) {
    // 创建一个调试节点
    const debugNode = createNode('调试节点 ' + new Date().toLocaleTimeString(), rootNode.id, 1, 'right');
    
    // 设置明显的样式
    debugNode.style = {
      ...debugNode.style,
      backgroundColor: '#ff4d4f',
      borderColor: '#ff1f1f',
      fontColor: '#ffffff',
      fontWeight: 'bold'
    };
    
    // 设置位置（确保在根节点右侧显示）
    const rootX = rootNode.position?.x || 0;
    const rootY = rootNode.position?.y || 0;
    
    // 为调试节点设置一个固定位置，避免叠加
    debugNode.position = {
      x: rootX + 200,
      y: rootY + (Math.random() * 100 - 50) // 随机上下偏移，避免节点重叠
    };
    
    // 添加到根节点的子节点中
    rootNode.children.push(debugNode);
    rootNode.expanded = true;
    
    // 添加到扁平数组
    updatedNodes.push(debugNode);
    
    console.log('调试节点已添加:', debugNode.id, '位置:', debugNode.position);
  } else {
    console.log('未找到根节点，无法添加调试节点');
  }
  
  return updatedNodes;
};

// 添加兄弟节点
export const addSiblingNodeFunc = (
  nodes: MindNode[],
  siblingId: string,
  content: string = '新节点'
): MindNode[] => {
  const updatedNodes = [...nodes];
  const siblingNode = findNodeById(updatedNodes, siblingId);
  
  if (siblingNode && siblingNode.parent) {
    const parentNode = findNodeById(updatedNodes, siblingNode.parent);
    
    if (parentNode) {
      const level = siblingNode.level;
      const direction = siblingNode.direction || 'right';
      const newNode = createNode(content, parentNode.id, level, direction);
      
      // 找到兄弟节点的索引，然后在其后插入新节点
      const siblingIndex = parentNode.children.findIndex(
        child => child.id === siblingId
      );
      
      if (siblingIndex !== -1) {
        parentNode.children.splice(siblingIndex + 1, 0, newNode);
      } else {
        parentNode.children.push(newNode);
      }
      
      // 添加到扁平数组
      updatedNodes.push(newNode);
    }
  }
  
  return updatedNodes;
};

// 删除节点
export const deleteNodeFunc = (
  nodes: MindNode[],
  nodeId: string
): MindNode[] => {
  // 不能删除根节点
  const rootNode = nodes.find(node => node.level === 0);
  if (rootNode && rootNode.id === nodeId) {
    return nodes;
  }
  
  const updatedNodes = [...nodes];
  
  const deleteNodeRecursive = (nodeList: MindNode[]): boolean => {
    for (let i = 0; i < nodeList.length; i++) {
      if (nodeList[i].id === nodeId) {
        nodeList.splice(i, 1);
        return true;
      }
      
      if (nodeList[i].children.length > 0) {
        if (deleteNodeRecursive(nodeList[i].children)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // 从根节点开始递归删除
  deleteNodeRecursive(updatedNodes);
  
  return updatedNodes;
};

// 更新节点内容
export const updateNodeContentFunc = (
  nodes: MindNode[],
  nodeId: string,
  content: string
): MindNode[] => {
  const updatedNodes = [...nodes];
  const node = findNodeById(updatedNodes, nodeId);
  
  if (node) {
    node.content = content;
  }
  
  return updatedNodes;
};

// 更新节点样式
export const updateNodeStyleFunc = (
  nodes: MindNode[],
  nodeId: string,
  style: Partial<MindNode['style']>
): MindNode[] => {
  const updatedNodes = [...nodes];
  const node = findNodeById(updatedNodes, nodeId);
  
  if (node) {
    node.style = { ...node.style, ...style };
  }
  
  return updatedNodes;
};

// 展开/折叠节点
export const toggleNodeExpandedFunc = (
  nodes: MindNode[],
  nodeId: string
): MindNode[] => {
  const updatedNodes = [...nodes];
  const node = findNodeById(updatedNodes, nodeId);
  
  if (node) {
    node.expanded = !node.expanded;
  }
  
  return updatedNodes;
};
