import AdminDashboardLayout from "@/components/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Shield, Building2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import API_BASE from '@/lib/api';
import auth from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const AdminProfile = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>({
    name: "",
    email: "",
    phone: "",
    role: "",
    employeeId: "",
    accessLevel: "Full",
    profileFileName: "",
    profileData: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const roleToPath = (r: string) =>
    r === "student" ? "students" : r === "faculty" ? "faculty" : r === "tpo" ? "tpo" : r === "admin" ? "admin" : "students";

  const getProfileImageSrc = (p: any) => {
    if (p?.profileData && p?.profileFileName) {
      const fn = p.profileFileName.toLowerCase();
      const mime = fn.endsWith(".png")
        ? "image/png"
        : fn.endsWith(".jpg") || fn.endsWith(".jpeg")
        ? "image/jpeg"
        : "image/*";
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
      toast({ title: "No File Selected", description: "Please choose an image to upload", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      const stored = auth.getUser();
      const role = stored?.role || "admin";
      const path = roleToPath(role);

      const form = new FormData();
      form.append("file", selectedFile, selectedFile.name);

  const res = await fetch(`${API_BASE}/api/${path}/upload-profile`, {
        method: "POST",
        headers: { "x-user-email": profile.email },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");

      const updated = data.admin || data.user || data[role] || data;
      if (updated) {
        setProfile((p: any) => ({ ...p, ...updated }));
        auth.saveUser(updated, role);
        try { window.dispatchEvent(new Event("pms_auth_updated")); } catch(e){}
      }

      toast({ title: "Upload Successful", description: data?.message || "Profile photo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload Error", description: err?.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleRemove = async () => {
    try {
      if (!profile.profileData) return;
      const stored = auth.getUser();
      const role = stored?.role || "admin";
      const path = roleToPath(role);

  const res = await fetch(`${API_BASE}/api/${path}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, profileFileName: null, profileData: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Remove failed");
      const updated = data.admin || data.user || data[role] || data;
      if (updated) {
        setProfile((p: any) => ({ ...p, ...updated }));
        auth.saveUser(updated, role);
        try { window.dispatchEvent(new Event("pms_auth_updated")); } catch(e){}
      }
      toast({ title: "Removed", description: "Profile photo removed" });
    } catch (err: any) {
      toast({ title: "Remove Error", description: err?.message || "Unable to remove", variant: "destructive" });
    }
  };

  useEffect(() => {
    const stored = auth.getUser();
    if (stored && stored.user && stored.role === "admin") {
      setProfile((p: any) => ({ ...p, ...stored.user, accessLevel: stored.user.accessLevel || "Full" }));
    }
  }, []);

  const handleSaveRemote = async () => {
    try {
      const stored = auth.getUser();
      const role = stored?.role || "admin";
      const path = roleToPath(role);

  const res = await fetch(`${API_BASE}/api/${path}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, ...profile }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Update failed");

      const updated = data.admin || data.user || data[role] || data;
      if (updated) auth.saveUser(updated, role);

      toast({ title: "Profile Updated", description: data?.message || "Your profile has been saved successfully." });
    } catch (err: any) {
      toast({ title: "Save Error", description: err?.message || "Unable to save", variant: "destructive" });
    }
  };

  return (
    <AdminDashboardLayout title="My Profile">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-destructive/10 via-destructive/5 to-destructive/10 p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-28 h-28 rounded-full overflow-hidden shadow-lg flex-shrink-0">
                {profile.profileData ? (
                  <img src={getProfileImageSrc(profile) as string} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-destructive text-destructive-foreground flex items-center justify-center text-4xl font-bold">
                    {profile.name ? profile.name.charAt(0) : "A"}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <p className="text-muted-foreground">{profile.role}</p>
              </div>

              <div className="flex flex-col items-start md:items-end gap-3">
                <label className="flex items-center gap-3">
                  <input id="profileFile" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <Button size="sm" onClick={() => document.getElementById("profileFile")?.click()} className="gap-2">
                    Choose file
                  </Button>
                  <span className="text-sm text-muted-foreground">{selectedFile?.name || profile.profileFileName || "No file chosen"}</span>
                </label>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpload} disabled={uploading || !selectedFile} className="gap-2">
                    {uploading ? "Uploading..." : (profile.profileData ? "Change Photo" : "Upload Photo")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleRemove}>
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
                <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail size={16} /> Email
                </Label>
                <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone size={16} /> Phone
                </Label>
                <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId" className="flex items-center gap-2">
                  <Building2 size={16} /> Employee ID
                </Label>
                <Input id="employeeId" value={profile.employeeId} onChange={(e) => setProfile({ ...profile, employeeId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield size={16} /> Role
                </Label>
                <Input id="role" value={profile.role} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessLevel" className="flex items-center gap-2">
                <Shield size={16} /> Access Level
              </Label>
              <Input id="accessLevel" value={profile.accessLevel} readOnly className="bg-muted" />
            </div>

            <Button onClick={handleSaveRemote} className="gap-2">
              <Save size={16} /> Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminProfile;