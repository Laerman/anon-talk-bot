import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import LoginForm from '@/components/LoginForm';
import AdminHeader from '@/components/admin/AdminHeader';
import StatsCards from '@/components/admin/StatsCards';
import ActivityChart from '@/components/admin/ActivityChart';
import GenderDistribution from '@/components/admin/GenderDistribution';
import StatsMetrics from '@/components/admin/StatsMetrics';
import ActiveChatsList from '@/components/admin/ActiveChatsList';
import ComplaintsList from '@/components/admin/ComplaintsList';
import AttachmentsList from '@/components/admin/AttachmentsList';

const API_URL = 'https://functions.poehali.dev/3d80763a-6e9c-47e8-ad39-f66f686907a6';
const AUTH_API_URL = 'https://functions.poehali.dev/7c36ba9c-1436-4f94-ac57-6e4d16640f39';

interface Stats {
  active_users: number;
  active_chats: number;
  searching_users: number;
  pending_complaints: number;
  gender_distribution: {
    male: number;
    female: number;
  };
  hourly_stats: Array<{ hour: number; users: number; chats: number }>;
  avg_chat_duration_minutes: number;
  total_messages_today: number;
}

interface Chat {
  id: number;
  user1_gender: string;
  user2_gender: string;
  message_count: number;
  duration_minutes: number;
}

interface Complaint {
  id: number;
  chat_id: number;
  reason: string;
  created_at: string;
  status: string;
}

interface Attachment {
  id: number;
  chat_id: number;
  photo_url: string;
  content_type: string;
  sent_at: string;
  sender_gender: string;
}

export default function Index() {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const verifySession = async (token: string) => {
    try {
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          session_token: token
        })
      });
      const data = await response.json();
      return data.valid === true;
    } catch {
      return false;
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logout',
          session_token: sessionToken
        })
      });
    }
    localStorage.removeItem('admin_session');
    setIsAuthenticated(false);
    setSessionToken(null);
  };

  const handleLoginSuccess = (token: string) => {
    setSessionToken(token);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_session');
      if (token) {
        const valid = await verifySession(token);
        if (valid) {
          setSessionToken(token);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('admin_session');
        }
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}?endpoint=stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchChats = async () => {
    try {
      const response = await fetch(`${API_URL}?endpoint=chats`);
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  };

  const fetchComplaints = async () => {
    try {
      const response = await fetch(`${API_URL}?endpoint=complaints`);
      const data = await response.json();
      setComplaints(data.complaints || []);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`${API_URL}?endpoint=attachments`);
      const data = await response.json();
      setAttachments(data.attachments || []);
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchStats(), fetchChats(), fetchComplaints(), fetchAttachments()]);
        setLoading(false);
      };
      loadData();
    }
  }, [isAuthenticated]);

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchChats(), fetchComplaints(), fetchAttachments()]);
    setLoading(false);
  };

  const genderData = stats?.gender_distribution ? [
    { name: 'Мужчины', value: stats.gender_distribution.male || 0 },
    { name: 'Женщины', value: stats.gender_distribution.female || 0 },
  ] : [];

  const chartData = stats?.hourly_stats?.map(item => ({
    time: `${String(item.hour).padStart(2, '0')}:00`,
    users: item.users,
    chats: item.chats,
  })) || [];

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const formatGender = (g: string) => {
    return g === 'male' ? 'М' : 'Ж';
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" size={48} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" size={48} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <AdminHeader 
          loading={loading} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />

        <StatsCards stats={stats} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-14">
            <TabsTrigger value="stats" className="text-base">
              <Icon name="BarChart3" size={18} className="mr-2" />
              Статистика
            </TabsTrigger>
            <TabsTrigger value="chats" className="text-base">
              <Icon name="MessageSquare" size={18} className="mr-2" />
              Активные чаты
            </TabsTrigger>
            <TabsTrigger value="complaints" className="text-base">
              <Icon name="Flag" size={18} className="mr-2" />
              Жалобы
            </TabsTrigger>
            <TabsTrigger value="attachments" className="text-base">
              <Icon name="Image" size={18} className="mr-2" />
              Вложения
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ActivityChart chartData={chartData} />
              <GenderDistribution genderData={genderData} />
            </div>

            <StatsMetrics stats={stats} formatDuration={formatDuration} />
          </TabsContent>

          <TabsContent value="chats">
            <ActiveChatsList 
              chats={chats} 
              formatDuration={formatDuration} 
              formatGender={formatGender} 
            />
          </TabsContent>

          <TabsContent value="complaints">
            <ComplaintsList complaints={complaints} onAction={handleRefresh} />
          </TabsContent>

          <TabsContent value="attachments">
            <AttachmentsList attachments={attachments} onCleanupComplete={handleRefresh} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}