import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Input, Popover, Tooltip } from 'antd';
import { MindNode, NodeStyle } from '@/types/mindmap';
import useMindMapStore from '@/store';
import { 
  EditOutlined, 
  PlusOutlined, 
  MinusOutlined,
  FileImageOutlined,
  MessageOutlined,
  TagOutlined,
  LinkOutlined
} from '@ant-design/icons';
import NodeMenu from './NodeMenu';

// 节点接口
interface NodeProps {
  node: MindNode;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

// 节点容器样式
const NodeContainer = styled.div<{
  isSelected: boolean;
  style: NodeStyle;
  hasChildren: boolean;
  isExpanded: boolean;
  isReference: boolean;
  node: MindNode;
}>`
  position: absolute;
  transform: ${props => `translate(${props.node?.position?.x || 0}px, ${props.node?.position?.y || 0}px)`};
  background-color: ${props => props.style.backgroundColor || '#ffffff'};
  border: ${props => 
    `${props.style.borderWidth || 1}px ${props.style.borderStyle || 'solid'} ${
      props.isSelected 
        ? '#1890ff' 
        : props.isReference 
          ? '#722ed1' // 引用节点使用紫色边框
          : props.style.borderColor || '#cccccc'
    }`};
  border-radius: ${props => `${props.style.borderRadius || 4}px`};
  padding: ${props => `${props.style.padding || 8}px`};
  min-width: 80px;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: ${props => props.isSelected ? '0 0 0 2px rgba(24, 144, 255, 0.5)' : 'none'};
  cursor: pointer;
  user-select: none;
  z-index: 1;
  
  &:hover {
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  }
  
  ${props => props.isReference && `
    background-image: linear-gradient(45deg, rgba(114, 46, 209, 0.05) 25%, transparent 25%, transparent 50%, rgba(114, 46, 209, 0.05) 50%, rgba(114, 46, 209, 0.05) 75%, transparent 75%, transparent);
    background-size: 10px 10px;
  `}
`;

// 节点矩形样式
const NodeRect = styled.rect<{ 
  backgroundColor: string; 
  borderColor: string; 
  borderWidth: number;
  isSelected: boolean;
}>`
  fill: ${props => props.backgroundColor};
  stroke: ${props => props.isSelected ? '#1890ff' : props.borderColor};
  stroke-width: ${props => props.isSelected ? 2 : props.borderWidth}px;
  rx: 5px;
  ry: 5px;
`;

// 节点文本样式
const NodeText = styled.text<{ 
  fontColor: string; 
  fontSize: number; 
  fontWeight: string | number;
}>`
  fill: ${props => props.fontColor};
  font-size: ${props => props.fontSize}px;
  font-weight: ${props => props.fontWeight};
  dominant-baseline: middle;
  text-anchor: middle;
  user-select: none;
  pointer-events: none;
`;

// 节点折叠按钮样式
const CollapseButton = styled.g`
  cursor: pointer;
  
  &:hover circle {
    fill: #e6f7ff;
  }
`;

// 外部编辑框样式
const ForeignObject = styled.foreignObject`
  overflow: visible;
`;

// 节点内容样式
const NodeContent = styled.div<{ style: NodeStyle; isEditing: boolean }>`
  font-size: ${props => `${props.style.fontSize || 14}px`};
  color: ${props => props.style.fontColor || '#333333'};
  font-weight: ${props => props.style.fontWeight || 'normal'};
  text-align: center;
  width: 100%;
  word-break: break-word;
  outline: ${props => props.isEditing ? '2px solid #1890ff' : 'none'};
  padding: 2px;
`;

// 编辑输入框样式
const EditInput = styled(Input)`
  font-size: inherit;
  color: inherit;
  font-weight: inherit;
  text-align: center;
  width: 100%;
  border: none;
  outline: 2px solid #1890ff;
  padding: 2px;
  
  &:focus {
    box-shadow: none;
  }
`;

// 子节点折叠/展开按钮
const ExpandButton = styled.div<{ direction: 'left' | 'right' }>`
  position: absolute;
  bottom: ${props => props.direction === 'left' ? '50%' : '50%'};
  ${props => props.direction === 'left' ? 'left' : 'right'}: -15px;
  width: 16px;
  height: 16px;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  transform: translateY(50%);
  
  &:hover {
    border-color: #1890ff;
    color: #1890ff;
  }
`;

// 图片容器
const ImageContainer = styled.div`
  margin-bottom: 8px;
  max-width: 100%;
  display: flex;
  justify-content: center;
`;

// 图标容器
const IconContainer = styled.div`
  margin-bottom: 8px;
  font-size: 20px;
  display: flex;
  justify-content: center;
`;

// 备注指示器
const NoteIndicator = styled.div`
  position: absolute;
  top: 2px;
  right: 2px;
  color: #1890ff;
  font-size: 12px;
`;

// 引用指示器
const ReferenceIndicator = styled.div`
  position: absolute;
  top: 2px;
  left: 2px;
  color: #722ed1;
  font-size: 12px;
`;

// 功能按钮容器
const ActionButtons = styled.div`
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background-color: #ffffff;
  border-radius: 4px;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
`;

// 功能按钮
const ActionButton = styled.div`
  cursor: pointer;
  color: #666666;
  font-size: 14px;
  
  &:hover {
    color: #1890ff;
  }
`;

const Node: React.FC<NodeProps> = ({ node, isSelected, onClick }) => {
  const { 
    editingNodeId, 
    setEditingNodeId, 
    updateNodeContent, 
    toggleNodeExpanded,
    updateNodeNote,
    updateNodeIcon,
    updateNodeImage
  } = useMindMapStore();
  
  const [showMenu, setShowMenu] = useState(false);
  const [localNoteContent, setLocalNoteContent] = useState(node.note || '');
  const [tempContent, setTempContent] = useState(node.content);
  const [isEditingNote, setIsEditingNote] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  
  // 处理节点点击
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(e);
    
    // 双击激活编辑
    if (e.detail === 2) {
      setEditingNodeId(node.id);
    }
  };
  
  // 处理编辑提交
  const handleInputSubmit = () => {
    if (tempContent.trim() !== '') {
      updateNodeContent(node.id, tempContent);
    }
    setEditingNodeId(null);
  };
  
  // 处理输入框按键
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setTempContent(node.content);
      setEditingNodeId(null);
    }
  };
  
  // 处理折叠/展开按钮点击
  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpanded(node.id);
  };
  
  // 处理备注提交
  const handleNoteSubmit = () => {
    updateNodeNote(node.id, localNoteContent);
    setIsEditingNote(false);
  };
  
  // 处理图标更新
  const handleIconUpdate = (icon: string, color: string = '#1890ff', size: number = 20) => {
    if (!icon) {
      updateNodeIcon(node.id, undefined);
    } else {
      updateNodeIcon(node.id, { type: icon, color, size });
    }
    setShowMenu(false);
  };
  
  // 处理图片更新
  const handleImageUpdate = (imageSrc: string, width: number = 100, height: number = 100) => {
    if (!imageSrc) {
      updateNodeImage(node.id, undefined);
    } else {
      updateNodeImage(node.id, { src: imageSrc, width, height, alt: node.content });
    }
    setShowMenu(false);
  };
  
  // 当节点进入编辑状态时，聚焦输入框
  useEffect(() => {
    if (editingNodeId === node.id && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingNodeId, node.id]);
  
  // 当开始编辑备注时，聚焦备注输入框
  useEffect(() => {
    if (isEditingNote && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [isEditingNote]);
  
  // 备注内容渲染
  const notePopoverContent = (
    <div style={{ width: 250 }}>
      {isEditingNote ? (
        <div>
          <Input.TextArea
            ref={noteInputRef}
            value={localNoteContent}
            onChange={(e) => setLocalNoteContent(e.target.value)}
            autoSize={{ minRows: 3, maxRows: 6 }}
            onBlur={handleNoteSubmit}
            onPressEnter={(e) => {
              if ((e.nativeEvent as KeyboardEvent).ctrlKey || (e.nativeEvent as KeyboardEvent).metaKey) {
                handleNoteSubmit();
              }
            }}
          />
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <small>按 Ctrl+Enter 保存</small>
          </div>
        </div>
      ) : (
        <div>
          <div>{node.note || '点击添加备注'}</div>
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <a onClick={() => setIsEditingNote(true)}>编辑</a>
          </div>
        </div>
      )}
    </div>
  );

  // 获取用于显示的图标组件
  const getIconComponent = () => {
    if (!node.icon) return null;
    
    // 动态导入图标
    try {
      // 这里简化处理，实际需要动态导入对应的图标
      return <div style={{ color: node.icon.color, fontSize: node.icon.size }}>
        {node.icon.type === 'message' && <MessageOutlined />}
        {node.icon.type === 'file' && <FileImageOutlined />}
        {node.icon.type === 'tag' && <TagOutlined />}
        {node.icon.type === 'link' && <LinkOutlined />}
      </div>;
    } catch (error) {
      console.error('Failed to load icon:', error);
      return null;
    }
  };
  
  return (
    <>
      <NodeContainer
        isSelected={isSelected}
        style={node.style}
        hasChildren={node.children.length > 0}
        isExpanded={node.expanded}
        isReference={!!node.isReference}
        onClick={handleClick}
        node={node}
      >
        {/* 图标显示 */}
        {node.icon && (
          <IconContainer>
            {getIconComponent()}
          </IconContainer>
        )}
        
        {/* 图片显示 */}
        {node.image && (
          <ImageContainer>
            <img 
              src={node.image.src} 
              alt={node.image.alt || node.content} 
              style={{
                maxWidth: '100%',
                maxHeight: node.image.height,
                width: 'auto',
                height: 'auto'
              }}
            />
          </ImageContainer>
        )}
        
        {/* 节点内容 */}
        <NodeContent 
          style={node.style} 
          isEditing={editingNodeId === node.id}
        >
          {editingNodeId === node.id ? (
            <EditInput
              ref={inputRef}
              value={tempContent}
              onChange={(e) => setTempContent(e.target.value)}
              onBlur={handleInputSubmit}
              onKeyDown={handleInputKeyDown}
            />
          ) : (
            node.content
          )}
        </NodeContent>
        
        {/* 备注指示 */}
        {node.note && (
          <Popover 
            content={notePopoverContent} 
            title="节点备注" 
            trigger="click"
            overlayStyle={{ maxWidth: 300 }}
          >
            <NoteIndicator onClick={(e) => e.stopPropagation()}>
              <Tooltip title="查看备注">
                <MessageOutlined />
              </Tooltip>
            </NoteIndicator>
          </Popover>
        )}
        
        {/* 引用指示 */}
        {node.isReference && (
          <ReferenceIndicator>
            <Tooltip title="引用节点">
              <LinkOutlined />
            </Tooltip>
          </ReferenceIndicator>
        )}
        
        {/* 展开/折叠按钮 */}
        {node.children.length > 0 && (
          <ExpandButton 
            direction={node.direction || 'right'} 
            onClick={handleExpandClick}
          >
            {node.expanded ? <MinusOutlined /> : <PlusOutlined />}
          </ExpandButton>
        )}
        
        {/* 节点选中时显示功能按钮 */}
        {isSelected && (
          <ActionButtons>
            <Tooltip title="编辑内容">
              <ActionButton onClick={() => setEditingNodeId(node.id)}>
                <EditOutlined />
              </ActionButton>
            </Tooltip>
            
            <Tooltip title="添加备注">
              <ActionButton onClick={() => {
                setIsEditingNote(true);
                setLocalNoteContent(node.note || '');
              }}>
                <MessageOutlined />
              </ActionButton>
            </Tooltip>
            
            <Tooltip title="更多操作">
              <ActionButton onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}>
                <FileImageOutlined />
              </ActionButton>
            </Tooltip>
          </ActionButtons>
        )}
      </NodeContainer>
      
      {/* 节点菜单 - 用于添加图标、图片、创建引用 */}
      {showMenu && (
        <NodeMenu 
          node={node}
          onClose={() => setShowMenu(false)}
          onUpdateIcon={handleIconUpdate}
          onUpdateImage={handleImageUpdate}
        />
      )}
    </>
  );
};

export default Node;
