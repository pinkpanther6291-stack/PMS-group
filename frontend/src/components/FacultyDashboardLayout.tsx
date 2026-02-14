import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  BookOpen,
  FileBarChart,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import auth from "@/lib/auth";
import logo from "@/assets/banasthali-logo.jpg";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/faculty" },
  { icon: User, label: "My Profile", path: "/dashboard/faculty/profile" },
  { icon: Users, label: "Student Progress", path: "/dashboard/faculty/student-progress" },
  { icon: FileText, label: "Student Resumes", path: "/dashboard/faculty/resumes" },
  { icon: BarChart3, label: "Skill Analytics", path: "/dashboard/faculty/skill-analytics" },
  { icon: BookOpen, label: "Learning Resources", path: "/dashboard/faculty/learning-resources" },
  { icon: FileBarChart, label: "Reports", path: "/dashboard/faculty/reports" },
];

interface FacultyDashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

const FacultyDashboardLayout = ({ children, title }: FacultyDashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(() => auth.getUser()?.user);

  const getProfileImageSrc = (u: any) => {
    if (!u) return null;
    if (u.profileData && u.profileFileName) {
      const fn = u.profileFileName.toLowerCase();
      const mime = fn.endsWith('.png') ? 'image/png' : fn.endsWith('.jpg') || fn.endsWith('.jpeg') ? 'image/jpeg' : 'image/*';
      return `data:${mime};base64,${u.profileData}`;
    }
    return null;
  };

  const userInitial = (u: any) => {
    if (!u) return 'F';
    if (u.name && u.name.length) return u.name.charAt(0).toUpperCase();
    if (u.email && u.email.length) return u.email.charAt(0).toUpperCase();
    return 'F';
  };

  useEffect(() => {
    const onUpdate = () => setUser(auth.getUser()?.user);
    window.addEventListener('storage', onUpdate);
    window.addEventListener('pms_auth_updated', onUpdate);
    return () => {
      window.removeEventListener('storage', onUpdate);
      window.removeEventListener('pms_auth_updated', onUpdate);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const stored = auth.getUser();
      const email = stored?.user?.email;
      const role = stored?.role;
      if (email && role) {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role }),
        });
      }
    } catch (e) {
      console.warn('Logout request failed:', e);
    }
    auth.clearUser();
    try { window.dispatchEvent(new Event('pms_auth_updated')); } catch (e) {}
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-card border-r border-border shadow-lg transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0 lg:w-20"
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border flex items-center gap-3">
            <img src={logo} alt="PMS" className="w-12 h-12 rounded-lg shrink-0" />
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h2 className="font-bold text-sm gradient-text truncate">PMS Portal</h2>
                <p className="text-xs text-muted-foreground">Faculty</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <item.icon size={20} className="shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {isActive && <ChevronRight size={16} />}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={20} />
              {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:flex"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                5
              </span>
            </Button>
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <Avatar className="w-9 h-9">
                {getProfileImageSrc(user) ? (
                  <AvatarImage src={getProfileImageSrc(user) as string} alt={user?.name || 'Avatar'} />
                ) : (
                  <AvatarFallback>{userInitial(user)}</AvatarFallback>
                )}
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user?.name || 'Dr. Faculty Name'}</p>
                <p className="text-xs text-muted-foreground">{user?.department || 'CSE Department'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default FacultyDashboardLayout;