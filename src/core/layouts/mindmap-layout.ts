import { MindNode } from '@/types/mindmap';

// 节点计算约束配置
interface LayoutConfig {
  // 节点水平间距
  horizontalSpacing: number;
  // 节点垂直间距
  verticalSpacing: number;
  // 节点默认宽度
  defaultNodeWidth: number;
  // 节点默认高度
  defaultNodeHeight: number;
}

// 默认布局配置
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  horizontalSpacing: 80,
  verticalSpacing: 40,
  defaultNodeWidth: 120,
  defaultNodeHeight: 40,
};

// 获取节点大小信息
function getNodeSize(node: MindNode): { width: number; height: number } {
  const width = node.style.width || DEFAULT_LAYOUT_CONFIG.defaultNodeWidth;
  const height = node.style.height || DEFAULT_LAYOUT_CONFIG.defaultNodeHeight;
  return { width, height };
}

// 新的自底向上布局主函数
export const calculateMindMapLayout = (
  rootNode: MindNode,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): MindNode => {
  if (!rootNode) return rootNode;
  // 第一遍递归，计算所有节点的边界
  const boundsMap = new Map<string, {top: number, bottom: number, height: number}>();
  calcBounds(rootNode, 0, boundsMap, config);
  // 第二遍递归，设置所有节点的position
  setPositions(rootNode, 0, 0, boundsMap, config);
  return rootNode;
};

// 递归计算每个节点的top/bottom边界（相对于本层父节点y=0）
function calcBounds(
  node: MindNode,
  y: number,
  boundsMap: Map<string, {top: number, bottom: number, height: number}>,
  config: LayoutConfig
): {top: number, bottom: number, height: number} {
  const size = getNodeSize(node);
  if (!node.expanded || node.children.length === 0) {
    const top = y - size.height / 2;
    const bottom = y + size.height / 2;
    boundsMap.set(node.id, { top, bottom, height: size.height });
    return { top, bottom, height: size.height };
  }
  // 先分组
  const leftChildren = node.children.filter(c => c.direction === 'left');
  const rightChildren = node.children.filter(c => c.direction !== 'left');
  // 递归计算所有子节点的边界
  let children: MindNode[] = [];
  if (leftChildren.length > 0) children = leftChildren;
  else if (rightChildren.length > 0) children = rightChildren;
  const childBounds: {node: MindNode, size: {width:number, height:number}, bounds: {top:number, bottom:number, height:number}}[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const cb = calcBounds(child, 0, boundsMap, config);
    childBounds.push({ node: child, size: getNodeSize(child), bounds: cb });
  }
  // 子节点组的top/bottom
  let groupTop = 0;
  let groupBottom = 0;
  if (childBounds.length > 0) {
    groupTop = childBounds[0].bounds.top;
    groupBottom = childBounds[childBounds.length - 1].bounds.bottom;
  }
  // 父节点的中心y就是子节点组的中点
  const centerY = (groupTop + groupBottom) / 2;
  const top = centerY - size.height / 2;
  const bottom = centerY + size.height / 2;
  // 父节点包裹整个子树的top/bottom
  const treeTop = Math.min(top, groupTop);
  const treeBottom = Math.max(bottom, groupBottom);
  boundsMap.set(node.id, { top: treeTop, bottom: treeBottom, height: treeBottom - treeTop });
  return { top: treeTop, bottom: treeBottom, height: treeBottom - treeTop };
}

// 第二遍递归，设置所有节点的position
function setPositions(
  node: MindNode,
  x: number,
  y: number,
  boundsMap: Map<string, {top: number, bottom: number, height: number}>,
  config: LayoutConfig
) {
  const size = getNodeSize(node);
  node.position = { x, y };
  if (!node.expanded || node.children.length === 0) return;
  // 分组
  const leftChildren = node.children.filter(c => c.direction === 'left');
  const rightChildren = node.children.filter(c => c.direction !== 'left');
  // 只布局一侧
  let children: MindNode[] = [];
  let direction: 'left' | 'right' = 'right';
  if (leftChildren.length > 0) {
    children = leftChildren;
    direction = 'left';
  } else if (rightChildren.length > 0) {
    children = rightChildren;
    direction = 'right';
  }
  if (children.length === 0) return;
  // 计算子节点组的总高度
  let totalHeight = 0;
  const childHeights = children.map(child => {
    const b = boundsMap.get(child.id)!;
    return b.bottom - b.top;
  });
  for (let i = 0; i < childHeights.length; i++) {
    totalHeight += childHeights[i];
    if (i < childHeights.length - 1) totalHeight += config.verticalSpacing;
  }
  // 子节点组的起始y
  let startY = y - totalHeight / 2;
  // 水平偏移
  const offsetX = direction === 'left'
    ? x - (size.width / 2 + config.horizontalSpacing)
    : x + (size.width / 2 + config.horizontalSpacing);
  // 依次布局子节点
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const b = boundsMap.get(child.id)!;
    const childHeight = b.bottom - b.top;
    const childY = startY + childHeight / 2;
    setPositions(child, offsetX, childY, boundsMap, config);
    startY += childHeight + config.verticalSpacing;
  }
}

// 导出函数
export const layoutFunctions = {
  getNodeSize,
  calculateMindMapLayout,
};
