import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Create from './pages/Create.jsx';
import Campaign from './pages/Campaign.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<Create />} />
      <Route path="/campaign/:id" element={<Campaign />} />
    </Routes>
  );
}
