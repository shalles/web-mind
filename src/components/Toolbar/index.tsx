import React, { useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { Button, Tooltip, Divider, message, ColorPicker, Modal, Input, List, Typography, Tag, Popconfirm } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  BgColorsOutlined,
  FontColorsOutlined,
  NodeIndexOutlined,
  SaveOutlined,
  FileOutlined,
  SnippetsOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { FileImageOutlined, ImportOutlined } from '@ant-design/icons';
import useMindMapStore from '@/store';
import { findNodeById } from '@/core/operations/node-operations';
import html2canvas from 'html2canvas';

// 检测操作系统
const isMac = typeof navigator !== 'undefined' ? /Mac|iPod|iPhone|iPad/.test(navigator.platform) : false;

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

// 强调按钮样式
const HighlightedButton = styled(Button)`
  color: #1890ff;
  font-size: 18px;
  &:hover {
    color: #40a9ff;
  }
`;

// 为window对象扩展自定义属性
declare global {
  interface Window {
    keyEventHandled?: boolean;
    logKeyboardEvent?: (source: string, event: KeyboardEvent, handled?: boolean) => void;
    debugShortcuts?: boolean;
    debugTemplates?: boolean;
  }
}

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
    zoom,
    exportToJSON,
    importFromJSON,
    createEmptyMindMap,
    saveAsTemplate,
    loadTemplates,
    createFromTemplate,
    saveToLocalStorage,
    deleteTemplate
  } = useMindMapStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTemplateModalVisible, setNewTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
  const [templates, setTemplates] = useState<{id: string, name: string}[]>([]);
  const [fileMenuVisible, setFileMenuVisible] = useState(false);
  
  const hasSelection = selectedNodeIds.length > 0;
  const hasSingleSelection = selectedNodeIds.length === 1;
  
  // 处理添加子节点
  const handleAddChild = useCallback(() => {
    if (hasSingleSelection) {
      addChildNode(selectedNodeIds[0]);
      message.success('已添加子节点');
    }
  }, [hasSingleSelection, selectedNodeIds, addChildNode]);
  
  // 处理添加兄弟节点
  const handleAddSibling = useCallback(() => {
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
  }, [hasSingleSelection, selectedNodeIds, nodes, addSiblingNode]);
  
  // 处理删除节点
  const handleDelete = useCallback(() => {
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
  }, [hasSelection, selectedNodeIds, nodes, deleteNode]);
  
  // 处理编辑节点
  const handleEdit = useCallback(() => {
    if (hasSingleSelection) {
      setEditingNodeId(selectedNodeIds[0]);
    }
  }, [hasSingleSelection, selectedNodeIds, setEditingNodeId]);
  
  // 处理撤销
  const handleUndo = useCallback(() => {
    undo();
    message.info('已撤销');
  }, [undo]);
  
  // 处理重做
  const handleRedo = useCallback(() => {
    redo();
    message.info('已重做');
  }, [redo]);
  
  // 处理缩放
  const handleZoomIn = useCallback(() => {
    setZoom(Math.min(2, zoom * 1.2));
  }, [zoom, setZoom]);
  
  const handleZoomOut = useCallback(() => {
    setZoom(Math.max(0.5, zoom * 0.8));
  }, [zoom, setZoom]);
  
  // 导出思维导图为PNG
  const handleExport = useCallback(async () => {
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
  }, []);
  
  // 处理新建思维导图
  const handleCreateNew = useCallback(() => {
    // 显示加载中提示
    message.loading({ content: '正在创建新的空白思维导图...', key: 'createEmpty' });
    
    // 直接创建空白思维导图
    console.log('准备创建新的空白思维导图');
    createEmptyMindMap();
    console.log('空白思维导图创建完成');
    
    // 提示创建结果
    setTimeout(() => {
      message.success({ content: '已创建新的空白思维导图', key: 'createEmpty', duration: 2 });
    }, 500);
    
    // 关闭文件菜单
    setFileMenuVisible(false);
  }, [createEmptyMindMap, setFileMenuVisible]);
  
  // 处理保存
  const handleSave = useCallback(async () => {
    await saveToLocalStorage();
    message.success('思维导图已保存');
    setFileMenuVisible(false);
  }, [saveToLocalStorage, setFileMenuVisible]);
  
  // 处理导出JSON
  const handleExportJSON = useCallback(() => {
    const jsonData = exportToJSON();
    
    // 创建下载链接
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `mindmap-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    link.click();
    
    // 释放URL对象
    URL.revokeObjectURL(url);
    
    message.success('思维导图已导出为JSON文件');
  }, [exportToJSON]);
  
  // 触发文件选择对话框
  const handleImportClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);
  
  // 处理文件导入
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const success = importFromJSON(content);
        if (success) {
          message.success('思维导图已成功导入');
        } else {
          message.error('导入失败，文件格式不正确');
        }
      }
      
      // 重置文件输入，以便可以再次选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      message.error('读取文件失败');
    };
    reader.readAsText(file);
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
  
  // 处理显示模板列表
  const handleShowTemplates = useCallback(async () => {
    // 显示加载提示
    message.loading({ content: '加载模板列表...', key: 'loadTemplates' });
    
    // 添加详细调试日志
    console.log('🔍 开始加载模板列表 - 通过', window.debugShortcuts ? 'Ctrl+T快捷键触发' : '按钮点击触发');
    
    // 清空当前模板列表，强制重新加载
    setTemplates([]);
    
    try {
      // 每次都重新获取最新的模板列表
      console.log('📑 调用loadTemplates API获取模板列表');
      const templateList = await loadTemplates();
      console.log('📋 模板列表获取结果:', templateList);
      
      setTemplates(templateList);
      console.log('✅ 加载模板列表成功，共', templateList.length, '个模板');
      
      // 显示成功提示
      if (templateList.length === 0) {
        message.info({ content: '暂无可用模板', key: 'loadTemplates' });
      } else {
        message.success({ content: `已加载${templateList.length}个模板`, key: 'loadTemplates' });
      }
      
      // 打开模板对话框
      console.log('🖼️ 打开模板对话框');
      setTemplatesModalVisible(true);
    } catch (error) {
      console.error('❌ 加载模板失败:', error);
      message.error({ content: '加载模板失败，请重试', key: 'loadTemplates' });
    }
    
    // 关闭文件菜单
    setFileMenuVisible(false);
  }, [loadTemplates, setTemplates, setTemplatesModalVisible, setFileMenuVisible]);
  
  // 处理从模板创建
  const handleCreateFromTemplate = async (templateId: string) => {
    console.log('🚀 准备从模板创建思维导图, 模板ID:', templateId);
    
    if (window.debugTemplates) {
      console.log('🔍 模板调试: 开始从模板创建, ID:', templateId);
    }
    
    message.loading({ content: '正在从模板创建...', key: 'createFromTemplate' });
    
    try {
      const success = await createFromTemplate(templateId);
      
      if (success) {
        console.log('✅ 从模板创建成功');
        message.success({ content: '已从模板创建思维导图', key: 'createFromTemplate' });
        setTemplatesModalVisible(false);
      } else {
        console.error('❌ 从模板创建失败');
        message.error({ content: '创建失败，模板可能已被删除', key: 'createFromTemplate' });
      }
    } catch (error) {
      console.error('❌ 从模板创建出现错误:', error);
      message.error({ content: '创建过程中出现错误', key: 'createFromTemplate' });
    }
  };
  
  // 处理保存为模板
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      message.error('请输入模板名称');
      return;
    }
    
    try {
      // 显示加载提示
      message.loading({ content: '正在保存模板...', key: 'saveTemplate' });
      
      // 保存模板
      const templateId = await saveAsTemplate(templateName);
      
      // 关闭对话框并清空输入
      setNewTemplateModalVisible(false);
      setTemplateName('');
      
      // 显示成功提示
      message.success({ content: `已保存为模板: ${templateName}`, key: 'saveTemplate' });
      
      console.log('模板保存成功，ID:', templateId);
      
      // 延迟一段时间后重新加载模板列表，确保数据已经写入
      setTimeout(async () => {
        try {
          const updatedTemplates = await loadTemplates();
          setTemplates(updatedTemplates);
          console.log('延迟加载模板列表成功，共', updatedTemplates.length, '个模板');
        } catch (error) {
          console.error('延迟加载模板列表失败:', error);
        }
      }, 500);
    } catch (error) {
      console.error('保存模板失败:', error);
      message.error({ content: '保存模板失败，请重试', key: 'saveTemplate' });
    }
  };
  
  // 处理删除模板
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      // 显示加载提示
      message.loading({ content: '正在删除模板...', key: 'deleteTemplate' });
      
      // 删除模板
      const success = await deleteTemplate(templateId);
      
      if (success) {
        // 从列表中移除已删除的模板
        setTemplates(templates.filter(template => template.id !== templateId));
        
        // 显示成功提示
        message.success({ content: '模板已删除', key: 'deleteTemplate' });
      } else {
        // 显示失败提示
        message.error({ content: '删除模板失败', key: 'deleteTemplate' });
      }
    } catch (error) {
      console.error('删除模板发生错误:', error);
      message.error({ content: '删除模板失败，请重试', key: 'deleteTemplate' });
    }
  };
  
  // 添加键盘快捷键
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 记录键盘事件 - 显示更多调试信息
      console.log('+++Toolbar键盘事件+++', { 
        key: e.key, 
        altKey: e.altKey, 
        ctrlKey: e.ctrlKey, 
        metaKey: e.metaKey, 
        shiftKey: e.shiftKey,
        handled: window.keyEventHandled,
        target: e.target instanceof HTMLElement ? e.target.tagName : ''
      });
      
      // 详细快捷键调试
      if (window.debugShortcuts) {
        const isModKey = e.ctrlKey;
        if (isModKey) {
          console.log(`快捷键调试[Toolbar] - 检测到修饰键+${e.key}组合`, {
            isMac,
            isModifierKey: isModKey,
            key: e.key,
            keyLower: e.key.toLowerCase(),
            handled: window.keyEventHandled,
            activeElement: document.activeElement?.tagName
          });
        }
      }
      
      // 检查是否已经被处理
      if (window.keyEventHandled) {
        console.log('已被处理，跳过');
        return;
      }
      
      // 如果焦点在输入框或文本区域，不处理快捷键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        console.log('焦点在表单元素上，跳过快捷键处理');
        return;
      }
      
      // 检测修饰键 - 统一使用Ctrl键
      const isModifierKeyPressed = e.ctrlKey;
      
      // 所有文件操作快捷键使用Ctrl/Cmd
      
      // Ctrl+N: 新建空白思维导图
      if (isModifierKeyPressed && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        // 先设置标记再执行操作
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+N - 新建空白思维导图');
        handleCreateNew();
        
        // 快捷键调试
        if (window.debugShortcuts) {
          console.log('快捷键执行: Ctrl+N - 新建思维导图');
        }
        return;
      }
      
      // Ctrl+S: 保存
      if (isModifierKeyPressed && e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+S - 保存');
        handleSave();
        return;
      }
      
      // Ctrl+Shift+E: 导出JSON（原Ctrl+E）
      if (isModifierKeyPressed && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+Shift+E - 导出JSON');
        handleExportJSON();
        return;
      }
      
      // Ctrl+Shift+O: 导入JSON（原Ctrl+O）
      if (isModifierKeyPressed && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+Shift+O - 导入JSON');
        handleImportClick();
        
        // 快捷键调试
        if (window.debugShortcuts) {
          console.log('快捷键执行: Ctrl+Shift+O - 导入JSON');
        }
        return;
      }
      
      // Ctrl+T: 从模板创建
      if (isModifierKeyPressed && e.key.toLowerCase() === 't') {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('📢 触发快捷键：Ctrl+T - 从模板创建', {
          时间: new Date().toISOString().split('T')[1],
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey, 
          isMac,
          标志已设置: window.keyEventHandled
        });
        
        // 使用setTimeout确保事件处理完成后再执行
        setTimeout(() => {
          console.log('⏱️ 延迟执行从模板创建操作');
          handleShowTemplates();
          
          // 快捷键调试
          if (window.debugShortcuts) {
            console.log('🎯 快捷键执行: Ctrl+T - 从模板创建');
          }
        }, 0);
        return;
      }
      
      // Ctrl+P: 导出为图片
      if (isModifierKeyPressed && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+P - 导出为图片');
        handleExport();
        
        // 快捷键调试
        if (window.debugShortcuts) {
          console.log('快捷键执行: Ctrl+P - 导出为图片');
        }
        return;
      }
      
      // Ctrl+M: 打开文件菜单
      if (isModifierKeyPressed && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+M - 打开文件菜单');
        setFileMenuVisible(!fileMenuVisible);
        return;
      }
      
      // 节点操作快捷键
      
      // Tab: 添加子节点
      if (e.key === 'Tab' && !e.shiftKey && hasSingleSelection) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Tab - 添加子节点');
        handleAddChild();
        return;
      }
      
      // Shift+Tab: 添加兄弟节点
      if (e.key === 'Tab' && e.shiftKey && hasSingleSelection) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Shift+Tab - 添加兄弟节点');
        handleAddSibling();
        return;
      }
      
      // Delete: 删除节点
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
        // 只有当没有处于编辑状态时才处理删除
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          window.keyEventHandled = true;
          console.log('触发快捷键：Delete/Backspace - 删除节点');
          handleDelete();
          return;
        }
      }
      
      // Ctrl+E: 编辑节点（原F2）
      if (isModifierKeyPressed && e.key.toLowerCase() === 'e' && !e.shiftKey && hasSingleSelection) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+E - 编辑节点');
        handleEdit();
        return;
      }
      
      // Ctrl+Shift+S: 保存为模板
      if (isModifierKeyPressed && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+Shift+S - 保存为模板');
        setNewTemplateModalVisible(true);
        return;
      }
      
      // F2: 编辑节点
      if (e.key === 'F2' && hasSingleSelection) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：F2 - 编辑节点（已改为Ctrl+E，保留向后兼容）');
        handleEdit();
        return;
      }
      
      // Ctrl+Z: 撤销
      if (isModifierKeyPressed && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+Z - 撤销');
        handleUndo();
        return;
      }
      
      // Ctrl+Y 或 Ctrl+Shift+Z: 重做
      if (isModifierKeyPressed && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+Y 或 Ctrl+Shift+Z - 重做');
        handleRedo();
        return;
      }
      
      // Ctrl++: 放大
      if (isModifierKeyPressed && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl++ - 放大');
        handleZoomIn();
        return;
      }
      
      // Ctrl+-: 缩小
      if (isModifierKeyPressed && e.key === '-') {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+- - 缩小');
        handleZoomOut();
        return;
      }
      
      // Ctrl+B: 打开背景色选择器
      if (isModifierKeyPressed && e.key.toLowerCase() === 'b' && hasSelection) {
        e.preventDefault();
        window.keyEventHandled = true;
        console.log('触发快捷键：Ctrl+B - 打开背景色选择器');
        // 模拟点击背景色按钮
        document.querySelector('.ant-color-picker-trigger')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
        return;
      }
      
      // Ctrl+C: 打开文字颜色选择器 (避免与复制冲突，只在有节点选中时处理)
      if (isModifierKeyPressed && e.key.toLowerCase() === 'c' && hasSelection) {
        const selection = window.getSelection();
        // 只有当没有文本选择时才处理
        if (!selection || selection.toString().trim() === '') {
          e.preventDefault();
          window.keyEventHandled = true;
          console.log('触发快捷键：Ctrl+C - 打开文字颜色选择器');
          // 模拟点击文字颜色按钮
          document.querySelectorAll('.ant-color-picker-trigger')[1]?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
          );
          return;
        }
      }
    };
    
    // 优先级最高，使用捕获阶段
    document.removeEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    
    console.log('已安装Toolbar快捷键处理函数，状态：', {
      hasSingleSelection,
      hasSelection,
      fileMenuVisible,
      isMac
    });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      console.log('已移除Toolbar快捷键处理函数');
    };
  }, [
    // 添加所有依赖项
    selectedNodeIds, 
    hasSingleSelection, 
    hasSelection, 
    fileMenuVisible,
    handleAddChild,
    handleAddSibling,
    handleDelete,
    handleEdit,
    handleUndo,
    handleRedo,
    handleZoomIn,
    handleZoomOut,
    handleCreateNew,
    handleSave,
    handleExportJSON,
    handleImportClick,
    handleShowTemplates,
    handleExport,
    setNewTemplateModalVisible,
    setFileMenuVisible
  ]);
  
  // 处理模板对话框关闭
  const handleTemplatesModalClose = () => {
    setTemplatesModalVisible(false);
    // 清空模板列表，确保下次打开时重新获取
    setTemplates([]);
  };
  
  // 组件加载时预加载模板列表
  React.useEffect(() => {
    const preloadTemplates = async () => {
      try {
        const templateList = await loadTemplates();
        setTemplates(templateList);
        console.log('预加载模板列表成功，共', templateList.length, '个模板');
      } catch (error) {
        console.error('预加载模板列表失败:', error);
      }
    };
    
    preloadTemplates();
  }, [loadTemplates]);
  
  return (
    <ToolbarContainer>
      <ToolbarGroup>
        <Tooltip title={`文件操作 (Ctrl+M)`}>
          <Button 
            type="text" 
            icon={<FileOutlined />} 
            onClick={() => setFileMenuVisible(!fileMenuVisible)} 
          />
        </Tooltip>
        {fileMenuVisible && (
          <FileMenu>
            <MenuItem onClick={handleCreateNew}>
              <PlusOutlined /> 新建空白思维导图 <span style={{ color: '#999', fontSize: '12px' }}>Ctrl+N</span>
            </MenuItem>
            <MenuItem onClick={handleSave}>
              <SaveOutlined /> 保存 <span style={{ color: '#999', fontSize: '12px' }}>Ctrl+S</span>
            </MenuItem>
            <MenuItem onClick={handleExportJSON}>
              <SnippetsOutlined style={{ fontSize: '16px', color: '#1890ff' }} /> 导出JSON <span style={{ color: '#999', fontSize: '12px' }}>Ctrl+Shift+E</span>
            </MenuItem>
            <MenuItem onClick={handleImportClick}>
              <ImportOutlined style={{ fontSize: '16px', color: '#1890ff' }} /> 导入JSON <span style={{ color: '#999', fontSize: '12px' }}>Ctrl+Shift+O</span>
            </MenuItem>
            <MenuItem onClick={() => {
              setNewTemplateModalVisible(true);
              setFileMenuVisible(false);
            }}>
              <AppstoreOutlined /> 保存为模板 <span style={{ color: '#999', fontSize: '12px' }}>Ctrl+Shift+S</span>
            </MenuItem>
            <MenuItem onClick={handleShowTemplates}>
              <AppstoreOutlined /> 从模板创建 <span style={{ color: '#999', fontSize: '12px' }}>Ctrl+T</span>
            </MenuItem>
          </FileMenu>
        )}
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
        <Tooltip title="编辑节点 (Ctrl+E)">
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
        <Tooltip title={`撤销 (Ctrl+Z)`}>
          <Button type="text" icon={<UndoOutlined />} onClick={handleUndo} />
        </Tooltip>
        <Tooltip title={`重做 (Ctrl+Y)`}>
          <Button type="text" icon={<RedoOutlined />} onClick={handleRedo} />
        </Tooltip>
      </ToolbarGroup>
      
      <Divider type="vertical" />
      
      <ToolbarGroup>
        <Tooltip title={`放大 (Ctrl++)`}>
          <Button type="text" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
        </Tooltip>
        <Tooltip title={`缩小 (Ctrl+-)`}>
          <Button type="text" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
        </Tooltip>
      </ToolbarGroup>
      
      <Divider type="vertical" />
      
      <ToolbarGroup>
        <Tooltip title={`节点背景色 (Ctrl+B)`}>
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
        <Tooltip title={`文字颜色 (Ctrl+C)`}>
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
        <Tooltip title={`导出为图片 (Ctrl+P)`}>
          <HighlightedButton type="text" icon={<FileImageOutlined />} onClick={handleExport} />
        </Tooltip>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileImport}
          accept=".json"
          style={{ display: 'none' }}
        />
      </ToolbarGroup>
      
      {/* 新模板对话框 */}
      <Modal
        title="保存为模板"
        open={newTemplateModalVisible}
        onOk={handleSaveAsTemplate}
        onCancel={() => setNewTemplateModalVisible(false)}
      >
        <Input
          placeholder="请输入模板名称"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
        />
      </Modal>
      
      {/* 模板列表对话框 */}
      <Modal
        title="从模板创建思维导图"
        open={templatesModalVisible}
        footer={null}
        onCancel={handleTemplatesModalClose}
      >
        {templates.length === 0 ? (
          <Typography.Text>暂无模板</Typography.Text>
        ) : (
          <List
            dataSource={templates}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button 
                    type="primary" 
                    onClick={() => handleCreateFromTemplate(item.id)}
                  >
                    使用此模板
                  </Button>,
                  // 默认模板不显示删除按钮
                  item.id !== 'default-example-template' && (
                    <Popconfirm
                      title="删除模板"
                      description="确定要删除这个模板吗？此操作不可恢复。"
                      onConfirm={() => handleDeleteTemplate(item.id)}
                      okText="删除"
                      cancelText="取消"
                      icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                    >
                      <Button type="text" danger>
                        <DeleteOutlined /> 删除
                      </Button>
                    </Popconfirm>
                  )
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  title={
                    <div>
                      {item.name} 
                      {item.id === 'default-example-template' && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>默认示例</Tag>
                      )}
                    </div>
                  }
                  description={item.id === 'default-example-template' ? 
                    '系统默认提供的示例思维导图模板' : 
                    `模板ID: ${item.id.substring(0, 8)}...`}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </ToolbarContainer>
  );
};

// 文件菜单样式
const FileMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  min-width: 160px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
  margin-top: 4px;
`;

const MenuItem = styled.div`
  padding: 8px 16px;
  cursor: pointer;

  &:hover {
    background-color: #f5f5f5;
  }
`;

export default Toolbar;
