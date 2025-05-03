import React, { useEffect } from 'react';
import styled from 'styled-components';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { GlobalStyle } from './styles/global';
import MindMap from './components/MindMap';
import useMindMapStore from './store';
import logo from './assets/webxmind-logo.svg';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
`;

const Header = styled.header`
  height: 50px;
  background-color: #1890ff;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 18px;
  font-weight: bold;
`;

const Logo = styled.img`
  height: 36px;
  margin-right: 10px;
`;

const MainContent = styled.main`
  flex: 1;
  overflow: hidden;
  position: relative;
`;

const App: React.FC = () => {
  const { initialize, nodes } = useMindMapStore();
  
  // 只在节点为空时初始化思维导图
  useEffect(() => {
    if (nodes.length === 0) {
      console.log('App组件挂载，初始化思维导图');
      initialize();
    } else {
      console.log('App组件挂载，思维导图已初始化，节点数:', nodes.length);
    }
  }, [initialize, nodes.length]);
  
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 4,
        },
      }}
    >
      <GlobalStyle />
      <AppContainer>
        <Header>
          <Logo src={logo} alt="WebXmind Logo" />
          WebXmind 网页思维导图
        </Header>
        <MainContent>
          <MindMap />
        </MainContent>
      </AppContainer>
    </ConfigProvider>
  );
};

export default App;
