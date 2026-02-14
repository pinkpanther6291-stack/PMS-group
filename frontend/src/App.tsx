import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import Profile from "./pages/dashboard/Profile";
import ResumeSkillAnalysis from "./pages/dashboard/ResumeSkillAnalysis";
import PlacementCareer from "./pages/dashboard/PlacementCareer";
import Notifications from "./pages/dashboard/Notifications";
import StudentLearningResources from "./pages/dashboard/student/LearningResources";
import FacultyDashboard from "./pages/dashboard/faculty/FacultyDashboard";
import FacultyProfile from "./pages/dashboard/faculty/FacultyProfile";
import StudentProgress from "./pages/dashboard/faculty/StudentProgress";
import SkillAnalytics from "./pages/dashboard/faculty/SkillAnalytics";
import LearningResources from "./pages/dashboard/faculty/LearningResources";
import FacultyReports from "./pages/dashboard/faculty/FacultyReports";
import StudentResumes from "./pages/dashboard/faculty/StudentResumes";
import TPODashboard from "./pages/dashboard/tpo/TPODashboard";
import TPOProfile from "./pages/dashboard/tpo/TPOProfile";
import DriveScheduling from "./pages/dashboard/tpo/DriveScheduling";
import PlacementAnalytics from "./pages/dashboard/tpo/PlacementAnalytics";
import TPOReports from "./pages/dashboard/tpo/TPOReports";
import TPOCommunications from "./pages/dashboard/tpo/TPOCommunications";
import AdminDashboard from "./pages/dashboard/admin/AdminDashboard";
import AdminProfile from "./pages/dashboard/admin/AdminProfile";
import AdminCommunications from "./pages/dashboard/admin/AdminCommunications";
import UserManagement from "./pages/dashboard/admin/UserManagement";
import RolesManagement from "./pages/dashboard/admin/RolesManagement";
import SystemLogs from "./pages/dashboard/admin/SystemLogs";
import AdminSettings from "./pages/dashboard/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login/:role" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Student Dashboard Routes */}
          <Route path="/dashboard/student" element={<StudentDashboard />} />
          <Route path="/dashboard/student/profile" element={<Profile />} />
          <Route path="/dashboard/student/resume-skills" element={<ResumeSkillAnalysis />} />
          <Route path="/dashboard/student/placement-career" element={<PlacementCareer />} />
          <Route path="/dashboard/student/notifications" element={<Notifications />} />
          <Route path="/dashboard/student/learning-resources" element={<StudentLearningResources />} />
          
          {/* Faculty Dashboard Routes */}
          <Route path="/dashboard/faculty" element={<FacultyDashboard />} />
          <Route path="/dashboard/faculty/profile" element={<FacultyProfile />} />
          <Route path="/dashboard/faculty/student-progress" element={<StudentProgress />} />
          <Route path="/dashboard/faculty/resumes" element={<StudentResumes />} />
          <Route path="/dashboard/faculty/skill-analytics" element={<SkillAnalytics />} />
          <Route path="/dashboard/faculty/learning-resources" element={<LearningResources />} />
          <Route path="/dashboard/faculty/reports" element={<FacultyReports />} />
          
          {/* TPO Dashboard Routes */}
          <Route path="/dashboard/tpo" element={<TPODashboard />} />
          <Route path="/dashboard/tpo/profile" element={<TPOProfile />} />
          <Route path="/dashboard/tpo/drives" element={<DriveScheduling />} />
          <Route path="/dashboard/tpo/analytics" element={<PlacementAnalytics />} />
          <Route path="/dashboard/tpo/communications" element={<TPOCommunications />} />
          <Route path="/dashboard/tpo/reports" element={<TPOReports />} />
          
          {/* Admin Dashboard Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/communications" element={<AdminCommunications />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/roles" element={<RolesManagement />} />
          <Route path="/admin/logs" element={<SystemLogs />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
