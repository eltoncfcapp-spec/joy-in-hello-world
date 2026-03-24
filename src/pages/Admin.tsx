import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Shield, UserCheck, UserX, Clock, RefreshCw, Loader2, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  approved: boolean;
  role: string;
  subscription_status: string | null;
  end_date: string | null;
  days_granted: number | null;
}

interface RequestRow {
  id: string;
  user_id: string;
  days_requested: number;
  status: string;
  created_at: string;
  user_email?: string;
}

interface ProgressState {
  active: boolean;
  label: string;
  current: number;
  total: number;
  phase: 'loading' | 'updating' | 'done' | 'error';
  updated: number;
  skipped: number;
  errors: number;
}

const sb = supabase as any;

const DEFAULT_PROGRESS: ProgressState = {
  active: false,
  label: '',
  current: 0,
  total: 0,
  phase: 'loading',
  updated: 0,
  skipped: 0,
  errors: 0,
};

// ── Progress Bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ progress }: { progress: ProgressState }) => {
  if (!progress.active && progress.phase !== 'done' && progress.phase !== 'error') return null;

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const isDone = progress.phase === 'done';
  const isError = progress.phase === 'error';

  return (
    <div
      className="mx-2 mb-2 rounded-xl border border-border bg-card p-3 space-y-2 transition-all duration-300"
      style={{ animation: 'fadeSlideIn 0.25s ease' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isDone ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          ) : isError ? (
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          ) : (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          )}
          <span className="text-[10px] font-semibold text-foreground">{progress.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">
            {progress.current}/{progress.total}
          </span>
          <span
            className={`text-[10px] font-bold tabular-nums ${
              isDone ? 'text-green-500' : isError ? 'text-destructive' : 'text-primary'
            }`}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ease-out ${
            isDone ? 'bg-green-500' : isError ? 'bg-destructive' : 'bg-primary'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stats row — shown once there's data */}
      {(progress.updated > 0 || progress.skipped > 0 || progress.errors > 0) && (
        <div className="flex gap-3">
          {progress.updated > 0 && (
            <span className="text-[9px] font-semibold text-green-500">
              ↑ {progress.updated} updated
            </span>
          )}
          {progress.skipped > 0 && (
            <span className="text-[9px] font-semibold text-muted-foreground">
              — {progress.skipped} skipped
            </span>
          )}
          {progress.errors > 0 && (
            <span className="text-[9px] font-semibold text-destructive">
              ✕ {progress.errors} errors
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const AdminPanel = ({ isOpen, onClose }: AdminPanelProps) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'users' | 'requests' | 'stock'>('users');
  const [daysInput, setDaysInput] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<ProgressState>(DEFAULT_PROGRESS);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── helpers ────────────────────────────────────────────────────────────────
  const startProgress = (label: string, total: number, phase: ProgressState['phase'] = 'loading') =>
    setProgress({ active: true, label, current: 0, total, phase, updated: 0, skipped: 0, errors: 0 });

  const tickProgress = (delta = 1) =>
    setProgress(p => ({ ...p, current: Math.min(p.current + delta, p.total) }));

  const addStat = (key: 'updated' | 'skipped' | 'errors', n = 1) =>
    setProgress(p => ({ ...p, [key]: p[key] + n }));

  const finishProgress = (phase: 'done' | 'error' = 'done') => {
    setProgress(p => ({ ...p, active: false, phase, current: p.total }));
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(
      () => setProgress(DEFAULT_PROGRESS),
      phase === 'done' ? 3500 : 6000,
    );
  };

  // ── data fetch ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    startProgress('Loading admin data…', 4, 'loading');

    try {
      const { data: profiles } = await sb
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      tickProgress();

      const { data: roles } = await sb.from('user_roles').select('*');
      tickProgress();

      const { data: subs } = await sb
        .from('app_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      tickProgress();

      const { data: reqs } = await sb
        .from('subscription_requests')
        .select('*')
        .order('created_at', { ascending: false });
      tickProgress();

      const userRows: UserRow[] = (profiles || []).map((p: any) => {
        const role = (roles || []).find((r: any) => r.user_id === p.id);
        const sub = (subs || []).find(
          (s: any) => s.user_id === p.id && s.status === 'active',
        );
        return {
          id: p.id,
          email: p.email || '',
          full_name: p.full_name || '',
          approved: p.approved,
          role: role?.role || 'user',
          subscription_status: sub?.status || null,
          end_date: sub?.end_date || null,
          days_granted: sub?.days_granted || null,
        };
      });
      setUsers(userRows);

      const reqRows: RequestRow[] = (reqs || []).map((r: any) => {
        const prof = (profiles || []).find((p: any) => p.id === r.user_id);
        return { ...r, user_email: prof?.email || 'Unknown' };
      });
      setRequests(reqRows);

      finishProgress('done');
    } catch (err) {
      console.error('Admin fetch error:', err);
      toast.error('Failed to load admin data');
      finishProgress('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchData();
    return () => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
    };
  }, [isOpen, fetchData]);

  // ── stock programme upsert ────────────────────────────────────────────────
  /**
   * Call this when you have an array of stock items to sync.
   * Items with the same stock_code will have barcode/description/price updated;
   * new codes are inserted.
   *
   * shape: { stock_code, barcode, description, price }[]
   */
  const syncStockProgramme = useCallback(
    async (items: { stock_code: string; barcode?: string; description?: string; price?: number }[]) => {
      if (!items.length) return;

      startProgress('Syncing stock programme…', items.length, 'updating');

      // 1. Fetch existing codes in one query
      const { data: existing, error: fetchErr } = await sb
        .from('stock_items')
        .select('id, stock_code, barcode, description, price');

      if (fetchErr) {
        toast.error('Failed to fetch existing stock');
        finishProgress('error');
        return;
      }

      const existingMap: Map<string, any> = new Map(
        (existing || []).map((row: any) => [String(row.stock_code).trim().toUpperCase(), row]),
      );

      const toInsert: any[] = [];
      const toUpdate: { id: string; barcode?: string; description?: string; price?: number }[] = [];

      for (const item of items) {
        const key = String(item.stock_code).trim().toUpperCase();
        const existing = existingMap.get(key);

        if (existing) {
          // Only update if something actually changed
          const changed =
            (item.barcode !== undefined && item.barcode !== existing.barcode) ||
            (item.description !== undefined && item.description !== existing.description) ||
            (item.price !== undefined && item.price !== existing.price);

          if (changed) {
            toUpdate.push({
              id: existing.id,
              ...(item.barcode !== undefined ? { barcode: item.barcode } : {}),
              ...(item.description !== undefined ? { description: item.description } : {}),
              ...(item.price !== undefined ? { price: item.price } : {}),
            });
          } else {
            addStat('skipped');
          }
        } else {
          toInsert.push({
            stock_code: item.stock_code,
            barcode: item.barcode,
            description: item.description,
            price: item.price,
          });
        }
      }

      // 2. Process updates in batches of 50
      const BATCH = 50;
      for (let i = 0; i < toUpdate.length; i += BATCH) {
        const batch = toUpdate.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(({ id, ...fields }) =>
            sb.from('stock_items').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id),
          ),
        );
        results.forEach(r => {
          if (r.status === 'fulfilled') addStat('updated');
          else addStat('errors');
          tickProgress();
        });
      }

      // 3. Insert new items in batches of 50
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const { error } = await sb.from('stock_items').insert(batch);
        if (error) {
          addStat('errors', batch.length);
        } else {
          addStat('updated', batch.length);
        }
        tickProgress(batch.length);
      }

      // Handle skipped (already counted inline above for updates)
      const skippedCount = items.length - toUpdate.length - toInsert.length;
      if (skippedCount > 0) {
        setProgress(p => ({ ...p, skipped: p.skipped + skippedCount, current: p.total }));
      }

      toast.success(
        `Stock sync complete — ${toUpdate.length} updated, ${toInsert.length} new`,
      );
      finishProgress('done');
    },
    [],
  );

  // ── user actions ──────────────────────────────────────────────────────────
  const sendNotification = async (payload: Record<string, unknown>) => {
    try {
      await supabase.functions.invoke('send-notification', { body: payload });
    } catch (err) {
      console.error('Notification send failed:', err);
    }
  };

  const approveUser = async (userId: string) => {
    startProgress('Approving user…', 1, 'updating');
    await sb.from('user_profiles').update({ approved: true }).eq('id', userId);
    const user = users.find(u => u.id === userId);
    if (user?.email)
      sendNotification({ type: 'user_approved', user_id: userId, user_email: user.email });
    tickProgress();
    finishProgress('done');
    toast.success('User approved');
    fetchData();
  };

  const revokeUser = async (userId: string) => {
    startProgress('Revoking user…', 1, 'updating');
    await sb.from('user_profiles').update({ approved: false }).eq('id', userId);
    tickProgress();
    finishProgress('done');
    toast.success('User access revoked');
    fetchData();
  };

  const grantDays = async (userId: string) => {
    const days = parseInt(daysInput[userId] || '30');
    if (isNaN(days) || days < 1) {
      toast.error('Enter valid number of days');
      return;
    }

    startProgress(`Granting ${days} days…`, 2, 'updating');

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);

    const { data: existing } = await sb
      .from('app_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    tickProgress();

    if (existing) {
      await sb.from('app_subscriptions').update({
        days_granted: days,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await sb.from('app_subscriptions').insert({
        user_id: userId,
        days_granted: days,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        status: 'active',
      });
    }

    await sb.from('user_profiles').update({ approved: true }).eq('id', userId);
    tickProgress();
    finishProgress('done');
    toast.success(`Granted ${days} days to user`);
    setDaysInput(prev => ({ ...prev, [userId]: '' }));
    fetchData();
  };

  const handleRequest = async (
    requestId: string,
    userId: string,
    days: number,
    approve: boolean,
  ) => {
    startProgress(approve ? 'Approving request…' : 'Rejecting request…', approve ? 3 : 1, 'updating');

    if (approve) {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + days);

      const { data: existing } = await sb
        .from('app_subscriptions')
        .select('id, end_date')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      tickProgress();

      if (existing?.end_date && new Date(existing.end_date) > new Date()) {
        const currentEnd = new Date(existing.end_date);
        currentEnd.setDate(currentEnd.getDate() + days);
        await sb.from('app_subscriptions').update({
          days_granted: days,
          end_date: currentEnd.toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await sb.from('app_subscriptions').insert({
          user_id: userId,
          days_granted: days,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          status: 'active',
        });
      }
      tickProgress();

      await sb.from('user_profiles').update({ approved: true }).eq('id', userId);
      tickProgress();
    }

    await sb
      .from('subscription_requests')
      .update({ status: approve ? 'approved' : 'rejected' })
      .eq('id', requestId);

    finishProgress('done');
    toast.success(approve ? 'Request approved' : 'Request rejected');
    fetchData();
  };

  if (!isOpen) return null;

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">Admin Panel</h2>
            {pendingRequests.length > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-2 border-b border-border">
          <button
            onClick={() => setTab('users')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === 'users'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === 'requests'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            Requests ({pendingRequests.length} pending)
          </button>
          <button
            onClick={() => setTab('stock')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === 'stock'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            Stock
          </button>
        </div>

        {/* ── Progress Bar (sticky under tabs) ───────────────────────────── */}
        <ProgressBar progress={progress} />

        {/* ── Content ────────────────────────────────────────────────────── */}
        <ScrollArea className="flex-1 p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading…</p>
            </div>
          ) : tab === 'users' ? (
            /* ── Users tab ───────────────────────────────────────────────── */
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {u.full_name || 'No name'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {u.role === 'admin' && (
                        <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                          ADMIN
                        </span>
                      )}
                      {u.approved ? (
                        <span className="text-[9px] bg-accent/60 text-accent-foreground px-2 py-0.5 rounded-full font-bold">
                          APPROVED
                        </span>
                      ) : (
                        <span className="text-[9px] bg-warning/20 text-warning px-2 py-0.5 rounded-full font-bold">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>

                  {u.end_date && (
                    <div className="text-[10px] text-muted-foreground">
                      Expires: {new Date(u.end_date).toLocaleDateString()}
                      {new Date(u.end_date) <= new Date() && (
                        <span className="text-destructive font-bold ml-1">(EXPIRED)</span>
                      )}
                      {u.days_granted && <span> · {u.days_granted} days</span>}
                    </div>
                  )}

                  <div className="flex gap-2 items-center">
                    {!u.approved ? (
                      <button
                        onClick={() => approveUser(u.id)}
                        className="flex items-center gap-1 bg-accent/40 text-accent-foreground rounded-lg px-3 py-1.5 text-[10px] font-semibold hover:bg-accent/60"
                      >
                        <UserCheck className="w-3 h-3" />
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => revokeUser(u.id)}
                        className="flex items-center gap-1 bg-destructive/20 text-destructive rounded-lg px-3 py-1.5 text-[10px] font-semibold hover:bg-destructive/30"
                      >
                        <UserX className="w-3 h-3" />
                        Revoke
                      </button>
                    )}
                    <input
                      type="number"
                      value={daysInput[u.id] || ''}
                      onChange={e =>
                        setDaysInput(prev => ({ ...prev, [u.id]: e.target.value }))
                      }
                      placeholder="Days"
                      className="w-16 bg-secondary rounded-lg px-2 py-1.5 text-[10px] font-mono text-foreground outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => grantDays(u.id)}
                      className="flex items-center gap-1 bg-primary/20 text-primary rounded-lg px-3 py-1.5 text-[10px] font-semibold hover:bg-primary/30"
                    >
                      <Clock className="w-3 h-3" />
                      Grant Days
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'requests' ? (
            /* ── Requests tab ────────────────────────────────────────────── */
            <div className="space-y-2">
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs py-8">No requests yet</p>
              ) : (
                requests.map(r => (
                  <div
                    key={r.id}
                    className="bg-card border border-border rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{r.user_email}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Requested {r.days_requested} days ·{' '}
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                          r.status === 'pending'
                            ? 'bg-warning/20 text-warning'
                            : r.status === 'approved'
                            ? 'bg-accent/40 text-accent-foreground'
                            : 'bg-destructive/20 text-destructive'
                        }`}
                      >
                        {r.status.toUpperCase()}
                      </span>
                    </div>

                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleRequest(r.id, r.user_id, r.days_requested, true)
                          }
                          className="flex-1 flex items-center justify-center gap-1 bg-accent/40 text-accent-foreground rounded-lg py-2 text-[10px] font-semibold hover:bg-accent/60"
                        >
                          <UserCheck className="w-3 h-3" />
                          Approve {r.days_requested}d
                        </button>
                        <button
                          onClick={() =>
                            handleRequest(r.id, r.user_id, r.days_requested, false)
                          }
                          className="flex-1 flex items-center justify-center gap-1 bg-destructive/20 text-destructive rounded-lg py-2 text-[10px] font-semibold hover:bg-destructive/30"
                        >
                          <UserX className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* ── Stock tab ───────────────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-4">
              <Package className="w-10 h-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-semibold text-foreground">Stock Programme Sync</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Call{' '}
                  <code className="bg-secondary px-1 rounded text-primary font-mono">
                    syncStockProgramme(items)
                  </code>{' '}
                  with your stock data. Items with matching stock codes will have their
                  barcode, description and price updated. New codes are inserted automatically.
                </p>
              </div>
              <div className="w-full bg-secondary rounded-xl p-3 text-left">
                <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">
                  {`// shape expected:\n[{ stock_code, barcode, description, price }]`}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
};

export { AdminPanel as default };
export type { AdminPanelProps };
// ── Export sync helper so other components can trigger stock updates ─────────
export const useStockSync = () => {
  const [progress, setProgress] = useState<ProgressState>(DEFAULT_PROGRESS);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startProgress = (label: string, total: number) =>
    setProgress({ active: true, label, current: 0, total, phase: 'updating', updated: 0, skipped: 0, errors: 0 });

  const tickProgress = (n = 1) =>
    setProgress(p => ({ ...p, current: Math.min(p.current + n, p.total) }));

  const addStat = (key: 'updated' | 'skipped' | 'errors', n = 1) =>
    setProgress(p => ({ ...p, [key]: p[key] + n }));

  const finishProgress = (phase: 'done' | 'error' = 'done') => {
    setProgress(p => ({ ...p, active: false, phase, current: p.total }));
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => setProgress(DEFAULT_PROGRESS), phase === 'done' ? 3500 : 6000);
  };

  const syncItems = useCallback(
    async (items: { stock_code: string; barcode?: string; description?: string; price?: number }[]) => {
      if (!items.length) return;
      startProgress('Syncing stock…', items.length);

      const { data: existing } = await sb.from('stock_items').select('id, stock_code, barcode, description, price');
      const map = new Map((existing || []).map((r: any) => [String(r.stock_code).trim().toUpperCase(), r]));

      const toInsert: any[] = [];
      const toUpdate: any[] = [];

      for (const item of items) {
        const key = String(item.stock_code).trim().toUpperCase();
        const ex = map.get(key);
        if (ex) {
          const changed =
            (item.barcode !== undefined && item.barcode !== ex.barcode) ||
            (item.description !== undefined && item.description !== ex.description) ||
            (item.price !== undefined && item.price !== ex.price);
          if (changed) toUpdate.push({ id: ex.id, barcode: item.barcode, description: item.description, price: item.price });
          else addStat('skipped');
        } else {
          toInsert.push(item);
        }
      }

      const BATCH = 50;
      for (let i = 0; i < toUpdate.length; i += BATCH) {
        const batch = toUpdate.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(({ id, ...f }) => sb.from('stock_items').update({ ...f, updated_at: new Date().toISOString() }).eq('id', id))
        );
        results.forEach(r => { addStat(r.status === 'fulfilled' ? 'updated' : 'errors'); tickProgress(); });
      }

      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const { error } = await sb.from('stock_items').insert(batch);
        addStat(error ? 'errors' : 'updated', batch.length);
        tickProgress(batch.length);
      }

      finishProgress('done');
      return progress;
    },
    []
  );

  return { progress, syncItems, ProgressBar: () => <ProgressBar progress={progress} /> };
};
