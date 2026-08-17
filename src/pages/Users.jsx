import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../utils/toast';

const roleColors = {
    admin: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
    receptionist: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
    staff: 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    doctor: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
};

const roleOptions = ['admin', 'receptionist', 'doctor', 'staff'];

export default function Users() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [form, setForm] = useState({ email: '', name: '', role: 'receptionist', password: '' });
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/users', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load users');
            setUsers(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleAdd = async () => {
        setError('');
        if (!form.email || !form.name || !form.password) { setError('Email, name, and password are required'); return; }
        try {
            const res = await fetch('/api/users', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create user');
            setShowAddModal(false);
            setForm({ email: '', name: '', role: 'receptionist', password: '' });
            showSuccess('User created!');
            fetchUsers();
        } catch (err) { setError(err.message); showError(err.message); }
    };

    const handleUpdate = async () => {
        setError('');
        if (!editUser.name) { setError('Name is required'); return; }
        try {
            const body = { id: editUser.id, name: editUser.name, role: editUser.role, is_active: editUser.is_active };
            if (editUser.newPassword) body.password = editUser.newPassword;
            const res = await fetch('/api/users', {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update user');
            setEditUser(null);
            showSuccess('User updated!');
            fetchUsers();
        } catch (err) { setError(err.message); showError(err.message); }
    };

    const inputClass = "w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary";
    const activeCount = users.filter(u => u.is_active).length;

    return (
        <>
            <Header title="Users">
                <button onClick={() => { setShowAddModal(true); setError(''); setForm({ email: '', name: '', role: 'receptionist', password: '' }); }}
                    className="bg-primary hover:bg-primary-700 text-white px-3 md:px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 transition-all">
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    <span className="hidden md:inline">Add User</span>
                </button>
            </Header>

            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs text-slate-400 font-medium">Total Users</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{users.length}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs text-slate-400 font-medium">Active</p>
                        <h3 className="text-2xl font-bold text-emerald-500 mt-1">{activeCount}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs text-slate-400 font-medium">Inactive</p>
                        <h3 className="text-2xl font-bold text-slate-400 mt-1">{users.length - activeCount}</h3>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center"><span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span></div>
                    ) : (
                        <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Name</th>
                                    <th className="px-5 py-3 font-semibold">Email</th>
                                    <th className="px-5 py-3 font-semibold">Role</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                                    {u.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                </div>
                                                <div>
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{u.name}</span>
                                                    {u.id === currentUser?.id && <span className="ml-1.5 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">YOU</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${roleColors[u.role] || roleColors.staff}`}>
                                                {u.role?.charAt(0).toUpperCase() + u.role?.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_active ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => { setEditUser({ ...u, newPassword: '' }); setError(''); }}
                                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-md text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-400 text-sm">No users found</td></tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">person_add</span>Add User
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><span className="material-symbols-outlined text-slate-400">close</span></button>
                        </div>
                        {error && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{error}</p>}
                        <div className="space-y-3">
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Full Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Dr. John Doe" /></div>
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="user@clinic.com" /></div>
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Password *</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={inputClass} placeholder="••••••••" /></div>
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Role</label>
                                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={inputClass}>
                                    {roleOptions.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                            <button onClick={handleAdd} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary/20">Create User</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editUser && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">edit</span>Edit User
                            </h3>
                            <button onClick={() => setEditUser(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><span className="material-symbols-outlined text-slate-400">close</span></button>
                        </div>
                        {error && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{error}</p>}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Email</label>
                                <input value={editUser.email} disabled className={inputClass + " opacity-60 cursor-not-allowed"} />
                            </div>
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Full Name</label><input value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} className={inputClass} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Role</label>
                                    <select value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })} className={inputClass}>
                                        {roleOptions.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Status</label>
                                    <select value={editUser.is_active} onChange={e => setEditUser({ ...editUser, is_active: parseInt(e.target.value) })} className={inputClass}>
                                        <option value={1}>Active</option>
                                        <option value={0}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">New Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span></label><input type="password" value={editUser.newPassword} onChange={e => setEditUser({ ...editUser, newPassword: e.target.value })} className={inputClass} placeholder="••••••••" /></div>
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                            <button onClick={handleUpdate} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary/20">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
