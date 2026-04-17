import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { routes } from './routes';

function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Link to="/" style={{ fontWeight: 600, textDecoration: 'none', color: '#111' }}>QualiPilot</Link>
        {routes.map((r) => (
          <Link key={r.path} to={r.path} style={{ textDecoration: 'none', color: '#555' }}>{r.label}</Link>
        ))}
      </nav>

      <Suspense fallback={<div style={{ padding: 24 }}>Chargement...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={<r.component />} />
          ))}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
