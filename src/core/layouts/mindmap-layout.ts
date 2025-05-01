import { MindNode, NodePosition } from '@/types/mindmap';

// 节点计算约束配置
interface LayoutConfig {
  // 节点水平间距
  horizontalSpacing: number;
  // 节点垂直间距
  verticalSpacing: number;
  // 根节点到子节点的距离
  rootDistance: number;
  // 节点默认宽度 (如果没有计算)
  defaultNodeWidth: number;
  // 节点默认高度 (如果没有计算)
  defaultNodeHeight: number;
}

// 默认布局配置
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  horizontalSpacing: 80,
  verticalSpacing: 40,
  rootDistance: 200,
  defaultNodeWidth: 120,
  defaultNodeHeight: 40,
};

// 计算节点大小 (可以根据文本内容和样式设置动态计算)
const calculateNodeSize = (node: MindNode): { width: number; height: number } => {
  // 这里简化处理，实际上应该根据文本内容和字体大小等计算
  const textLength = node.content.length;
  const width = Math.max(textLength * 10, node.style.width || DEFAULT_LAYOUT_CONFIG.defaultNodeWidth);
  const height = node.style.height || DEFAULT_LAYOUT_CONFIG.defaultNodeHeight;
  
  return { width, height };
};

// 右侧布局 (从根节点向右展开)
const layoutRight = (node: MindNode, x: number, y: number, config: LayoutConfig): number => {
  const { width, height } = calculateNodeSize(node);
  
  // 设置当前节点位置
  node.position = { x, y };
  
  if (!node.expanded || node.children.length === 0) {
    return height;
  }
  
  let totalHeight = 0;
  let childY = y - (getTotalChildrenHeight(node, config) / 2);
  
  // 计算所有子节点的位置
  for (const child of node.children) {
    const childHeight = layoutRight(
      child,
      x + width + config.horizontalSpacing,
      childY + totalHeight,
      config
    );
    
    totalHeight += childHeight + config.verticalSpacing;
  }
  
  return Math.max(height, totalHeight - config.verticalSpacing);
};

// 左侧布局 (从根节点向左展开)
const layoutLeft = (node: MindNode, x: number, y: number, config: LayoutConfig): number => {
  const { width, height } = calculateNodeSize(node);
  
  // 设置当前节点位置
  node.position = { x, y };
  
  if (!node.expanded || node.children.length === 0) {
    return height;
  }
  
  let totalHeight = 0;
  let childY = y - (getTotalChildrenHeight(node, config) / 2);
  
  // 计算所有子节点的位置
  for (const child of node.children) {
    const childHeight = layoutLeft(
      child,
      x - width - config.horizontalSpacing,
      childY + totalHeight,
      config
    );
    
    totalHeight += childHeight + config.verticalSpacing;
  }
  
  return Math.max(height, totalHeight - config.verticalSpacing);
};

// 计算节点子树的总高度
const getTotalChildrenHeight = (node: MindNode, config: LayoutConfig): number => {
  if (!node.expanded || node.children.length === 0) {
    return calculateNodeSize(node).height;
  }
  
  let totalHeight = 0;
  for (const child of node.children) {
    totalHeight += getTotalChildrenHeight(child, config) + config.verticalSpacing;
  }
  
  return totalHeight - config.verticalSpacing;
};

// 整体布局计算
export const calculateMindMapLayout = (
  rootNode: MindNode,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): MindNode => {
  if (!rootNode) return rootNode;
  
  // 1. 计算根节点位置 (默认居中)
  const { width } = calculateNodeSize(rootNode);
  rootNode.position = { x: 0, y: 0 };
  
  // 2. 根据方向拆分左右子树
  const leftChildren: MindNode[] = [];
  const rightChildren: MindNode[] = [];
  
  rootNode.children.forEach(child => {
    if (child.direction === 'left') {
      leftChildren.push(child);
    } else {
      rightChildren.push(child);
    }
  });
  
  // 3. 分别计算左右子树
  let leftTotalHeight = 0;
  let leftY = -(getTotalChildrenHeight({ ...rootNode, children: leftChildren }, config) / 2);
  
  for (const child of leftChildren) {
    const childHeight = layoutLeft(
      child,
      -width / 2 - config.horizontalSpacing,
      leftY + leftTotalHeight,
      config
    );
    
    leftTotalHeight += childHeight + config.verticalSpacing;
  }
  
  let rightTotalHeight = 0;
  let rightY = -(getTotalChildrenHeight({ ...rootNode, children: rightChildren }, config) / 2);
  
  for (const child of rightChildren) {
    const childHeight = layoutRight(
      child,
      width / 2 + config.horizontalSpacing,
      rightY + rightTotalHeight,
      config
    );
    
    rightTotalHeight += childHeight + config.verticalSpacing;
  }
  
  return rootNode;
};

// 导出其他布局函数
export const layoutFunctions = {
  calculateNodeSize,
  layoutRight,
  layoutLeft,
  getTotalChildrenHeight,
};
