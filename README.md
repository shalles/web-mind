# WebXmind 思维导图工具

基于 React + TypeScript + Vite 的在线思维导图工具，具有丰富的功能和良好的用户体验。

## 主要功能

- 基础节点操作：创建、删除、编辑、移动
- 多级节点支持：无限层级的树状结构
- 节点样式自定义：颜色、大小、字体等
- 连接线样式：多种连接线类型和样式
- 撤销/重做功能：操作历史管理
- 导出功能：导出为 PNG 图片
- 缩放和平移：灵活的视图控制
- 键盘快捷键：提高操作效率

## 快捷键

- `Tab`：添加子节点
- `Shift + Tab`：添加兄弟节点
- `Delete`：删除节点
- `F2`：编辑节点
- `Ctrl + Z`：撤销
- `Ctrl + Y`：重做
- `Ctrl + +`：放大
- `Ctrl + -`：缩小

## 技术栈

- **React 18**：用户界面构建
- **TypeScript**：类型安全的 JavaScript
- **Vite**：快速的构建工具
- **Zustand**：简单、高效的状态管理
- **Styled Components**：组件样式管理
- **Ant Design**：UI 组件库
- **HTML5 Canvas/SVG**：图形渲染

## 项目结构

```
src/
  ├── components/       # UI组件
  │   ├── MindMap/      # 思维导图主组件
  │   ├── Toolbar/      # 工具栏
  │   └── ...
  ├── core/             # 核心逻辑
  │   ├── models/       # 数据模型
  │   ├── layouts/      # 布局算法
  │   └── operations/   # 操作处理
  ├── store/            # 状态管理
  ├── styles/           # 全局样式
  ├── types/            # 类型定义
  ├── utils/            # 工具函数
  └── ...
```

## 如何使用

1. 克隆仓库
   ```bash
   git clone https://github.com/your-username/webxmind.git
   cd webxmind
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 启动开发服务器
   ```bash
   npm run dev
   ```

4. 打开浏览器访问 `http://localhost:5173/`

## 后续开发计划

- 实现协作编辑功能
- 增加更多导出格式（PDF、SVG等）
- 支持自定义主题
- 增加模板库
- 添加更多节点类型（图片、链接等）

## 许可证

MIT
