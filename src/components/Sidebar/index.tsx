import React from 'react';
import styled from 'styled-components';
import { Tabs } from 'antd';
import { ThemeOutlined, SettingOutlined } from '@ant-design/icons';

const SidebarContainer = styled.div`
  width: 280px;
  height: 100%;
  border-right: 1px solid #f0f0f0;
  background: white;
`;

const StylePanel = styled.div`
  padding: 16px;
`;

const SettingsPanel = styled.div`
  padding: 16px;
`;

const Sidebar: React.FC = () => {
  return (
    <SidebarContainer>
      <Tabs
        defaultActiveKey="style"
        items={[
          {
            key: 'style',
            label: (
              <span>
                <ThemeOutlined />
                样式
              </span>
            ),
            children: <StylePanel>样式设置面板</StylePanel>,
          },
          {
            key: 'settings',
            label: (
              <span>
                <SettingOutlined />
                设置
              </span>
            ),
            children: <SettingsPanel>全局设置面板</SettingsPanel>,
          },
        ]}
      />
    </SidebarContainer>
  );
};

export default Sidebar;