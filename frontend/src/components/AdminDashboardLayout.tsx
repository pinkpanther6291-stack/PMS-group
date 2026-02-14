import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import auth from "@/lib/auth";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: User, label: "My Profile", path: "/admin/profile" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Shield, label: "Roles", path: "/admin/roles" },
  { icon: FileText, label: "Communications", path: "/admin/communications" },
  { icon: FileText, label: "Logs", path: "/admin/logs" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminDashboardLayout = ({ children, title }: AdminDashboardLayoutProps) => {
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
    if (!u) return 'A';
    if (u.name && u.name.length) return u.name.charAt(0).toUpperCase();
    if (u.email && u.email.length) return u.email.charAt(0).toUpperCase();
    return 'A';
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0 -translate-x-full md:w-16 md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-destructive rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-destructive-foreground" />
              </div>
              <span className="font-bold text-foreground">Admin Panel</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:flex hidden"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-destructive/10 text-destructive"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-destructive",
              !sidebarOpen && "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        )}
      >
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                5
              </span>
            </Button>
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar className="w-8 h-8">
                {getProfileImageSrc(user) ? (
                  <AvatarImage src={getProfileImageSrc(user) as string} alt={user?.name || 'Avatar'} />
                ) : (
                  <AvatarFallback>{userInitial(user)}</AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden sm:block">{user?.name || 'Admin'}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminDashboardLayout;