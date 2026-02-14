import AdminDashboardLayout from "@/components/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import API_BASE from "@/lib/api";

function SuggestionBox() {
  const [list, setList] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    try {
      const tryUrl = `${API_BASE}/api/feedback?role=admin`;
      let res = null;
      try {
        res = await fetch(tryUrl);
      } catch (e) {
        console.warn('Fetch to API_BASE failed, falling back to relative path', e);
      }
      if (!res) res = await fetch(`/api/feedback?role=admin`);
      const j = await res.json();
      setList(j.list || []);
    } catch (e) {
      console.warn('Failed to fetch suggestions', e);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const send = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const body = { fromRole: 'admin', toRole: 'tpo', fromEmail, message };
      const tryUrl = `${API_BASE}/api/feedback`;
      let res = null;
      try { res = await fetch(tryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
      catch (e) { console.warn('POST to API_BASE failed, falling back to relative path', e); }
      if (!res) res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const posted = await res.json();
      console.log('Posted feedback response', posted);
      setMessage('');
      fetchList();
    } catch (e) {
      console.warn('Send failed', e);
    }
    setLoading(false);
  };

  const reply = async (id: string, replyMsg: string) => {
    if (!replyMsg.trim()) return;
    try {
      await fetch(`${API_BASE}/api/feedback/${id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromRole: 'admin', fromEmail, message: replyMsg }) });
      fetchList();
    } catch (e) { console.warn(e); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input placeholder="Your email (optional)" value={fromEmail} onChange={(e:any)=>setFromEmail(e.target.value)} />
        <div className="md:col-span-2" />
      </div>
      <Textarea placeholder="Write a suggestion or feedback to TPO" value={message} onChange={(e:any)=>setMessage(e.target.value)} />
      <div className="flex gap-2">
        <Button onClick={send} disabled={loading}>{loading ? 'Sending...' : 'Send to TPO'}</Button>
        <Button variant="ghost" onClick={()=>{ setMessage(''); }}>Clear</Button>
      </div>

      <div className="space-y-2 mt-4">
        {list.map(item => (
          <div key={item._id} className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">From: {item.fromRole} {item.fromEmail ? `(${item.fromEmail})` : ''}</p>
                <p className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-2">
              <p>{item.message}</p>
            </div>
            <div className="mt-3 space-y-2">
              {(item.replies || []).map((r:any, idx:number) => (
                <div key={idx} className="p-2 bg-white/20 rounded">
                  <p className="text-sm font-medium">{r.fromRole} {r.fromEmail ? `(${r.fromEmail})` : ''}</p>
                  <p className="text-sm">{r.message}</p>
                </div>
              ))}
              <ReplyInput onReply={(txt)=>reply(item._id, txt)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReplyInput({ onReply }: { onReply: (txt: string)=>void }){
  const [t, setT] = useState('');
  return (
    <div className="flex gap-2 mt-2">
      <Input placeholder="Reply..." value={t} onChange={(e:any)=>setT(e.target.value)} />
      <Button onClick={()=>{ onReply(t); setT(''); }}>Reply</Button>
    </div>
  );
}

const AdminCommunications = () => {
  return (
    <AdminDashboardLayout title="Communications">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Communications (Admin & TPO)</CardTitle>
          </CardHeader>
          <CardContent>
            <SuggestionBox />
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminCommunications;
