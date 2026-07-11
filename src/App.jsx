import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Archive from './pages/Archive';
import Add from './pages/Add';
import Import from './pages/Import';
import Profile from './pages/Profile';
import TitleDetail from './pages/TitleDetail';
import Login from './pages/Login';

const TOKEN_KEY = 'mystubs_token';

// Wrapper for routes that require authentication
function ProtectedRoute({ children }) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Wrapper for public-only routes (redirects to home if already logged in)
function PublicRoute({ children }) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected App Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <NavBar />
                <main style={{ flex: '1 0 auto' }}>
                  <Routes>
                    <Route path="/" element={<Archive />} />
                    <Route path="/title/:id" element={<TitleDetail />} />
                    <Route path="/add" element={<Add />} />
                    <Route path="/import" element={<Import />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
