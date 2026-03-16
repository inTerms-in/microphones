import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  IndianRupee, Smartphone, CreditCard, Activity, Trophy,
  TrendingUp, CheckCircle2, AlertCircle,
  Receipt, TrendingDown, Calendar, Wrench
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [rawData, setRawData] = useState({ branches: [], entries: [], pendingJobs: 0 });
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [filter, setFilter] = useState('month'); // Default to month
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getSmartDate = useCallback((offset = 0) => {
    const now = new Date();
    // If it's before 6 PM and we want "today", we might actually want "yesterday"
    // but the user specifically asked for a "Yesterday" button.
    // Let's implement Yesterday logic first.
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    // On mount, set default filter based on 7 PM shop close logic
    const hour = new Date().getHours();
    const initialFilter = hour < 19 ? 'yesterday' : 'today';
    setFilter(initialFilter);
  }, []);

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

        // Fetch last 18 months of data to support navigation
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 18);
        const bIds = branches?.map(b => b.id) || [];
        const { data: entries } = await supabase
          .from('daily_entries').select('*, branches(name)')
          .in('branch_id', bIds)
          .gte('entry_date', startDate.toISOString().split('T')[0])
          .order('entry_date', { ascending: true });

        // Fetch Pending Service Jobs
        const { count: pendingJobs } = await supabase
          .from('service_jobs')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'in-progress', 'ready']);

        setRawData({ branches: branches || [], entries: entries || [], pendingJobs: pendingJobs || 0 });
      } catch (err) { console.error(err); }
      finally { setInitialLoaded(true); }
    };
    fetchAll();
  }, []);

  const [navigationOffset, setNavigationOffset] = useState(0);

  // Reset navigation when switching filter modes
  useEffect(() => {
    setNavigationOffset(0);
  }, [filter]);

  const shiftRange = (dir) => {
    setNavigationOffset(prev => prev + dir);
  };

  const calculatedRange = useMemo(() => {
    let baseDate = new Date();
    
    // Apply navigation offset
    if (filter === 'today' || filter === 'yesterday') {
      baseDate.setDate(baseDate.getDate() + navigationOffset);
    } else if (filter === 'week') {
      baseDate.setDate(baseDate.getDate() + (navigationOffset * 7));
    } else if (filter === 'month') {
      baseDate.setMonth(baseDate.getMonth() + navigationOffset);
    } else if (filter === 'year') {
      baseDate.setFullYear(baseDate.getFullYear() + navigationOffset);
    }

    const today = baseDate.toISOString().split('T')[0];
    let startDate = today;
    let endDate = today;
    
    if (filter === 'custom' && customStart) {
      // If custom, shift individual days
      const d1 = new Date(customStart); d1.setDate(d1.getDate() + navigationOffset);
      const d2 = new Date(customEnd || customStart); d2.setDate(d2.getDate() + navigationOffset);
      return { startDate: d1.toISOString().split('T')[0], endDate: d2.toISOString().split('T')[0], baseDate };
    } else if (filter === 'week') {
      const d = new Date(baseDate); d.setDate(d.getDate() - 7); startDate = d.toISOString().split('T')[0];
    } else if (filter === 'month') {
      const d = new Date(baseDate); d.setDate(1); startDate = d.toISOString().split('T')[0];
      const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      endDate = lastDay.toISOString().split('T')[0];
      const realToday = new Date().toISOString().split('T')[0];
      if (endDate > realToday && navigationOffset === 0) endDate = realToday;
    } else if (filter === 'year') {
      const d = new Date(baseDate); d.setMonth(0, 1); startDate = d.toISOString().split('T')[0];
      const lastDay = new Date(baseDate.getFullYear(), 11, 31);
      endDate = lastDay.toISOString().split('T')[0];
      const realToday = new Date().toISOString().split('T')[0];
      if (endDate > realToday && navigationOffset === 0) endDate = realToday;
    } else if (filter === 'yesterday') {
      const d = new Date(baseDate); d.setDate(d.getDate() - 1); startDate = d.toISOString().split('T')[0];
      endDate = startDate;
    } else if (filter === 'today') {
      startDate = today;
    }

    return { startDate, endDate, baseDate };
  }, [filter, navigationOffset, customStart, customEnd]);

  // Sync custom inputs with calculated range so user sees them
  useEffect(() => {
    setCustomStart(calculatedRange.startDate);
    setCustomEnd(calculatedRange.endDate);
  }, [calculatedRange.startDate, calculatedRange.endDate]);

  // When user manually picks a date, reset the arrow navigation so they start fresh from that date
  const handleDateChange = (type, val) => {
    setNavigationOffset(0);
    setFilter('custom');
    if (type === 'start') setCustomStart(val);
    else setCustomEnd(val);
  };

  const { stats, charts, pct } = useMemo(() => {
    const { startDate, endDate, baseDate } = calculatedRange;
    const { branches, entries } = rawData;
    
    // Today for status checks (always real today)
    const realToday = new Date().toISOString().split('T')[0];
    const todayEntries = entries.filter(e => e.entry_date === realToday);
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

    // Dynamic Bar Chart Binning Logic
    let barData = [];
    if (filter === 'today' || filter === 'yesterday' || filter === 'custom') {
      // Comparison by branch
      barData = Object.values(branchAgg).map(b => ({
        name: b.name,
        Sales: b.sales,
        Service: b.service
      }));
    } else if (filter === 'week') {
      // Last 7 days from baseDate
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(baseDate); d.setDate(d.getDate() - i);
        days.push({ 
          date: d.toISOString().split('T')[0], 
          label: d.toLocaleDateString('en-US', { weekday: 'short' }) 
        });
      }
      barData = days.map(d => {
        const dayEntries = rangeEntries.filter(e => e.entry_date === d.date);
        return {
          name: d.label,
          Sales: dayEntries.reduce((s, e) => s + e.total_sales, 0),
          Service: dayEntries.reduce((s, e) => s + e.service_amount, 0),
        };
      });
    } else if (filter === 'month') {
      // Month Days for baseDate
      const m = baseDate.getMonth();
      const y = baseDate.getFullYear();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayEntries = rangeEntries.filter(e => e.entry_date === dateStr);
        barData.push({
          name: String(i),
          Sales: dayEntries.reduce((s, e) => s + e.total_sales, 0),
          Service: dayEntries.reduce((s, e) => s + e.service_amount, 0),
        });
      }
    } else if (filter === 'year') {
      // Monthly for year of baseDate
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const y = baseDate.getFullYear();
      barData = months.map((m, idx) => {
        const monthPrefix = `${y}-${String(idx + 1).padStart(2, '0')}`;
        const monthEntries = entries.filter(e => e.entry_date.startsWith(monthPrefix));
        return {
          name: m,
          Sales: monthEntries.reduce((s, e) => s + e.total_sales, 0),
          Service: monthEntries.reduce((s, e) => s + e.service_amount, 0),
        };
      });
    }

    const pieData = [
      { name: 'Product', value: totals.sales - totals.service, fill: '#00d2ff' },
      { name: 'Service', value: totals.service, fill: '#6366f1' } // Purple for Service
    ];

    const totalBranches = branches.length;
    const branchesSubmitted = submitted.length;
    const pct = totalBranches > 0 ? Math.round((branchesSubmitted / totalBranches) * 100) : 0;

    return {
      stats: { totalSales: totals.sales, serviceRevenue: totals.service, smartphonesSold: totals.phones, simCardsSold: totals.sims, branchesSubmitted, totalBranches, submittedBranches: submitted, pendingBranches: pending, topBranch: ranked[0] || null, pendingJobs: rawData.pendingJobs },
      charts: { mainChart: barData, serviceVsProduct: pieData, branchPerformance: ranked },
      pct
    };
  }, [rawData, filter, customStart, customEnd, navigationOffset]);

  if (!initialLoaded) return null;

  return (
    <div className="animate-fade-in no-scrollbar dash-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '3rem' }}>
      
      {/* Title & Range Filters */}
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '1rem', fontWeight: 700 }}>Analytics Overview</h1>
         <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Range Shifters */}
            <div style={{ display: 'flex', gap: '4px', marginRight: '8px' }}>
               <button onClick={() => shiftRange(-1)} className="btn-icon" style={{ padding: '6px' }}><ChevronLeft size={16} /></button>
               <button onClick={() => shiftRange(1)} className="btn-icon" style={{ padding: '6px' }}><ChevronRight size={16} /></button>
            </div>

            <div className="glass" style={{ display: 'flex', padding: '3px', borderRadius: '8px', gap: '2px' }}>
              {['today', 'yesterday', 'week', 'month', 'year'].map(r => (
                <button key={r} onClick={() => setFilter(r)}
                  style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                    background: filter === r ? 'rgba(0,210,255,0.15)' : 'transparent',
                    color: filter === r ? 'var(--accent-color)' : 'var(--text-secondary)',
                  }}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
              ))}
           </div>
           {/* Custom Date Inputs - Always show what is active */}
           <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
             <input type="date" value={customStart} onChange={e => handleDateChange('start', e.target.value)} style={{ padding: '4px 8px', fontSize: '0.7rem', width: '120px' }} />
             <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>→</span>
             <input type="date" value={customEnd} onChange={e => handleDateChange('end', e.target.value)} style={{ padding: '4px 8px', fontSize: '0.7rem', width: '120px' }} />
           </div>
         </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <MetricCard title="Total Sales" value={stats.totalSales} color="#00d2ff" icon={IndianRupee} />
        <MetricCard title="Smartphones" value={stats.smartphonesSold} isCurrency={false} color="#00c853" icon={Smartphone} />
        <MetricCard title="SIM Cards" value={stats.simCardsSold} isCurrency={false} color="#f59e0b" icon={CreditCard} />
        <MetricCard title="Service Rev." value={stats.serviceRevenue} color="#a855f7" icon={Receipt} />
        <MetricCard title="Pending Jobs" value={stats.pendingJobs} isCurrency={false} color="#ec4899" icon={Wrench} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '0.9rem' }}>Revenue Performance</h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>Sales vs Service</span>
          </div>
          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.mainChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-secondary)" 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)' }}
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', background: '#1a1a1a', color: 'white', fontSize: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.7rem', paddingTop: '10px' }} />
                <Bar dataKey="Sales" fill="#00d2ff" radius={[4, 4, 0, 0]} barSize={filter === 'month' ? 6 : 20} />
                <Bar dataKey="Service" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={filter === 'month' ? 6 : 20} />
              </BarChart>
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
