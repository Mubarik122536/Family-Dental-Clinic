import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { getTreatments, getTreatmentCategories, createTreatment, updateTreatment, deleteTreatment } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/toast';

export default function Treatments() {
  const [activeTab, setActiveTab] = useState('All');
  const [categories, setCategories] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTreatment, setNewTreatment] = useState({ name: '', category: '', description: '', price: '', pricing_type: 'per_tooth', duration: 30, status: 'Active' });
  const [error, setError] = useState('');
  const [editTreatment, setEditTreatment] = useState(null);
  const [editError, setEditError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cats, treats] = await Promise.all([
        getTreatmentCategories(),
        getTreatments(activeTab)
      ]);
      setCategories(cats);
      setTreatments(treats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleAdd = async () => {
    try {
      setError('');
      if (!newTreatment.name || !newTreatment.category || !newTreatment.price) {
        setError('Name, category and price are required');
        return;
      }
      await createTreatment({ ...newTreatment, price: parseFloat(newTreatment.price) });
      setShowAddModal(false);
      setNewTreatment({ name: '', category: '', description: '', price: '', pricing_type: 'per_tooth', duration: 30, status: 'Active' });
      showSuccess('Treatment added successfully!');
      fetchData();
    } catch (err) {
      setError(err.message); showError(err.message);
    }
  };

  const handleEditSave = async () => {
    try {
      setEditError('');
      if (!editTreatment.name || !editTreatment.category || !editTreatment.price) {
        setEditError('Name, category and price are required');
        return;
      }
      await updateTreatment(editTreatment.id, { ...editTreatment, price: parseFloat(editTreatment.price) });
      setEditTreatment(null);
      showSuccess('Treatment updated!');
      fetchData();
    } catch (err) {
      setEditError(err.message); showError(err.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Delete Treatment?', 'This action cannot be undone.');
    if (!confirmed) return;
    try { await deleteTreatment(id); showSuccess('Treatment deleted'); fetchData(); } catch (err) { showError(err.message); }
  };

  const totalTreatments = treatments.length;
  const avgPrice = treatments.length > 0 ? (treatments.reduce((s, t) => s + parseFloat(t.price), 0) / treatments.length).toFixed(0) : 0;

  return (
    <>
      <Header title="Treatments & Services">
        <button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 transition-all">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Treatment
        </button>
      </Header>
      <div className="p-6 flex-1 overflow-y-auto space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm transition-colors">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total Services</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{totalTreatments}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm transition-colors">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Categories</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{categories.length}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm transition-colors">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Avg. Price</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">${avgPrice}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <button onClick={() => setActiveTab('All')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'All' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveTab(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === cat ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{cat}</button>
            ))}
          </div>
          {loading ? (
            <div className="p-12 text-center"><span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">progress_activity</span></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-semibold">Treatment Name</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Duration</th>
                  <th className="px-5 py-3 font-semibold text-right">Price</th>
                  <th className="px-5 py-3 font-semibold">Pricing</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {treatments.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.name}</p>
                      {t.description && <p className="text-[10px] text-slate-400 dark:text-slate-500">{t.description}</p>}
                    </td>
                    <td className="px-5 py-3"><span className="px-2 py-0.5 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-300 rounded text-[10px] font-bold">{t.category}</span></td>
                    <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{t.duration} min</td>
                    <td className="px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 text-right">${parseFloat(t.price).toFixed(2)}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.pricing_type === 'fixed' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'}`}>{t.pricing_type === 'fixed' ? 'Fixed' : 'Per Tooth'}</span></td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'}`}>{t.status}</span></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => { setEditTreatment({ ...t }); setEditError(''); }} className="p-1.5 hover:bg-blue-50 rounded-md text-slate-400 hover:text-blue-500" title="Edit Treatment">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-500" title="Delete Treatment">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {treatments.length === 0 && <tr><td colSpan="7" className="px-5 py-8 text-center text-slate-400 text-sm">No treatments found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Add Treatment</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><span className="material-symbols-outlined text-slate-400 dark:text-slate-500">close</span></button>
            </div>
            {error && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg mb-3">{error}</p>}
            <div className="space-y-3">
              <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Name *</label><input value={newTreatment.name} onChange={e => setNewTreatment({ ...newTreatment, name: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 dark:placeholder:text-slate-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Category *</label><input value={newTreatment.category} onChange={e => setNewTreatment({ ...newTreatment, category: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="e.g. General" /></div>
                <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{newTreatment.pricing_type === 'fixed' ? 'Fixed Price *' : 'Price per Tooth *'}</label><input type="number" value={newTreatment.price} onChange={e => setNewTreatment({ ...newTreatment, price: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Pricing Type</label>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                  <button type="button" onClick={() => setNewTreatment({ ...newTreatment, pricing_type: 'per_tooth' })} className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${newTreatment.pricing_type === 'per_tooth' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Per Tooth</button>
                  <button type="button" onClick={() => setNewTreatment({ ...newTreatment, pricing_type: 'fixed' })} className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${newTreatment.pricing_type === 'fixed' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Fixed Price</button>
                </div>
              </div>
              <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Duration (min)</label><input type="number" value={newTreatment.duration} onChange={e => setNewTreatment({ ...newTreatment, duration: parseInt(e.target.value) || 30 })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
              <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Description</label><textarea value={newTreatment.description} onChange={e => setNewTreatment({ ...newTreatment, description: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" rows={2} /></div>
            </div>
            <button onClick={handleAdd} className="w-full mt-4 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors">Save Treatment</button>
          </div>
        </div>
      )}

      {editTreatment && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Edit Treatment</h3>
              <button onClick={() => setEditTreatment(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><span className="material-symbols-outlined text-slate-400 dark:text-slate-500">close</span></button>
            </div>
            {editError && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg mb-3">{editError}</p>}
            <div className="space-y-3">
              <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Name *</label><input value={editTreatment.name} onChange={e => setEditTreatment({ ...editTreatment, name: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Category *</label><input value={editTreatment.category} onChange={e => setEditTreatment({ ...editTreatment, category: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{editTreatment.pricing_type === 'fixed' ? 'Fixed Price *' : 'Price per Tooth *'}</label><input type="number" value={editTreatment.price} onChange={e => setEditTreatment({ ...editTreatment, price: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Pricing Type</label>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                  <button type="button" onClick={() => setEditTreatment({ ...editTreatment, pricing_type: 'per_tooth' })} className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${editTreatment.pricing_type === 'per_tooth' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Per Tooth</button>
                  <button type="button" onClick={() => setEditTreatment({ ...editTreatment, pricing_type: 'fixed' })} className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${editTreatment.pricing_type === 'fixed' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Fixed Price</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Duration (min)</label><input type="number" value={editTreatment.duration} onChange={e => setEditTreatment({ ...editTreatment, duration: parseInt(e.target.value) || 30 })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Status</label><select value={editTreatment.status} onChange={e => setEditTreatment({ ...editTreatment, status: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"><option>Active</option><option>Inactive</option></select></div>
              </div>
              <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Description</label><textarea value={editTreatment.description || ''} onChange={e => setEditTreatment({ ...editTreatment, description: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" rows={2} /></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleEditSave} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors">Save Changes</button>
              <button onClick={() => setEditTreatment(null)} className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
