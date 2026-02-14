import React, { useState } from 'react';
import API_BASE from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import auth from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/banasthali-logo.jpg';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [testOtp, setTestOtp] = useState(''); // For dev/testing
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
  const res = await fetch(`${API_BASE}/api/${role}s/otp-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to request OTP');
      }

      // If response includes OTP (dev mode), show it
      if (data.otp) {
        setTestOtp(data.otp);
        toast({ title: 'Dev Mode', description: `OTP for testing: ${data.otp}` });
      }

      setOtpSent(true);
      toast({ title: 'OTP Sent', description: data.message || 'Check your email for the OTP' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to send OTP', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
  const res = await fetch(`${API_BASE}/api/${role}s/otp-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Invalid OTP');
      }

      // Log in the user
      const returnedRole = data.role || role;
      const returnedUser = data.user || {};
      auth.saveUser(returnedUser, returnedRole);

      toast({ title: 'Success', description: 'Logged in successfully!' });
      setTimeout(() => {
        navigate(returnedRole === 'admin' ? '/admin/dashboard' : `/dashboard/${returnedRole}`);
      }, 500);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to verify OTP', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-login flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-2xl p-8 animate-scale-in">
          <div className="text-center mb-8">
            <img src={logo} alt="PMS Logo" className="w-28 h-28 mx-auto rounded-xl border-4 border-primary/20 shadow-lg mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground">Reset Password</h1>
            <p className="text-muted-foreground mt-2">
              {otpSent ? 'Enter the OTP sent to your email' : 'Enter your email to receive an OTP'}
            </p>
          </div>

          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="tpo">TPO</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button type="submit" variant="login" size="lg" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  className="h-12 text-center text-lg tracking-widest"
                />
              </div>

              {testOtp && (
                <div className="text-xs text-muted-foreground bg-accent p-2 rounded">
                  Dev: OTP = {testOtp}
                </div>
              )}

              <Button type="submit" variant="login" size="lg" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP & Login'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setTestOtp('');
                }}
                disabled={loading}
              >
                Back to Email
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            <button
              onClick={() => navigate('/login/student')}
              className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">© AI-Powered Placement Management System 2025</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
