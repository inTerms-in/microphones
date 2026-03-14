import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, MapPin, Check, X, Plus, Trash2, 
  Edit2, Search, Building2, Upload, 
  Globe, Database, Phone, Mail,
  ChevronDown, CheckSquare, Square
} from 'lucide-react';

const SettingsPage = () => {
  const { profile, companyName } = useAuth();
  const [activeTab, setActiveTab] = useState('team');
  const [team, setTeam] = useState([]);
  const [branches, setBranches] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [branchSearch, setBranchSearch] = useState('');

  // Login toggle default ON, Active default ON
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', role: 'employee', is_active: true, can_login: true, branches: [] });
  const [creating, setCreating] = useState(false);
  
  const [newBranch, setNewBranch] = useState({ name: '', location: '', is_active: true });
  const [creatingBranch, setCreatingBranch] = useState(false);

  const [editingBranchId, setEditingBranchId] = useState(null);
  const [branchEditData, setBranchEditData] = useState({ name: '', location: '' });

  const [editingUser, setEditingUser] = useState(null);
  const [userPerms, setUserPerms] = useState([]);
  const [userBranches, setUserBranches] = useState({});

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchTeam(), fetchBranches(), fetchCompany(), fetchAssignments()]);
    setLoading(false);
  };

  const fetchTeam = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setTeam(data);
  };

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('*').order('name');
    if (data) setBranches(data);
  };

  const fetchCompany = async () => {
    const { data } = await supabase.from('companies').select('*').limit(1).single();
    if (data) setCompany(data);
  };

  const fetchAssignments = async () => {
    const { data } = await supabase.from('user_branches').select('*');
    if (data) {
      const mapping = {};
      data.forEach(asgn => {
        if (!mapping[asgn.user_id]) mapping[asgn.user_id] = [];
        mapping[asgn.user_id].push(asgn.branch_id);
      });
      setUserBranches(mapping);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    if (!company?.id) { alert('Company data not loaded.'); setCreating(false); return; }
    try {
      const { data: userData, error } = await supabase.rpc('admin_create_user_instant', {
        new_email: newUser.email, new_password: newUser.password,
        new_full_name: newUser.fullName, new_role: newUser.role,
        target_company_id: company.id
      });
      if (error) throw error;
      
      // Handle different RPC return shapes (might be object with user_id or id, or string ID)
      const newUserId = (typeof userData === 'string') ? userData : (userData?.user_id || userData?.id);
      
      if (newUserId && newUserId !== 'undefined') {
        // Update toggles
        await supabase.from('profiles').update({ 
          is_active: newUser.is_active, 
          can_login: newUser.can_login 
        }).eq('id', newUserId);

        // Assign branches
        if (newUser.branches.length > 0) {
          const { error: branchErr } = await supabase.from('user_branches').insert(
            newUser.branches.map(bId => ({ user_id: newUserId, branch_id: bId }))
          );
          if (branchErr) console.error('Branch assignment error:', branchErr);
        }
      } else {
        throw new Error('Failed to retrieve new user ID. Please check if user already exists.');
      }

      setNewUser({ email: '', password: '', fullName: '', role: 'employee', is_active: true, can_login: true, branches: [] });
      fetchTeam();
      fetchAssignments();
    } catch (err) { 
      let msg = err.message;
      if (msg.includes('duplicate key') || msg.includes('already exists')) {
        msg = 'User already exist.';
      }
      alert(msg); 
    }
    finally { setCreating(false); }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setCreatingBranch(true);
    try {
      const { error } = await supabase.from('branches').insert([{ name: newBranch.name, location: newBranch.location, company_id: company.id }]);
      if (error) throw error;
      setNewBranch({ name: '', location: '' });
      fetchBranches();
    } catch (err) { alert(err.message); }
    finally { setCreatingBranch(false); }
  };

  const saveBranchEdit = async (id) => {
    const { error } = await supabase.from('branches').update(branchEditData).eq('id', id);
    if (!error) { setEditingBranchId(null); fetchBranches(); } else alert(error.message);
  };

  const toggleUserStatus = async (userId, field, value) => {
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', userId);
    if (!error) fetchTeam();
  };

  const toggleBranchAssignment = async (userId, branchId, assigned) => {
    if (assigned) {
      await supabase.from('user_branches').delete().eq('user_id', userId).eq('branch_id', branchId);
    } else {
      await supabase.from('user_branches').insert([{ user_id: userId, branch_id: branchId }]);
    }
    fetchAssignments();
  };

  const openPermissionEditor = async (user) => {
    setEditingUser(user);
    const { data } = await supabase.from('page_permissions').select('*').eq('user_id', user.id);
    setUserPerms(data || []);
  };

  const filteredTeam = team.filter(m => {
    // Hide master system owner from the list
    if (m.email === 'admin@micro.com') return false;
    
    return m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           m.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredBranchesList = branches.filter(b => 
    b.name?.toLowerCase().includes(branchSearch.toLowerCase()) ||
    b.location?.toLowerCase().includes(branchSearch.toLowerCase())
  );

  // ===================== TEAM TAB =====================
  const renderTeam = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Add User — Comprehensive Form */}
      <div className="glass" style={{ padding: '1.25rem', overflow: 'visible', zIndex: 10, position: 'relative' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Add New User</h3>
        <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'nowrap', overflow: 'visible' }}>
          <div className="form-group-standard" style={{ minWidth: '150px', flex: 1.5 }}>
            <label>Full Name</label>
            <input value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} required style={{ width: '100%' }} />
          </div>
          <div className="form-group-standard" style={{ minWidth: '150px', flex: 1.5 }}>
            <label>Email</label>
            <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required style={{ width: '100%' }} />
          </div>
          <div className="form-group-standard" style={{ minWidth: '80px', flex: 1 }}>
            <label>Pass</label>
            <input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required style={{ width: '100%' }} />
          </div>
          <div className="form-group-standard" style={{ minWidth: '100px', flex: 1 }}>
            <label>Role</label>
            <select value={newUser.role} onChange={e => {
              const newRole = e.target.value;
              const allBranchIds = (newRole === 'owner' || newRole === 'partner') ? branches.map(b => b.id) : [];
              setNewUser({...newUser, role: newRole, branches: allBranchIds});
            }} style={{ width: '100%' }}>
              <option value="employee">Employee</option>
              <option value="partner">Partner</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div className="form-group-standard" style={{ minWidth: '150px', flex: 1.5 }}>
            <label>Branches</label>
            <BranchMultiselect 
              branches={branches} 
              assigned={newUser.branches} 
              onToggle={(bId, current) => {
                setNewUser(prev => ({
                  ...prev,
                  branches: current ? prev.branches.filter(id => id !== bId) : [...prev.branches, bId]
                }));
              }} 
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', paddingBottom: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ACT</span>
              <Toggle active={newUser.is_active} onClick={() => setNewUser({...newUser, is_active: !newUser.is_active})} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>LOG</span>
              <Toggle active={newUser.can_login} onClick={() => setNewUser({...newUser, can_login: !newUser.can_login})} />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={creating} style={{ padding: '10px', width: '40px', height: '40px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {creating ? '...' : <Plus size={18} />}
          </button>
        </form>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '300px' }}>
         <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
         <input placeholder="Search employees..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '32px', width: '100%', padding: '8px 10px 8px 32px', fontSize: '0.8rem' }} />
      </div>

      {/* Grid View Table */}
      <div className="glass" style={{ padding: 0, overflow: 'visible' }}>
        {/* Header Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2.5fr 70px 70px 80px', padding: '10px 16px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
           <div>Employee</div>
           <div>Type</div>
           <div>Branches</div>
           <div style={{ textAlign: 'center' }}>Active</div>
           <div style={{ textAlign: 'center' }}>Login</div>
           <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {/* Data Rows */}
        <div style={{ maxHeight: '450px', overflowY: 'visible' }} className="no-scrollbar">
          {filteredTeam.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No employees found</div>
          ) : filteredTeam.map(member => (
            <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2.5fr 70px 70px 80px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center', transition: '0.15s' }}>
              {/* Name + Email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <div style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', background: 'var(--accent-gradient)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem' }}>
                  {member.full_name?.charAt(0)}
                </div>
                <div style={{ overflow: 'hidden' }}>
                   <p style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.full_name}</p>
                   <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</p>
                </div>
              </div>

              {/* Role Badge */}
              <div>
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                  background: member.role === 'owner' ? 'rgba(255,61,0,0.15)' : member.role === 'partner' ? 'rgba(245,158,11,0.15)' : 'rgba(0,210,255,0.1)',
                  color: member.role === 'owner' ? '#ff6b35' : member.role === 'partner' ? '#f59e0b' : 'var(--accent-color)'
                }}>{member.role}</span>
              </div>

              {/* Branch Multiselect */}
              <div style={{ overflow: 'visible' }}>
                <BranchMultiselect 
                  user={member} branches={branches} 
                  assigned={userBranches[member.id] || []} 
                  onToggle={(bId, state) => toggleBranchAssignment(member.id, bId, state)} 
                />
              </div>

              {/* Active Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Toggle active={member.is_active} onClick={() => toggleUserStatus(member.id, 'is_active', !member.is_active)} />
              </div>

              {/* Login Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Toggle active={member.can_login} onClick={() => toggleUserStatus(member.id, 'can_login', !member.can_login)} color="var(--accent-color)" />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                <button onClick={() => openPermissionEditor(member)} title="Permissions" style={{ padding: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--accent-color)' }}><Shield size={13} /></button>
                <button onClick={async () => { if(confirm('Delete user?')) { await supabase.from('profiles').delete().eq('id', member.id); fetchTeam(); } }} style={{ padding: '5px', background: 'rgba(255,61,0,0.1)', borderRadius: '4px', color: 'var(--error)' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const toggleBranchStatus = async (branchId, value) => {
    const { error } = await supabase.from('branches').update({ is_active: value }).eq('id', branchId);
    if (!error) fetchBranches();
  };

  // ===================== BRANCHES TAB =====================
  const renderBranches = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
       {/* Add Branch — Label-Up Form */}
       <div className="glass" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Add New Branch</h3>
        <form onSubmit={handleCreateBranch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group-standard">
            <label>Branch Name</label>
            <input value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} required style={{ width: '25ch' }} />
          </div>
          <div className="form-group-standard">
            <label>Location</label>
            <input value={newBranch.location} onChange={e => setNewBranch({...newBranch, location: e.target.value})} required style={{ width: '30ch' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ACTIVE</span>
            <Toggle active={newBranch.is_active} onClick={() => setNewBranch({...newBranch, is_active: !newBranch.is_active})} />
          </div>
          <button type="submit" className="btn-primary" disabled={creatingBranch} style={{ padding: '10px 20px' }}>
            {creatingBranch ? '...' : <Plus size={20} />}
          </button>
        </form>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '300px' }}>
         <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
         <input placeholder="Search branches..." value={branchSearch} onChange={e => setBranchSearch(e.target.value)} style={{ paddingLeft: '32px', width: '100%', padding: '8px 10px 8px 32px', fontSize: '0.8rem' }} />
      </div>

      {/* Grid View List */}
      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1.5fr 2fr 100px', padding: '10px 16px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
           <div>Status</div>
           <div>Branch Name</div>
           <div>Location</div>
           <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="no-scrollbar">
          {filteredBranchesList.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No branches found</div>
          ) : filteredBranchesList.map(branch => (
            <div key={branch.id} style={{ display: 'grid', gridTemplateColumns: '80px 1.5fr 2fr 100px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
              <div style={{ display: 'flex' }}>
                 <Toggle active={branch.is_active} onClick={() => toggleBranchStatus(branch.id, !branch.is_active)} />
              </div>

              <div>
                {editingBranchId === branch.id ? (
                  <input value={branchEditData.name} onChange={e => setBranchEditData({...branchEditData, name: e.target.value})} style={{ padding: '4px 8px', fontSize: '0.8rem', width: '90%' }} />
                ) : (
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{branch.name}</span>
                )}
              </div>

              <div>
                {editingBranchId === branch.id ? (
                  <input value={branchEditData.location} onChange={e => setBranchEditData({...branchEditData, location: e.target.value})} style={{ padding: '4px 8px', fontSize: '0.8rem', width: '90%' }} />
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{branch.location}</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {editingBranchId === branch.id ? (
                  <>
                    <button onClick={() => saveBranchEdit(branch.id)} style={{ padding: '5px', color: 'var(--success)' }}><Check size={16} /></button>
                    <button onClick={() => setEditingBranchId(null)} style={{ padding: '5px', color: 'var(--error)' }}><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingBranchId(branch.id); setBranchEditData({ name: branch.name, location: branch.location }); }} style={{ padding: '5px', color: 'var(--accent-color)' }}><Edit2 size={15} /></button>
                    <button onClick={async () => { if(confirm('Delete branch?')) { await supabase.from('branches').delete().eq('id', branch.id); fetchBranches(); } }} style={{ padding: '5px', color: 'var(--error)' }}><Trash2 size={15} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="no-scrollbar" style={{ maxWidth: '1100px', height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '1.25rem', fontWeight: 700 }}>System Configuration</h1>
      </header>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
        {['team', 'branches', 'company'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 16px', borderRadius: '6px',
              background: activeTab === tab ? 'rgba(0,210,255,0.1)' : 'transparent',
              color: activeTab === tab ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize'
            }}>{tab}</button>
        ))}
      </div>

      <div style={{ paddingBottom: '2rem' }}>
        {activeTab === 'team' && renderTeam()}
        {activeTab === 'branches' && renderBranches()}
        {activeTab === 'company' && <CompanySettings company={company} setCompany={setCompany} />}
      </div>

      {editingUser && <PermissionMatrix user={editingUser} perms={userPerms} onToggle={async (pId, f, v) => {
        const { error } = await supabase.from('page_permissions').update({ [f]: v }).eq('id', pId);
        if (!error) setUserPerms(userPerms.map(p => p.id === pId ? { ...p, [f]: v } : p));
      }} onClose={() => setEditingUser(null)} />}
    </div>
  );
};

// ===================== SUB-COMPONENTS =====================

const BranchMultiselect = ({ user, branches, assigned, onToggle }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = branches.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  const allAssigned = branches.length > 0 && assigned.length === branches.length;

  const selectAll = async () => {
    for (const b of branches) { if (!assigned.includes(b.id)) await onToggle(b.id, false); }
  };
  const unselectAll = async () => {
    for (const b of branches) { if (assigned.includes(b.id)) await onToggle(b.id, true); }
  };

  // Display logic: All → "All (N)", ≤3 → chips, >3 → "N branches"
  const renderDisplay = () => {
    if (assigned.length === 0) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Assign...</span>;
    if (allAssigned) return <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--success)' }}>All ({branches.length})</span>;
    if (assigned.length <= 3) {
      return assigned.map(bId => {
        const b = branches.find(br => br.id === bId);
        return b ? <span key={bId} style={{ padding: '1px 6px', borderRadius: '10px', background: 'rgba(0,210,255,0.15)', color: 'var(--accent-color)', fontSize: '0.6rem', fontWeight: 600 }}>{b.name}</span> : null;
      });
    }
    return <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--accent-color)' }}>{assigned.length} branches</span>;
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(!open)}
        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', minHeight: '28px', gap: '4px' }}>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', overflow: 'hidden' }}>{renderDisplay()}</div>
        <ChevronDown size={12} color="var(--text-secondary)" />
      </div>

      {open && (
        <div className="glass" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, marginTop: '4px', padding: '6px', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', minWidth: '220px', maxWidth: '260px' }}>
           {/* Select All / Unselect All */}
           <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
             <button onClick={selectAll} style={{ flex: 1, padding: '4px', fontSize: '0.6rem', fontWeight: 700, background: 'rgba(0,200,83,0.1)', color: 'var(--success)', borderRadius: '4px' }}>Select All</button>
             <button onClick={unselectAll} style={{ flex: 1, padding: '4px', fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,61,0,0.1)', color: 'var(--error)', borderRadius: '4px' }}>Clear All</button>
           </div>
           <div style={{ position: 'relative', marginBottom: '6px' }}>
              <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '5px 8px 5px 26px', fontSize: '0.7rem' }} />
           </div>
           <div style={{ maxHeight: '180px', overflowY: 'auto' }} className="no-scrollbar">
              {filtered.map(b => {
                const isAssigned = assigned.includes(b.id);
                return (
                  <div key={b.id} onClick={() => onToggle(b.id, isAssigned)}
                    style={{ padding: '5px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: isAssigned ? 'rgba(0,210,255,0.08)' : 'transparent', marginBottom: '1px' }}>
                     {isAssigned ? <CheckSquare size={13} color="var(--accent-color)" /> : <Square size={13} color="var(--text-secondary)" />}
                     <span style={{ fontSize: '0.75rem', fontWeight: isAssigned ? 600 : 400 }}>{b.name}</span>
                  </div>
                );
              })}
           </div>
        </div>
      )}
    </div>
  );
};

const Toggle = ({ active, onClick, color = "var(--success)" }) => (
  <div onClick={onClick} style={{ width: '30px', height: '15px', borderRadius: '8px', background: active ? color : '#333', position: 'relative', cursor: 'pointer', transition: '0.2s' }}>
    <div style={{ width: '11px', height: '11px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: active ? '17px' : '2px', transition: '0.2s' }} />
  </div>
);

const CompanySettings = ({ company, setCompany }) => {
  const { refreshCompanyName } = useAuth();
  const handleUpdate = async (e) => {
    e.preventDefault();
    await supabase.from('companies').update({ 
      name: company.name, address: company.address,
      phone: company.phone, email: company.email, website: company.website
    }).eq('id', company.id);
    await refreshCompanyName();
    alert('Business Profile Updated!');
  };
  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', maxWidth: '800px' }}>
      <div className="glass">
        <h2 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Business Identity</h2>
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group-standard"><label>Company Name</label>
            <input value={company?.name || ''} onChange={e => setCompany({...company, name: e.target.value})} placeholder="Enterprise Name" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group-standard"><label>Phone</label>
              <input value={company?.phone || ''} onChange={e => setCompany({...company, phone: e.target.value})} placeholder="+91..." /></div>
            <div className="form-group-standard"><label>Email</label>
              <input value={company?.email || ''} onChange={e => setCompany({...company, email: e.target.value})} placeholder="admin@company.com" /></div>
          </div>
          <div className="form-group-standard"><label>Address</label>
            <textarea value={company?.address || ''} onChange={e => setCompany({...company, address: e.target.value})} placeholder="Head office..." style={{ minHeight: '60px' }} /></div>
          <div className="form-group-standard"><label>Website</label>
            <input value={company?.website || ''} onChange={e => setCompany({...company, website: e.target.value})} placeholder="www.example.com" /></div>
          <button type="submit" className="btn-primary">Update Profile</button>
        </form>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="glass" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '12px', border: '2px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--text-secondary)' }}>
            <Upload size={20} />
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 700 }}>Company Logo</p>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>PNG / JPG</p>
          <button className="btn-secondary" style={{ width: '100%', fontSize: '0.7rem', padding: '8px' }}>Upload</button>
        </div>
        <div className="glass" style={{ background: 'rgba(0,210,255,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            <Database size={16} color="var(--accent-color)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>DB Backup</span>
          </div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Export JSON backup</p>
          <button onClick={async () => {
            const tables = ['profiles','branches','daily_entries','user_branches','page_permissions','companies'];
            const backup = {};
            for (const t of tables) { const { data } = await supabase.from(t).select('*'); backup[t] = data; }
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = `backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
          }} className="btn-primary" style={{ width: '100%', fontSize: '0.7rem', padding: '8px' }}>Download Backup</button>
        </div>
      </div>
    </div>
  );
};

const PermissionMatrix = ({ user, perms, onToggle, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
    <div className="glass animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: '1.5rem' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem' }}>Permissions: {user.full_name}</h2>
          <button onClick={onClose}><X size={20} /></button>
       </div>
       <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
         <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ fontSize: '0.7rem', opacity: 0.5, borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '0.75rem' }}>PAGE</th><th>V</th><th>A</th><th>E</th><th>D</th>
            </tr></thead>
            <tbody>{perms.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem', textTransform: 'capitalize' }}>{p.page_name}</td>
                {['can_view', 'can_insert', 'can_update', 'can_delete'].map(f => (
                  <td key={f}>
                    <div onClick={() => onToggle(p.id, f, !p[f])} style={{ width: '20px', height: '20px', borderRadius: '4px', background: p[f] ? 'var(--accent-color)' : '#222', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p[f] && <Check size={12} color="black" />}
                    </div>
                  </td>
                ))}
              </tr>
            ))}</tbody>
         </table>
       </div>
    </div>
  </div>
);

export default SettingsPage;
