import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Filter, 
  FileText, Printer, ChevronLeft, ChevronRight
} from 'lucide-react';

const ReportsPage = () => {
  const { companyName } = useAuth();
  const [entries, setEntries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    branchId: 'all'
  });

  useEffect(() => {
    // Initial Load Logic: Before 7 PM show yesterday's data
    const hour = new Date().getHours();
    const isEarly = hour < 19;
    const end = new Date();
    const start = new Date();
    if (isEarly) {
      start.setDate(end.getDate() - 1);
      end.setDate(end.getDate() - 1);
    }
    setFilters(prev => ({ 
      ...prev, 
      startDate: start.toISOString().split('T')[0], 
      endDate: end.toISOString().split('T')[0] 
    }));
  }, []);

  useEffect(() => { fetchData(); }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: branchData } = await supabase.from('branches').select('*').eq('is_active', true);
      setBranches(branchData || []);

      let query = supabase.from('daily_entries').select('*, branches(name)')
        .gte('entry_date', filters.startDate).lte('entry_date', filters.endDate)
        .order('entry_date', { ascending: false });

      if (filters.branchId !== 'all') query = query.eq('branch_id', filters.branchId);
      const { data } = await query;
      if (data) setEntries(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePreset = (type) => {
    // Shifting is only for manual navigation, presets should reset the reference if they want a clean start
    // but here presets set absolute dates, so navigation doesn't strictly apply unless we use an offset state.
    // In ReportsPage we use absolute dates in state.
    const end = new Date(); let start = new Date();
    if (type === 'today') { /* same day */ }
    else if (type === 'yesterday') {
      start.setDate(end.getDate() - 1);
      end.setDate(end.getDate() - 1);
    }
    else if (type === 'week') start.setDate(end.getDate() - 7);
    else if (type === 'month') start.setDate(1); // Default to 1st of current month
    else if (type === 'year') start.setMonth(0, 1); // Default to Jan 1st
    
    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];
    setFilters({ ...filters, startDate, endDate });
  };

  const shiftRange = (dir) => {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    
    // Determine the diff in days
    const diffTime = Math.abs(end - start);
    const diffDays = (Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1);
    
    start.setDate(start.getDate() + (dir * diffDays));
    end.setDate(end.getDate() + (dir * diffDays));
    
    setFilters({ ...filters, startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] });
  };

  const totals = entries.reduce((acc, curr) => ({
    sales: acc.sales + curr.total_sales, service: acc.service + curr.service_amount,
    phones: acc.phones + curr.smartphone_count, sims: acc.sims + curr.sim_count
  }), { sales: 0, service: 0, phones: 0, sims: 0 });

  // ========== PROFESSIONAL PDF FROM DATABASE ==========
  const generatePDF = () => {
    const branchLabel = filters.branchId === 'all' ? 'All Branches' : branches.find(b => b.id === filters.branchId)?.name || '';
    
    const rows = entries.map(e => `
      <tr>
        <td>${new Date(e.entry_date).toLocaleDateString('en-GB')}</td>
        <td>${e.branches?.name || ''}</td>
        <td style="text-align:right">₹${e.total_sales.toLocaleString()}</td>
        <td style="text-align:right">₹${e.service_amount.toLocaleString()}</td>
        <td style="text-align:center">${e.smartphone_count}</td>
        <td style="text-align:center">${e.sim_count}</td>
        <td>${e.remarks || '-'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html><head><title>Report - ${companyName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
        body { padding: 30px; color: #1e293b; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #00d2ff; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { font-size: 22px; color: #0f172a; }
        .header .meta { text-align: right; font-size: 11px; color: #64748b; }
        .header .meta strong { color: #1e293b; display: block; font-size: 13px; }
        .summary { display: flex; gap: 15px; margin-bottom: 20px; }
        .summary-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        .summary-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
        .summary-card .value { font-size: 18px; font-weight: 800; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
        td { padding: 9px 8px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
        tr:nth-child(even) { background: #fafafa; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
        .totals td { font-weight: 800; background: #f1f5f9; border-top: 2px solid #cbd5e1; }
        @media print { body { padding: 15px; } }
      </style></head><body>
        <div class="header">
          <div>
            <h1>${companyName}</h1>
            <p style="font-size:11px;color:#64748b;margin-top:4px">Business Performance Report</p>
          </div>
          <div class="meta">
            <strong>SALES REPORT</strong>
            Period: ${new Date(filters.startDate).toLocaleDateString('en-GB')} — ${new Date(filters.endDate).toLocaleDateString('en-GB')}<br/>
            Branch: ${branchLabel}<br/>
            Generated: ${new Date().toLocaleString('en-GB')}
          </div>
        </div>

        <div class="summary">
          <div class="summary-card"><div class="label">Total Revenue</div><div class="value">₹${totals.sales.toLocaleString()}</div></div>
          <div class="summary-card"><div class="label">Service Revenue</div><div class="value">₹${totals.service.toLocaleString()}</div></div>
          <div class="summary-card"><div class="label">Devices Sold</div><div class="value">${totals.phones}</div></div>
          <div class="summary-card"><div class="label">SIM Activations</div><div class="value">${totals.sims}</div></div>
        </div>

        <table>
          <thead><tr>
            <th>Date</th><th>Branch</th><th style="text-align:right">Sales</th><th style="text-align:right">Service</th><th style="text-align:center">Phones</th><th style="text-align:center">SIMs</th><th>Remarks</th>
          </tr></thead>
          <tbody>
            ${rows}
            <tr class="totals">
              <td colspan="2">TOTALS (${entries.length} entries)</td>
              <td style="text-align:right">₹${totals.sales.toLocaleString()}</td>
              <td style="text-align:right">₹${totals.service.toLocaleString()}</td>
              <td style="text-align:center">${totals.phones}</td>
              <td style="text-align:center">${totals.sims}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <span>${companyName} — Confidential Report</span>
          <span>Page 1 of 1</span>
        </div>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => { if (!window.printInProgress) window.close(); }, 500);
          };
          window.onafterprint = () => window.close();
        </script>
      </body></html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportCSV = () => {
    const headers = ['Date', 'Branch', 'Total Sales', 'Service', 'Phones', 'SIMs', 'Remarks'];
    const rows = entries.map(e => [e.entry_date, e.branches?.name, e.total_sales, e.service_amount, e.smartphone_count, e.sim_count, (e.remarks || '').replace(/,/g, ';')]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(r => r.join(',')).join('\n'); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `Report_${filters.startDate}_to_${filters.endDate}.csv`;
    
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, fileName);
    } else {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Business Performance</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={generatePDF} className="btn-secondary" style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 16px', fontSize: '0.8rem' }}>
            <Printer size={16} /> PDF Report
          </button>
          <button onClick={exportCSV} className="btn-primary" style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 16px', fontSize: '0.8rem' }}>
            <FileText size={16} /> CSV
          </button>
        </div>
      </header>



      {/* Filters */}
      <div className="glass" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', marginRight: '4px' }}>
           <button onClick={() => shiftRange(-1)} className="btn-icon" style={{ padding: '6px' }}><ChevronLeft size={16} /></button>
           <button onClick={() => shiftRange(1)} className="btn-icon" style={{ padding: '6px' }}><ChevronRight size={16} /></button>
        </div>
        <Filter size={16} color="var(--accent-color)" />
        <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} style={{ padding: '6px 10px', fontSize: '0.8rem' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>to</span>
        <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} style={{ padding: '6px 10px', fontSize: '0.8rem' }} />
        <div style={{ display: 'flex', gap: '3px' }}>
          {['today', 'yesterday', 'week', 'month', 'year'].map(p => (
            <button key={p} onClick={() => handlePreset(p)} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{p}</button>
          ))}
        </div>
        <select value={filters.branchId} onChange={e => setFilters({...filters, branchId: e.target.value})} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Total Revenue', val: `₹${totals.sales.toLocaleString()}`, color: '#00d2ff' },
          { label: 'Service Revenue', val: `₹${totals.service.toLocaleString()}`, color: '#00c853' },
          { label: 'Devices Sold', val: totals.phones, color: '#f59e0b' },
          { label: 'SIM Activations', val: totals.sims, color: '#a855f7' }
        ].map(card => (
          <div key={card.label} className="glass" style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>{card.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: card.color }}>{card.val}</p>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Detailed Records</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 600 }}>{entries.length} entries</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '0.75rem 1.25rem' }}>Date</th><th>Branch</th><th>Sales</th><th>Service</th><th>Phones</th><th>SIMs</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No entries for this period</td></tr>
              ) : entries.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, fontSize: '0.85rem' }}>{new Date(entry.entry_date).toLocaleDateString('en-GB')}</td>
                  <td style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{entry.branches?.name}</td>
                  <td>₹{entry.total_sales.toLocaleString()}</td>
                  <td>₹{entry.service_amount.toLocaleString()}</td>
                  <td>{entry.smartphone_count}</td>
                  <td>{entry.sim_count}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
