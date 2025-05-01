import { MindNode } from '@/types/mindmap';
import { createNode } from '../models/mindmap';

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
