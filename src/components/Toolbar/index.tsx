import React from 'react';
import styled from 'styled-components';
import { Button, Tooltip, Divider, message, ColorPicker } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  DownloadOutlined,
  BgColorsOutlined,
  FontColorsOutlined,
  NodeIndexOutlined
} from '@ant-design/icons';
import useMindMapStore from '@/store';
import { findNodeById } from '@/core/operations/node-operations';
import html2canvas from 'html2canvas';

// 工具栏容器
const ToolbarContainer = styled.div`
  background-color: white;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
`;

// 工具栏分组
const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
`;

const Toolbar: React.FC = () => {
  // 状态
  const { 
    selectedNodeIds, 
    nodes, 
    addChildNode, 
    addSiblingNode,
    deleteNode, 
    setEditingNodeId,
    updateNodeStyle,
    undo, 
    redo,
    setZoom,
    zoom
  } = useMindMapStore();
  
  const hasSelection = selectedNodeIds.length > 0;
  const hasSingleSelection = selectedNodeIds.length === 1;
  
  // 处理添加子节点
  const handleAddChild = () => {
    if (hasSingleSelection) {
      addChildNode(selectedNodeIds[0]);
      message.success('已添加子节点');
    }
  };
  
  // 处理添加兄弟节点
  const handleAddSibling = () => {
    if (hasSingleSelection) {
      // 查找当前节点，确保不是根节点
      const node = findNodeById(nodes, selectedNodeIds[0]);
      if (node && node.level > 0) {
        addSiblingNode(selectedNodeIds[0]);
        message.success('已添加兄弟节点');
      } else {
        message.warning('根节点不能添加兄弟节点');
      }
    }
  };
  
  // 处理删除节点
  const handleDelete = () => {
    if (hasSelection) {
      const nodeToDelete = findNodeById(nodes, selectedNodeIds[0]);
      if (nodeToDelete && nodeToDelete.level === 0) {
        message.warning('不能删除根节点');
        return;
      }
      
      selectedNodeIds.forEach(id => {
        const node = findNodeById(nodes, id);
        if (node && node.level > 0) {
          deleteNode(id);
        }
      });
      message.success('已删除所选节点');
    }
  };
  
  // 处理编辑节点
  const handleEdit = () => {
    if (hasSingleSelection) {
      setEditingNodeId(selectedNodeIds[0]);
    }
  };
  
  // 处理撤销
  const handleUndo = () => {
    undo();
    message.info('已撤销');
  };
  
  // 处理重做
  const handleRedo = () => {
    redo();
    message.info('已重做');
  };
  
  // 处理缩放
  const handleZoomIn = () => {
    setZoom(Math.min(2, zoom * 1.2));
  };
  
  const handleZoomOut = () => {
    setZoom(Math.max(0.5, zoom * 0.8));
  };
  
  // 导出思维导图为PNG
  const handleExport = async () => {
    const svgElement = document.querySelector('svg');
    if (!svgElement) {
      message.error('未找到思维导图元素');
      return;
    }
    
    const svgContainer = document.querySelector('.mindmap-container') as HTMLElement;
    if (!svgContainer) {
      message.error('未找到思维导图容器');
      return;
    }
    
    message.loading({ content: '正在导出思维导图...', key: 'export' });
    
    try {
      // 使用html2canvas导出
      const canvas = await html2canvas(svgContainer, {
        allowTaint: true,
        useCORS: true,
        scale: 2, // 提高清晰度
        backgroundColor: '#f5f5f5'
      });
      
      // 转换为图片并下载
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `mindmap-export-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      
      message.success({ content: '导出成功', key: 'export' });
    } catch (err) {
      console.error('导出失败:', err);
      message.error({ content: '导出失败，请重试', key: 'export' });
    }
  };
  
  // 修改节点背景色
  const handleChangeNodeBg = (color: string) => {
    if (hasSelection) {
      selectedNodeIds.forEach(id => {
        updateNodeStyle(id, { backgroundColor: color });
      });
      message.success('已修改节点背景色');
    }
  };
  
  // 修改节点文字颜色
  const handleChangeNodeFontColor = (color: string) => {
    if (hasSelection) {
      selectedNodeIds.forEach(id => {
        updateNodeStyle(id, { fontColor: color });
      });
      message.success('已修改节点文字颜色');
    }
  };
  
  // 添加键盘快捷键
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框或文本区域，不处理快捷键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      
      // Tab: 添加子节点
      if (e.key === 'Tab' && !e.shiftKey && hasSingleSelection) {
        e.preventDefault();
        handleAddChild();
      }
      
      // Shift+Tab: 添加兄弟节点
      if (e.key === 'Tab' && e.shiftKey && hasSingleSelection) {
        e.preventDefault();
        handleAddSibling();
      }
      
      // Delete: 删除节点
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
        // 只有当没有处于编辑状态时才处理删除
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleDelete();
        }
      }
      
      // F2: 编辑节点
      if (e.key === 'F2' && hasSingleSelection) {
        e.preventDefault();
        handleEdit();
      }
      
      // Ctrl+Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      
      // Ctrl+Y 或 Ctrl+Shift+Z: 重做
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      
      // Ctrl++: 放大
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        handleZoomIn();
      }
      
      // Ctrl+-: 缩小
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeIds, hasSingleSelection, hasSelection]);
  
  return (
    <ToolbarContainer>
      <ToolbarGroup>
        <Tooltip title="添加子节点 (Tab)">
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={handleAddChild}
            disabled={!hasSingleSelection}
          />
        </Tooltip>
        <Tooltip title="添加兄弟节点 (Shift+Tab)">
          <Button
            type="text"
            icon={<NodeIndexOutlined />}
            onClick={handleAddSibling}
            disabled={!hasSingleSelection}
          />
        </Tooltip>
        <Tooltip title="删除节点 (Delete)">
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            disabled={!hasSelection}
          />
        </Tooltip>
        <Tooltip title="编辑节点 (F2)">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={handleEdit}
            disabled={!hasSingleSelection}
          />
        </Tooltip>
      </ToolbarGroup>
      
      <Divider type="vertical" />
      
      <ToolbarGroup>
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button type="text" icon={<UndoOutlined />} onClick={handleUndo} />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Y)">
          <Button type="text" icon={<RedoOutlined />} onClick={handleRedo} />
        </Tooltip>
      </ToolbarGroup>
      
      <Divider type="vertical" />
      
      <ToolbarGroup>
        <Tooltip title="放大 (Ctrl++)">
          <Button type="text" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
        </Tooltip>
        <Tooltip title="缩小 (Ctrl+-)">
          <Button type="text" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
        </Tooltip>
      </ToolbarGroup>
      
      <Divider type="vertical" />
      
      <ToolbarGroup>
        <Tooltip title="节点背景色">
          <ColorPicker
            disabled={!hasSelection}
            onChange={color => handleChangeNodeBg(color.toHexString())}
          >
            <Button
              type="text"
              icon={<BgColorsOutlined />}
              disabled={!hasSelection}
            />
          </ColorPicker>
        </Tooltip>
        <Tooltip title="文字颜色">
          <ColorPicker
            disabled={!hasSelection}
            onChange={color => handleChangeNodeFontColor(color.toHexString())}
          >
            <Button
              type="text"
              icon={<FontColorsOutlined />}
              disabled={!hasSelection}
            />
          </ColorPicker>
        </Tooltip>
      </ToolbarGroup>
      
      <Divider type="vertical" />
      
      <ToolbarGroup>
        <Tooltip title="导出为图片">
          <Button type="text" icon={<DownloadOutlined />} onClick={handleExport} />
        </Tooltip>
      </ToolbarGroup>
    </ToolbarContainer>
  );
};

export default Toolbar;
