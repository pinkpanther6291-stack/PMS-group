import AdminDashboardLayout from "@/components/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  GraduationCap, 
  Building2, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Shield,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import API_BASE from "@/lib/api";

function SuggestionBox() {
  const [list, setList] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    try {
      const tryUrl = `${API_BASE}/api/feedback?role=admin`;
      let res = null;
      try { res = await fetch(tryUrl); } catch (e) { console.warn('Fetch to API_BASE failed, falling back to relative path', e); }
      if (!res) res = await fetch(`/api/feedback?role=admin`);
      const j = await res.json();
      setList(j.list || []);
    } catch (e) {
      console.warn('Failed to fetch suggestions', e);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const send = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const body = { fromRole: 'admin', toRole: 'tpo', fromEmail, message };
      const tryUrl = `${API_BASE}/api/feedback`;
      let res = null;
      try { res = await fetch(tryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
      catch (e) { console.warn('POST to API_BASE failed, falling back to relative path', e); }
      if (!res) res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      console.log('Posted feedback response', j);
      setMessage('');
      fetchList();
    } catch (e) {
      console.warn('Send failed', e);
    }
    setLoading(false);
  };

  const reply = async (id: string, replyMsg: string) => {
    if (!replyMsg.trim()) return;
    try {
      await fetch(`${API_BASE}/api/feedback/${id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromRole: 'admin', fromEmail, message: replyMsg }) });
      fetchList();
    } catch (e) { console.warn(e); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input placeholder="Your email (optional)" value={fromEmail} onChange={(e:any)=>setFromEmail(e.target.value)} />
        <div className="md:col-span-2" />
      </div>
      <Textarea placeholder="Write a suggestion or feedback to TPO" value={message} onChange={(e:any)=>setMessage(e.target.value)} />
      <div className="flex gap-2">
        <Button onClick={send} disabled={loading}>{loading ? 'Sending...' : 'Send to TPO'}</Button>
        <Button variant="ghost" onClick={()=>{ setMessage(''); }}>Clear</Button>
      </div>

      <div className="space-y-2 mt-4">
        {list.map(item => (
          <div key={item._id} className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">From: {item.fromRole} {item.fromEmail ? `(${item.fromEmail})` : ''}</p>
                <p className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-2">
              <p>{item.message}</p>
            </div>
            <div className="mt-3 space-y-2">
              {(item.replies || []).map((r:any, idx:number) => (
                <div key={idx} className="p-2 bg-white/20 rounded">
                  <p className="text-sm font-medium">{r.fromRole} {r.fromEmail ? `(${r.fromEmail})` : ''}</p>
                  <p className="text-sm">{r.message}</p>
                </div>
              ))}
              <ReplyInput onReply={(txt)=>reply(item._id, txt)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReplyInput({ onReply }: { onReply: (txt: string)=>void }){
  const [t, setT] = useState('');
  return (
    <div className="flex gap-2 mt-2">
      <Input placeholder="Reply..." value={t} onChange={(e:any)=>setT(e.target.value)} />
      <Button onClick={()=>{ onReply(t); setT(''); }}>Reply</Button>
    </div>
  );
}

const AdminDashboard = () => {
  const stats = [
    { label: "Total Users", value: "2,847", change: "+12%", trend: "up", icon: Users },
    { label: "Active Students", value: "2,156", change: "+8%", trend: "up", icon: GraduationCap },
    { label: "Partner Companies", value: "89", change: "+15%", trend: "up", icon: Building2 },
    { label: "Placement Rate", value: "87.5%", change: "+5.2%", trend: "up", icon: TrendingUp },
  ];

  const systemHealth = [
    { name: "Database", status: "healthy", uptime: "99.9%" },
    { name: "API Services", status: "healthy", uptime: "99.8%" },
  ];

  const recentActivities = [
    { action: "New user registered", user: "Priya Sharma", time: "2 min ago", type: "user" },
    { action: "Role updated", user: "Dr. Meera", time: "5 hours ago", type: "role" },
    { action: "Settings changed", user: "Admin", time: "1 day ago", type: "settings" },
  ];

  return (
    <AdminDashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stat.trend === "up" ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                      <span className={stat.trend === "up" ? "text-green-500 text-sm" : "text-red-500 text-sm"}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemHealth.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {service.status === "healthy" ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    )}
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <Badge variant={service.status === "healthy" ? "default" : "secondary"}>
                    {service.uptime}
                  </Badge>
                </div>
              ))}
              <Button variant="outline" className="w-full" asChild>
                <Link to="/admin/logs">View System Logs</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/users">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/roles">
                  <Shield className="w-4 h-4 mr-2" />
                  Configure Roles
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/logs">
                  <Activity className="w-4 h-4 mr-2" />
                  View Logs
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/settings">
                  <Activity className="w-4 h-4 mr-2" />
                  System Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Suggestion Box - Admin <-> TPO communication */}
        <Card>
          <CardHeader>
            <CardTitle>Suggestion Box (Admin &amp; TPO)</CardTitle>
          </CardHeader>
          <CardContent>
            <SuggestionBox />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                      activity.type === "role" ? "bg-purple-500" :
                      activity.type === "settings" ? "bg-blue-500" :
                      "bg-gray-500"
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">by {activity.user}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminDashboard;
