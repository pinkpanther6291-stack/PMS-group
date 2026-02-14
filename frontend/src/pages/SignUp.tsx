import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import API_BASE from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/banasthali-logo.jpg";
import { isEmailStrict } from '@/lib/validation';

const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const initialEmail = (location.state as { email?: string })?.email || "";

  const [formData, setFormData] = useState({
    name: "",
    email: initialEmail,
    password: "",
    confirmPassword: "",
  role: "student",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // client-side validations
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!formData.name || !nameRegex.test(formData.name.trim())) {
      toast({ title: 'Invalid name', description: 'Only alphabetic characters and spaces are allowed', variant: 'destructive' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!pwdRegex.test(formData.password)) {
      toast({ title: 'Weak password', description: 'Password must be at least 8 characters and include letters, numbers and special characters', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    // strict client-side email validation
    if (!isEmailStrict(formData.email)) {
      toast({ title: 'Invalid email', description: 'Enter a valid email (local part must include letters)', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

  // email domain: require a properly formatted email (example: user@domain.tld)
  // isEmailStrict covers this check already; proceed

    // Call backend register endpoint
    const roleToPath = (role: string) => {
      switch (role) {
        case "student":
          return "students";
        case "faculty":
          return "faculty";
        case "tpo":
          return "tpo";
        case "admin":
          return "admin";
        default:
          return "students";
      }
    };

    const payload: any = { ...formData };
    delete payload.confirmPassword;

    // Validate phone if provided (exactly 10 digits)
    if (payload.phone && !/^\d{10}$/.test(String(payload.phone).trim())) {
      toast({ title: 'Invalid phone', description: 'Phone number must be exactly 10 digits', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
  `${API_BASE}/api/${roleToPath(formData.role)}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message || "Registration failed");
      }

      toast({
        title: "Account Created",
        description: body?.message || "Registration successful. Please login.",
      });
      navigate(`/login/${formData.role}`);
    } catch (err: any) {
      toast({
        title: "Registration Error",
        description: err?.message || "Unable to register",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-login flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-2xl p-8 animate-scale-in">
          <div className="text-center mb-8">
            <img
              src={logo}
              alt="PMS Logo"
              className="w-24 h-24 mx-auto rounded-xl border-4 border-primary/20 shadow-lg mb-4"
            />
            <h1 className="text-2xl font-display font-bold text-foreground">
              Create Account
            </h1>
            <p className="text-muted-foreground mt-2">
              Join PMS to start your placement journey
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Select Role</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full h-12 px-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="student">Student</option>
                <option value="tpo">TPO</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* year is handled in the user's profile, not during signup */}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="h-12"
              />
            </div>

            <Button type="submit" variant="login" size="lg" disabled={isLoading} className="mt-2">
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login/student" className="text-primary font-semibold hover:underline">
                Log in
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
