import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { GlobalStyle } from './styles/global';
import MindMap from './components/MindMap';

function App() {
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
      <MindMap />
    </ConfigProvider>
  );
}

export default App;
