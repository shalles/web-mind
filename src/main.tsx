import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'
import useMindMapStore from './store'

// 设置 antd 的默认配置
ConfigProvider.config({
  theme: {
    token: {
      colorPrimary: '#1890ff',
    },
  },
})

// 创建一个调试函数，在页面加载后输出状态
const debugStore = () => {
  setTimeout(() => {
    const store = useMindMapStore.getState();
    console.log('MindMap 状态:', store);
    console.log('节点数量:', store.nodes.length);
    if (store.nodes.length > 0) {
      console.log('第一个节点:', store.nodes[0]);
    } else {
      console.log('暂无节点');
      // 注释掉这里的初始化，让组件自己管理初始化
      // store.initialize();
    }
  }, 1000);
};

// 调用调试函数
debugStore();

// 移除WebManifest
const removeManifestLink = () => {
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    manifestLink.remove();
    console.log('已移除manifest链接');
  }
};

// 调用移除WebManifest
removeManifestLink();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
