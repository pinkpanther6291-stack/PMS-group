import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Target,
  TrendingUp,
  Bell,
  ChevronRight,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import API_BASE from '@/lib/api';
import auth from "@/lib/auth";

const stats = [
  {
    title: "Placement Probability",
    value: "78%",
    icon: Target,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Resume Score",
    value: "85/100",
    icon: FileText,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    title: "Skills Matched",
    value: "12/15",
    icon: TrendingUp,
    color: "text-teal",
    bgColor: "bg-teal/10",
  },
];

const quickActions = [
  { label: "Upload Resume", icon: Upload, path: "/dashboard/student/resume-skills" },
  // route to placement-career with tab query so the correct tab is selected
  { label: "View Predictions", icon: Target, path: "/dashboard/student/placement-career?tab=prediction" },
  { label: "Career Paths", icon: TrendingUp, path: "/dashboard/student/placement-career?tab=career" },
  { label: "Lessons", icon: FileText, path: "/dashboard/student/learning-resources" },
];

const StudentDashboard = () => {
  const [user, setUser] = useState<any>(() => auth.getUser()?.user);
  const [hasResume, setHasResume] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const email = auth.getUser()?.user?.email;
      if (!email) return;
  const res = await fetch(`${API_BASE}/api/students/notifications?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const j = await res.json();
        const list = (j.notifications || []).map((n: any) => ({ title: n.title, time: n.createdAt ? new Date(n.createdAt).toLocaleString() : '', description: n.message, from: n.from || null }));
        // include feedback entries as notifications too
        const fb = (j.feedback || []).map((f: any) => ({ title: 'Resume Feedback', time: f.createdAt ? new Date(f.createdAt).toLocaleString() : '', description: f.message, from: f.from || null }));
        setNotifications([...list, ...fb]);
      }
    } catch (e) {
      // ignore
    }
  };

  
  const checkResumeExists = async () => {
    const stored = auth.getUser();
    const email = stored?.user?.email;
    if (!email) {
      setHasResume(false);
      return;
    }
    try {
  const res = await fetch(`${API_BASE}/api/students/resume?email=${encodeURIComponent(email)}`, {
        method: "GET",
      });
      setHasResume(res.ok);
    } catch (e) {
      setHasResume(false);
    }
  };

  useEffect(() => {
    const onUpdate = () => {
      setUser(auth.getUser()?.user);
      checkResumeExists();
      fetchNotifications();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("pms_auth_updated", onUpdate);
    window.addEventListener("pms_resume_updated", checkResumeExists);
    window.addEventListener("pms_resume_feedback", fetchNotifications);
    // initial check
    checkResumeExists();
    fetchNotifications();
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("pms_auth_updated", onUpdate);
      window.removeEventListener("pms_resume_updated", checkResumeExists);
      window.removeEventListener("pms_resume_feedback", fetchNotifications);
    };
  }, []);

  const completionItems = [
    { label: "Personal Info", done: true },
    { label: "Education", done: true },
    { label: "Skills", done: true },
    { label: "Resume", done: hasResume },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-teal/10 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome back, <span className="gradient-text">{user?.name || "Student"}</span>
          </h2>
          <p className="text-muted-foreground">
            Your placement journey is progressing well. Keep up the good work!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover:shadow-card transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Completion */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Profile Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Overall Progress</span>
                <span className="text-sm font-semibold">75%</span>
              </div>
              <Progress value={75} className="h-3" />
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                {completionItems.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      item.done ? "bg-primary/10" : "bg-secondary"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        item.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.done ? "✓" : "!"}
                    </div>
                    <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Button key={action.label} variant="outline" className="w-full justify-between" asChild>
                  <Link to={action.path}>
                    <span className="flex items-center gap-2">
                      <action.icon size={18} />
                      {action.label}
                    </span>
                    <ChevronRight size={16} />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell size={20} className="text-primary" />
              Recent Notifications
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/student/notifications">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                    {notification.description && <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>}
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              ))}
              {notifications.length === 0 && <div className="text-sm text-muted-foreground">No notifications</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;