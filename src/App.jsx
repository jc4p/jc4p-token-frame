import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FrameInit } from './components/FrameInit';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { RedeemPage } from './pages/RedeemPage';
import { HistoryPage } from './pages/HistoryPage';
import { ContractProvider } from './contexts/ContractContext';

function App() {
  return (
    <BrowserRouter>
      <ContractProvider>
        <div className="min-h-screen bg-terminal-bg">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/redeem" element={<RedeemPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
          <Navigation />
          <FrameInit />
        </div>
      </ContractProvider>
    </BrowserRouter>
  );
}

export default App;