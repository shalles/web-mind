import React, { useRef, useState } from 'react';
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
  
  // 导出思维导图为JSON
  const handleExportJSON = () => {
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
  };
  
  // 触发文件选择对话框
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
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
  
  // 处理新建思维导图
  const handleCreateNew = () => {
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
  
  // 处理显示模板列表
  const handleShowTemplates = async () => {
    // 显示加载提示
    message.loading({ content: '加载模板列表...', key: 'loadTemplates' });
    
    // 清空当前模板列表，强制重新加载
    setTemplates([]);
    
    try {
      // 每次都重新获取最新的模板列表
      const templateList = await loadTemplates();
      setTemplates(templateList);
      console.log('加载模板列表成功，共', templateList.length, '个模板');
      
      // 显示成功提示
      if (templateList.length === 0) {
        message.info({ content: '暂无可用模板', key: 'loadTemplates' });
      } else {
        message.success({ content: `已加载${templateList.length}个模板`, key: 'loadTemplates' });
      }
      
      // 打开模板对话框
      setTemplatesModalVisible(true);
    } catch (error) {
      console.error('加载模板失败:', error);
      message.error({ content: '加载模板失败，请重试', key: 'loadTemplates' });
    }
    
    // 关闭文件菜单
    setFileMenuVisible(false);
  };
  
  // 处理从模板创建
  const handleCreateFromTemplate = async (templateId: string) => {
    const success = await createFromTemplate(templateId);
    if (success) {
      message.success('已从模板创建思维导图');
      setTemplatesModalVisible(false);
    } else {
      message.error('创建失败，模板可能已被删除');
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
  
  // 处理手动保存
  const handleSave = async () => {
    await saveToLocalStorage();
    message.success('思维导图已保存');
    setFileMenuVisible(false);
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
  
  // 处理模板对话框关闭
  const handleTemplatesModalClose = () => {
    setTemplatesModalVisible(false);
    // 清空模板列表，确保下次打开时重新获取
    setTemplates([]);
  };
  
  return (
    <ToolbarContainer>
      <ToolbarGroup>
        <Tooltip title="文件操作">
          <Button 
            type="text" 
            icon={<FileOutlined />} 
            onClick={() => setFileMenuVisible(!fileMenuVisible)} 
          />
        </Tooltip>
        {fileMenuVisible && (
          <FileMenu>
            <MenuItem onClick={handleCreateNew}>
              <PlusOutlined /> 新建空白思维导图
            </MenuItem>
            <MenuItem onClick={handleSave}>
              <SaveOutlined /> 保存
            </MenuItem>
            <MenuItem onClick={handleExportJSON}>
              <SnippetsOutlined style={{ fontSize: '16px', color: '#1890ff' }} /> 导出JSON
            </MenuItem>
            <MenuItem onClick={handleImportClick}>
              <ImportOutlined style={{ fontSize: '16px', color: '#1890ff' }} /> 导入JSON
            </MenuItem>
            <MenuItem onClick={() => {
              setNewTemplateModalVisible(true);
              setFileMenuVisible(false);
            }}>
              <AppstoreOutlined /> 保存为模板
            </MenuItem>
            <MenuItem onClick={handleShowTemplates}>
              <AppstoreOutlined /> 从模板创建
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
