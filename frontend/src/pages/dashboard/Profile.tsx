import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, GraduationCap, Code, Save, IdCard } from "lucide-react";
import { useState, useEffect } from "react";
import auth from "@/lib/auth";
import API_BASE from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { isEmailStrict } from '@/lib/validation';

const Profile = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    studentId: "",
    branch: "",
    course: "",
    year: "",
    cgpa: "",
    skills: "",
    profileFileName: "",
    profileData: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const roleToPath = (r: string) => (r === "student" ? "students" : r === "faculty" ? "faculty" : r === "tpo" ? "tpo" : r === "admin" ? "admin" : "students");

  const getProfileImageSrc = (p: any) => {
    if (p?.profileData && p?.profileFileName) {
      const fn = p.profileFileName.toLowerCase();
      const mime = fn.endsWith('.png') ? 'image/png' : fn.endsWith('.jpg') || fn.endsWith('.jpeg') ? 'image/jpeg' : 'image/*';
      return `data:${mime};base64,${p.profileData}`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: 'No File Selected', description: 'Please choose an image to upload', variant: 'destructive' });
      return;
    }

    try {
      setUploading(true);
      const stored = auth.getUser();
      const role = stored?.role || 'student';
      const path = roleToPath(role);

      const form = new FormData();
      form.append('file', selectedFile, selectedFile.name);

  const res = await fetch(`${API_BASE}/api/${path}/upload-profile`, {
        method: 'POST',
        headers: { 'x-user-email': profile.email },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Upload failed');

      const updated = data.student || data.user || data[role] || data;
      if (updated) {
        setProfile((p) => ({ ...p, ...updated }));
        auth.saveUser(updated, role);
        // notify other parts of the app (dashboard, welcome text) that auth/user changed
        try { window.dispatchEvent(new Event('pms_auth_updated')); } catch (e) { /* ignore */ }
      }

      toast({ title: 'Upload Successful', description: data?.message || 'Profile photo uploaded' });
    } catch (err: any) {
      toast({ title: 'Upload Error', description: err?.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  useEffect(() => {
    const stored = auth.getUser();
    if (stored && stored.user) {
      setProfile((p) => ({ ...p, ...stored.user }));
    }
  }, []);

  const handleSave = async () => {
    try {
      // strict client-side email validation for the profile email field
      if (!isEmailStrict(profile.email)) {
        toast({ title: 'Invalid email', description: 'Enter a valid email (local part must include letters)', variant: 'destructive' });
        return;
      }
      // Client-side validation: phone must be exactly 10 digits if provided
      if (profile.phone && !/^\d{10}$/.test(String(profile.phone).trim())) {
        toast({ title: 'Invalid phone', description: 'Phone number must be exactly 10 digits', variant: 'destructive' });
        return;
      }

      // Client-side validation: cgpa must be a number between 0 and 10 if provided
      if (profile.cgpa !== undefined && profile.cgpa !== null && String(profile.cgpa).trim() !== '') {
        const cg = Number(profile.cgpa);
        if (Number.isNaN(cg) || cg < 0 || cg > 10) {
          toast({ title: 'Invalid CGPA', description: 'CGPA must be a number between 0 and 10', variant: 'destructive' });
          return;
        }
  // normalize to string for the frontend state (server will accept number)
  profile.cgpa = String(cg);
      }

      const stored = auth.getUser();
      const role = stored?.role || "student";
      const path = roleToPath(role);

      const url = `${API_BASE}/api/${path}/update`;
      console.debug('Profile save URL:', url);
      // Build a safe payload that excludes large base64 fields (profileData, resumeData)
      const safe = { ...profile } as any;
      delete safe.profileData;
      delete safe.profileFileName; // filename is managed by upload endpoint
      delete safe.resumeData;
      delete safe.resumeFileName;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, ...safe }),
      });

      // Defensive parsing: if server doesn't return JSON, capture the text for a helpful error
      let data: any = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        try {
          data = await res.json();
        } catch (e: any) {
          const text = await res.text();
          console.error('Failed to parse JSON response:', e, 'response text:', text);
          throw new Error('Invalid JSON response from server: ' + (text ? text.substring(0,200) : '<empty>'));
        }
      } else {
        const text = await res.text();
        console.error('Non-JSON response from server. Content-Type:', ct, 'Body:', text);
        throw new Error('Non-JSON response from server: ' + (text ? text.substring(0,200) : '<empty>'));
      }

      if (!res.ok) throw new Error(data?.message || "Update failed");

      // pick updated user from response
      const updated = data.student || data.user || data[role] || data;
      if (updated) {
        // update local profile and auth store
        setProfile((p) => ({ ...p, ...updated }));
        try { auth.saveUser(updated, role); } catch (e) { /* ignore save errors */ }
        try { window.dispatchEvent(new Event('pms_auth_updated')); } catch (e) { /* ignore */ }
      }

      toast({ title: "Profile Updated", description: data?.message || "Your profile has been saved successfully." });
    } catch (err: any) {
      toast({ title: "Save Error", description: err?.message || "Unable to save", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile header — combined with photo & controls */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-teal/10 p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-28 h-28 rounded-full overflow-hidden shadow-lg flex-shrink-0">
                {profile.profileData ? (
                  <img src={getProfileImageSrc(profile) as string} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center text-4xl font-bold">
                    {profile.name ? profile.name.charAt(0) : 'S'}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <p className="text-muted-foreground">{profile.branch}</p>
                <p className="text-sm text-muted-foreground">{profile.year} • CGPA: {profile.cgpa}</p>
              </div>

              <div className="flex flex-col items-start md:items-end gap-3">
                <label className="flex items-center gap-3">
                  <input id="profileFile" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <Button size="sm" onClick={() => document.getElementById('profileFile')?.click()} className="gap-2">
                    Choose file
                  </Button>
                  <span className="text-sm text-muted-foreground">{selectedFile?.name || profile.profileFileName || 'No file chosen'}</span>
                </label>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpload} disabled={uploading || !selectedFile} className="gap-2">
                    {uploading ? 'Uploading...' : (profile.profileData ? 'Change Photo' : 'Upload Photo')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    try {
                      if (!profile.profileData) return;
                      const stored = auth.getUser();
                      const role = stored?.role || 'student';
                      const path = roleToPath(role);
                      const res = await fetch(`${API_BASE}/api/${path}/update`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: profile.email, profileFileName: null, profileData: null }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data?.message || 'Remove failed');
                      const updated = data.student || data.user || data[role] || data;
                      if (updated) {
                        setProfile((p) => ({ ...p, ...updated }));
                        auth.saveUser(updated, role);
                        window.dispatchEvent(new Event('pms_auth_updated'));
                      }
                      toast({ title: 'Removed', description: 'Profile photo removed' });
                    } catch (err: any) {
                      toast({ title: 'Remove Error', description: err?.message || 'Unable to remove', variant: 'destructive' });
                    }
                  }}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User size={16} /> Full Name
                </Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail size={16} /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone size={16} /> Phone
                </Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId" className="flex items-center gap-2">
                  <IdCard size={16} /> Student ID
                </Label>
                <Input
                  id="studentId"
                  value={profile.studentId}
                  onChange={(e) => setProfile({ ...profile, studentId: e.target.value })}
                  placeholder="e.g., STU-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course" className="flex items-center gap-2">
                  <GraduationCap size={16} /> Course
                </Label>
                <select
                  id="course"
                  value={profile.course}
                  onChange={(e) => setProfile({ ...profile, course: e.target.value })}
                  className="w-full h-12 px-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Course</option>
                  <option value="BTECH">BTECH</option>
                  <option value="BA">BA</option>
                  <option value="BA Hons">BA Hons</option>
                  <option value="BSC">BSC</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year" className="flex items-center gap-2">
                  <GraduationCap size={16} /> Year
                </Label>
                <select
                  id="year"
                  value={profile.year}
                  onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                  className="w-full h-12 px-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Year</option>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                  <option value="4th">4th</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cgpa" className="flex items-center gap-2">
                  <GraduationCap size={16} /> CGPA
                </Label>
                <Input
                  id="cgpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={profile.cgpa}
                  onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch" className="flex items-center gap-2">
                  <User size={16} /> Branch
                </Label>
                <Input
                  id="branch"
                  value={profile.branch}
                  onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills" className="flex items-center gap-2">
                <Code size={16} /> Skills (comma separated)
              </Label>
              <Input
                id="skills"
                value={profile.skills}
                onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
              />
            </div>

            <Button onClick={handleSave} className="gap-2">
              <Save size={16} /> Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
