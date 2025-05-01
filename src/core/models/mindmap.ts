import { MindNode, NodeStyle } from '@/types/mindmap';
import { v4 as uuidv4 } from 'uuid';

// 默认节点样式
export const DEFAULT_NODE_STYLE: NodeStyle = {
  backgroundColor: '#ffffff',
  borderColor: '#cccccc',
  borderWidth: 1,
  borderStyle: 'solid',
  borderRadius: 5,
  padding: 10,
  fontSize: 14,
  fontColor: '#333333',
  fontWeight: 'normal',
};

// 根节点默认样式
export const ROOT_NODE_STYLE: NodeStyle = {
  ...DEFAULT_NODE_STYLE,
  backgroundColor: '#e6f7ff',
  borderColor: '#1890ff',
  borderWidth: 2,
  fontSize: 16,
  fontWeight: 'bold',
};

// 创建新节点
export const createNode = (
  content: string = '新节点',
  parentId?: string,
  level: number = 0,
  direction: 'left' | 'right' = 'right'
): MindNode => {
  return {
    id: uuidv4(),
    content,
    children: [],
    parent: parentId,
    style: level === 0 ? ROOT_NODE_STYLE : DEFAULT_NODE_STYLE,
    expanded: true,
    level,
    direction,
    meta: {},
  };
};

// 创建一个初始的思维导图
export const createInitialMindMap = (): MindNode => {
  const rootNode = createNode('中心主题', undefined, 0);
  
  // 添加一些初始子节点示例
  const rightChild1 = createNode('右侧主题 1', rootNode.id, 1, 'right');
  const rightChild2 = createNode('右侧主题 2', rootNode.id, 1, 'right');
  const leftChild1 = createNode('左侧主题 1', rootNode.id, 1, 'left');
  const leftChild2 = createNode('左侧主题 2', rootNode.id, 1, 'left');
  
  // 添加第三级节点
  rightChild1.children.push(
    createNode('子主题 1.1', rightChild1.id, 2, 'right'),
    createNode('子主题 1.2', rightChild1.id, 2, 'right')
  );
  
  leftChild1.children.push(
    createNode('子主题 1.1', leftChild1.id, 2, 'left')
  );
  
  // 组装根节点
  rootNode.children = [rightChild1, rightChild2, leftChild1, leftChild2];
  
  return rootNode;
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

// 扁平化节点树为数组（用于 zustand 存储）
export const flattenNodes = (rootNode: MindNode): MindNode[] => {
  const result: MindNode[] = [rootNode];
  
  const traverse = (node: MindNode) => {
    if (node.children.length > 0) {
      for (const child of node.children) {
        result.push(child);
        traverse(child);
      }
    }
  };
  
  traverse(rootNode);
  return result;
};

// 从扁平数组重建树结构
export const rebuildTree = (nodes: MindNode[]): MindNode | null => {
  if (nodes.length === 0) return null;
  
  // 找到根节点
  const rootNode = nodes.find(node => node.level === 0);
  if (!rootNode) return null;
  
  // 创建节点映射
  const nodeMap = new Map<string, MindNode>();
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });
  
  // 重建树结构
  nodes.forEach(node => {
    if (node.parent && nodeMap.has(node.parent)) {
      const parentNode = nodeMap.get(node.parent);
      if (parentNode) {
        parentNode.children.push(nodeMap.get(node.id)!);
      }
    }
  });
  
  return nodeMap.get(rootNode.id) || null;
}; 