'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, Users, Activity, Trash2, 
  LogIn, UserPlus, AlertTriangle, CheckCircle, XCircle,
  Clock, Calendar, Filter as FilterIcon, ShoppingCart,
  CreditCard, Star, Eye, Settings, Check
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface ActivityLog {
  _id: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  category: string;
  status: string;
  ipAddress?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ChatLog {
  _id: string;
  sessionId: string;
  userId?: string;
  userRole: string;
  page: string;
  messages: { role: string; content: string; timestamp: string }[];
  createdAt: string;
}

interface AuthLog {
  _id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  status: string;
  ipAddress?: string;
  role?: string;
  createdAt: string;
}

interface Stats {
  byCategory: { _id: string; count: number }[];
  byStatus: { _id: string; count: number }[];
  todayStats: { total: number; byCategory: { _id: string; count: number }[] };
}

const categoryIcons: Record<string, any> = {
  AUTH: LogIn,
  BOOKING: Calendar,
  PAYMENT: CreditCard,
  CAREGIVER: Users,
  REVIEW: Star,
  PROFILE: Settings,
  CHAT: MessageSquare,
  SYSTEM: Activity,
};

const categoryColors: Record<string, string> = {
  AUTH: 'bg-blue-500',
  BOOKING: 'bg-green-500',
  PAYMENT: 'bg-yellow-500',
  CAREGIVER: 'bg-purple-500',
  REVIEW: 'bg-pink-500',
  PROFILE: 'bg-indigo-500',
  CHAT: 'bg-cyan-500',
  SYSTEM: 'bg-slate-500',
};

export default function AdminLogsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activityPage, setActivityPage] = useState(1);
  const [chatPage, setChatPage] = useState(1);
  const [authPage, setAuthPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedChat, setExpandedChat] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [mounted, isAuthenticated, user, router]);

  useEffect(() => {
    if (mounted && isAuthenticated && user?.role === 'ADMIN') {
      fetchActivityLogs(1);
      fetchChatLogs(1);
      fetchAuthLogs(1);
      fetchStats();
    }
  }, [mounted, isAuthenticated, user]);

  const fetchActivityLogs = async (page = 1) => {
    try {
      const res = await fetch(`/api/logs/activity?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (page === 1) {
        setActivityLogs(data.logs || []);
      } else {
        setActivityLogs(prev => [...prev, ...(data.logs || [])]);
      }
      setActivityPage(page);
    } catch {
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatLogs = async (page = 1) => {
    try {
      const res = await fetch(`/api/logs/chat?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (page === 1) {
        setChatLogs(data.logs || []);
      } else {
        setChatLogs(prev => [...prev, ...(data.logs || [])]);
      }
      setChatPage(page);
    } catch {
      toast.error('Failed to fetch chat logs');
    }
  };

  const fetchAuthLogs = async (page = 1) => {
    try {
      const res = await fetch(`/api/logs/auth?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (page === 1) {
        setAuthLogs(data.logs || []);
      } else {
        setAuthLogs(prev => [...prev, ...(data.logs || [])]);
      }
      setAuthPage(page);
    } catch {
      toast.error('Failed to fetch auth logs');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/logs/activity/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setStats(data);
    } catch {
      toast.error('Failed to fetch stats');
    }
  };

  const deleteActivityLog = async (id: string) => {
    if (!confirm('Delete this activity log?')) return;
    try {
      const res = await fetch(`/api/logs/activity/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setActivityLogs(activityLogs.filter(log => log._id !== id));
        toast.success('Activity log deleted');
        fetchStats();
      }
    } catch {
      toast.error('Failed to delete activity log');
    }
  };

  const deleteChatSession = async (sessionId: string) => {
    if (!confirm('Delete this chat session?')) return;
    try {
      const res = await fetch(`/api/logs/chat/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setChatLogs(chatLogs.filter(log => log.sessionId !== sessionId));
        toast.success('Chat session deleted');
      }
    } catch {
      toast.error('Failed to delete chat session');
    }
  };

  useEffect(() => {
    if (activityLogs.length > 0 || chatLogs.length > 0 || authLogs.length > 0) {
      setLoading(false);
    }
  }, [activityLogs, chatLogs, authLogs]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!mounted || !isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />
      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Activity Logs</h1>
          <p className="text-muted-foreground mt-1">Monitor all platform activities, AI conversations, and authentication events</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {stats?.byCategory?.map((cat) => {
            const Icon = categoryIcons[cat._id] || Activity;
            return (
              <Card key={cat._id} style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full text-white ${categoryColors[cat._id] || 'bg-gray-500'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{cat.count}</p>
                      <p className="text-xs text-muted-foreground">{cat._id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              All Activity
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat Logs
            </TabsTrigger>
            <TabsTrigger value="auth" className="gap-2">
              <Users className="h-4 w-4" />
              Auth Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <CardHeader>
                <CardTitle>All Platform Activity</CardTitle>
                <CardDescription>Every action on the platform - searches, views, bookings, payments</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : activityLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No activity logs found</div>
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => {
                      const Icon = categoryIcons[log.category] || Activity;
                      return (
                        <div 
                          key={log._id}
                          className="flex items-start gap-4 p-4 border rounded-lg"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
                        >
                          <div className={`p-2 rounded-full text-white shrink-0 ${categoryColors[log.category] || 'bg-gray-500'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                              <Badge variant="outline" className="text-xs">{log.category}</Badge>
                              <Badge 
                                className={`text-xs ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : log.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
                              >
                                {log.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {log.userEmail && <span>{log.userEmail}</span>}
                              {log.userRole && <span className="px-2 py-0.5 bg-secondary rounded">{log.userRole}</span>}
                              <span>{formatDate(log.createdAt)}</span>
                              {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteActivityLog(log._id)}
                            className="text-red-500 hover:text-red-600 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    
                    {activityLogs.length >= 20 && (
                      <Button variant="outline" onClick={() => fetchActivityLogs(activityPage + 1)}>
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <CardHeader>
                <CardTitle>AI Chat Conversations</CardTitle>
                <CardDescription>All conversations with CareSphere AI assistant</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : chatLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No chat logs found</div>
                ) : (
                  <div className="space-y-4">
                    {chatLogs.map((log) => (
                      <div 
                        key={log._id} 
                        className="border rounded-lg p-4"
                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{log.userRole}</Badge>
                            <span className="text-sm text-muted-foreground">{log.page}</span>
                            <span className="text-xs text-muted-foreground">
                              {log.messages.length} messages
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setExpandedChat(expandedChat === log._id ? null : log._id)}
                            >
                              {expandedChat === log._id ? 'Hide' : 'View'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteChatSession(log.sessionId)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Session: {log.sessionId.substring(0, 8)}... • {formatDate(log.createdAt)}
                        </p>
                        
                        {expandedChat === log._id && (
                          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                            {log.messages.map((msg, idx) => (
                              <div 
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div 
                                  className="max-w-[80%] rounded-lg px-3 py-2 text-sm"
                                  style={{ 
                                    backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--secondary)',
                                    color: msg.role === 'user' ? 'white' : 'var(--foreground)'
                                  }}
                                >
                                  <p className="font-medium text-xs mb-1 uppercase">{msg.role}</p>
                                  <p>{msg.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {chatLogs.length >= 10 && (
                      <Button variant="outline" onClick={() => fetchChatLogs(chatPage + 1)}>
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth">
            <Card style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <CardHeader>
                <CardTitle>Authentication Logs</CardTitle>
                <CardDescription>Login, registration, and security events</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : authLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No auth logs found</div>
                ) : (
                  <div className="space-y-3">
                    {authLogs.map((log) => (
                      <div 
                        key={log._id}
                        className="flex items-center gap-4 p-3 border rounded-lg"
                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
                      >
                        <div className={`p-2 rounded-full ${
                          log.status === 'SUCCESS' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {log.status === 'SUCCESS' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                            <Badge 
                              className={`text-xs ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                            >
                              {log.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {log.userEmail || 'Unknown'} {log.role && `• ${log.role}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                          {log.ipAddress && (
                            <p className="text-xs text-muted-foreground">{log.ipAddress}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {authLogs.length >= 10 && (
                      <Button variant="outline" onClick={() => fetchAuthLogs(authPage + 1)}>
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
