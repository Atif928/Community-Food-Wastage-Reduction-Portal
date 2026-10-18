/**
 * AdminCategories - manage food categories.
 */
import { useCallback, useEffect, useState } from 'react';
import { categoryApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { EmptyState, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';

export default function AdminCategories() {
  const { success, error: showError } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'VEG', isActive: true });
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoryApi.list({ includeInactive: true });
      setItems(data.categories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing('new'); setForm({ name: '', type: 'VEG', isActive: true }); };
  const openEdit = (cat) => { setEditing(cat.id); setForm({ name: cat.name, type: cat.type, isActive: cat.isActive }); };
  const close = () => { setEditing(null); setForm({ name: '', type: 'VEG', isActive: true }); };

  const save = async () => {
    setWorking(true);
    try {
      if (editing === 'new') {
        await categoryApi.create({ name: form.name.trim(), type: form.type, isActive: form.isActive ? 1 : 0 });
      } else {
        await categoryApi.update(editing, { name: form.name.trim(), type: form.type, isActive: form.isActive ? 1 : 0 });
      }
      success('Category saved.');
      close();
      load();
    } catch (err) { showError(err.message); }
    finally { setWorking(false); }
  };

  const remove = async (cat) => {
    try {
      await categoryApi.remove(cat.id);
      success('Category removed (or deactivated if in use).');
      load();
    } catch (err) { showError(err.message); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" subtitle="Manage food categories" actions={<Button onClick={openAdd}>Add category</Button>} />

      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? (
        <EmptyState icon="🏷️" title="No categories" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Name</th><th>Type</th><th>Active</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {items.map((cat) => (
                  <tr key={cat.id}>
                    <td className="font-medium text-slate-700">{cat.name}</td>
                    <td className="text-xs text-slate-600">{cat.type}</td>
                    <td className="text-xs">{cat.isActive ? 'Yes' : 'No'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(cat)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(cat)}>Remove</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        title={editing === 'new' ? 'Add category' : 'Edit category'}
        onClose={close}
        footer={(
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button onClick={save} loading={working}>Save</Button>
          </>
        )}
      >
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="VEG">Veg</option>
            <option value="NON_VEG">Non-Veg</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active
          </label>
        </div>
      </Modal>
    </div>
  );
}
