import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/contexts/rbacPermissions";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

export default function Login() {
  const { login, signup, resetPassword, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<"login" | "signup" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<AppRole>("DISPATCHER");

  // Reset password state
  const [resetEmail, setResetEmail] = useState("");

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const fillDemo = (email: string) => {
    setLoginEmail(email);
    setLoginPassword("password123");
    setActiveTab("login");
    toast.info(`Loaded demo credentials for ${email}`);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast.error("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        toast.success("Successfully authenticated with Supabase Auth.");
        setLocation("/dashboard");
      } else {
        toast.error(res.message || "Authentication failed.");
      }
    } catch {
      toast.error("An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await signup(signupName, signupEmail, signupPassword, signupRole);
      if (res.success) {
        toast.success("Account created via Supabase Auth! Welcome to QSWARM.");
        setLocation("/dashboard");
      } else {
        toast.error(res.message || "Registration failed.");
      }
    } catch {
      toast.error("An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error("Please provide your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(resetEmail);
      if (res.success) {
        toast.success(res.message || "Password reset email sent.");
        setActiveTab("login");
      } else {
        toast.error(res.message || "Reset failed.");
      }
    } catch {
      toast.error("An error occurred during password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#f4f4f0] flex flex-col justify-between selection:bg-[#c8ff00] selection:text-black font-sans relative overflow-hidden">
      {/* Background Subtle Noise & Grid */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 filter brightness-50 contrast-125 transition-all"
        style={{ backgroundImage: `url('/assets/login-bg.jpg')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/90 via-[#080808]/95 to-[#080808]" />
      <div className="absolute inset-0 bg-[radial-gradient(#c8ff00_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none" />

      {/* Top Telemetry Header */}
      <header className="relative z-20 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-white/10">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center space-x-3 group text-left focus:outline-none"
        >
          <div className="p-1.5 bg-black border border-[#c8ff00]/40 rounded-none backdrop-blur">
            <img src="/assets/qswarm-mark.webp" alt="QSWARM" className="w-5 h-5 object-contain" />
          </div>
          <div>
            <span className="font-mono text-xl font-bold tracking-tight text-white group-hover:text-[#c8ff00] transition-colors block">
              QSWARM
            </span>
            <span className="text-[10px] font-mono text-[#c8ff00] uppercase tracking-widest block -mt-1 font-semibold">
              AUTHENTICATION GATEWAY
            </span>
          </div>
        </button>

        <button
          onClick={() => setLocation("/")}
          className="flex items-center space-x-2 text-xs font-mono text-neutral-300 hover:text-[#c8ff00] hover:border-[#c8ff00]/60 transition-all border border-neutral-800 px-4 py-2 bg-neutral-900/80 backdrop-blur rounded-none"
        >
          <ArrowLeft size={14} className="text-[#c8ff00]" />
          <span>RETURN TO SYSTEM</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-20 max-w-7xl w-full mx-auto px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Narrative */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-[#c8ff00]/10 border border-[#c8ff00]/30 px-3 py-1.5 text-[#c8ff00] font-mono text-xs uppercase tracking-widest backdrop-blur">
              <span className="w-2 h-2 rounded-full bg-[#c8ff00] animate-pulse" />
              <Sparkles size={13} className="mr-0.5" />
              <span>SUPABASE AUTHENTICATION LAYER</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight leading-none uppercase drop-shadow-lg text-white">
              OPTIMIZE FLEET. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c8ff00] via-[#a3e635] to-emerald-400">
                ANTICIPATE TRAFFIC.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-neutral-400 max-w-lg font-sans leading-relaxed">
              Enterprise transportation management & intelligent route optimization. Powered by Supabase Auth & PostgreSQL Row-Level Security.
            </p>
          </div>

          {/* Quick Demo Credentials Access */}
          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider flex items-center space-x-2">
              <KeyRound size={12} className="text-[#c8ff00]" />
              <span>QUICK DEMO ACCESS SHORTCUTS</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => fillDemo("ops@qswarm.io")}
                className="p-2.5 bg-[#111111] border border-neutral-800 hover:border-[#c8ff00] text-left transition-all group"
              >
                <div className="text-[#c8ff00] font-bold group-hover:underline">Ops Manager</div>
                <div className="text-[9px] text-neutral-400 truncate">ops@qswarm.io</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("dispatcher@qswarm.io")}
                className="p-2.5 bg-[#111111] border border-neutral-800 hover:border-emerald-400 text-left transition-all group"
              >
                <div className="text-emerald-400 font-bold group-hover:underline">Dispatcher</div>
                <div className="text-[9px] text-neutral-400 truncate">dispatcher@qswarm.io</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("analyst@qswarm.io")}
                className="p-2.5 bg-[#111111] border border-neutral-800 hover:border-cyan-400 text-left transition-all group"
              >
                <div className="text-cyan-400 font-bold group-hover:underline">Analyst</div>
                <div className="text-[9px] text-neutral-400 truncate">analyst@qswarm.io</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("admin@qswarm.io")}
                className="p-2.5 bg-[#111111] border border-neutral-800 hover:border-amber-400 text-left transition-all group"
              >
                <div className="text-amber-400 font-bold group-hover:underline">Org Admin</div>
                <div className="text-[9px] text-neutral-400 truncate">admin@qswarm.io</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Form Card */}
        <div className="lg:col-span-6 w-full max-w-lg mx-auto lg:max-w-none">
          <div className="bg-[#0d0d0d] border border-neutral-800 backdrop-blur-2xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 relative font-mono">
            {/* Top Electric Lime Signal Strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c8ff00] via-emerald-400 to-amber-400" />

            {/* Security Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs">
              <div className="flex items-center space-x-2">
                <ShieldCheck size={16} className="text-[#c8ff00]" />
                <span className="font-bold text-white uppercase tracking-wider">SUPABASE SECURITY</span>
              </div>
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/30 font-semibold flex items-center space-x-1">
                <CheckCircle2 size={10} className="mr-1" />
                POSTGRES RLS ACTIVE
              </span>
            </div>

            {/* Tabs & Form */}
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[#141414] p-1 rounded-none border border-neutral-800 mb-6">
                <TabsTrigger
                  value="login"
                  className="rounded-none text-xs font-mono uppercase font-bold text-neutral-400 data-[state=active]:bg-[#c8ff00] data-[state=active]:text-black py-2.5 transition-all"
                >
                  SIGN IN
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-none text-xs font-mono uppercase font-bold text-neutral-400 data-[state=active]:bg-[#c8ff00] data-[state=active]:text-black py-2.5 transition-all"
                >
                  REGISTER
                </TabsTrigger>
                <TabsTrigger
                  value="reset"
                  className="rounded-none text-xs font-mono uppercase font-bold text-neutral-400 data-[state=active]:bg-[#c8ff00] data-[state=active]:text-black py-2.5 transition-all"
                >
                  RESET
                </TabsTrigger>
              </TabsList>

              {/* SIGN IN TAB */}
              <TabsContent value="login" className="space-y-4 m-0">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-xs text-neutral-300 uppercase font-mono font-semibold">
                      EMAIL ADDRESS
                    </Label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-neutral-500" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="operator@qswarm.io"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10 bg-[#050505] border-neutral-800 focus:border-[#c8ff00] focus:ring-1 focus:ring-[#c8ff00] text-sm font-mono text-white placeholder:text-neutral-600 rounded-none h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="login-password" className="text-xs text-neutral-300 uppercase font-mono font-semibold">
                        PASSWORD
                      </Label>
                      <button
                        type="button"
                        onClick={() => setActiveTab("reset")}
                        className="text-[10px] text-[#c8ff00] hover:underline"
                      >
                        FORGOT PASSWORD?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-3.5 text-neutral-500" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 pr-10 bg-[#050505] border-neutral-800 focus:border-[#c8ff00] focus:ring-1 focus:ring-[#c8ff00] text-sm font-mono text-white placeholder:text-neutral-600 rounded-none h-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-neutral-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#c8ff00] hover:bg-[#b5e600] text-black font-bold uppercase tracking-wider text-xs h-11 rounded-none transition-all flex items-center justify-center space-x-2 mt-4 border-none"
                  >
                    {loading ? (
                      <span>AUTHENTICATING...</span>
                    ) : (
                      <>
                        <span>AUTHENTICATE WITH SUPABASE</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* REGISTER TAB */}
              <TabsContent value="signup" className="space-y-4 m-0">
                <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="signup-name" className="text-xs text-neutral-300 uppercase font-mono font-semibold">
                      FULL NAME
                    </Label>
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-3.5 top-3.5 text-neutral-500" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Commander Sarah Jenkins"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="pl-10 bg-[#050505] border-neutral-800 focus:border-[#c8ff00] focus:ring-1 focus:ring-[#c8ff00] text-sm font-mono text-white placeholder:text-neutral-600 rounded-none h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="signup-email" className="text-xs text-neutral-300 uppercase font-mono font-semibold">
                      EMAIL ADDRESS
                    </Label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-neutral-500" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="sarah.jenkins@fleet.io"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pl-10 bg-[#050505] border-neutral-800 focus:border-[#c8ff00] focus:ring-1 focus:ring-[#c8ff00] text-sm font-mono text-white placeholder:text-neutral-600 rounded-none h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="signup-password" className="text-xs text-neutral-300 uppercase font-mono font-semibold">
                      PASSWORD
                    </Label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-3.5 text-neutral-500" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-10 pr-10 bg-[#050505] border-neutral-800 focus:border-[#c8ff00] focus:ring-1 focus:ring-[#c8ff00] text-sm font-mono text-white placeholder:text-neutral-600 rounded-none h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="signup-role" className="text-xs text-neutral-300 uppercase font-mono font-semibold">
                      REQUESTED ROLE (CONTROLLED ASSIGNMENT)
                    </Label>
                    <select
                      id="signup-role"
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value as AppRole)}
                      className="w-full h-11 px-3 bg-[#050505] border border-neutral-800 focus:border-[#c8ff00] text-sm font-mono text-white rounded-none outline-none"
                    >
                      <option value="OPERATIONS_MANAGER" className="bg-[#0c0d0e]">OPERATIONS_MANAGER</option>
                      <option value="DISPATCHER" className="bg-[#0c0d0e]">DISPATCHER</option>
                      <option value="ANALYST" className="bg-[#0c0d0e]">ANALYST</option>
                      <option value="ORG_ADMIN" className="bg-[#0c0d0e]">ORG_ADMIN</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#c8ff00] hover:bg-[#b5e600] text-black font-bold uppercase tracking-wider text-xs h-11 rounded-none transition-all flex items-center justify-center space-x-2 mt-4 border-none"
                  >
                    {loading ? (
                      <span>REGISTERING...</span>
                    ) : (
                      <>
                        <span>REGISTER USER</span>
                        <ShieldCheck size={15} />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* RESET PASSWORD TAB */}
              <TabsContent value="reset" className="space-y-4 m-0">
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="text-xs text-neutral-300 uppercase font-mono font-semibold">
                      REGISTERED EMAIL ADDRESS
                    </Label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-neutral-500" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="operator@qswarm.io"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-10 bg-[#050505] border-neutral-800 focus:border-[#c8ff00] focus:ring-1 focus:ring-[#c8ff00] text-sm font-mono text-white placeholder:text-neutral-600 rounded-none h-11"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#c8ff00] hover:bg-[#b5e600] text-black font-bold uppercase tracking-wider text-xs h-11 rounded-none transition-all flex items-center justify-center space-x-2 mt-4 border-none"
                  >
                    {loading ? (
                      <span>SENDING LINK...</span>
                    ) : (
                      <>
                        <span>SEND PASSWORD RESET LINK</span>
                        <Mail size={15} />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 max-w-7xl w-full mx-auto px-6 py-4 border-t border-neutral-800 text-center font-mono text-xs text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-2 backdrop-blur-sm bg-black/60">
        <span>QSWARM FLEET INTELLIGENCE • SUPABASE AUTH & RLS</span>
        <span>SIH 2026 • ALL RIGHTS RESERVED</span>
      </footer>
    </div>
  );
}

