import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileEdit, Settings, BarChart3, LogOut, ChevronLeft, ChevronRight, Menu, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { logout, checkPermission, profile, companyName } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard', show: checkPermission('dashboard', 'view') },
    { name: 'Entry', icon: <FileEdit size={22} />, path: '/entry', show: checkPermission('entryform', 'view'), isCenter: true },
    { name: 'Services', icon: <Wrench size={20} />, path: '/service', show: checkPermission('service', 'view') },
    { name: 'Reports', icon: <BarChart3 size={20} />, path: '/reports', show: checkPermission('reports', 'view') },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings', show: checkPermission('settings', 'view') },
  ];

  return (
    <aside className="glass app-sidebar" style={{
      width: collapsed ? '80px' : 'var(--sidebar-width)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      transition: 'width 0.3s ease',
      position: 'relative'
    }}>
      {/* Mobile-only Logout (Hidden on desktop via CSS if we wanted, but here we just append to nav) */}
      
      {/* Collapse Toggle Button (Hidden on mobile via CSS) */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="btn-icon sidebar-toggle desktop-only"
        style={{
          position: 'absolute',
          right: '-12px',
          top: '2.5rem',
          background: 'var(--bg-color)',
          border: '1px solid var(--glass-border)',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          zIndex: 110,
          color: 'var(--accent-color)'
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="sidebar-header" style={{ marginBottom: '3rem', padding: '0 1rem', overflow: 'hidden' }}>
        {!collapsed && (
          <>
            <h1 className="text-gradient" style={{ fontSize: '1.3rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{companyName}</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Administration</p>
          </>
        )}
        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
             <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
               {companyName?.[0]}
             </div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: collapsed ? '0 12px' : '0' }}>
        {navItems.filter(item => item.show).map(item => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => {
              let cls = 'nav-item flex-center';
              if (isActive) cls += ' nav-active';
              if (item.isCenter && !collapsed) cls += ' nav-item-center';
              return cls;
            }}
            style={({ isActive }) => ({
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '12px',
              borderRadius: '12px',
              textDecoration: 'none',
              color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
              gap: collapsed ? '0' : '12px',
              transition: '0.2s',
              background: isActive ? 'rgba(0,210,255,0.1)' : 'transparent'
            })}
          >
            {item.icon}
            {!collapsed && <span className="nav-label" style={{ fontWeight: 500 }}>{item.name}</span>}
          </NavLink>
        ))}
        
        {/* Mobile Logout Button (Visible inside nav only on mobile via CSS) */}
        <button 
          onClick={() => { logout(); navigate('/login'); }}
          className="nav-item flex-center mobile-logout-btn"
          style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '12px',
            borderRadius: '12px',
            color: 'var(--error)',
            gap: collapsed ? '0' : '12px',
            background: 'transparent',
            marginTop: '4px'
          }}
        >
          <LogOut size={20} />
          {!collapsed && <span className="nav-label" style={{ fontWeight: 500 }}>Logout</span>}
        </button>
      </nav>

      <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--glass-border)', overflow: 'hidden' }}>
        {!collapsed && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>{profile?.full_name}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{profile?.role}</p>
          </div>
        )}
        <button 
          onClick={() => { logout(); navigate('/login'); }}
          className="flex-center logout-btn-desktop" 
          style={{
            width: '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '12px',
            background: 'rgba(255, 61, 0, 0.1)',
            color: 'var(--error)',
            gap: collapsed ? '0' : '12px',
            borderRadius: '12px'
          }}
        >
          <LogOut size={18} />
          {!collapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>
      <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-secondary)', opacity: 0.1 }}>v1.0.4</span>
      </div>
    </aside>
  );
};

export default Sidebar;
