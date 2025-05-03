import React, { useEffect } from 'react';
import styled from 'styled-components';
import { ConfigProvider, theme, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { GlobalStyle } from './styles/global';
import MindMap from './components/MindMap';
import useMindMapStore from './store';
import logo from './assets/webxmind-logo.svg';

// 声明全局标志，用于标记快捷键事件是否已被处理
declare global {
  interface Window {
    keyEventHandled?: boolean;
    debugKeyboard?: boolean; // 添加调试标志
    logKeyboardEvent?: (source: string, e: KeyboardEvent, handled?: boolean) => void;
    debugShortcuts?: boolean; // 详细快捷键调试
    debugTemplates?: boolean; // 模板操作调试
  }
}

// 确保window属性存在
if (typeof window !== 'undefined') {
  window.keyEventHandled = false;
  window.debugKeyboard = true; // 默认开启键盘调试
  window.debugShortcuts = false; // 默认关闭详细快捷键调试
  window.debugTemplates = false; // 默认关闭模板调试
}

// 全局键盘事件监控日志函数
const logKeyboardEvent = (source: string, e: KeyboardEvent, handled: boolean = false) => {
  if (window.debugKeyboard) {
    console.log(`键盘事件 [${source}]:`, {
      key: e.key,
      code: e.code,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      modifier: e.ctrlKey ? 'Ctrl按下' : '',
      target: e.target instanceof HTMLElement 
        ? `${e.target.tagName.toLowerCase()}${e.target.id ? '#'+e.target.id : ''}`
        : typeof e.target,
      handled,
      timestamp: new Date().toISOString().split('T')[1].replace('Z', '')
    });
  }
};

// 将日志函数添加到全局，供其他组件使用
if (typeof window !== 'undefined') {
  window.logKeyboardEvent = logKeyboardEvent;
}

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
  
  // 全局键盘快捷键管理
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 重置全局标志 - 由于App组件使用捕获阶段且最先注册，这个重置会在所有处理前执行
      window.keyEventHandled = false;
      
      // 记录键盘事件
      logKeyboardEvent('App', e, false);
      
      // 如果焦点在输入框中，不处理全局快捷键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      
      // F1键显示帮助信息
      if (e.key === 'F1') {
        e.preventDefault();
        message.info('WebXmind思维导图 - 帮助信息将在这里显示');
        window.keyEventHandled = true;
        logKeyboardEvent('App-F1', e, true);
      }
      
      // 切换键盘调试模式
      if (e.key === 'F12' && e.shiftKey) {
        e.preventDefault();
        window.debugKeyboard = !window.debugKeyboard;
        message.info(`键盘调试模式: ${window.debugKeyboard ? '开启' : '关闭'}`);
        window.keyEventHandled = true;
        console.log(`键盘调试模式已${window.debugKeyboard ? '开启' : '关闭'}`);
      }
      
      // 切换快捷键详细调试模式
      if (e.key === 'F12' && e.ctrlKey) {
        e.preventDefault();
        window.debugShortcuts = !window.debugShortcuts;
        message.info(`快捷键详细调试模式: ${window.debugShortcuts ? '开启' : '关闭'}`);
        window.keyEventHandled = true;
        console.log(`快捷键详细调试模式已${window.debugShortcuts ? '开启' : '关闭'}`);
        if (window.debugShortcuts) {
          console.log('快捷键调试提示：请尝试按下Ctrl+N, Ctrl+O, Ctrl+T等快捷键，并查看控制台日志');
        }
      }
      
      // 切换模板调试模式（Alt+F12）
      if (e.key === 'F12' && e.altKey) {
        e.preventDefault();
        window.debugTemplates = !window.debugTemplates;
        message.info(`模板功能调试模式: ${window.debugTemplates ? '开启' : '关闭'}`);
        window.keyEventHandled = true;
        console.log(`模板功能调试模式已${window.debugTemplates ? '开启' : '关闭'}`);
        if (window.debugTemplates) {
          console.log('模板调试提示：Ctrl+T - 从模板创建 | Ctrl+Shift+S - 保存为模板');
        }
      }
    };
    
    // 使用捕获阶段，确保最先接收到事件
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    console.log('App组件：已安装全局键盘事件处理器');
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
      console.log('App组件：已移除全局键盘事件处理器');
    };
  }, []);
  
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
