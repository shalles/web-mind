import React from 'react';
import styled from 'styled-components';
import { MindNode } from '@/types/mindmap';
import { 
  FileImageOutlined, 
  TagOutlined, 
  LinkOutlined, 
  CloseOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { Input, Button, ColorPicker } from 'antd';

interface NodeMenuProps {
  node: MindNode;
  onClose: () => void;
  onUpdateIcon: (iconType: string, color?: string, size?: number) => void;
  onUpdateImage: (src: string, width?: number, height?: number) => void;
}

const MenuContainer = styled.div`
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  padding: 10px;
  z-index: 1000;
  min-width: 200px;
`;

const MenuHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
`;

const MenuTitle = styled.div`
  font-weight: bold;
`;

const CloseButton = styled.div`
  cursor: pointer;
  &:hover {
    color: #1890ff;
  }
`;

const MenuSection = styled.div`
  margin-bottom: 10px;
`;

const SectionTitle = styled.div`
  font-size: 13px;
  margin-bottom: 5px;
  color: #666;
`;

const IconGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 10px;
`;

const IconItem = styled.div<{ active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
  background-color: ${props => props.active ? '#e6f7ff' : '#f5f5f5'};
  border: 1px solid ${props => props.active ? '#1890ff' : 'transparent'};
  
  &:hover {
    background-color: #e6f7ff;
  }
`;

const NodeMenu: React.FC<NodeMenuProps> = ({ node, onClose, onUpdateIcon, onUpdateImage }) => {
  const [iconColor, setIconColor] = React.useState<string>(node.icon?.color || '#1890ff');
  const [imageSrc, setImageSrc] = React.useState<string>('');
  const [imageWidth, setImageWidth] = React.useState<number>(100);
  const [imageHeight, setImageHeight] = React.useState<number>(100);
  
  // 图标列表
  const icons = [
    { type: 'message', component: <MessageOutlined /> },
    { type: 'file', component: <FileImageOutlined /> },
    { type: 'tag', component: <TagOutlined /> },
    { type: 'link', component: <LinkOutlined /> }
  ];
  
  // 处理图标选择
  const handleIconSelect = (iconType: string) => {
    onUpdateIcon(iconType, iconColor, 20);
  };
  
  // 处理移除图标
  const handleRemoveIcon = () => {
    onUpdateIcon('');
  };
  
  // 处理添加图片
  const handleAddImage = () => {
    if (imageSrc.trim()) {
      onUpdateImage(imageSrc, imageWidth, imageHeight);
    }
  };
  
  // 处理移除图片
  const handleRemoveImage = () => {
    onUpdateImage('');
  };
  
  return (
    <MenuContainer>
      <MenuHeader>
        <MenuTitle>节点设置</MenuTitle>
        <CloseButton onClick={onClose}>
          <CloseOutlined />
        </CloseButton>
      </MenuHeader>
      
      <MenuSection>
        <SectionTitle>节点图标</SectionTitle>
        <IconGrid>
          {icons.map(icon => (
            <IconItem 
              key={icon.type}
              active={node.icon?.type === icon.type}
              onClick={() => handleIconSelect(icon.type)}
              style={{ color: iconColor }}
            >
              {icon.component}
            </IconItem>
          ))}
        </IconGrid>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ marginRight: 10 }}>图标颜色:</div>
          <ColorPicker
            value={iconColor}
            onChange={(color) => setIconColor(color.toHexString())}
          />
          
          {node.icon && (
            <Button 
              size="small" 
              type="text" 
              danger 
              onClick={handleRemoveIcon}
              style={{ marginLeft: 'auto' }}
            >
              移除图标
            </Button>
          )}
        </div>
      </MenuSection>
      
      <MenuSection>
        <SectionTitle>节点图片</SectionTitle>
        <Input
          placeholder="输入图片URL"
          value={imageSrc}
          onChange={(e) => setImageSrc(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        
        <div style={{ display: 'flex', gap: 10 }}>
          <Input
            type="number"
            addonBefore="宽"
            addonAfter="px"
            value={imageWidth}
            onChange={(e) => setImageWidth(Number(e.target.value))}
            style={{ width: '50%' }}
          />
          <Input
            type="number"
            addonBefore="高"
            addonAfter="px"
            value={imageHeight}
            onChange={(e) => setImageHeight(Number(e.target.value))}
            style={{ width: '50%' }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <Button size="small" type="primary" onClick={handleAddImage}>
            添加图片
          </Button>
          
          {node.image && (
            <Button size="small" danger onClick={handleRemoveImage}>
              移除图片
            </Button>
          )}
        </div>
      </MenuSection>
    </MenuContainer>
  );
};

export default NodeMenu; 