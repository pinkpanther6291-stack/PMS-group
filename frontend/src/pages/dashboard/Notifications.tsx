import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Briefcase, FileText, Calendar, Check, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import auth from "@/lib/auth";

import API_BASE from '@/lib/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const email = auth.getUser()?.user?.email;
      if (!email) return;
  const res = await fetch(`${API_BASE}/api/students/notifications?email=${encodeURIComponent(email)}`);
      if (!res.ok) return;
      const j = await res.json();
      const fromNotifications = (j.notifications || []).map((n: any, idx: number) => ({
        id: n._id || n.createdAt || `n-${idx}`,
        type: n.title && n.title.toLowerCase().includes('job') ? 'job' : n.title && n.title.toLowerCase().includes('resume') ? 'resume' : 'event',
        title: n.title,
        description: n.message,
        from: n.from || null,
        time: n.createdAt ? new Date(n.createdAt).toLocaleString() : '',
        read: !!n.read,
      }));

      const fromFeedback = (j.feedback || []).map((f: any, idx: number) => ({
        id: f._id || f.createdAt || `f-${idx}`,
        type: 'resume',
        title: 'Resume Feedback',
        description: f.message,
        from: f.from || null,
        time: f.createdAt ? new Date(f.createdAt).toLocaleString() : '',
        read: false,
      }));

      // merge notifications and feedback, newest first by time when possible
      const merged = [...fromNotifications, ...fromFeedback].sort((a, b) => {
        const ta = a.time ? new Date(a.time).getTime() : 0;
        const tb = b.time ? new Date(b.time).getTime() : 0;
        return tb - ta;
      });
      // ensure we keep kind so frontend can delete the correct subdoc
      const withKind = merged.map((it) => ({ ...it, kind: it.kind || (it.id && String(it.id).startsWith('f-') ? 'feedback' : it._kind || 'notification') }));
      // better: mark items originally from feedback array as kind='feedback'
      const final = withKind.map((it) => (it.title === 'Resume Feedback' && !it.from && it.description ? { ...it, kind: 'feedback' } : it));
      setNotifications(final);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const onFeedback = () => fetchNotifications();
    window.addEventListener('pms_resume_feedback', onFeedback);
    return () => window.removeEventListener('pms_resume_feedback', onFeedback);
  }, []);

  const handleDelete = async (id: any, kind: string) => {
    if (!confirm('Delete this notification?')) return;
    // optimistic update: remove locally first
    const prev = notifications;
    setNotifications(prev.filter((n) => String(n.id) !== String(id)));
    try {
      const email = auth.getUser()?.user?.email;
      if (!email) return;
  const res = await fetch(`${API_BASE}/api/students/delete-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail: email, id, kind }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.message || 'Failed to delete');
        setNotifications(prev); // rollback
        return;
      }
      // refresh from server for consistency
      fetchNotifications();
    } catch (e) {
      // rollback optimistic update
      setNotifications(prev);
      alert('Failed to delete notification');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "job":
        return <Briefcase className="w-5 h-5 text-primary" />;
      case "resume":
        return <FileText className="w-5 h-5 text-accent" />;
      case "event":
        return <Calendar className="w-5 h-5 text-teal" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">All Notifications</h2>
            <p className="text-sm text-muted-foreground">{unreadCount} unread notifications</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchNotifications}>
            <Check size={16} /> Refresh
          </Button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={String(notification.id)}
              className={`transition-colors ${!notification.read ? "bg-primary/5 border-primary/20" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${!notification.read ? "bg-primary/10" : "bg-secondary"}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </h3>
                        {notification.from && (
                          <p className="text-xs text-muted-foreground mt-1">From: {notification.from}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{notification.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDelete(notification.id, notification.kind)}>
                    <Trash2 size={16} className="text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {notifications.length === 0 && <div className="text-sm text-muted-foreground">No notifications</div>}
        </div>
      </div>
    </DashboardLayout>
  );
};
export default Notifications;
