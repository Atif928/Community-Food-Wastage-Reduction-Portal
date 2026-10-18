/**
 * AdminVerifications - queue for NGO/shelter approval.
 *
 * Tabs: Pending, Approved, Rejected. Each row can be reviewed with a note.
 */
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/layout/PageHeader';
import { EmptyState, ErrorState } from '../../components/common/States';
import { PageLoader } from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { Textarea } from '../../components/common/Input';
import { formatDateTime, orgTypeLabel } from '../../utils/formatters';

const TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function AdminVerifications() {
  const { success, error: showError } = useToast();
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [note, setNote] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listVerifications({ status, page, limit: 15 });
      setResult({ items: data.items || [], pagination: data.pagination || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  const openReview = (item) => { setReviewing(item); setNote(item.reviewNote || ''); };
  const closeReview = () => { setReviewing(null); setNote(''); };

  const decide = async (action) => {
    if (!reviewing) return;
    setWorking(true);
    try {
      await adminApi.reviewVerification(reviewing.id, { status: action, reviewNote: note.trim() || undefined });
      success(action === 'APPROVED' ? 'Verification approved.' : 'Verification rejected.');
      closeReview();
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Verifications" subtitle="Approve or reject NGO/shelter accounts." />

      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === tab.value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={load} /> : result.items.length === 0 ? (
        <EmptyState icon="🛡️" title="Nothing here" message="No verifications in this state." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Organisation</th>
                  <th>Document</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium text-slate-700">{item.applicant?.name}</p>
                      <p className="text-xs text-slate-500">{item.applicant?.email}</p>
                      <p className="text-xs text-slate-500">{item.applicant?.phone}</p>
                    </td>
                    <td className="text-sm text-slate-600">{orgTypeLabel(item.applicant?.orgType)}</td>
                    <td>
                      {item.documentUrl && (
                        <a href={item.documentUrl} target="_blank" rel="noreferrer" className="link text-xs">View document</a>
                      )}
                    </td>
                    <td className="text-xs text-slate-400">{formatDateTime(item.submittedAt)}</td>
                    <td className="text-xs">{item.status}</td>
                    <td className="text-right">
                      {item.status === 'PENDING' ? (
                        <Button size="sm" variant="secondary" onClick={() => openReview(item)}>Review</Button>
                      ) : <span className="text-xs text-slate-400">{item.reviewNote || '-'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination pagination={result.pagination} onPageChange={setPage} disabled={loading} />

      <Modal
        open={Boolean(reviewing)}
        title="Review verification"
        onClose={closeReview}
        footer={(
          <>
            <Button variant="secondary" onClick={() => decide('REJECTED')} loading={working}>Reject</Button>
            <Button onClick={() => decide('APPROVED')} loading={working}>Approve</Button>
          </>
        )}
      >
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-slate-500">Applicant</p>
            <p className="font-semibold text-slate-800">{reviewing?.applicant?.name}</p>
            <p className="text-xs text-slate-500">{reviewing?.applicant?.email}</p>
          </div>
          {reviewing?.documentUrl && (
            <a href={reviewing.documentUrl} target="_blank" rel="noreferrer" className="link text-xs">View attached document</a>
          )}
          <Textarea
            label="Review note (optional)"
            name="note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
