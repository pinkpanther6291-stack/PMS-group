import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import auth from '@/lib/auth';
import API_BASE from '@/lib/api';

const GenerateATSScore: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const stored = auth.getUser();
    const id = stored?.user?._id || stored?.user?.id;
    if (!id) {
      toast({ title: 'Not logged in', description: 'Unable to find student id', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
  const res = await fetch(`${API_BASE}/api/score-resume/${encodeURIComponent(id)}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed');
      toast({ title: 'ATS Score Generated', description: 'Scores saved to profile' });
    } catch (e: any) {
      toast({ title: 'Generate failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleGenerate} disabled={loading} variant="outline">
      {loading ? 'Generating...' : 'Generate ATS Score'}
    </Button>
  );
};

export default GenerateATSScore;
