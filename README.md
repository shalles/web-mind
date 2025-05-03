# WebXmind - 网页版思维导图工具

![产品图](docs/prd.png)

基于React + TypeScript + Vite + Zustand开发的思维导图工具，支持节点编辑、样式调整、关系连线和节点引用等功能。

## 功能

基础功能：
- 节点的添加、删除、编辑
- 左右布局支持
- 节点展开/折叠
- 缩放和平移
- 撤销/重做
- 导出PNG图片

新增功能：
- 节点备注：支持为节点添加备注信息
- 节点图标：支持为节点添加各种图标
- 节点图片：支持为节点添加图片
- 关系连线：支持在任意两个节点之间创建自定义关系连线，可设置线条样式和添加关系描述
- 节点引用：支持节点引用功能，一个节点可在不同位置被引用

## 技术栈

- React 
- TypeScript
- Vite
- Ant Design
- Styled Components
- Zustand (状态管理)
- HTML5 Canvas (导出功能)

## 开发指南

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
src/
├─ components/     # 组件
│  ├─ MindMap/     # 思维导图相关组件
│  │  ├─ index.tsx         # 主组件
│  │  ├─ Node.tsx          # 节点组件 
│  │  ├─ Connection.tsx    # 连接线组件
│  │  ├─ RelationshipLine.tsx  # 关系连线组件
│  │  └─ NodeMenu.tsx      # 节点菜单组件
│  ├─ Toolbar/     # 工具栏组件
│  └─ Sidebar/     # 侧边栏组件
├─ core/           # 核心逻辑
│  ├─ models/      # 数据模型
│  ├─ operations/  # 操作函数
│  └─ layouts/     # 布局算法
├─ store/          # 状态管理
├─ types/          # 类型定义
└─ styles/         # 全局样式
```

## 快捷键

- Tab: 添加子节点
- Shift+Tab: 添加兄弟节点
- Delete/Backspace: 删除节点
- F2: 编辑节点
- Ctrl+Z: 撤销
- Ctrl+Y/Ctrl+Shift+Z: 重做
- Ctrl++: 放大
- Ctrl+-: 缩小

## 下一步计划

- 优化布局算法
- 添加主题支持
- 增加多画布管理
- 添加协作功能
- 云端存储支持
- 添加更多导出格式
- 移动端适配

## 许可证

MIT
