// QSwarm style reminder: navigation is lightweight race telemetry, not a dashboard sidebar; keep labels uppercase, compact, and legible.

import { Menu, X, LogOut, LayoutDashboard, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { toast } from "sonner";

const links = [
  { id: "system", label: "01 / SYSTEM" },
  { id: "problem", label: "02 / PROBLEM" },
  { id: "architecture", label: "03 / ARCHITECTURE" },
  { id: "hackathon", label: "04 / HACKATHON" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("system");
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (location !== "/") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-18% 0px -68% 0px" },
    );
    links.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [location]);

  const scrollTo = (id: string) => {
    if (location !== "/") {
      setLocation("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    toast.info("Signed out of Q-FLOW session.");
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Operator";

  return (
    <header className={`site-nav ${open ? "site-nav--open" : ""}`}>
      <div className="site-nav__inner">
        <button className="brand-lockup" onClick={() => scrollTo("system")} aria-label="QSwarm home">
          <img src="/assets/qswarm-mark.webp" alt="" className="brand-lockup__mark" />
          <span className="brand-lockup__wordmark">QSWARM</span>
        </button>
        <nav className="site-nav__links" aria-label="Primary navigation">
          {links.map((link) => (
            <button key={link.id} className={active === link.id ? "is-active" : ""} onClick={() => scrollTo(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLocation("/dashboard")}
                className="flex items-center space-x-2 px-3 py-1.5 bg-lime-400/10 hover:bg-lime-400/20 border border-lime-400/30 text-lime-400 font-mono text-xs uppercase tracking-wider transition-all"
                title="Open Operator Dashboard"
              >
                <LayoutDashboard size={13} />
                <span className="hidden sm:inline font-bold truncate max-w-[100px]">{displayName.split(" ")[0]}</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors"
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLocation("/login")}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-mono text-xs uppercase tracking-wider transition-all"
            >
              <KeyRound size={13} className="text-lime-400" />
              <span>SIGN IN</span>
            </button>
          )}

          <button className="nav-cta" onClick={() => scrollTo("architecture")}>
            ARCHITECTURE <span aria-hidden="true">↗</span>
          </button>

          <button
            className="nav-menu"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      <div className="site-nav__mobile-panel">
        {links.map((link) => (
          <button key={link.id} onClick={() => scrollTo(link.id)}>{link.label}</button>
        ))}
        {isAuthenticated ? (
          <button onClick={() => { setLocation("/dashboard"); setOpen(false); }} className="mobile-cta">
            DASHBOARD ↗
          </button>
        ) : (
          <button onClick={() => { setLocation("/login"); setOpen(false); }} className="mobile-cta">
            SIGN IN ↗
          </button>
        )}
      </div>
    </header>
  );
}
