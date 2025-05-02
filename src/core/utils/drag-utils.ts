import { MindNode, NodePosition } from '@/types/mindmap';

/**
 * 节点拖拽计算工具
 */

// 检查两个节点之间的距离
export const calculateDistance = (posA: NodePosition, posB: NodePosition): number => {
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// 查找最近的节点
export const findClosestNode = (
  nodes: MindNode[],
  currentNodeId: string,
  position: NodePosition,
  threshold: number
): { node: MindNode, distance: number } | null => {
  console.log('寻找最近节点:', { currentNodeId, position, threshold });
  
  let closestNode: MindNode | null = null;
  let minDistance = threshold;
  
  // 排除当前节点和其子节点
  const excludeIds = new Set<string>();
  
  // 收集要排除的节点ID（当前节点及其所有子节点）
  const collectExcludeIds = (nodeId: string, nodes: MindNode[]) => {
    excludeIds.add(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      node.children.forEach(child => collectExcludeIds(child.id, nodes));
    }
  };
  
  collectExcludeIds(currentNodeId, nodes);
  console.log('排除的节点IDs:', Array.from(excludeIds));
  
  // 收集有效的可吸附节点（排除没有位置的和已排除的节点）
  const validNodes = nodes.filter(n => 
    !excludeIds.has(n.id) && 
    n.position !== undefined
  );
  
  console.log('有效的可吸附节点数量:', validNodes.length);
  
  // 计算所有有效节点的距离
  const nodeDistances = validNodes.map(node => ({
    node,
    distance: calculateDistance(position, node.position!)
  })).sort((a, b) => a.distance - b.distance);
  
  // 记录距离信息用于调试
  console.log('节点距离排序 (最近的5个):', 
    nodeDistances.slice(0, 5).map(nd => ({
      id: nd.node.id, 
      content: nd.node.content,
      distance: nd.distance
    }))
  );
  
  // 查找最近的节点
  for (const { node, distance } of nodeDistances) {
    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
      break; // 找到第一个符合条件的就退出
    }
  }
  
  if (closestNode) {
    console.log('找到最近节点:', {
      id: closestNode.id,
      content: closestNode.content,
      distance: minDistance
    });
    return { node: closestNode, distance: minDistance };
  }
  
  console.log('没有找到符合吸附条件的节点');
  return null;
};

// 缓动函数：使动画更平滑
export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

// 缓动函数：弹性效果
export const easeOutElastic = (t: number): number => {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
};

// 计算动画中的当前位置
export const calculateAnimatedPosition = (
  startPos: NodePosition,
  targetPos: NodePosition,
  progress: number,
  easeFunc: (t: number) => number = easeOutCubic
): NodePosition => {
  const easedProgress = easeFunc(progress);
  return {
    x: startPos.x + (targetPos.x - startPos.x) * easedProgress,
    y: startPos.y + (targetPos.y - startPos.y) * easedProgress
  };
};

/**
 * 更新节点父子关系
 * @param nodes 所有节点
 * @param draggedNodeId 拖拽的节点ID
 * @param targetNodeId 目标节点ID（吸附目标）
 * @returns 更新后的节点数组
 */
export const updateNodeRelationship = (
  nodes: MindNode[],
  draggedNodeId: string,
  targetNodeId: string
): MindNode[] => {
  console.log('=== 开始更新节点关系 ===');
  console.log('拖拽节点ID:', draggedNodeId);
  console.log('目标节点ID:', targetNodeId);
  
  // 获取节点的深拷贝，避免引用问题
  const nodesCopy = JSON.parse(JSON.stringify(nodes));
  
  // 获取节点的完整引用
  const draggedNode = nodesCopy.find((n: MindNode) => n.id === draggedNodeId);
  const targetNode = nodesCopy.find((n: MindNode) => n.id === targetNodeId);
  
  if (!draggedNode || !targetNode) {
    console.error('无法找到拖拽节点或目标节点:', { 
      foundDraggedNode: !!draggedNode, 
      foundTargetNode: !!targetNode 
    });
    return nodes; // 返回原始节点，不做更改
  }
  
  // 获取拖拽节点的原父节点
  const oldParentId = draggedNode.parent;
  const oldParentNode = oldParentId ? nodesCopy.find((n: MindNode) => n.id === oldParentId) : null;
  
  console.log('拖拽节点:', {
    id: draggedNode.id,
    content: draggedNode.content,
    parent: draggedNode.parent,
    level: draggedNode.level
  });
  
  console.log('目标节点:', {
    id: targetNode.id,
    content: targetNode.content,
    level: targetNode.level,
    childrenCount: targetNode.children.length
  });
  
  if (oldParentNode) {
    console.log('原父节点:', {
      id: oldParentNode.id,
      content: oldParentNode.content,
      childrenCount: oldParentNode.children.length
    });
  }
  
  // 如果目标节点已经是拖拽节点的父节点，则不需要更新
  if (draggedNode.parent === targetNodeId) {
    console.log('目标节点已经是拖拽节点的父节点，无需更新');
    return nodes;
  }
  
  // 防止形成循环引用：检查目标节点是否是拖拽节点的子节点
  const isChildOfDragged = (nodeId: string, nodes: MindNode[]): boolean => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return false;
    if (node.id === draggedNodeId) return true;
    return node.children.some(child => isChildOfDragged(child.id, nodes));
  };
  
  if (isChildOfDragged(targetNodeId, nodes)) {
    console.error('检测到循环引用: 目标节点是拖拽节点的子节点，操作取消');
    return nodes;
  }
  
  // 1. 从原父节点的children中移除拖拽的节点
  if (oldParentNode) {
    console.log('从原父节点的children中移除拖拽节点');
    oldParentNode.children = oldParentNode.children.filter(
      (child: MindNode) => child.id !== draggedNodeId
    );
    console.log('更新后原父节点的子节点数:', oldParentNode.children.length);
  }
  
  // 2. 更新拖拽节点的parent引用和层级
  console.log('更新拖拽节点的parent引用为:', targetNodeId);
  draggedNode.parent = targetNodeId;
  draggedNode.level = targetNode.level + 1;
  
  // 如果目标节点有方向属性，继承该方向
  if (targetNode.direction) {
    draggedNode.direction = targetNode.direction;
  }
  
  // 3. 将拖拽节点添加到新父节点的children中
  console.log('将拖拽节点添加到目标节点的children中');
  // 确保不重复添加
  const alreadyChild = targetNode.children.some((child: MindNode) => child.id === draggedNodeId);
  if (!alreadyChild) {
    targetNode.children.push(draggedNode);
  }
  
  // 确保目标节点处于展开状态
  targetNode.expanded = true;
  
  console.log('目标节点更新后的子节点数:', targetNode.children.length);
  
  // 4. 递归更新拖拽节点的所有子节点的层级
  const updateChildLevels = (parentId: string, parentLevel: number, nodes: MindNode[]) => {
    const children = nodes.filter(n => n.parent === parentId);
    children.forEach(child => {
      child.level = parentLevel + 1;
      updateChildLevels(child.id, child.level, nodes);
    });
  };
  
  updateChildLevels(draggedNodeId, draggedNode.level, nodesCopy);
  
  console.log('=== 节点关系更新完成 ===');
  
  return nodesCopy;
}; 