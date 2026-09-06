import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, Lock, Mail, User as UserIcon, ArrowRight, KeyRound } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "signup";
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, defaultTab = "login", onSuccess }: AuthModalProps) {
  const { signInWithPassword, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "signup">(defaultTab);
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
      const res = await signInWithPassword(loginEmail, loginPassword);
      if (res.success) {
        toast.success("Successfully authenticated. Welcome to Q-FLOW!");
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || "Failed to log in.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      toast.error("Please complete all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await signUp(signupName, signupEmail, signupPassword, signupRole);
      if (res.success) {
        toast.success("Account created successfully! Welcome aboard.");
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || "Failed to create account.");
      }
    } catch {
      toast.error("An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-[#0c0d0e]/95 backdrop-blur-xl border border-white/10 text-white rounded-none p-0 overflow-hidden shadow-2xl">
        {/* Header telemetry accent bar */}
        <div className="h-1 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-500 w-full" />

        <div className="p-6">
          <DialogHeader className="space-y-1 mb-6 text-left">
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest text-lime-400 uppercase">AUTHENTICATION PROTOCOL</span>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-white font-mono uppercase">
              QSWARM GATEWAY
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Access real-time fleet optimization, quantum swarm telemetry, and routing controls.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Demo Credentials Strip */}
          <div className="mb-5 p-3 rounded bg-white/[0.03] border border-white/[0.06] text-xs font-mono">
            <div className="text-[10px] text-neutral-400 mb-2 font-semibold uppercase tracking-wider flex items-center">
              <KeyRound size={12} className="mr-1.5 text-lime-400" /> DEMO OPERATOR ACCESS
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("admin@qswarm.io")}
                className="text-left px-2 py-1.5 rounded bg-white/5 hover:bg-lime-400/10 hover:border-lime-400/30 border border-transparent transition-all group"
              >
                <div className="text-[11px] font-semibold text-lime-300 group-hover:text-lime-400">Admin</div>
                <div className="text-[9px] text-neutral-400 truncate">admin@qswarm.io</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("operator@qswarm.io")}
                className="text-left px-2 py-1.5 rounded bg-white/5 hover:bg-lime-400/10 hover:border-lime-400/30 border border-transparent transition-all group"
              >
                <div className="text-[11px] font-semibold text-cyan-300 group-hover:text-cyan-400">Dispatcher</div>
                <div className="text-[9px] text-neutral-400 truncate">operator@qswarm.io</div>
              </button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "login" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 rounded-none p-1 border border-white/10 mb-5">
              <TabsTrigger
                value="login"
                className="rounded-none text-xs font-mono uppercase data-[state=active]:bg-lime-400 data-[state=active]:text-black font-semibold transition-all"
              >
                SIGN IN
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-none text-xs font-mono uppercase data-[state=active]:bg-lime-400 data-[state=active]:text-black font-semibold transition-all"
              >
                REGISTER
              </TabsTrigger>
            </TabsList>

            {/* LOGIN FORM */}
            <TabsContent value="login" className="space-y-4 m-0">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs font-mono text-neutral-300 uppercase">
                    EMAIL ADDRESS
                  </Label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-3 text-neutral-500" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="operator@qswarm.io"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-9 bg-black/40 border-white/15 focus:border-lime-400 text-sm font-mono text-white placeholder:text-neutral-600 rounded-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs font-mono text-neutral-300 uppercase">
                    PASSWORD
                  </Label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-3 text-neutral-500" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-9 pr-9 bg-black/40 border-white/15 focus:border-lime-400 text-sm font-mono text-white placeholder:text-neutral-600 rounded-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-neutral-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-lime-400 hover:bg-lime-300 text-black font-mono font-bold uppercase tracking-wider text-xs py-5 rounded-none transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <span>AUTHENTICATING...</span>
                  ) : (
                    <>
                      <span>AUTHENTICATE OPERATOR</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* SIGNUP FORM */}
            <TabsContent value="signup" className="space-y-4 m-0">
              <form onSubmit={handleSignupSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="signup-name" className="text-xs font-mono text-neutral-300 uppercase">
                    FULL NAME
                  </Label>
                  <div className="relative">
                    <UserIcon size={15} className="absolute left-3 top-3 text-neutral-500" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Commander Alex Mercer"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="pl-9 bg-black/40 border-white/15 focus:border-lime-400 text-sm font-mono text-white placeholder:text-neutral-600 rounded-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="signup-email" className="text-xs font-mono text-neutral-300 uppercase">
                    EMAIL ADDRESS
                  </Label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-3 text-neutral-500" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="alex.mercer@fleet.io"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-9 bg-black/40 border-white/15 focus:border-lime-400 text-sm font-mono text-white placeholder:text-neutral-600 rounded-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="signup-password" className="text-xs font-mono text-neutral-300 uppercase">
                    PASSWORD
                  </Label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-3 text-neutral-500" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-9 pr-9 bg-black/40 border-white/15 focus:border-lime-400 text-sm font-mono text-white placeholder:text-neutral-600 rounded-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-neutral-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="signup-role" className="text-xs font-mono text-neutral-300 uppercase">
                    OPERATOR ROLE
                  </Label>
                  <select
                    id="signup-role"
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value as AppRole)}
                    className="w-full h-10 px-3 bg-black/40 border border-white/15 focus:border-lime-400 text-sm font-mono text-white rounded-none outline-none"
                  >
                    <option value="OPERATIONS_MANAGER" className="bg-[#0c0d0e]">Operations Manager</option>
                    <option value="DISPATCHER" className="bg-[#0c0d0e]">Dispatcher</option>
                    <option value="ANALYST" className="bg-[#0c0d0e]">Analyst</option>
                    <option value="ORG_ADMIN" className="bg-[#0c0d0e]">Organization Admin</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-lime-400 hover:bg-lime-300 text-black font-mono font-bold uppercase tracking-wider text-xs py-5 rounded-none transition-all flex items-center justify-center space-x-2 mt-2"
                >
                  {loading ? (
                    <span>CREATING ACCOUNT...</span>
                  ) : (
                    <>
                      <span>REGISTER OPERATOR</span>
                      <ShieldCheck size={15} />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4 pt-3 border-t border-white/10 text-center text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
            QUANTUM SWARM INTELLIGENCE SYSTEM • ALL SESSIONS ENCRYPTED
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
