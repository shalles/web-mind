// 节点样式接口
export interface NodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
  padding?: number;
  fontSize?: number;
  fontColor?: string;
  fontWeight?: string | number;
  width?: number;
  height?: number;
}

// 节点位置接口
export interface NodePosition {
  x: number;
  y: number;
}

// 节点数据接口
export interface MindNode {
  id: string;
  content: string;
  children: MindNode[];
  parent?: string;  // 父节点ID
  style: NodeStyle;
  position?: NodePosition;
  expanded: boolean;
  level: number;    // 节点层级
  direction?: 'left' | 'right'; // 节点方向，用于左右布局
  meta?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;  // 扩展字段，用于存储额外信息
  };
}

// 连接线样式接口
export interface ConnectionStyle {
  lineColor?: string;
  lineWidth?: number;
  lineStyle?: 'straight' | 'curved' | 'orthogonal';
  lineType?: 'solid' | 'dashed' | 'dotted';
}

// 思维导图状态接口已移至 store/index.ts 文件中
