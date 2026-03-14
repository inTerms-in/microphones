import React from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { companyName } = useAuth();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      <Sidebar />
      <main className="main-content" style={{ 
        flex: 1, 
        width: '100%'
      }}>
        <div className="animate-fade-in" style={{ padding: '0 2rem' }}>
          <header style={{ padding: '1rem 0', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', marginBottom: '1.5rem', justifyContent: 'space-between' }}>
            <h1 className="text-gradient" style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>{companyName}</h1>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ADMINISTRATION PANEL</div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
