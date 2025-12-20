import { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  TrendingUp,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  UserPlus,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Eye,
  Search,
  Key,
  RefreshCw,
  FileText,
  Download,
  Upload,
  ExternalLink,
  BookOpen,
  PlayCircle
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

/* =======================
   TYPES
======================= */

interface Member {
  id: string;
  name: string;
  surname: string;
  residence: string | null;
  phone: string | null;
  cell_group_id: string | null;
  invited_by: string | null;
  created_at: string | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  role?: string | null;
  permissions?: string[] | null;
  login_username?: string | null;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  event_time: string;
  location: string | null;
  pamphlet_url: string | null;
}

interface Sermon {
  id: string;
  title: string;
  summary: string;
  pastor_name: string;
  sermon_date: string;
  event_id: string | null;
  video_url: string | null;
  document_url: string | null;
  events?: {
    name: string;
    topic: string | null;
  } | null;
}

/* 🔴 UPDATED */
interface AbsentMember {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  residence: string | null;
  consecutiveAbsences: number;
  lastEventDate: string;
}

interface StatCard {
  icon: any;
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'info';
  color: string;
  bgColor: string;
  action: string;
}

/* =======================
   PERMISSIONS
======================= */

const canEdit = (role?: string | null, permissions: string[] = []) =>
  role === 'pastor' || role === 'admin' || permissions.includes('admin_access');

/* =======================
   DASHBOARD
======================= */

const Dashboard = () => {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const currentUserCanEdit = canEdit(profile?.admin_role, profile?.permissions || []);

  /* =======================
     LOAD ABSENT MEMBERS
  ======================= */
  const loadAbsentMembers = async () => {
    try {
      const { data: sundayEvents } = await supabase
        .from('events')
        .select('id, event_date')
        .or('name.ilike.%sunday%,name.ilike.%service%')
        .order('event_date', { ascending: false })
        .limit(2);

      if (!sundayEvents || sundayEvents.length < 2) {
        setAbsentMembers([]);
        return;
      }

      const { data: membersData } = await supabase
        .from('members')
        .select('id, name, surname, phone, residence');

      const { data: attendance } = await supabase
        .from('event_attendees')
        .select('members_id, event_id, attendance_status')
        .in('event_id', sundayEvents.map(e => e.id));

      const absent: AbsentMember[] = [];

      membersData?.forEach(member => {
        const records = attendance?.filter(a => a.members_id === member.id) || [];
        const absentCount = records.filter(r => r.attendance_status === 'absent').length;

        if (absentCount >= 2) {
          absent.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            phone: member.phone,
            residence: member.residence,
            consecutiveAbsences: absentCount,
            lastEventDate: sundayEvents[0].event_date
          });
        }
      });

      setAbsentMembers(absent);
    } catch (err) {
      console.error(err);
      setAbsentMembers([]);
    }
  };

  /* =======================
     LOAD DASHBOARD DATA
  ======================= */
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const { data: membersData } = await supabase.from('members').select('*');
      const { data: eventsData } = await supabase.from('events').select('*');
      const { data: sermonsData } = await supabase
        .from('sermons')
        .select('*, events(name, topic)');

      setMembers(membersData || []);
      setEvents(eventsData || []);
      setSermons(sermonsData || []);

      /* ✅ FIXED ORDER */
      await loadAbsentMembers();
      calculateStats(membersData || [], eventsData || [], sermonsData || []);
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     STATS
  ======================= */
  const calculateStats = (members: Member[], events: Event[], sermons: Sermon[]) => {
    setStats([
      {
        icon: AlertTriangle,
        label: 'Absent 2 Sundays',
        value: absentMembers.length.toString(),
        change:
          absentMembers.length > 0 ? 'Needs follow-up' : 'All members attending',
        changeType: absentMembers.length > 0 ? 'negative' : 'positive',
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50',
        action: 'viewAbsentMembers'
      }
    ]);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="p-10 text-center">Loading dashboard…</div>;
  }

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="p-6">
      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(stat => (
          <button
            key={stat.label}
            onClick={() => setActiveModal(stat.action)}
            className="p-6 rounded-xl bg-white shadow text-left"
          >
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-gray-600">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* ABSENT MEMBERS MODAL */}
      {activeModal === 'viewAbsentMembers' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              Members Absent for 2 Sundays
            </h2>

            {absentMembers.length === 0 && (
              <p className="text-green-600">All members are attending 🎉</p>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {absentMembers.map(m => (
                <div
                  key={m.id}
                  className="border border-red-200 bg-red-50 p-4 rounded-lg flex justify-between"
                >
                  <div>
                    <p className="font-semibold">
                      {m.name} {m.surname}
                    </p>
                    <p className="text-sm text-gray-600">
                      📍 {m.residence || 'No residence'}
                    </p>
                    <p className="text-sm text-gray-600">
                      📞 {m.phone || 'No phone'}
                    </p>
                  </div>
                  <span className="text-red-600 font-medium">
                    {m.consecutiveAbsences} Sundays
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="mt-4 px-4 py-2 bg-gray-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
