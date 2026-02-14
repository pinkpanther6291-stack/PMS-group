import FacultyDashboardLayout from "@/components/FacultyDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import API_BASE from '@/lib/api';
import {
  Upload,
  FileText,
  Link as LinkIcon,
  Download,
  Trash2,
  Plus,
} from "lucide-react";

const LearningResources = () => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    setLoading(true);
    try {
  const res = await fetch(`${API_BASE}/api/faculty/learning-resources`);
      const json = await res.json();
      setResources(json.resources || []);
    } catch (e) {
      console.error('Failed to fetch resources', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FacultyDashboardLayout title="Learning Resources">
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <Input placeholder="Search resources..." className="md:max-w-sm" />
            <div className="flex gap-2">
              <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <LinkIcon size={16} />
                    Add Link
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Learning Link</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-2">
                    <Label>Title</Label>
                    <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="E.g. Interview Preparation - Video" />
                    <Label>URL</Label>
                    <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://youtube.com/..." />
                    <Label>Preview</Label>
                    <div className="border p-2 rounded">
                      {linkUrl && linkUrl.includes('youtube') ? (
                        <iframe title="preview" src={linkUrl.replace('watch?v=', 'embed/')} className="w-full h-48" />
                      ) : linkUrl ? (
                        <a href={linkUrl} target="_blank" rel="noreferrer" className="text-primary">Open link</a>
                      ) : (
                        <p className="text-sm text-muted-foreground">Enter a URL to preview here</p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={async () => {
                        const title = linkTitle;
                        const url = linkUrl;
                        if (!title || !url) return alert('Title and URL required');
                        try {
                          const r = await fetch(`${API_BASE}/api/faculty/learning-resources`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title, url, uploadedBy: 'Faculty' }),
                          });
                          const text = await r.text();
                          if (!r.ok) throw new Error(text || 'Upload failed');
                          setAddLinkOpen(false);
                          setLinkTitle('');
                          setLinkUrl('');
                          fetchResources();
                        } catch (e: any) {
                          alert('Failed to add link: ' + (e.message || e));
                        }
                      }}
                    >
                      Upload Link
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Upload size={16} />
                    Upload Resource
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-2">
                      <Label>Title</Label>
                      <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="E.g. Technical Skills Handbook" />
                      <Label>File (PDF or DOCX)</Label>
                      <input id="doc-file" type="file" accept=".pdf,.docx" onChange={(e) => {
                        const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                        setUploadFile(f);
                        if (f && f.type === 'application/pdf') {
                          const url = URL.createObjectURL(f);
                          setUploadPreviewUrl(url);
                        } else {
                          setUploadPreviewUrl(null);
                        }
                      }} />
                      <Label>Preview</Label>
                      <div id="doc-preview" className="border p-2 rounded text-sm text-muted-foreground">
                        {uploadPreviewUrl ? (
                          <iframe title="doc-preview" src={uploadPreviewUrl} className="w-full h-48" />
                        ) : uploadFile ? (
                          <div>{uploadFile.name} ({Math.round((uploadFile.size/1024))} KB)</div>
                        ) : (
                          <div>No file selected</div>
                        )}
                      </div>
                    </div>
                  <DialogFooter>
                    <Button
                      onClick={async () => {
                        if (!uploadFile) return alert('Please select a file');
                        const form = new FormData();
                        form.append('title', uploadTitle || uploadFile.name);
                        form.append('uploadedBy', 'Faculty');
                        form.append('file', uploadFile);
                        try {
                          const r = await fetch(`${API_BASE}/api/faculty/learning-resources`, { method: 'POST', body: form });
                          const text = await r.text();
                          if (!r.ok) throw new Error(text || 'Upload failed');
                          setUploadOpen(false);
                          setUploadTitle('');
                          setUploadFile(null);
                          if (uploadPreviewUrl) { URL.revokeObjectURL(uploadPreviewUrl); setUploadPreviewUrl(null); }
                          fetchResources();
                        } catch (e: any) {
                          alert('Failed to upload document: ' + (e.message || e));
                        }
                      }}
                    >
                      Upload Resource
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
        </div>

        {/* Documents List */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {resources.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="text-primary" size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{doc.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {doc.type === 'link' ? 'Link' : (doc.fileName || 'Document')} • Uploaded by {doc.uploadedBy}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{doc.views || 0}</p>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (doc.type === 'link') window.open(doc.url, '_blank');
                          else window.open(`/api/learning-resources/${doc._id}/file`, '_blank');
                        }}
                      >
                        <Download size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add New Document Card */}
        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setUploadOpen(true)}>
          <CardContent className="p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Plus size={24} />
            <span className="text-sm font-medium">Add New Document</span>
          </CardContent>
        </Card>
      </div>
    </FacultyDashboardLayout>
  );
};

export default LearningResources;
