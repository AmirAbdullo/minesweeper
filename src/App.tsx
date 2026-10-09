import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AboutPage } from './pages/AboutPage';
import { GamePage } from './pages/GamePage';
import { HelpPage } from './pages/HelpPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import { GameProvider } from './state/GameContext';
import { SettingsProvider } from './state/SettingsContext';
import { StatsProvider } from './state/StatsContext';

export default function App() {
  return (
    <SettingsProvider>
      <StatsProvider>
        <GameProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<GamePage />} />
                <Route path="stats" element={<StatsPage />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </GameProvider>
      </StatsProvider>
    </SettingsProvider>
  );
}
