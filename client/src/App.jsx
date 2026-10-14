import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { clearSession, getToken, getUser } from './api.js';
import { AuthPage, Dashboard, Interview } from './pages.jsx';

const Private = ({ children }) => (getToken() ? children : <Navigate to="/login" replace />);

export default function App() {
  const nav = useNavigate();
  const user = getUser();
  return (
    <>
      <header className="bar">
        <Link to="/" className="brand">PrepPilot</Link>
        {user && (
          <div className="who">
            <span>{user.name}</span>
            <button className="ghost" onClick={() => { clearSession(); nav('/login'); }}>Log out</button>
          </div>
        )}
      </header>
      <main>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/" element={<Private><Dashboard /></Private>} />
          <Route path="/interview/:id" element={<Private><Interview /></Private>} />
        </Routes>
      </main>
    </>
  );
}
