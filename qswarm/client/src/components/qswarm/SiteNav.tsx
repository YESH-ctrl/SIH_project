// QSwarm style reminder: navigation is lightweight race telemetry, not a dashboard sidebar; keep labels uppercase, compact, and legible.

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { id: "system", label: "01 / SYSTEM" },
  { id: "live-route", label: "02 / LIVE ROUTE" },
  { id: "simulation", label: "03 / SIMULATION" },
  { id: "optimization", label: "04 / OPTIMIZATION" },
  { id: "hackathon", label: "05 / HACKATHON" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("system");

  useEffect(() => {
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
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

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
        <button className="nav-cta" onClick={() => scrollTo("simulation")}>
          LAUNCH SIMULATION <span aria-hidden="true">↗</span>
        </button>
        <button className="nav-menu" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      <div className="site-nav__mobile-panel">
        {links.map((link) => (
          <button key={link.id} onClick={() => scrollTo(link.id)}>{link.label}</button>
        ))}
        <button onClick={() => scrollTo("simulation")} className="mobile-cta">LAUNCH SIMULATION ↗</button>
      </div>
    </header>
  );
}
