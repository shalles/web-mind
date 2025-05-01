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

// 图标接口
export interface NodeIcon {
  type: string;  // 图标类型，可以是Ant Design图标名称
  color?: string; // 图标颜色
  size?: number;  // 图标大小
}

// 图片接口
export interface NodeImage {
  src: string;    // 图片URL
  width: number;  // 图片宽度
  height: number; // 图片高度
  alt?: string;   // 图片替代文本
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
  note?: string;    // 节点备注
  icon?: NodeIcon;  // 节点图标
  image?: NodeImage; // 节点图片
  refId?: string;   // 引用的节点ID，用于节点引用功能
  isReference?: boolean; // 标记是否为引用节点
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

// 关系连线接口
export interface Relationship {
  id: string;
  sourceId: string;  // 源节点ID
  targetId: string;  // 目标节点ID
  label?: string;    // 关系描述
  style: ConnectionStyle; // 连线样式
}

// 思维导图状态接口已移至 store/index.ts 文件中
