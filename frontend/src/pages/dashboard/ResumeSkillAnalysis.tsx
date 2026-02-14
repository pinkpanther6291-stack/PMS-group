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
  Tag,
  AlertTriangle,
  ChevronRight,
  Award,
  Zap,
  BarChart3,
  Shield,
} from "lucide-react";
import API_BASE from '@/lib/api';
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import auth from "@/lib/auth";



function SkillCard({ icon: Icon, title, skills, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-100 hover:bg-cyan-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100",
    pink: "bg-pink-50 text-pink-600 border-pink-100 hover:bg-pink-100",
  };

  if (!skills || skills.length === 0) return null;

  return (
    <Card className="border-none shadow-sm bg-slate-50/30 rounded-3xl overflow-hidden p-6 hover:shadow-md hover:bg-white transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl ${(colorMap[color] || colorMap.blue).split(' ')[0]} ${(colorMap[color] || colorMap.blue).split(' ')[1]}`}>
          <Icon size={20} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{skills.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill: string, idx: number) => (
          <span
            key={idx}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all cursor-default ${colorMap[color] || colorMap.blue}`}
          >
            {formatSkill(skill)}
          </span>
        ))}
      </div>
    </Card>
  );
}

function formatSkill(word: string) {
  if (!word) return "";
  return word
    .split(" ")
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Score circle component
function ScoreCircle({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 85) return { stroke: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Excellent' };
    if (s >= 70) return { stroke: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-600', label: 'Strong' };
    if (s >= 55) return { stroke: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600', label: 'Good' };
    if (s >= 40) return { stroke: '#f97316', bg: 'bg-orange-50', text: 'text-orange-600', label: 'Needs Work' };
    return { stroke: '#ef4444', bg: 'bg-red-50', text: 'text-red-600', label: 'Critical' };
  };

  const colors = getScoreColor(score);
  const circumference = 2 * Math.PI * 70;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="80" cy="80" r="70" fill="none"
            stroke={colors.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-black ${colors.text}`}>{score}</span>
          <span className="text-sm font-semibold text-slate-400">ATS Score</span>
        </div>
      </div>
    </div>
  );
}

interface AnalysisResult {
  success: boolean;
  ats_score: number;
  skills_found: Record<string, string[]>;
  total_skills_found: number;
  sections_detected: Record<string, boolean>;
  skill_gaps: any;
  enhanced_strengths: any;
  resume_weaknesses: any[];
  ats_optimization_advice: string[];
  suggested_roles: any[];
  experience: any[];
  projects: any[];
  word_count: number;
  metadata: any;
}

const categoryColorMap: Record<string, string> = {
  Programming: "blue",
  Web: "amber",
  Data_ML: "emerald",
  Tools: "purple",
  Databases: "rose",
  Cloud: "cyan",
  Mobile: "orange",
  DevOps: "indigo",
  Testing: "teal",
  Soft_Skills: "pink",
  Security: "amber",
};

const categoryIconMap: Record<string, any> = {
  Programming: Code,
  Web: Layout,
  Data_ML: BarChart3,
  Tools: Terminal,
  Databases: Shield,
  Cloud: Zap,
  Mobile: Lightbulb,
  DevOps: RefreshCw,
  Testing: CheckCircle,
  Soft_Skills: GraduationCap,
  Security: Shield,
};

const ResumeSkillAnalysis = () => {
  const { toast } = useToast();

  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analyze resume
  const handleAnalyze = async () => {
    const stored = auth.getUser();
    const email = stored?.user?.email;
    if (!email) {
      toast({ title: 'Error', description: 'No user email found. Please log in.', variant: 'destructive' });
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/analyze-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Email': email,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Analysis failed');
      }

      if (!data.success) {
        throw new Error(data?.message || data?.error || 'Analysis returned unsuccessful');
      }

      setAnalysisResult(data);
      toast({
        title: "Analysis Complete!",
        description: `Your ATS Score is ${data.ats_score}/100`,
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      toast({
        title: "Analysis Failed",
        description: err?.message || "Failed to analyze resume",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF or DOCX file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setAnalysisResult(null); // Clear old results on new upload
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

      const fileName = data?.resumeFileName || file.name;
      setUploadedFile({ name: fileName, size: file.size });

      try { window.dispatchEvent(new Event('pms_resume_updated')); } catch (e) { }

      toast({
        title: "Resume Uploaded",
        description: "Your resume has been saved successfully. Click 'Generate ATS Score' to analyze.",
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
      setAnalysisResult(null);
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

  const fetchExistingResume = async () => {
    const stored = auth.getUser();
    const email = stored?.user?.email;
    if (!email) return;

    try {
      const res = await fetch(`${API_BASE}/api/students/resume?email=${encodeURIComponent(email)}`, {
        method: 'GET',
      });
      if (!res.ok) return;
      const filename = res.headers.get('x-resume-filename') || 'Resume';
      const length = res.headers.get('content-length');
      setUploadedFile({ name: filename, size: length ? parseInt(length, 10) : 0 });
    } catch (err: any) {
      // silently fail
    }
  };

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

  // Get non-empty skill categories
  const skillCategories = analysisResult
    ? Object.entries(analysisResult.skills_found).filter(([, skills]) => skills.length > 0)
    : [];

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

            {/* Generate ATS Score Bar */}
            {uploadedFile && (
              <div className="flex items-center justify-between mt-6 bg-emerald-50/60 border border-emerald-100 rounded-2xl px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Resume uploaded successfully. Your resume has been saved to your profile.
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyze();
                    }}
                    disabled={analyzing}
                    className="rounded-full px-6 py-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
                    size="sm"
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate ATS Score
                      </>
                    )}
                  </Button>
                  {analysisResult && (
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyze();
                      }}
                      disabled={analyzing}
                      className="rounded-full px-6 py-2 text-sm font-bold border-emerald-500 text-emerald-600 hover:bg-emerald-50 transition-all duration-200"
                      size="sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Results
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysisResult && (
          <>
            <Tabs defaultValue="ats-score" className="w-full">
              <TabsList className="w-full flex flex-wrap gap-1 bg-slate-100/80 p-1.5 rounded-2xl h-auto">
                <TabsTrigger value="ats-score" className="rounded-xl text-sm font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <BarChart3 className="w-4 h-4 mr-1.5" /> ATS Score
                </TabsTrigger>
                <TabsTrigger value="skills" className="rounded-xl text-sm font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Code className="w-4 h-4 mr-1.5" /> Skills
                </TabsTrigger>
                <TabsTrigger value="gaps" className="rounded-xl text-sm font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Target className="w-4 h-4 mr-1.5" /> Skill Gaps
                </TabsTrigger>
                <TabsTrigger value="experience" className="rounded-xl text-sm font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Briefcase className="w-4 h-4 mr-1.5" /> Experience
                </TabsTrigger>
                <TabsTrigger value="projects" className="rounded-xl text-sm font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Lightbulb className="w-4 h-4 mr-1.5" /> Projects
                </TabsTrigger>
                <TabsTrigger value="roles" className="rounded-xl text-sm font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Award className="w-4 h-4 mr-1.5" /> Suggested Roles
                </TabsTrigger>
                <TabsTrigger value="strengths" className="rounded-xl text-sm font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <TrendingUp className="w-4 h-4 mr-1.5" /> Strengths & Advice
                </TabsTrigger>
              </TabsList>

              {/* ATS Score Tab */}
              <TabsContent value="ats-score" className="mt-6">
                <Card className="border-none shadow-sm bg-emerald-50/40 rounded-2xl overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-10">
                      {/* Score Circle */}
                      <div className="flex-shrink-0">
                        <ScoreCircle score={analysisResult.ats_score} />
                      </div>

                      {/* Score Info */}
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Resume ATS Analysis</h2>
                        <div className="mt-2 text-left">
                          <span className={`px-4 py-1.5 rounded-full text-base font-semibold tracking-wide border-0 shadow-sm ${analysisResult.ats_score >= 85 ? 'bg-emerald-100 text-emerald-600' :
                              analysisResult.ats_score >= 70 ? 'bg-blue-100 text-blue-600' :
                                analysisResult.ats_score >= 55 ? 'bg-amber-100 text-amber-600' :
                                  analysisResult.ats_score >= 40 ? 'bg-orange-100 text-orange-600' :
                                    'bg-red-100 text-red-600'
                            }`}>
                            {analysisResult.ats_score >= 85 ? 'Excellent' :
                              analysisResult.ats_score >= 70 ? 'Strong' :
                                analysisResult.ats_score >= 55 ? 'Good' :
                                  analysisResult.ats_score >= 40 ? 'Needs Work' : 'Critical'}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-5 font-medium text-lg">
                          Analyzed resume: Score {analysisResult.ats_score}/100.
                        </p>

                        {/* Quick Stats Row */}
                        <div className="flex flex-wrap gap-4 mt-6">
                          <div className="bg-white rounded-xl px-5 py-3 text-center shadow-sm border border-slate-100">
                            <p className="text-2xl font-black text-blue-600">{analysisResult.total_skills_found}</p>
                            <p className="text-xs font-semibold text-blue-500 mt-0.5">Skills Found</p>
                          </div>
                          <div className="bg-white rounded-xl px-5 py-3 text-center shadow-sm border border-slate-100">
                            <p className="text-2xl font-black text-emerald-600">
                              {Object.values(analysisResult.sections_detected).filter(Boolean).length}
                            </p>
                            <p className="text-xs font-semibold text-emerald-500 mt-0.5">Sections</p>
                          </div>
                          <div className="bg-white rounded-xl px-5 py-3 text-center shadow-sm border border-slate-100">
                            <p className="text-2xl font-black text-amber-600">{analysisResult.word_count}</p>
                            <p className="text-xs font-semibold text-amber-500 mt-0.5">Words</p>
                          </div>
                          <div className="bg-white rounded-xl px-5 py-3 text-center shadow-sm border border-slate-100">
                            <p className="text-2xl font-black text-purple-600">
                              {analysisResult.suggested_roles?.length || 0}
                            </p>
                            <p className="text-xs font-semibold text-purple-500 mt-0.5">Roles</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skillCategories.map(([category, skills]) => (
                    <SkillCard
                      key={category}
                      icon={categoryIconMap[category] || Tag}
                      title={category.replace('_', ' / ')}
                      skills={skills}
                      color={categoryColorMap[category] || 'blue'}
                    />
                  ))}
                </div>
                {skillCategories.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Tag className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-semibold">No skills detected</p>
                    <p className="text-sm mt-1">Make sure your resume includes relevant technical skills</p>
                  </div>
                )}
              </TabsContent>

              {/* Skill Gaps Tab */}
              <TabsContent value="gaps" className="mt-6 space-y-4">
                {analysisResult.skill_gaps && (
                  <>
                    {/* Gap Summary */}
                    <Card className="border-none shadow-sm bg-white rounded-2xl">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`p-2 rounded-xl ${analysisResult.skill_gaps.impact_level === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                            analysisResult.skill_gaps.impact_level === 'MODERATE' ? 'bg-amber-100 text-amber-600' :
                              'bg-emerald-100 text-emerald-600'
                            }`}>
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">
                              Impact Level: {analysisResult.skill_gaps.impact_level || 'N/A'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">{analysisResult.skill_gaps.summary}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
                          {analysisResult.skill_gaps.overall_impact}
                        </p>
                      </CardContent>
                    </Card>

                    {/* High Priority Gaps */}
                    {analysisResult.skill_gaps.high_priority_gaps?.length > 0 && (
                      <Card className="border-none shadow-sm bg-white rounded-2xl">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-bold text-red-600 flex items-center gap-2">
                            <Target className="w-4 h-4" /> High Priority Missing Skills
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.skill_gaps.high_priority_gaps.map((skill: string, idx: number) => (
                              <span key={idx} className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-100">
                                {formatSkill(skill)}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Medium Priority Gaps */}
                    {analysisResult.skill_gaps.medium_priority_gaps?.length > 0 && (
                      <Card className="border-none shadow-sm bg-white rounded-2xl">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-bold text-amber-600 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Medium Priority Missing Skills
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.skill_gaps.medium_priority_gaps.map((skill: string, idx: number) => (
                              <span key={idx} className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-600 border border-amber-100">
                                {formatSkill(skill)}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendation */}
                    {analysisResult.skill_gaps.recommendation && (
                      <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl">
                        <CardContent className="p-6">
                          <h3 className="font-bold text-indigo-700 mb-3 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5" /> Recommendations
                          </h3>
                          <pre className="text-sm text-indigo-900 whitespace-pre-wrap font-sans leading-relaxed">
                            {analysisResult.skill_gaps.recommendation}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Experience Tab */}
              <TabsContent value="experience" className="mt-6 space-y-4">
                {analysisResult.experience && analysisResult.experience.length > 0 ? (
                  analysisResult.experience.map((exp: any, idx: number) => (
                    <Card key={idx} className="border-none shadow-sm bg-white rounded-2xl">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-blue-100 text-blue-600 mt-0.5">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-800">{exp.title}</h3>
                            {exp.details && exp.details.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {exp.details.map((detail: string, i: number) => (
                                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                    <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-semibold">No experience entries detected</p>
                    <p className="text-sm mt-1">Add a clearly labeled "Experience" section to your resume</p>
                  </div>
                )}
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="mt-6 space-y-4">
                {analysisResult.projects && analysisResult.projects.length > 0 ? (
                  analysisResult.projects.map((proj: any, idx: number) => (
                    <Card key={idx} className="border-none shadow-sm bg-white rounded-2xl">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 mt-0.5">
                            <Lightbulb className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-800">{proj.name}</h3>
                            {proj.details && proj.details.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {proj.details.map((detail: string, i: number) => (
                                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                    <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-semibold">No project entries detected</p>
                    <p className="text-sm mt-1">Add a clearly labeled "Projects" section to your resume</p>
                  </div>
                )}
              </TabsContent>

              {/* Suggested Roles Tab */}
              <TabsContent value="roles" className="mt-6 space-y-4">
                {analysisResult.suggested_roles && analysisResult.suggested_roles.length > 0 ? (
                  analysisResult.suggested_roles.map((role: any, idx: number) => (
                    <Card key={idx} className="border-none shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${role.match_percentage >= 70 ? 'bg-emerald-100 text-emerald-600' :
                            role.match_percentage >= 50 ? 'bg-blue-100 text-blue-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                            <Award className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h3 className="text-lg font-bold text-slate-800">{role.role}</h3>
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${role.match_percentage >= 70 ? 'bg-emerald-50 text-emerald-600' :
                                role.match_percentage >= 50 ? 'bg-blue-50 text-blue-600' :
                                  'bg-amber-50 text-amber-600'
                                }`}>
                                {role.match_percentage}% Match
                              </span>
                            </div>

                            {/* Matched Skills */}
                            {role.matched_skills?.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-emerald-600 mb-1.5">✓ Skills You Have</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {role.matched_skills.map((s: string, i: number) => (
                                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                      {formatSkill(s)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Missing Skills */}
                            {role.missing_skills?.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-red-500 mb-1.5">✗ Skills to Learn</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {role.missing_skills.map((s: string, i: number) => (
                                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                                      {formatSkill(s)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-semibold">No role suggestions available</p>
                    <p className="text-sm mt-1">Add more skills to your resume to get role suggestions</p>
                  </div>
                )}
              </TabsContent>

              {/* Strengths & Advice Tab */}
              <TabsContent value="strengths" className="mt-6 space-y-4">
                {/* Strengths */}
                {analysisResult.enhanced_strengths?.individual_tips?.length > 0 && (
                  <Card className="border-none shadow-sm bg-white rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold text-emerald-700 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Your Strengths ({analysisResult.enhanced_strengths.strength_count})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysisResult.enhanced_strengths.individual_tips.map((tip: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 bg-emerald-50/50 p-3 rounded-xl">
                            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Weaknesses */}
                {analysisResult.resume_weaknesses?.length > 0 && (
                  <Card className="border-none shadow-sm bg-white rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Areas for Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {analysisResult.resume_weaknesses.map((w: any, idx: number) => (
                          <li key={idx} className="bg-red-50/40 p-4 rounded-xl border border-red-100/50">
                            <p className="font-bold text-red-700 text-sm">{w.weakness}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              <span className="font-semibold text-slate-700">Impact:</span> {w.impact}
                            </p>
                            <p className="text-sm text-emerald-700 mt-1">
                              <span className="font-semibold">Fix:</span> {w.fix}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Sections Detected */}
                <Card className="border-none shadow-sm bg-white rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                      <FileText className="w-5 h-5" /> Sections Detected
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {Object.entries(analysisResult.sections_detected).map(([section, found]) => (
                        <div
                          key={section}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${found
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-red-50 text-red-500 border border-red-100'
                            }`}
                        >
                          {found ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          {section.charAt(0).toUpperCase() + section.slice(1)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};



export default ResumeSkillAnalysis;
