import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
// ...existing code... (removed DropdownMenu imports)
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import logo from "@/assets/banasthali-logo.jpg";
import heroBg from "@/assets/hero-bg.jpg";
import studentImg from "@/assets/student-role.jpg";
import tpoImg from "@/assets/tpo-role.jpg";
import facultyImg from "@/assets/faculty-role.jpg";
import adminImg from "@/assets/admin-role.jpg";

const Header = () => (
  <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Banasthali Vidyapith" className="h-14 w-14 rounded-full border-2 border-primary/20" />
        <h1 className="text-xl md:text-2xl font-bold gradient-text">
          AI-Powered Placement Management System
        </h1>
      </div>
      <div className="flex items-center gap-3 relative">
        {/* Login button with compact dropdown, now to the left of Sign Up */}
        <LoginDropdown />
        <Button variant="default" size="lg" asChild>
          <Link to="/signup">Sign Up</Link>
        </Button>
      </div>
    </div>
  </header>
);

function LoginDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!(e.target instanceof Node)) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const onChoose = (role: string) => {
    setOpen(false);
    navigate(`/login/${role}`);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="h-10 min-w-[120px] inline-flex items-center justify-center gap-2 rounded-md bg-white text-green-600 px-5 text-sm font-medium hover:bg-green-50 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="mx-auto">Login</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-card rounded-lg shadow-lg border border-border z-50">
          <button onClick={() => onChoose('student')} className="w-full text-left px-4 py-2 hover:bg-accent/5">Student</button>
          <button onClick={() => onChoose('faculty')} className="w-full text-left px-4 py-2 hover:bg-accent/5">Faculty</button>
          <button onClick={() => onChoose('tpo')} className="w-full text-left px-4 py-2 hover:bg-accent/5">TPO</button>
          <button onClick={() => onChoose('admin')} className="w-full text-left px-4 py-2 hover:bg-accent/5">Admin</button>
        </div>
      )}
    </div>
  );
}

const HeroSection = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleCreateAccount = () => {
    navigate("/signup", { state: { email } });
  };

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-foreground/60" />
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-in">
        <h2 className="text-4xl md:text-6xl font-display font-bold text-card mb-2">
          Empower Your Career with
        </h2>
        <h2 className="text-4xl md:text-6xl font-display font-bold mb-6">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-teal to-primary">
            PMS Portal
          </span>
        </h2>
        <p className="text-lg md:text-xl text-card/90 mb-8 max-w-2xl mx-auto">
          Discover opportunities, track progress, and connect with your TPO — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
          <Input
            type="email"
            placeholder="Enter your email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 text-lg bg-card/95 border-0 shadow-lg"
          />
          <Button variant="hero" size="xl" onClick={handleCreateAccount}>
            Create Account
          </Button>
        </div>
        <a href="#about" className="inline-block mt-8 text-card/80 hover:text-card underline underline-offset-4 transition-colors">
          Learn more about PMS
        </a>
      </div>
    </section>
  );
};

const AboutSection = () => (
  <section id="about" className="py-20 bg-card">
    <div className="container mx-auto px-4">
      <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-6">
        About <span className="gradient-text">PMS</span>
      </h2>
      <p className="text-center text-muted-foreground max-w-3xl mx-auto text-lg leading-relaxed mb-8">
        Developed for Banasthali Vidyapith, PMS (AI-Powered Placement Management System) is a powerful 
        web-based platform to streamline and manage campus placements efficiently. It leverages AI 
        for placement prediction, resume analysis, skill-gap detection, and career path recommendations.
      </p>
    </div>
  </section>
);

const roles = [
  {
    id: "student",
    title: "Student",
    image: studentImg,
    description: "Students can register, explore job opportunities, apply for jobs, and track application status with a personalized dashboard.",
  },
  {
    id: "tpo",
    title: "TPO (Training & Placement Officer)",
    image: tpoImg,
    description: "TPOs manage company data, job postings, application reviews, and generate insightful reports for placement tracking.",
  },
  {
    id: "faculty",
    title: "Faculty",
    image: facultyImg,
    description: "Faculty can monitor student progress, analyze skill gaps, and recommend learning resources to improve placement readiness.",
  },
  {
    id: "admin",
    title: "Super User (Admin)",
    image: adminImg,
    description: "Admins handle all roles with super privileges — managing users, system settings, and ensuring smooth operations across modules.",
  },
];

const RoleCards = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 gradient-bg">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-4">
          Choose Your <span className="gradient-text">Role</span>
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Select your role to access the appropriate dashboard and features
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {roles.map((role, i) => (
            <div
              key={role.id}
              onClick={() => navigate(`/login/${role.id}`)}
              className="bg-card rounded-2xl p-6 text-center cursor-pointer shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-2 animate-fade-in group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="relative mx-auto w-40 h-40 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-primary/50 group-hover:border-primary transition-colors" />
                <img
                  src={role.image}
                  alt={role.title}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">{role.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{role.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-card border-t border-border py-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {roles.map((role) => (
          <Button key={role.id} variant="default" asChild>
            <Link to={`/login/${role.id}`}>Login as {role.title.split(" ")[0]}</Link>
          </Button>
        ))}
      </div>
      <div className="text-center text-muted-foreground">
        <p className="mb-2">
          © 2025 <span className="text-primary font-semibold">AI-Powered Placement Management System</span>. All rights reserved.
        </p>
        <p className="text-sm">Developed for Banasthali Vidyapith</p>
      </div>
    </div>
  </footer>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <RoleCards />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
