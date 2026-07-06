import { BrowserRouter, Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Archive from './pages/Archive';
import Add from './pages/Add';
import Import from './pages/Import';
import Profile from './pages/Profile';
import TitleDetail from './pages/TitleDetail';

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Archive />} />
        <Route path="/title/:id" element={<TitleDetail />} />
        <Route path="/add" element={<Add />} />
        <Route path="/import" element={<Import />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
