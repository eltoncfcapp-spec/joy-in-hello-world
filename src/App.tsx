import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Events from './pages/Events';
import CellGroups from './pages/CellGroups';
import Departments from './pages/Departments';
import Trends from './pages/Trends';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="events" element={<Events />} />
          <Route path="cell-groups" element={<CellGroups />} />
          <Route path="departments" element={<Departments />} />
          <Route path="trends" element={<Trends />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
