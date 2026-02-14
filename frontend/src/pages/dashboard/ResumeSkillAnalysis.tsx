import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  Sparkles,
  RefreshCw,
  Code,
  Lightbulb,
  Terminal,
  Layout,
  Briefcase,
  Target,
  GraduationCap,
  TrendingUp,
  Tag
} from "lucide-react";
import API_BASE from '@/lib/api';
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import auth from "@/lib/auth";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';



function SkillCard({ icon: Icon, title, skills, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100",
  };

  return (
    <Card className="border-none shadow-sm bg-slate-50/30 rounded-3xl overflow-hidden p-8 hover:shadow-md hover:bg-white transition-all duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className={`p-3 rounded-2xl ${colorMap[color].split(' ')[0]} ${colorMap[color].split(' ')[1]}`}>
          <Icon size={24} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {skills.map((skill: string, idx: number) => (
          <span
            key={idx}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-default ${colorMap[color]}`}
          >
            {skill}
          </span>
        ))}
      </div>
    </Card>
  );
}

const ResumeSkillAnalysis = () => {
  const { toast } = useToast();

  function formatSkill(word: string) {
    if (!word) return "";
    return word
      .split(" ")
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [loading, setLoading] = useState(false);
  // ATS removed: no ATS state kept

  // ATS scoring permanently removed; no handler.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF or DOCX file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const stored = auth.getUser();
      const email = stored?.user?.email;

      const res = await fetch(`${API_BASE}/api/students/upload-resume`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Student-Email': email,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Upload failed');

      // Use filename from response if provided
      const fileName = data?.resumeFileName || file.name;
      setUploadedFile({ name: fileName, size: file.size });

      // notify other parts of app
      try { window.dispatchEvent(new Event('pms_resume_updated')); } catch (e) { }

      toast({
        title: "Resume Uploaded",
        description: "Your resume has been saved successfully",
      });
    } catch (err: any) {
      toast({
        title: "Upload Error",
        description: err?.message || "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove resume from server for current user
  const removeResume = async () => {
    const stored = auth.getUser();
    const email = stored?.user?.email;
    if (!email) {
      toast({ title: 'Error', description: 'No user email found', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/students/resume?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || 'Remove failed');
      }
  setUploadedFile(null);
      try { window.dispatchEvent(new Event('pms_resume_updated')); } catch (e) { }
      toast({ title: 'Removed', description: 'Resume removed' });
    } catch (err: any) {
      toast({ title: 'Remove Error', description: err?.message || 'Unable to remove', variant: 'destructive' });
    }
  };

  const handleDragDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Check if a resume already exists for the logged in user
  const fetchExistingResume = async () => {
    const stored = auth.getUser();
    const email = stored?.user?.email;
    const id = stored?.user?._id || stored?.user?.id;
    if (!email) return;

    try {
      const res = await fetch(`${API_BASE}/api/students/resume?email=${encodeURIComponent(email)}`, {
        method: 'GET',
      });
      if (!res.ok) return; // no resume
      const filename = res.headers.get('x-resume-filename') || 'Resume';
      const length = res.headers.get('content-length');
  setUploadedFile({ name: filename, size: length ? parseInt(length, 10) : 0 });
  // Response is a PDF stream; we already set `uploadedFile` above from headers.
  // Do not attempt to parse the body as JSON.
    } catch (err: any) {
      toast({ title: 'Remove Error', description: err?.message || 'Unable to remove', variant: 'destructive' });
    }
  };

  // attempt to fetch existing resume on mount
  useEffect(() => {
    fetchExistingResume();
    const onUpdate = () => fetchExistingResume();
    window.addEventListener('storage', onUpdate);
    window.addEventListener('pms_resume_updated', onUpdate);
    return () => {
      window.removeEventListener('storage', onUpdate);
      window.removeEventListener('pms_resume_updated', onUpdate);
    };
  }, []);

  return (
    <DashboardLayout title="Resume & Skill Analysis">
      <div className="space-y-6 max-w-7xl mx-auto px-4 pb-20">
        {/* Upload Section */}
        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <Upload className="text-primary w-5 h-5" />
              Upload Your Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${uploadedFile ? "border-primary bg-primary/[0.02] shadow-inner" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDragDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleInputChange}
                className="hidden"
              />
              {uploadedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-800 tracking-tight">{uploadedFile.name}</p>
                    <p className="text-sm text-slate-500 font-medium">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        const stored = auth.getUser();
                        const email = stored?.user?.email;
                        if (!email) return;
                        window.open(`${API_BASE}/api/students/resume?email=${encodeURIComponent(email)}`, '_blank');
                      }}
                      className="rounded-full px-5 border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      Preview
                    </Button>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="rounded-full px-5"
                    >
                      Change
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await removeResume();
                      }}
                      className="rounded-full px-4 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-700">Drag & drop your resume here</p>
                    <p className="text-sm text-slate-500 mt-1">or click to browse your files (PDF, DOCX)</p>
                  </div>
                  <Button variant="outline" disabled={loading} className="mt-4 rounded-full px-8 border-slate-200">
                    {loading ? "Uploading..." : "Select File"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
  {/* ATS UI is disabled via ATS_ENABLED flag; no analysis tabs rendered */}
      </div>
    </DashboardLayout >
  );
};



export default ResumeSkillAnalysis;
