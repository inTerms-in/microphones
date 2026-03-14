import React from 'react';

const MetricCard = ({ title, value, unit, icon, trend, subtext, color = 'var(--accent-color)' }) => {
  return (
    <div className="glass animate-fade-in" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1, color }}>
        {React.cloneElement(icon, { size: 80 })}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <div style={{ padding: '8px', borderRadius: '8px', background: `rgba(${color === 'var(--accent-color)' ? '0, 210, 255' : '0, 200, 83'}, 0.1)`, color }}>
          {React.cloneElement(icon, { size: 20 })}
        </div>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>{value}</h2>
        {unit && <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>{unit}</span>}
      </div>

      {subtext && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {subtext}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
