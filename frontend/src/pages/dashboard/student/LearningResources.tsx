import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import API_BASE from '@/lib/api';
import { FileText, Download } from "lucide-react";

const StudentLearningResources = () => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    setLoading(true);
    try {
  const res = await fetch(`${API_BASE}/api/students/learning-resources`);
      const json = await res.json();
      setResources(json.resources || []);
    } catch (e) {
      console.error('Failed to fetch student resources', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Lessons">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Lessons / Learning Resources</CardTitle>
          </CardHeader>
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
                  <div className="flex items-center gap-2">
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
                  </div>
                </div>
              ))}
              {resources.length === 0 && !loading && (
                <div className="p-4 text-sm text-muted-foreground">No lessons available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentLearningResources;
