import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  X, Shield, UserCheck, UserX, Clock, RefreshCw, Loader2, Package,
  CheckCircle2, AlertCircle, Upload, ChevronUp, ChevronDown, Pencil,
  Database, Download, Monitor, Check, FolderOpen, Save, ChevronDown as ChevronDownIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// ── inline file parsing (no external dependency) ──────────────────────────────

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string ?? '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function detectDelimiter(line: string): string {
  const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  for (const ch of line) {
    if (ch in counts) counts[ch as keyof typeof counts]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDelimitedText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter);
  const rows = lines.slice(1).map(l => splitCSVLine(l, delimiter));
  return { headers, rows };
}

function parseXMLToRows(text: string): { headers: string[]; rows: string[][] } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    const items = Array.from(doc.querySelectorAll('item, row, record, product, stock, Item, Row, Record, Product, Stock'));
    if (!items.length) return { headers: [], rows: [] };
    const headerSet = new Set<string>();
    items.forEach(el => Array.from(el.children).forEach(c => headerSet.add(c.tagName)));
    const headers = Array.from(headerSet);
    const rows = items.map(el => headers.map(h => el.querySelector(h)?.textContent?.trim() ?? ''));
    return { headers, rows };
  } catch {
    return { headers: [], rows: [] };
  }
}

function parseJSONToRows(text: string): { headers: string[]; rows: string[][] } {
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : data.items ?? data.products ?? data.stock ?? [];
    if (!arr.length) return { headers: [], rows: [] };
    const headers = Object.keys(arr[0]);
    const rows = arr.map((item: Record<string, unknown>) => headers.map(h => String(item[h] ?? '')));
    return { headers, rows };
  } catch {
    return { headers: [], rows: [] };
  }
}

function parseRawRows(text: string, fileName: string): { headers: string[]; rows: string[][] } {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xml') return parseXMLToRows(text);
  if (ext === 'json') return parseJSONToRows(text);
  return parseDelimitedText(text);
}

// ── location settings (localStorage) ─────────────────────────────────────────

const LOCATION_KEY = 'stock_location_settings';

interface LocationSettings {
  names: [string, string, string];
  pcPaths: [string, string, string];
  syncPaths: [string, string, string];
}

const DEFAULT_LOCATIONS: LocationSettings = {
  names: ['Warehouse 1', 'Warehouse 2', 'Warehouse 3'],
  pcPaths: ['', '', ''],
  syncPaths: ['', '', ''],
};

const DOT_COLORS = ['#378ADD', '#639922', '#BA7517'] as const;

function loadLocations(): LocationSettings {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return DEFAULT_LOCATIONS;
    const p = JSON.parse(raw);
    return {
      names: p.names ?? DEFAULT_LOCATIONS.names,
      pcPaths: p.pcPaths ?? DEFAULT_LOCATIONS.pcPaths,
      syncPaths: p.syncPaths ?? DEFAULT_LOCATIONS.syncPaths,
    };
  } catch { return DEFAULT_LOCATIONS; }
}

function saveLocations(s: LocationSettings) {
  localStorage.setItem(LOCATION_KEY, JSON.stringify(s));
}

// ── sub-components ────────────────────────────────────────────────────────────

function BadgePill({ set }: { set: boolean }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
      set ? 'bg-emerald-500/20 text-emerald-400' : 'bg-secondary text-muted-foreground'
    }`}>
      {set ? 'Set' : 'Empty'}
    </span>
  );
}

function EditableName({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const trimmed = draft.trim() || value;
    setEditing(false);
    onSave(trimmed);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
          className="text-sm font-semibold bg-secondary border border-primary/40 rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary w-36 text-foreground"
        />
        <button onClick={commit} className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10"><Check className="w-3 h-3" /></button>
        <button onClick={() => { setDraft(value); setEditing(false); }} className="p-1 rounded text-muted-foreground hover:bg-secondary"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <button onClick={() => { setDraft(value); setEditing(true); }} className="p-1 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary transition-colors" title="Rename">
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

function PathCard({
  title, icon, names, paths, pathPlaceholders, onPathChange, onSave,
}: {
  title: string;
  icon: React.ReactNode;
  names: [string, string, string];
  paths: [string, string, string];
  pathPlaceholders: [string, string, string];
  onPathChange: (idx: number, val: string) => void;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">{icon}{title}</div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border rounded-lg px-2.5 py-1.5 hover:bg-secondary transition-colors"
        >
          {open ? 'Done' : 'Set paths'}
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {([0, 1, 2] as const).map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-border">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DOT_COLORS[i] }} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">{names[i]}</div>
            <div className="text-[10px] text-muted-foreground truncate mt-0.5">{paths[i] || 'Not set'}</div>
          </div>
          <BadgePill set={!!paths[i]} />
        </div>
      ))}

      {open && (
        <div className="border-t border-border bg-secondary/40 px-4 py-4 flex flex-col gap-4">
          {([0, 1, 2] as const).map(i => (
            <div key={i} className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: DOT_COLORS[i] }} />
                {names[i]}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paths[i]}
                  onChange={e => onPathChange(i, e.target.value)}
                  placeholder={pathPlaceholders[i]}
                  className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-[12px] font-mono text-foreground outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={() => toast.info('Folder picker requires desktop app')}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground border border-border rounded-lg px-2.5 py-2 hover:bg-card transition-colors flex-shrink-0"
                >
                  <FolderOpen className="w-3 h-3" />
                  Browse
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => { onSave(); setOpen(false); }}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[12px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <Save className="w-3 h-3" />
              Save paths
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StockLocationSettings() {
  const [loc, setLoc] = useState<LocationSettings>(DEFAULT_LOCATIONS);

  useEffect(() => { setLoc(loadLocations()); }, []);

  const update = (next: LocationSettings) => { setLoc(next); saveLocations(next); };

  const saveName = (idx: number, name: string) => {
    const names = [...loc.names] as [string, string, string];
    names[idx] = name;
    update({ ...loc, names });
    toast.success(`Renamed to "${name}"`);
  };

  const setPcPath = (idx: number, val: string) => {
    const pcPaths = [...loc.pcPaths] as [string, string, string];
    pcPaths[idx] = val;
    update({ ...loc, pcPaths });
  };

  const setSyncPath = (idx: number, val: string) => {
    const syncPaths = [...loc.syncPaths] as [string, string, string];
    syncPaths[idx] = val;
    update({ ...loc, syncPaths });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Location name editors */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 text-sm font-semibold text-foreground border-b border-border">Location names</div>
        {([0, 1, 2] as const).map(i => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DOT_COLORS[i] }} />
            <EditableName value={loc.names[i]} onSave={name => saveName(i, name)} />
          </div>
        ))}
      </div>

      <PathCard
        title="Send to PC — locations"
        icon={<Monitor className="w-4 h-4" />}
        names={loc.names}
        paths={loc.pcPaths}
        pathPlaceholders={[
          `e.g. C:\\Exports\\${loc.names[0]}`,
          `e.g. C:\\Exports\\${loc.names[1]}`,
          `e.g. C:\\Exports\\${loc.names[2]}`,
        ]}
        onPathChange={setPcPath}
        onSave={() => toast.success('Export paths saved')}
      />

      <PathCard
        title="Sync — locations"
        icon={
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M2 8a6 6 0 1 1 1.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M2 12V8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        names={loc.names}
        paths={loc.syncPaths}
        pathPlaceholders={[
          `\\\\Server\\StockData\\${loc.names[0]}`,
          `\\\\Server\\StockData\\${loc.names[1]}`,
          `\\\\Server\\StockData\\${loc.names[2]}`,
        ]}
        onPathChange={setSyncPath}
        onSave={() => toast.success('Sync paths saved')}
      />
    </div>
  );
}

// ── types ─────────────────────────────────────────────────────────────────────

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

interface StockPreviewData {
  headers: string[];
  rows: string[][];
  fileName: string;
  fileSize: number;
}

const BUILT_IN_FIELDS = [
  { value: 'stockcode',    label: 'Stock Code',    icon: '🏷️', color: 'bg-primary/20 text-primary border-primary/30' },
  { value: 'barcode',      label: 'Bar Code',      icon: '📊', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'description',  label: 'Description',   icon: '📝', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'counted',      label: 'Counted',       icon: '🔢', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'price',        label: 'Price',         icon: '💰', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'stockOnHand',  label: 'Stock on Hand', icon: '📦', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'ignore',       label: 'Skip Column',   icon: '⏭️', color: 'bg-muted text-muted-foreground border-border' },
];

const sb = supabase as any;

const DEFAULT_PROGRESS: ProgressState = {
  active: false, label: '', current: 0, total: 0,
  phase: 'loading', updated: 0, skipped: 0, errors: 0,
};

// ── progress bar ──────────────────────────────────────────────────────────────

const ProgressBar = ({ progress }: { progress: ProgressState }) => {
  if (!progress.active && progress.phase !== 'done' && progress.phase !== 'error') return null;
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const isDone = progress.phase === 'done';
  const isError = progress.phase === 'error';

  return (
    <div className="mx-2 mb-2 rounded-xl border border-border bg-card p-3 space-y-2 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            : isError ? <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            : <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
          <span className="text-[10px] font-semibold text-foreground">{progress.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">{progress.current}/{progress.total}</span>
          <span className={`text-[10px] font-bold tabular-nums ${isDone ? 'text-green-500' : isError ? 'text-destructive' : 'text-primary'}`}>{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-200 ease-out ${isDone ? 'bg-green-500' : isError ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
      </div>
      {(progress.updated > 0 || progress.skipped > 0 || progress.errors > 0) && (
        <div className="flex gap-3">
          {progress.updated > 0 && <span className="text-[9px] font-semibold text-green-500">↑ {progress.updated} updated</span>}
          {progress.skipped > 0 && <span className="text-[9px] font-semibold text-muted-foreground">— {progress.skipped} skipped</span>}
          {progress.errors > 0 && <span className="text-[9px] font-semibold text-destructive">✕ {progress.errors} errors</span>}
        </div>
      )}
    </div>
  );
};

// ── main component ────────────────────────────────────────────────────────────

const AdminPanel = ({ isOpen, onClose }: AdminPanelProps) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'users' | 'requests' | 'stock'>('users');
  const [daysInput, setDaysInput] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<ProgressState>(DEFAULT_PROGRESS);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stockData, setStockData] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  // stock import
  const [stockPreview, setStockPreview] = useState<StockPreviewData | null>(null);
  const [showStockMapping, setShowStockMapping] = useState(false);
  const [stockMappings, setStockMappings] = useState<Record<number, string>>({});
  const [stockColumnOrder, setStockColumnOrder] = useState<number[]>([]);
  const [syncingStock, setSyncingStock] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<Record<number, string>>({});
  const [renamingCol, setRenamingCol] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // ── progress helpers ────────────────────────────────────────────────────────
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

  // ── fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    startProgress('Loading admin data…', 4, 'loading');
    try {
      const { data: profiles } = await sb.from('user_profiles').select('*').order('created_at', { ascending: false });
      tickProgress();
      const { data: roles } = await sb.from('user_roles').select('*');
      tickProgress();
      const { data: subs } = await sb.from('app_subscriptions').select('*').order('created_at', { ascending: false });
      tickProgress();
      const { data: reqs } = await sb.from('subscription_requests').select('*').order('created_at', { ascending: false });
      tickProgress();

      setUsers((profiles || []).map((p: any) => {
        const role = (roles || []).find((r: any) => r.user_id === p.id);
        const sub = (subs || []).find((s: any) => s.user_id === p.id && s.status === 'active');
        return {
          id: p.id, email: p.email || '', full_name: p.full_name || '',
          approved: p.approved, role: role?.role || 'user',
          subscription_status: sub?.status || null,
          end_date: sub?.end_date || null,
          days_granted: sub?.days_granted || null,
        };
      }));

      setRequests((reqs || []).map((r: any) => {
        const prof = (profiles || []).find((p: any) => p.id === r.user_id);
        return { ...r, user_email: prof?.email || 'Unknown' };
      }));

      const { data: stock } = await sb.from('stock_items').select('*').order('stock_code', { ascending: true });
      setStockData(stock || []);

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
    return () => { if (progressTimer.current) clearTimeout(progressTimer.current); };
  }, [isOpen, fetchData]);

  // ── export CSV ──────────────────────────────────────────────────────────────
  const exportStockToCSV = useCallback(async () => {
    try {
      setExporting(true);
      const { data: stock, error } = await sb
        .from('stock_items')
        .select('stock_code, barcode, description, counted, price')
        .order('stock_code', { ascending: true });
      if (error) throw error;
      if (!stock || stock.length === 0) { toast.error('No stock data to export'); return; }

      const escape = (field: any) => {
        if (field === null || field === undefined) return '';
        const s = String(field);
        return (s.includes(',') || s.includes('"') || s.includes('\n'))
          ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const csv = [
        'StockCode,BarCode,Description,Counted',
        ...stock.map((i: any) => [escape(i.stock_code), escape(i.barcode || ''), escape(i.description || ''), escape(i.counted || '')].join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `stock_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success(`Exported ${stock.length} stock items`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export stock data');
    } finally {
      setExporting(false);
    }
  }, []);

  // ── sync stock ──────────────────────────────────────────────────────────────
  const syncStockProgramme = useCallback(async (
    items: { stock_code: string; barcode?: string; description?: string; counted?: number; price?: number }[]
  ) => {
    if (!items.length) return;
    startProgress('Syncing stock programme…', items.length, 'updating');

    const { data: existing, error: fetchErr } = await sb
      .from('stock_items').select('id, stock_code, barcode, description, counted, price');
    if (fetchErr) { toast.error('Failed to fetch existing stock'); finishProgress('error'); return; }

    const existingMap = new Map<string, any>(
      (existing || []).map((row: any) => [String(row.stock_code).trim().toUpperCase(), row])
    );

    const toInsert: any[] = [];
    const toUpdate: any[] = [];

    for (const item of items) {
      const key = String(item.stock_code).trim().toUpperCase();
      const ex = existingMap.get(key);
      if (ex) {
        const changed =
          (item.barcode !== undefined && item.barcode !== ex.barcode) ||
          (item.description !== undefined && item.description !== ex.description) ||
          (item.counted !== undefined && item.counted !== ex.counted) ||
          (item.price !== undefined && item.price !== ex.price);
        if (changed) {
          toUpdate.push({
            id: ex.id,
            ...(item.barcode !== undefined ? { barcode: item.barcode } : {}),
            ...(item.description !== undefined ? { description: item.description } : {}),
            ...(item.counted !== undefined ? { counted: item.counted } : {}),
            ...(item.price !== undefined ? { price: item.price } : {}),
          });
        } else { addStat('skipped'); }
      } else {
        toInsert.push({ stock_code: item.stock_code, barcode: item.barcode, description: item.description, counted: item.counted, price: item.price });
      }
    }

    const BATCH = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const results = await Promise.allSettled(
        toUpdate.slice(i, i + BATCH).map(({ id, ...fields }: any) =>
          sb.from('stock_items').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
        )
      );
      results.forEach(r => { r.status === 'fulfilled' ? addStat('updated') : addStat('errors'); tickProgress(); });
    }

    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { error } = await sb.from('stock_items').insert(batch);
      error ? addStat('errors', batch.length) : addStat('updated', batch.length);
      tickProgress(batch.length);
    }

    const skippedCount = items.length - toUpdate.length - toInsert.length;
    if (skippedCount > 0) setProgress(p => ({ ...p, skipped: p.skipped + skippedCount, current: p.total }));

    toast.success(`Stock sync complete — ${toUpdate.length} updated, ${toInsert.length} new`);
    const { data: refreshedStock } = await sb.from('stock_items').select('*').order('stock_code', { ascending: true });
    setStockData(refreshedStock || []);
    finishProgress('done');
  }, []);

  // ── user actions ────────────────────────────────────────────────────────────
  const sendNotification = async (payload: Record<string, unknown>) => {
    try { await supabase.functions.invoke('send-notification', { body: payload }); }
    catch (err) { console.error('Notification failed:', err); }
  };

  const approveUser = async (userId: string) => {
    startProgress('Approving user…', 1, 'updating');
    await sb.from('user_profiles').update({ approved: true }).eq('id', userId);
    const user = users.find(u => u.id === userId);
    if (user?.email) sendNotification({ type: 'user_approved', user_id: userId, user_email: user.email });
    tickProgress(); finishProgress('done'); toast.success('User approved'); fetchData();
  };

  const revokeUser = async (userId: string) => {
    startProgress('Revoking user…', 1, 'updating');
    await sb.from('user_profiles').update({ approved: false }).eq('id', userId);
    tickProgress(); finishProgress('done'); toast.success('User access revoked'); fetchData();
  };

  const grantDays = async (userId: string) => {
    const days = parseInt(daysInput[userId] || '30');
    if (isNaN(days) || days < 1) { toast.error('Enter valid number of days'); return; }
    startProgress(`Granting ${days} days…`, 2, 'updating');
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);
    const { data: existing } = await sb.from('app_subscriptions').select('id').eq('user_id', userId).eq('status', 'active').maybeSingle();
    tickProgress();
    if (existing) {
      await sb.from('app_subscriptions').update({ days_granted: days, start_date: start.toISOString(), end_date: end.toISOString(), updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await sb.from('app_subscriptions').insert({ user_id: userId, days_granted: days, start_date: start.toISOString(), end_date: end.toISOString(), status: 'active' });
    }
    await sb.from('user_profiles').update({ approved: true }).eq('id', userId);
    tickProgress(); finishProgress('done');
    toast.success(`Granted ${days} days to user`);
    setDaysInput(prev => ({ ...prev, [userId]: '' }));
    fetchData();
  };

  const handleRequest = async (requestId: string, userId: string, days: number, approve: boolean) => {
    startProgress(approve ? 'Approving request…' : 'Rejecting request…', approve ? 3 : 1, 'updating');
    if (approve) {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + days);
      const { data: existing } = await sb.from('app_subscriptions').select('id, end_date').eq('user_id', userId).eq('status', 'active').maybeSingle();
      tickProgress();
      if (existing?.end_date && new Date(existing.end_date) > new Date()) {
        const currentEnd = new Date(existing.end_date);
        currentEnd.setDate(currentEnd.getDate() + days);
        await sb.from('app_subscriptions').update({ days_granted: days, end_date: currentEnd.toISOString(), updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await sb.from('app_subscriptions').insert({ user_id: userId, days_granted: days, start_date: start.toISOString(), end_date: end.toISOString(), status: 'active' });
      }
      tickProgress();
      await sb.from('user_profiles').update({ approved: true }).eq('id', userId);
      tickProgress();
    }
    await sb.from('subscription_requests').update({ status: approve ? 'approved' : 'rejected' }).eq('id', requestId);
    finishProgress('done');
    toast.success(approve ? 'Request approved' : 'Request rejected');
    fetchData();
  };

  // ── file upload ─────────────────────────────────────────────────────────────
  const handleStockFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const { headers, rows } = parseRawRows(text, file.name);
      if (headers.length === 0 || rows.length === 0) { toast.error('No data found in file'); return; }

      setStockPreview({ headers, rows, fileName: file.name, fileSize: file.size });

      const autoMappings: Record<number, string> = {};
      headers.forEach((header, idx) => {
        const h = header.toLowerCase();
        if (/stock\s*code|sku|code|item\s*code|product\s*code/i.test(h)) autoMappings[idx] = 'stockcode';
        else if (/barcode|ean|upc|gtin/i.test(h)) autoMappings[idx] = 'barcode';
        else if (/desc|name|product\s*name|item\s*name|description/i.test(h)) autoMappings[idx] = 'description';
        else if (/counted|quantity|qty|stock\s*count|actual|physical/i.test(h)) autoMappings[idx] = 'counted';
        else if (/price|cost|unit\s*price|amount|selling\s*price/i.test(h)) autoMappings[idx] = 'price';
        else if (/stock\s*on\s*hand|soh|on\s*hand|available/i.test(h)) autoMappings[idx] = 'stockOnHand';
        else autoMappings[idx] = 'ignore';
      });

      setStockMappings(autoMappings);
      setStockColumnOrder(headers.map((_, i) => i));
      setShowStockMapping(true);
      toast.success(`Loaded ${rows.length} items from ${file.name}`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const convertToStockItems = useMemo(() => {
    if (!stockPreview) return [];
    const stockcodeIdx = stockColumnOrder.find(idx => stockMappings[idx] === 'stockcode');
    const barcodeIdx = stockColumnOrder.find(idx => stockMappings[idx] === 'barcode');
    const descriptionIdx = stockColumnOrder.find(idx => stockMappings[idx] === 'description');
    const countedIdx = stockColumnOrder.find(idx => stockMappings[idx] === 'counted');
    const priceIdx = stockColumnOrder.find(idx => stockMappings[idx] === 'price');
    if (stockcodeIdx === undefined) return [];
    return stockPreview.rows
      .map(row => ({
        stock_code: String(row[stockcodeIdx] || '').trim(),
        barcode: barcodeIdx !== undefined ? String(row[barcodeIdx] || '').trim() || undefined : undefined,
        description: descriptionIdx !== undefined ? String(row[descriptionIdx] || '').trim() : '',
        counted: countedIdx !== undefined ? parseFloat(String(row[countedIdx])) || 0 : undefined,
        price: priceIdx !== undefined ? parseFloat(String(row[priceIdx])) || 0 : 0,
      }))
      .filter(item => item.stock_code);
  }, [stockPreview, stockMappings, stockColumnOrder]);

  const updateStockMapping = (columnIndex: number, field: string) => {
    setStockMappings(prev => {
      const next = { ...prev };
      if (field !== 'ignore') {
        Object.keys(next).forEach(key => {
          const idx = parseInt(key);
          if (next[idx] === field && idx !== columnIndex) next[idx] = 'ignore';
        });
      }
      next[columnIndex] = field;
      return next;
    });
  };

  const moveStockColumn = (currentPos: number, direction: 'up' | 'down') => {
    const newPos = direction === 'up' ? currentPos - 1 : currentPos + 1;
    if (newPos < 0 || newPos >= stockColumnOrder.length) return;
    setStockColumnOrder(prev => {
      const next = [...prev];
      [next[currentPos], next[newPos]] = [next[newPos], next[currentPos]];
      return next;
    });
  };

  const handleStockSync = async () => {
    if (convertToStockItems.length === 0) { toast.error('No valid stock items to sync'); return; }
    setSyncingStock(true);
    try {
      await syncStockProgramme(convertToStockItems);
      setShowStockMapping(false);
      setStockPreview(null);
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSyncingStock(false);
    }
  };

  const handleRenameHeader = (origIdx: number) => {
    const name = renameValue.trim();
    if (name) setCustomHeaders(prev => ({ ...prev, [origIdx]: name }));
    setRenamingCol(null);
    setRenameValue('');
  };

  const getFieldInfo = (field: string) => {
    const builtIn = BUILT_IN_FIELDS.find(f => f.value === field);
    if (builtIn) return builtIn;
    return BUILT_IN_FIELDS[6];
  };

  if (!isOpen) return null;

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const hasStockcode = Object.values(stockMappings).includes('stockcode');

  return (
    <>
      <style>{`@keyframes fadeSlideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">Admin Panel</h2>
            {pendingRequests.length > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} disabled={loading} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-border">
          {(['users', 'requests', 'stock'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              {t === 'users' ? `Users (${users.length})` : t === 'requests' ? `Requests (${pendingRequests.length} pending)` : 'Stock'}
            </button>
          ))}
        </div>

        <ProgressBar progress={progress} />

        <ScrollArea className="flex-1 p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading…</p>
            </div>
          ) : tab === 'users' ? (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{u.full_name || 'No name'}</p>
                      <p className="text-[10px] text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {u.role === 'admin' && <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">ADMIN</span>}
                      {u.approved
                        ? <span className="text-[9px] bg-accent/60 text-accent-foreground px-2 py-0.5 rounded-full font-bold">APPROVED</span>
                        : <span className="text-[9px] bg-warning/20 text-warning px-2 py-0.5 rounded-full font-bold">PENDING</span>}
                    </div>
                  </div>
                  {u.end_date && (
                    <div className="text-[10px] text-muted-foreground">
                      Expires: {new Date(u.end_date).toLocaleDateString()}
                      {new Date(u.end_date) <= new Date() && <span className="text-destructive font-bold ml-1">(EXPIRED)</span>}
                      {u.days_granted && <span> · {u.days_granted} days</span>}
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    {!u.approved
                      ? <button onClick={() => approveUser(u.id)} className="flex items-center gap-1 bg-accent/40 text-accent-foreground rounded-lg px-3 py-1.5 text-[10px] font-semibold hover:bg-accent/60"><UserCheck className="w-3 h-3" />Approve</button>
                      : <button onClick={() => revokeUser(u.id)} className="flex items-center gap-1 bg-destructive/20 text-destructive rounded-lg px-3 py-1.5 text-[10px] font-semibold hover:bg-destructive/30"><UserX className="w-3 h-3" />Revoke</button>}
                    <input type="number" value={daysInput[u.id] || ''} onChange={e => setDaysInput(prev => ({ ...prev, [u.id]: e.target.value }))} placeholder="Days" className="w-16 bg-secondary rounded-lg px-2 py-1.5 text-[10px] font-mono text-foreground outline-none focus:ring-1 focus:ring-primary" />
                    <button onClick={() => grantDays(u.id)} className="flex items-center gap-1 bg-primary/20 text-primary rounded-lg px-3 py-1.5 text-[10px] font-semibold hover:bg-primary/30"><Clock className="w-3 h-3" />Grant Days</button>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'requests' ? (
            <div className="space-y-2">
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs py-8">No requests yet</p>
              ) : requests.map(r => (
                <div key={r.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.user_email}</p>
                      <p className="text-[10px] text-muted-foreground">Requested {r.days_requested} days · {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${r.status === 'pending' ? 'bg-warning/20 text-warning' : r.status === 'approved' ? 'bg-accent/40 text-accent-foreground' : 'bg-destructive/20 text-destructive'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleRequest(r.id, r.user_id, r.days_requested, true)} className="flex-1 flex items-center justify-center gap-1 bg-accent/40 text-accent-foreground rounded-lg py-2 text-[10px] font-semibold hover:bg-accent/60"><UserCheck className="w-3 h-3" />Approve {r.days_requested}d</button>
                      <button onClick={() => handleRequest(r.id, r.user_id, r.days_requested, false)} className="flex-1 flex items-center justify-center gap-1 bg-destructive/20 text-destructive rounded-lg py-2 text-[10px] font-semibold hover:bg-destructive/30"><UserX className="w-3 h-3" />Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* ── Stock Tab ── */
            <div className="space-y-4">

              {/* Export */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Database className="w-4 h-4" />Stock Data</h3>
                  <button onClick={exportStockToCSV} disabled={exporting || stockData.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors">
                    {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Export to PC
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">{stockData.length} items in stock database</p>
              </div>

              {/* Location Settings */}
              <StockLocationSettings />

              {/* Import */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Upload className="w-4 h-4" />Import Stock Data</h3>
                <input type="file" accept=".csv,.xlsx,.xls,.xml,.json,.txt,.agx" onChange={handleStockFileUpload}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" />
                <p className="text-[10px] text-muted-foreground mt-2">Supported: CSV, Excel, XML, JSON, AGX, and any delimited text file</p>
              </div>

              {/* Stock mapping modal */}
              {showStockMapping && stockPreview && (
                <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b border-border bg-card">
                    <div>
                      <h2 className="font-bold text-foreground text-sm">Map Stock Columns</h2>
                      <p className="text-[10px] text-muted-foreground">{stockPreview.fileName} — {stockPreview.rows.length} items</p>
                    </div>
                    <button onClick={() => { setShowStockMapping(false); setStockPreview(null); }} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-muted-foreground mb-3">Tell us what each column means. Tap a column to change its mapping.</p>
                      {stockColumnOrder.map((origIdx, posIdx) => {
                        const header = customHeaders[origIdx] || stockPreview.headers[origIdx];
                        const mapping = stockMappings[origIdx];
                        const fieldInfo = getFieldInfo(mapping);
                        const sample = stockPreview.rows[0]?.[origIdx] || '—';
                        const isIgnored = mapping === 'ignore';

                        return (
                          <div key={origIdx} className={`rounded-xl border transition-all ${isIgnored ? 'border-border/50 opacity-60' : 'border-border'} bg-card overflow-hidden`}>
                            <div className="flex items-center gap-3 p-3">
                              <div className="flex flex-col gap-0.5">
                                <button onClick={() => moveStockColumn(posIdx, 'up')} disabled={posIdx === 0} className="w-6 h-5 rounded flex items-center justify-center bg-muted hover:bg-muted/80 disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                                <button onClick={() => moveStockColumn(posIdx, 'down')} disabled={posIdx === stockColumnOrder.length - 1} className="w-6 h-5 rounded flex items-center justify-center bg-muted hover:bg-muted/80 disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {renamingCol === origIdx ? (
                                    <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                                      onBlur={() => handleRenameHeader(origIdx)}
                                      onKeyDown={e => e.key === 'Enter' && handleRenameHeader(origIdx)}
                                      className="text-sm font-bold text-foreground bg-secondary rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary w-full" />
                                  ) : (
                                    <>
                                      <p className="text-sm font-bold text-foreground truncate">{header}</p>
                                      <button onClick={() => { setRenamingCol(origIdx); setRenameValue(header); }} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex-shrink-0">
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">Sample: <span className="font-mono">{String(sample).substring(0, 50)}</span></p>
                              </div>
                              <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border ${fieldInfo.color}`}>{fieldInfo.icon} {fieldInfo.label}</span>
                            </div>
                            <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                              {BUILT_IN_FIELDS.map(opt => (
                                <button key={opt.value} onClick={() => updateStockMapping(origIdx, opt.value)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${mapping === opt.value ? `${opt.color} ring-1 ring-offset-1 ring-offset-background` : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground'}`}>
                                  {opt.icon} {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <div className="p-3 border-t border-border bg-card flex gap-2">
                    <button onClick={() => { setShowStockMapping(false); setStockPreview(null); }} disabled={syncingStock} className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-medium">Cancel</button>
                    <button onClick={handleStockSync} disabled={!hasStockcode || convertToStockItems.length === 0 || syncingStock}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-30 disabled:pointer-events-none">
                      {syncingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {syncingStock ? 'Syncing...' : `Sync ${convertToStockItems.length} Items`}
                    </button>
                  </div>
                  {!hasStockcode && !syncingStock && (
                    <div className="px-3 pb-3">
                      <p className="text-[10px] text-destructive text-center">⚠️ Map at least one column to "Stock Code" to continue</p>
                    </div>
                  )}
                </div>
              )}

              {/* Stock list preview */}
              {stockData.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Package className="w-4 h-4" />Stock List</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {stockData.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="border-b border-border pb-2 text-xs">
                        <div className="font-medium text-foreground">{item.stock_code}</div>
                        <div className="text-muted-foreground mt-1">
                          {item.description && <div>Desc: {item.description}</div>}
                          {item.barcode && <div>Barcode: {item.barcode}</div>}
                          {item.counted != null && <div>Counted: {item.counted}</div>}
                          {item.price != null && <div>Price: {item.price}</div>}
                        </div>
                      </div>
                    ))}
                    {stockData.length > 10 && (
                      <div className="text-center text-muted-foreground text-[10px] pt-2">+ {stockData.length - 10} more items</div>
                    )}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="flex flex-col items-center justify-center gap-4 text-center px-4 pt-4">
                <Package className="w-10 h-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Stock Programme Sync</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Upload any file format with your stock data. The system will automatically detect the format and help you map columns.</p>
                </div>
                <div className="w-full bg-secondary rounded-xl p-3 text-left">
                  <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">{`Supported formats:\n• CSV, Excel (.xlsx, .xls)\n• XML, JSON, AGX\n• Plain text with delimiters\n\nSupported fields:\n• Stock Code (required)\n• Bar Code, Description\n• Counted, Price, Stock on Hand`}</p>
                </div>
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
