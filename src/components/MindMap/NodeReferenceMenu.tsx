import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { MindNode } from '@/types/mindmap';
import { LinkOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { Input, Empty } from 'antd';
import useMindMapStore from '@/store';

interface NodeReferenceMenuProps {
  node: MindNode;
  position: { x: number; y: number };
  onClose: () => void;
}

// 菜单容器
const MenuContainer = styled.div<{ x: number; y: number }>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  width: 250px;
  max-height: 400px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

// 菜单标题
const MenuHeader = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.div`
  font-weight: bold;
  color: #333;
`;

const CloseButton = styled.div`
  cursor: pointer;
  color: #999;
  
  &:hover {
    color: #1890ff;
  }
`;

// 搜索框容器
const SearchContainer = styled.div`
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
`;

// 节点列表容器
const NodeListContainer = styled.div`
  overflow-y: auto;
  max-height: 300px;
  padding: 0;
`;

// 节点项
const NodeItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

// 节点图标
const NodeIcon = styled.div`
  margin-right: 8px;
  color: #1890ff;
`;

// 节点内容
const NodeContent = styled.div`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// 节点路径
const NodePath = styled.div`
  font-size: 12px;
  color: #999;
  margin-top: 2px;
`;

// 空状态
const EmptyContainer = styled.div`
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const NodeReferenceMenu: React.FC<NodeReferenceMenuProps> = ({ node, position, onClose }) => {
  const { nodes, createNodeReference } = useMindMapStore();
  const [searchText, setSearchText] = useState('');
  const [filteredNodes, setFilteredNodes] = useState<MindNode[]>([]);
  
  // 初始化过滤节点
  useEffect(() => {
    // 过滤当前节点及其子节点，避免自引用
    const excludeIds = new Set<string>();
    
    const collectNodeIds = (n: MindNode) => {
      excludeIds.add(n.id);
      n.children.forEach(collectNodeIds);
    };
    
    collectNodeIds(node);
    
    // 过滤可引用的节点
    const filtered = nodes.filter(n => 
      !excludeIds.has(n.id) && 
      !n.isReference &&
      (!searchText || n.content.toLowerCase().includes(searchText.toLowerCase()))
    );
    
    setFilteredNodes(filtered);
  }, [node, nodes, searchText]);
  
  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };
  
  // 处理选择节点作为引用
  const handleSelectNode = (selectedNode: MindNode) => {
    createNodeReference(selectedNode.id, node.id);
    onClose();
  };
  
  // 构建节点路径
  const buildNodePath = (nodeId: string): string => {
    const paths: string[] = [];
    let currentId = nodeId;
    
    // 最多10级，避免可能的循环引用
    for (let i = 0; i < 10; i++) {
      const currentNode = nodes.find(n => n.id === currentId);
      if (!currentNode) break;
      
      paths.unshift(currentNode.content);
      if (!currentNode.parent) break;
      currentId = currentNode.parent;
    }
    
    return paths.join(' > ');
  };
  
  return (
    <MenuContainer x={position.x} y={position.y}>
      <MenuHeader>
        <Title>添加节点引用</Title>
        <CloseButton onClick={onClose}>
          <CloseOutlined />
        </CloseButton>
      </MenuHeader>
      
      <SearchContainer>
        <Input
          placeholder="搜索节点..."
          value={searchText}
          onChange={handleSearch}
          prefix={<SearchOutlined />}
          allowClear
        />
      </SearchContainer>
      
      <NodeListContainer>
        {filteredNodes.length > 0 ? (
          filteredNodes.map(filteredNode => (
            <NodeItem 
              key={filteredNode.id}
              onClick={() => handleSelectNode(filteredNode)}
            >
              <NodeIcon>
                <LinkOutlined />
              </NodeIcon>
              <div>
                <NodeContent>{filteredNode.content}</NodeContent>
                <NodePath>{buildNodePath(filteredNode.id)}</NodePath>
              </div>
            </NodeItem>
          ))
        ) : (
          <EmptyContainer>
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description="没有找到可引用的节点" 
            />
          </EmptyContainer>
        )}
      </NodeListContainer>
    </MenuContainer>
  );
};

export default NodeReferenceMenu; 