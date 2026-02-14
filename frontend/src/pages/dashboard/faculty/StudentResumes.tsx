import FacultyDashboardLayout from "@/components/FacultyDashboardLayout";
import { useEffect, useState } from "react";
import API_BASE from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import auth from "@/lib/auth";

const StudentResumes = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseFilter, setCourseFilter] = useState('all');
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [feedback, setFeedback] = useState("");
  const user = auth.getUser()?.user;

  const fetchList = async () => {
    setLoading(true);
    try {
  const res = await fetch(`${API_BASE}/api/faculty/students-resumes`);
      const text = await res.text();
      try {
        const data = JSON.parse(text || "null");
        if (res.ok) {
          // handle both { students: [...] } and [...]
          const list = Array.isArray(data) ? data : data?.students || [];
          setStudents(list || []);
          setDebugInfo(null);
        } else {
          setDebugInfo(`Server returned ${res.status}: ${text}`);
          setStudents([]);
        }
      } catch (parseErr) {
        // not JSON
        if (res.ok) {
          setDebugInfo(`Unexpected response (not JSON): ${text}`);
        } else {
          setDebugInfo(`Server returned ${res.status}: ${text}`);
        }
        setStudents([]);
      }
    } catch (e) {
      setDebugInfo(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handlePreview = (s: any) => {
    const url = `${API_BASE}/api/students/resume?email=${encodeURIComponent(s.email)}`;
    window.open(url, "_blank");
  };

  const handleGiveFeedback = async () => {
    if (!selected) return;
    try {
  const res = await fetch(`${API_BASE}/api/faculty/give-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail: selected.email, message: feedback, from: user?.name || user?.email || 'Faculty' }),
      });
      if (res.ok) {
        setFeedback("");
        setSelected(null);
        // refresh list in case backend changes
        fetchList();
        // notify student UI via local event (if their client open)
        window.dispatchEvent(new CustomEvent('pms_resume_feedback'));
        alert('Feedback sent');
      } else {
        const j = await res.json();
        alert(j.message || 'Failed to send feedback');
      }
    } catch (e) {
      alert('Failed to send feedback');
    }
  };

  return (
    <FacultyDashboardLayout title="Student Resumes">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>All Student Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="grid gap-3">
                <div className="flex gap-3 items-center">
                  <label className="text-sm text-muted-foreground">Filter by course:</label>
                  <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="h-10 px-3 rounded border bg-background">
                    <option value="all">All Courses</option>
                    {Array.from(new Set(students.map(s => (s.course || '').trim()).filter(Boolean))).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {debugInfo && (
                  <div className="p-3 bg-red-50 text-red-700 rounded">
                    <strong>Debug:</strong> {debugInfo}
                  </div>
                )}
                {students.filter(s => courseFilter === 'all' || (s.course || '').toLowerCase() === courseFilter.toLowerCase()).map((s) => (
                  <div key={s.email} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg">
                    <div>
                      <div className="font-medium">{s.name || s.email}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                      <div className="text-xs text-muted-foreground">{s.resumeFileName ? s.resumeFileName : 'No resume uploaded'}</div>
                      <div className="text-xs text-muted-foreground">
                        Course: {s.course ? <span className="font-medium cursor-pointer text-primary" onClick={() => setCourseFilter(s.course)}>{s.course}</span> : '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handlePreview(s)} disabled={!s.resumeFileName} variant="ghost">
                        Preview
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button onClick={() => setSelected(s)} disabled={!s.resumeFileName}>
                            Give Feedback
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Give feedback to {selected?.name || selected?.email}</DialogTitle>
                          </DialogHeader>
                          <div>
                            <textarea
                              className="w-full p-2 border rounded-md h-32 mt-2"
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Enter constructive feedback here"
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => { setSelected(null); setFeedback(''); }}>
                              Cancel
                            </Button>
                            <Button onClick={handleGiveFeedback} disabled={!feedback.trim()}>
                              Send Feedback
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
                {students.length === 0 && <div className="text-sm text-muted-foreground">No students found.</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FacultyDashboardLayout>
  );
};

export default StudentResumes;
