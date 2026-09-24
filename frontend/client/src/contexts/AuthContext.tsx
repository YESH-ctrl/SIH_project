import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { AppRole, Permission, hasRolePermission, ROLE_PERMISSIONS } from "./rbacPermissions";
import { User as SupabaseUser } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  organization_id: string;
  role: AppRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  logo_url?: string;
}

export type { AppRole };

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  organization: Organization | null;
  role: AppRole;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (name: string, email: string, password: string, role?: AppRole) => Promise<{ success: boolean; message?: string }>;
  signUp: (name: string, email: string, password: string, role?: AppRole) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  signOut: () => void;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; message?: string }>;
}

// Preset Demo Users for Offline / Initial SIH Demo Evaluation
const DEMO_PROFILES: Record<string, { profile: UserProfile; org: Organization }> = {
  "admin@qswarm.io": {
    profile: {
      id: "prf_admin_01",
      auth_user_id: "usr_admin_01",
      full_name: "Dr. Aris Vance",
      email: "admin@qswarm.io",
      organization_id: "00000000-0000-0000-0000-000000000001",
      role: "ORG_ADMIN",
      is_active: true,
      created_at: "2026-01-15T08:30:00Z",
    },
    org: { id: "00000000-0000-0000-0000-000000000001", name: "SIH 2026 Fleet Operations" },
  },
  "dispatcher@qswarm.io": {
    profile: {
      id: "prf_disp_02",
      auth_user_id: "usr_disp_02",
      full_name: "Sienna Miller",
      email: "dispatcher@qswarm.io",
      organization_id: "00000000-0000-0000-0000-000000000001",
      role: "DISPATCHER",
      is_active: true,
      created_at: "2026-02-01T10:15:00Z",
    },
    org: { id: "00000000-0000-0000-0000-000000000001", name: "SIH 2026 Fleet Operations" },
  },
  "analyst@qswarm.io": {
    profile: {
      id: "prf_an_03",
      auth_user_id: "usr_an_03",
      full_name: "Marcus Sterling",
      email: "analyst@qswarm.io",
      organization_id: "00000000-0000-0000-0000-000000000001",
      role: "ANALYST",
      is_active: true,
      created_at: "2026-02-10T14:20:00Z",
    },
    org: { id: "00000000-0000-0000-0000-000000000001", name: "SIH 2026 Fleet Operations" },
  },
  "ops@qswarm.io": {
    profile: {
      id: "prf_ops_04",
      auth_user_id: "usr_ops_04",
      full_name: "Commander Sarah Jenkins",
      email: "ops@qswarm.io",
      organization_id: "00000000-0000-0000-0000-000000000001",
      role: "OPERATIONS_MANAGER",
      is_active: true,
      created_at: "2026-02-15T09:00:00Z",
    },
    org: { id: "00000000-0000-0000-0000-000000000001", name: "SIH 2026 Fleet Operations" },
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DEMO_STORAGE_KEY = "qswarm_demo_auth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active Role and Permissions
  const role: AppRole = profile?.role || "DISPATCHER";
  const permissions: Permission[] = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["DISPATCHER"];

  const hasPermission = (permission: Permission): boolean => {
    return hasRolePermission(role, permission);
  };

  // Fetch Profile & Organization from Supabase Database
  const fetchSupabaseProfile = async (authUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, organizations(id, name, logo_url)")
        .eq("auth_user_id", authUser.id)
        .single();

      if (error || !data) {
        console.warn("[Q-FLOW Auth] Profile fetch returned empty, using fallback metadata.");
        setProfile({
          id: `prf_${authUser.id.slice(0, 8)}`,
          auth_user_id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Fleet Operator",
          email: authUser.email || "",
          organization_id: "00000000-0000-0000-0000-000000000001",
          role: (authUser.user_metadata?.role as AppRole) || "DISPATCHER",
          is_active: true,
          created_at: new Date().toISOString(),
        });
        setOrganization({
          id: "00000000-0000-0000-0000-000000000001",
          name: "SIH 2026 Fleet Operations",
        });
      } else {
        const { organizations, ...profData } = data;
        setProfile(profData as UserProfile);
        if (organizations) {
          setOrganization(organizations as Organization);
        }
      }
    } catch (err) {
      console.error("[Q-FLOW Auth] Unexpected error fetching profile:", err);
    }
  };

  // Restore Session on Mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      // 1. Restore local demo session if available
      try {
        const savedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
        if (savedDemo && isMounted) {
          const parsed = JSON.parse(savedDemo);
          if (parsed?.profile && parsed?.org) {
            setProfile(parsed.profile);
            setOrganization(parsed.org);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      }

      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && isMounted) {
            setUser(data.session.user);
            await fetchSupabaseProfile(data.session.user);
          }
        } catch {
          // ignore error
        }
      }

      if (isMounted) setIsLoading(false);
    }

    initSession();

    // Supabase Auth Listener
    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchSupabaseProfile(session.user);
        }
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Sign In
  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.toLowerCase().trim();

    // Direct Instant Demo Profile Login
    const demo = DEMO_PROFILES[cleanEmail];
    if (demo) {
      setProfile(demo.profile);
      setOrganization(demo.org);
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demo));
      return { success: true };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data.user) {
          setUser(data.user);
          await fetchSupabaseProfile(data.user);
          return { success: true };
        }
        if (error) {
          return { success: false, message: error.message };
        }
      } catch (err: any) {
        console.warn("[AuthContext] Supabase sign in error:", err);
        return { success: false, message: err?.message || "Sign in error" };
      }
    }

    // Dynamic Local Demo User Creation
    const roleMapping: AppRole = cleanEmail.includes("admin")
      ? "ORG_ADMIN"
      : cleanEmail.includes("analyst")
      ? "ANALYST"
      : cleanEmail.includes("ops")
      ? "OPERATIONS_MANAGER"
      : "DISPATCHER";

    const demoProf: UserProfile = {
      id: `prf_${Date.now().toString(36)}`,
      auth_user_id: `usr_${Date.now().toString(36)}`,
      full_name: cleanEmail.split("@")[0].replace(/[^a-zA-Z]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Operator",
      email: cleanEmail,
      organization_id: "00000000-0000-0000-0000-000000000001",
      role: roleMapping,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const demoOrg: Organization = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "SIH 2026 Fleet Operations",
    };

    setProfile(demoProf);
    setOrganization(demoOrg);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ profile: demoProf, org: demoOrg }));
    return { success: true };
  };

  // Sign Up
  const signup = async (
    name: string,
    email: string,
    password: string,
    requestedRole: AppRole = "DISPATCHER"
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.toLowerCase().trim();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: name,
            role: requestedRole,
          },
        },
      });

      if (!error && data.user) {
        setUser(data.user);
        await fetchSupabaseProfile(data.user);
        return { success: true };
      }

      // If Supabase hits its Free Tier email rate limit or fails,
      // fallback to instant local profile registration so registration is never blocked.
      if (error && error.message.toLowerCase().includes("rate limit")) {
        console.warn("[Q-FLOW] Supabase Email Rate Limit exceeded. Falling back to local instant session.");
      } else if (error) {
        // For non-rate-limit errors (e.g., user already exists), still return message or fallback
        if (error.message.toLowerCase().includes("already registered")) {
          return { success: false, message: error.message };
        }
      }
    }

    // Demo Mode Sign Up
    const demoProf: UserProfile = {
      id: `prf_${Date.now().toString(36)}`,
      auth_user_id: `usr_${Date.now().toString(36)}`,
      full_name: name.trim() || "Operator",
      email: cleanEmail,
      organization_id: "00000000-0000-0000-0000-000000000001",
      role: requestedRole,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const demoOrg: Organization = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "SIH 2026 Fleet Operations",
    };

    setProfile(demoProf);
    setOrganization(demoOrg);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ profile: demoProf, org: demoOrg }));
    return { success: true };
  };

  // Forgot Password / Reset Password
  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?tab=reset`,
      });
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: "Password reset link sent to your email address." };
    }
    return { success: true, message: "[Demo Mode] Password reset link simulated." };
  };

  // Sign Out
  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setOrganization(null);
    localStorage.removeItem(DEMO_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organization,
        role,
        permissions,
        hasPermission,
        isAuthenticated: !!profile || !!user,
        isLoading,
        login,
        signInWithPassword: login,
        signup,
        signUp: signup,
        logout,
        signOut: logout,
        resetPassword,
        resetPasswordForEmail: resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
