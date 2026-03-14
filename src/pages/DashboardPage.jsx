import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  IndianRupee, Smartphone, CreditCard, Activity, Trophy,
  TrendingUp, CheckCircle2, AlertCircle,
  Receipt, TrendingDown, Calendar
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const MetricCard = React.memo(({ title, value, unit = "₹", icon: Icon, color, isCurrency = true }) => (
  <div className="glass card-hover metric-card" style={{ padding: '1rem', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{title}</p>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{isCurrency ? unit : ''}{value.toLocaleString()}</h2>
      </div>
      <div style={{ padding: '8px', borderRadius: '10px', background: `${color}20`, color }}>
        <Icon size={18} />
      </div>
    </div>
  </div>
));

const DashboardPage = () => {
  const { user, profile } = useAuth();
  const [rawData, setRawData] = useState({ branches: [], entries: [] });
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [filter, setFilter] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Fetch all data once, then filter client-side
  useEffect(() => {
    const fetchAll = async () => {
      try {
        let branchesQuery = supabase.from('branches').select('id, name').eq('is_active', true);
        if (profile?.role !== 'owner' && profile?.role !== 'partner') {
          const { data: ub } = await supabase.from('user_branches').select('branch_id').eq('user_id', user.id);
          const bIds = ub?.map(x => x.branch_id) || [];
          branchesQuery = branchesQuery.in('id', bIds);
        }
        const { data: branches } = await branchesQuery;

        // Fetch last year of data (covers all filters)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const bIds = branches?.map(b => b.id) || [];
        const { data: entries } = await supabase
          .from('daily_entries').select('*, branches(name)')
          .in('branch_id', bIds)
          .gte('entry_date', oneYearAgo.toISOString().split('T')[0])
          .order('entry_date', { ascending: true });

        setRawData({ branches: branches || [], entries: entries || [] });
      } catch (err) { console.error(err); }
      finally { setInitialLoaded(true); }
    };
    fetchAll();
  }, []);

  // Compute everything from rawData using useMemo — no re-fetch
  const { stats, charts, pct } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let startDate = today;
    
    if (filter === 'custom' && customStart) {
      startDate = customStart;
    } else if (filter === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7); startDate = d.toISOString().split('T')[0];
    } else if (filter === 'month') {
      const d = new Date(); d.setMonth(d.getMonth() - 1); startDate = d.toISOString().split('T')[0];
    } else if (filter === 'year') {
      const d = new Date(); d.setFullYear(d.getFullYear() - 1); startDate = d.toISOString().split('T')[0];
    }

    const endDate = (filter === 'custom' && customEnd) ? customEnd : today;
    const { branches, entries } = rawData;
    
    const todayEntries = entries.filter(e => e.entry_date === today);
    const submittedIds = new Set(todayEntries.map(e => e.branch_id));
    const submitted = branches.filter(b => submittedIds.has(b.id)).map(b => ({
      name: b.name,
      time: todayEntries.find(e => e.branch_id === b.id)?.created_at ?
            new Date(todayEntries.find(e => e.branch_id === b.id).created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
    }));
    const pending = branches.filter(b => !submittedIds.has(b.id)).map(b => b.name);

    const rangeEntries = entries.filter(e => e.entry_date >= startDate && e.entry_date <= endDate);
    const totals = rangeEntries.reduce((acc, curr) => ({
      sales: acc.sales + curr.total_sales, service: acc.service + curr.service_amount,
      phones: acc.phones + curr.smartphone_count, sims: acc.sims + curr.sim_count
    }), { sales: 0, service: 0, phones: 0, sims: 0 });

    const branchAgg = {};
    rangeEntries.forEach(e => {
      const name = e.branches?.name || 'Unknown';
      if (!branchAgg[name]) branchAgg[name] = { name, sales: 0, phones: 0, sims: 0, service: 0 };
      branchAgg[name].sales += e.total_sales; branchAgg[name].phones += e.smartphone_count;
      branchAgg[name].sims += e.sim_count; branchAgg[name].service += e.service_amount;
    });
    const ranked = Object.values(branchAgg).sort((a, b) => b.sales - a.sales);

    const trendMap = {};
    entries.filter(e => e.entry_date >= startDate && e.entry_date <= endDate).forEach(e => {
      if (!trendMap[e.entry_date]) trendMap[e.entry_date] = 0;
      trendMap[e.entry_date] += e.total_sales;
    });
    const trendData = Object.entries(trendMap).map(([date, sales]) => ({
      name: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), sales
    })).slice(-10);

    const pieData = [
      { name: 'Product', value: totals.sales - totals.service, fill: '#00d2ff' },
      { name: 'Service', value: totals.service, fill: '#00c853' }
    ];

    const totalBranches = branches.length;
    const branchesSubmitted = submitted.length;
    const pct = totalBranches > 0 ? Math.round((branchesSubmitted / totalBranches) * 100) : 0;

    return {
      stats: { totalSales: totals.sales, serviceRevenue: totals.service, smartphonesSold: totals.phones, simCardsSold: totals.sims, branchesSubmitted, totalBranches, submittedBranches: submitted, pendingBranches: pending, topBranch: ranked[0] || null },
      charts: { salesTrend: trendData, serviceVsProduct: pieData, branchPerformance: ranked },
      pct
    };
  }, [rawData, filter, customStart, customEnd]);

  if (!initialLoaded) return null;

  return (
    <div className="animate-fade-in no-scrollbar dash-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '3rem' }}>
      
      {/* Title & Range Filters */}
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '1rem', fontWeight: 700 }}>Analytics Overview</h1>
         <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
           <div className="glass" style={{ display: 'flex', padding: '3px', borderRadius: '8px', gap: '2px' }}>
              {['today', 'week', 'month', 'year'].map(r => (
                <button key={r} onClick={() => setFilter(r)}
                  style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                    background: filter === r ? 'rgba(0,210,255,0.15)' : 'transparent',
                    color: filter === r ? 'var(--accent-color)' : 'var(--text-secondary)',
                  }}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
              ))}
           </div>
           {/* Custom Date */}
           <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
             <input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); setFilter('custom'); }} style={{ padding: '4px 8px', fontSize: '0.7rem', width: '120px' }} />
             <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>→</span>
             <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setFilter('custom'); }} style={{ padding: '4px 8px', fontSize: '0.7rem', width: '120px' }} />
           </div>
         </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        <MetricCard title="Total Sales" value={stats.totalSales} color="#00d2ff" icon={IndianRupee} />
        <MetricCard title="Smartphones" value={stats.smartphonesSold} isCurrency={false} color="#00c853" icon={Smartphone} />
        <MetricCard title="SIM Cards" value={stats.simCardsSold} isCurrency={false} color="#f59e0b" icon={CreditCard} />
        <MetricCard title="Service Rev." value={stats.serviceRevenue} color="#a855f7" icon={Receipt} />
      </div>

      {/* Entry Status + Trophy */}
      <div className="status-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Entry Status</h3>
              <p style={{ fontSize: '1.1rem', fontWeight: 800 }}><span style={{ color: 'var(--success)' }}>{stats.branchesSubmitted}</span>/{stats.totalBranches} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Submitted</span></p>
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--success)' }}>{pct}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--success)', borderRadius: '10px', transition: '0.5s' }} />
          </div>
          <div className="branch-status-flex" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '6px' }}>Submitted</p>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {stats.submittedBranches.map(b => (
                  <span key={b.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(0,200,83,0.1)', padding: '3px 8px', borderRadius: '20px', color: 'var(--success)', fontSize: '0.65rem', fontWeight: 600 }}>
                    <CheckCircle2 size={10} /> {b.name}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase', marginBottom: '6px' }}>Pending</p>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {stats.pendingBranches.map(b => (
                  <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(255,61,0,0.1)', padding: '3px 8px', borderRadius: '20px', color: 'var(--error)', fontSize: '0.65rem', fontWeight: 600 }}>
                    <AlertCircle size={10} /> {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trophy */}
        <div className="glass trophy-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'center', gap: '0.5rem', minWidth: '160px', padding: '1rem' }}>
          <Trophy size={48} color="#f59e0b" fill="rgba(245,158,11,0.15)" />
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Top Branch</p>
            <p style={{ fontSize: '1rem', fontWeight: 800 }}>{stats.topBranch?.name || '—'}</p>
          </div>
          <p style={{ fontSize: '0.8rem', fontWeight: 800 }}>₹{stats.topBranch?.sales?.toLocaleString() || 0}</p>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
            <span>📱 {stats.topBranch?.phones || 0}</span>
            <span>💳 {stats.topBranch?.sims || 0}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: '0.75rem' }}>
        <div className="glass">
          <h3 style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '0.9rem' }}>Sales Trend</h3>
          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.salesTrend}>
                <defs><linearGradient id="cS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d2ff" stopOpacity={0.2}/><stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', background: '#1a1a1a', color: 'white', fontSize: '0.75rem' }} />
                <Area type="monotone" dataKey="sales" stroke="#00d2ff" strokeWidth={2} fillOpacity={1} fill="url(#cS)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass">
          <h3 style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '0.9rem' }}>Revenue Split</h3>
          <div style={{ height: '160px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={charts.serviceVsProduct} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value">
                {charts.serviceVsProduct.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie><Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.75rem' }} /></PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.5rem' }}>
            {charts.serviceVsProduct.map(d => (
              <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.fill }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{d.name}</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{stats.totalSales > 0 ? Math.round((d.value/stats.totalSales)*100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Performance */}
      <div className="glass" style={{ overflowX: 'auto' }}>
        <h3 style={{ fontWeight: 800, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Branch Performance</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.75rem 0' }}>#</th><th>Branch</th><th>Sales</th><th>Service</th><th>📱</th><th>💳</th>
            </tr>
          </thead>
          <tbody>
            {charts.branchPerformance.map((b, i) => (
              <tr key={b.name} style={{ borderTop: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '0.5rem 0', fontWeight: 800, color: i===0 ? '#f59e0b' : 'var(--text-secondary)', fontSize: '0.8rem' }}>{i+1}</td>
                <td style={{ fontWeight: 700, fontSize: '0.8rem' }}>{b.name}</td>
                <td style={{ fontWeight: 800, fontSize: '0.8rem' }}>₹{b.sales.toLocaleString()}</td>
                <td style={{ color: 'var(--success)', fontSize: '0.8rem' }}>₹{b.service.toLocaleString()}</td>
                <td style={{ fontSize: '0.8rem' }}>{b.phones}</td>
                <td style={{ fontSize: '0.8rem' }}>{b.sims}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage;
