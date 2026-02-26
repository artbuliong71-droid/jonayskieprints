"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type NavSection = "home" | "services" | "about" | "contact";

interface ServiceCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface ContactItem {
  icon: React.ReactNode;
  label: string;
  value: string;
}

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const IcoPrinter = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const IcoCopy = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const IcoScan = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 7V5a2 2 0 012-2h2" />
    <path d="M17 3h2a2 2 0 012 2v2" />
    <path d="M21 17v2a2 2 0 01-2 2h-2" />
    <path d="M7 21H5a2 2 0 01-2-2v-2" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);

const IcoPhoto = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IcoLaminate = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IcoZap = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IcoUsers = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const IcoUpload = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IcoTracking = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IcoMapPin = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IcoPhone = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const IcoMail = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IcoClock = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IcoPrinterNav = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

// ─── Data ─────────────────────────────────────────────────────────────────────

const SERVICES: ServiceCard[] = [
  {
    icon: <IcoPrinter />,
    title: "Document Printing",
    description: "High-quality document printing in various sizes and formats.",
  },
  {
    icon: <IcoCopy />,
    title: "Photocopying (Xerox)",
    description: "Fast and reliable photocopying services for all your needs.",
  },
  {
    icon: <IcoScan />,
    title: "Scanning",
    description: "Professional scanning services to digitize your documents.",
  },
  {
    icon: <IcoPhoto />,
    title: "Photo Development",
    description: "Beautiful photo prints in various sizes and finishes.",
  },
  {
    icon: <IcoLaminate />,
    title: "Laminating",
    description:
      "Protect your important documents with our laminating service.",
  },
  {
    icon: <IcoZap />,
    title: "Quick Turnaround",
    description: "Fast processing times to meet your urgent printing needs.",
  },
];

const FEATURES: FeatureCard[] = [
  {
    icon: <IcoUsers />,
    title: "Free Membership",
    description: "No registration fees — join our community for free!",
  },
  {
    icon: <IcoUpload />,
    title: "Easy File Upload",
    description: "Upload your files securely through our platform.",
  },
  {
    icon: <IcoTracking />,
    title: "Order Tracking",
    description: "Monitor your order progress from start to finish.",
  },
];

const CONTACT_ITEMS: ContactItem[] = [
  {
    icon: <IcoMapPin />,
    label: "Address",
    value: "Brgy. San Joseph, Santa Rosa, Nueva Ecija",
  },
  { icon: <IcoPhone />, label: "Phone", value: "+6393 5033 6938" },
  { icon: <IcoMail />, label: "Email", value: "info@jonayskieprints.com" },
  {
    icon: <IcoClock />,
    label: "Business Hours",
    value: "Mon–Sat: 8:00 AM – 6:00 PM",
  },
];

// ─── Hook: Intersection Observer ─────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function HomePage() {
  const [activeNav, setActiveNav] = useState<NavSection>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);

  const servicesReveal = useInView();
  const aboutReveal = useInView();
  const contactReveal = useInView();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const sections: [NavSection, React.RefObject<HTMLElement | null>][] = [
        ["home", heroRef],
        ["services", servicesRef],
        ["about", aboutRef],
        ["contact", contactRef],
      ];
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i][1].current;
        if (el && window.scrollY >= el.offsetTop - 100) {
          setActiveNav(sections[i][0]);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(section: NavSection) {
    const refs: Record<NavSection, React.RefObject<HTMLElement | null>> = {
      home: heroRef,
      services: servicesRef,
      about: aboutRef,
      contact: contactRef,
    };
    refs[section].current?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ink: #0f0e11;
          --paper: #faf9f6;
          --accent: #2563eb;
          --accent-dark: #1d4ed8;
          --muted: #7a7a7a;
          --border: #e0ddd8;
          --success: #2d9b5a;
        }

        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; background: var(--paper); color: var(--ink); overflow-x: hidden; }

        /* ── NAV ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 200; padding: 0 2rem; height: 68px;
          display: flex; align-items: center; justify-content: space-between;
          background: #ffffff; box-shadow: 0 1px 0 var(--border);
        }
        .nav.scrolled { background: #ffffff; box-shadow: 0 1px 8px rgba(0,0,0,0.08); }

        .nav-logo {
          display: flex; align-items: center; gap: 0.6rem;
          text-decoration: none; cursor: pointer;
        }
        .nav-logo-icon {
          width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
        }
        .nav-logo-icon img { width: 38px; height: 38px; object-fit: contain; }
        .nav-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.05rem; color: var(--ink);
          line-height: 1.1; letter-spacing: -0.01em;
        }
        .nav-logo-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.62rem; font-weight: 300; color: var(--muted);
          letter-spacing: 0.1em; text-transform: uppercase; display: block;
        }

        .nav-links { display: flex; align-items: center; gap: 0.25rem; list-style: none; }
        .nav-link-btn {
          background: none; border: none; cursor: pointer;
          padding: 0.45rem 0.85rem; border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem; font-weight: 500; color: var(--ink);
          transition: color 0.2s, background 0.2s;
        }
        .nav-link-btn:hover { color: var(--accent); background: rgba(37,99,235,0.06); }
        .nav-link-btn.active { color: var(--accent) !important; font-weight: 600; }

        .nav-actions { display: flex; align-items: center; gap: 0.65rem; }
        .btn-login {
          padding: 0.5rem 1.25rem; background: var(--accent); color: #fff;
          border: none; border-radius: 99px;
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 600;
          cursor: pointer; text-decoration: none; transition: background 0.2s, transform 0.15s;
          display: inline-flex; align-items: center;
        }
        .btn-login:hover { background: var(--accent-dark); transform: translateY(-1px); }
        .btn-register {
          padding: 0.5rem 1.25rem; background: transparent; color: var(--accent);
          border: 2px solid var(--accent); border-radius: 99px;
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 600;
          cursor: pointer; text-decoration: none; transition: all 0.2s;
          display: inline-flex; align-items: center;
        }
        .btn-register:hover { background: rgba(37,99,235,0.06); }
        .hamburger {
          display: none; background: none; border: none; cursor: pointer;
          color: var(--ink); padding: 4px;
        }

        .mobile-menu {
          position: fixed; top: 68px; left: 0; right: 0;
          background: var(--paper); border-bottom: 1px solid var(--border);
          padding: 1rem 2rem 1.5rem; z-index: 190;
          transform: translateY(-110%); transition: transform 0.3s;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .mobile-menu.open { transform: translateY(0); }
        .mobile-nav-links { list-style: none; display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
        .mobile-nav-btn {
          width: 100%; text-align: left; background: none; border: none; cursor: pointer;
          padding: 0.65rem 0.75rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500; color: var(--ink);
          border-radius: 7px; transition: background 0.15s;
        }
        .mobile-nav-btn:hover { background: rgba(0,0,0,0.04); }
        .mobile-nav-btn.active { color: var(--accent); font-weight: 600; }
        .mobile-actions { display: flex; gap: 0.75rem; }
        .mobile-actions .btn-login { flex: 1; justify-content: center; background: var(--accent); color: #fff !important; border-color: var(--accent) !important; }
        .mobile-actions .btn-register { flex: 1; justify-content: center; color: var(--ink) !important; border-color: var(--border) !important; }

        /* ── HERO ── */
        .hero {
          min-height: 100vh;
          background: linear-gradient(135deg, #5b6dee 0%, #7c3aed 50%, #a855f7 100%);
          display: flex; align-items: center;
          position: relative; overflow: hidden;
          padding: 7rem 2rem 4rem;
        }
        .hero::before {
          content: ''; position: absolute; top: -120px; left: -120px;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero::after {
          content: ''; position: absolute; bottom: -80px; right: 15%;
          width: 350px; height: 350px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-stripe {
          position: absolute; top: 0; right: 0; width: 38%; height: 100%;
          background: rgba(255,255,255,0.025);
          clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%);
          pointer-events: none;
        }
        .hero-inner {
          max-width: 1200px; width: 100%; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center;
          gap: 3rem; position: relative; z-index: 1; text-align: center;
        }
        .hero-content { flex: 1; max-width: 720px; display: flex; flex-direction: column; align-items: center; }

        .hero-tag {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(37,99,235,0.3);
          color: rgba(255,255,255,0.9);
          font-size: 0.75rem; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 4px 14px; border-radius: 99px;
          margin-bottom: 1.5rem;
          animation: fadeUp 0.6s ease both;
        }
        .hero-tag svg { color: rgba(255,255,255,0.8); }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.8rem, 5.5vw, 4.5rem);
          line-height: 1.12; color: #fff;
          margin-bottom: 1.25rem; letter-spacing: -0.02em;
          animation: fadeUp 0.65s 0.1s ease both;
        }
        .hero-title em { color: #93c5fd; font-style: italic; }

        .hero-subtitle {
          font-size: 1rem; color: rgba(255,255,255,0.55);
          line-height: 1.7; max-width: 520px; font-weight: 300;
          margin-bottom: 2.25rem; animation: fadeUp 0.65s 0.2s ease both;
        }

        .hero-cta {
          display: flex; gap: 0.85rem; flex-wrap: wrap;
          animation: fadeUp 0.65s 0.3s ease both; justify-content: center;
        }
        .cta-primary {
          padding: 0.9rem 2rem; background: #2563eb; color: #fff;
          border: none; border-radius: 99px;
          font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 600;
          cursor: pointer; text-decoration: none;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .cta-primary:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .cta-secondary {
          padding: 0.9rem 2rem; background: transparent; color: #fff;
          border: 2px solid rgba(255,255,255,0.7); border-radius: 99px;
          font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 600;
          cursor: pointer; text-decoration: none; transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .cta-secondary:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.9); }

        .hero-stats {
          display: flex; gap: 2.5rem; margin-top: 3rem;
          animation: fadeUp 0.65s 0.45s ease both; justify-content: center;
        }
        .hero-stat-value { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #fff; font-weight: 700; }
        .hero-stat-label { font-size: 0.72rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; margin-top: 1px; }

        /* ── SECTIONS SHARED ── */
        .section-inner { max-width: 1100px; margin: 0 auto; padding: 5rem 2rem; }
        .section-tag {
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--accent);
          margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.4rem;
        }
        .section-tag::before {
          content: ''; display: inline-block; width: 20px; height: 2px;
          background: var(--accent); border-radius: 2px;
        }
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.75rem, 3.5vw, 2.5rem); color: var(--ink);
          letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 0.75rem;
        }
        .section-subtitle {
          font-size: 0.95rem; color: var(--muted); font-weight: 300;
          line-height: 1.65; max-width: 500px; margin-bottom: 3rem;
        }

        /* ── REVEAL ── */
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.6s, transform 0.6s; }
        .reveal.in { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }
        .reveal-delay-5 { transition-delay: 0.5s; }
        .reveal-delay-6 { transition-delay: 0.6s; }

        /* ── SERVICES ── */
        .services-section { background: #fff; min-height: 100vh; display: flex; align-items: center; }
        .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
        .service-card {
          background: var(--paper); border: 1.5px solid var(--border); border-radius: 14px;
          padding: 2rem 1.5rem; text-align: center;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; cursor: default;
        }
        .service-card:hover { border-color: var(--accent); box-shadow: 0 8px 28px rgba(37,99,235,0.1); transform: translateY(-3px); }
        .service-icon-wrap {
          width: 56px; height: 56px; background: var(--accent); border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem; transition: background 0.2s; color: #fff;
        }
        .service-card:hover .service-icon-wrap { background: var(--accent-dark); }
        .service-title { font-family: 'Playfair Display', serif; font-size: 1.05rem; color: var(--ink); margin-bottom: 0.5rem; letter-spacing: -0.01em; }
        .service-desc { font-size: 0.85rem; color: var(--muted); line-height: 1.6; font-weight: 300; }

        /* ── ABOUT ── */
        .about-section { background: var(--paper); min-height: 100vh; display: flex; align-items: center; }
        .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; }
        .about-text p { font-size: 0.95rem; color: #555; line-height: 1.8; font-weight: 300; margin-bottom: 1.25rem; }
        .about-checklist { list-style: none; display: flex; flex-direction: column; gap: 0.65rem; margin-top: 1rem; }
        .about-check { display: flex; align-items: center; gap: 0.65rem; font-size: 0.9rem; color: var(--ink); font-weight: 400; }
        .check-dot {
          width: 20px; height: 20px; background: var(--success); border-radius: 50%;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff;
        }
        .check-dot svg { width: 11px; height: 11px; }

        .feature-cards { display: flex; flex-direction: column; gap: 1rem; }
        .feature-card {
          background: #fff; border: 1.5px solid var(--border); border-radius: 12px;
          padding: 1.25rem 1.5rem; display: flex; gap: 1rem; align-items: flex-start;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .feature-card:hover { border-color: var(--accent); box-shadow: 0 4px 16px rgba(37,99,235,0.08); }
        .feature-icon {
          width: 42px; height: 42px; background: var(--accent); border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff;
        }
        .feature-title { font-family: 'Playfair Display', serif; font-size: 0.95rem; color: var(--ink); margin-bottom: 0.25rem; }
        .feature-desc { font-size: 0.82rem; color: var(--muted); line-height: 1.55; font-weight: 300; }

        /* ── CONTACT ── */
        .contact-section { background: #fff; min-height: 100vh; display: flex; align-items: center; }
        .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .contact-card {
          background: var(--paper); border: 1.5px solid var(--border); border-radius: 12px;
          padding: 1.5rem; display: flex; align-items: center; gap: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .contact-card:hover { border-color: var(--accent); box-shadow: 0 4px 16px rgba(37,99,235,0.08); }
        .contact-icon {
          width: 44px; height: 44px; background: var(--accent); border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff;
        }
        .contact-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 3px; }
        .contact-value { font-size: 0.9rem; color: var(--ink); font-weight: 500; }

        /* ── FOOTER ── */
        .footer { background: var(--ink); padding: 3.5rem 2rem 2rem; }
        .footer-inner { max-width: 1100px; margin: 0 auto; }
        .footer-top {
          display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 3rem;
          padding-bottom: 2.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 1.5rem;
        }
        .footer-brand-name {
          font-family: 'Playfair Display', serif; font-size: 1.1rem; color: #fff;
          margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.6rem;
        }
        .footer-logo-box {
          width: 32px; height: 32px; background: var(--accent); border-radius: 7px;
          display: flex; align-items: center; justify-content: center; color: #fff;
        }
        .footer-brand-desc { font-size: 0.85rem; color: rgba(255,255,255,0.4); line-height: 1.7; font-weight: 300; }
        .footer-col-title { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); margin-bottom: 1rem; }
        .footer-links { list-style: none; display: flex; flex-direction: column; gap: 0.55rem; }
        .footer-link-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.45); font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 400; text-align: left; padding: 0; transition: color 0.2s;
        }
        .footer-link-btn:hover { color: rgba(255,255,255,0.85); }
        .footer-bottom {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 0.78rem; color: rgba(255,255,255,0.25); flex-wrap: wrap; gap: 0.5rem;
        }

        /* ── KEYFRAMES ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .nav-links, .nav-actions { display: none; }
          .hamburger { display: flex; }
          .about-grid { grid-template-columns: 1fr; gap: 2.5rem; }
          .footer-top { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 720px) {
          .services-grid { grid-template-columns: 1fr 1fr; }
          .contact-grid { grid-template-columns: 1fr; }
          .hero-inner { justify-content: center; }
          .hero-content { max-width: 560px; }
          .footer-top { grid-template-columns: 1fr; gap: 2rem; }
        }
        @media (max-width: 480px) {
          .services-grid { grid-template-columns: 1fr; }
          .hero-stats { gap: 1.5rem; }
          .section-inner { padding: 3.5rem 1.25rem; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-logo" onClick={() => scrollTo("home")}>
          <div className="nav-logo-icon">
            <img src="/logo.png" alt="Jonayskie Prints Logo" />
          </div>
          <div className="nav-logo-text">
            Jonayskie Prints
            <span className="nav-logo-sub">Premium Printing</span>
          </div>
        </div>

        <ul className="nav-links">
          {(["home", "services", "about", "contact"] as NavSection[]).map(
            (s) => (
              <li key={s}>
                <button
                  className={`nav-link-btn ${activeNav === s ? "active" : ""}`}
                  onClick={() => scrollTo(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              </li>
            ),
          )}
        </ul>

        <div className="nav-actions">
          <Link href="/login" className="btn-login">
            Login
          </Link>
          <Link href="/register" className="btn-register">
            Register
          </Link>
        </div>

        <button className="hamburger" onClick={() => setMenuOpen((v) => !v)}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </nav>

      {/* ── MOBILE MENU ── */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <ul className="mobile-nav-links">
          {(["home", "services", "about", "contact"] as NavSection[]).map(
            (s) => (
              <li key={s}>
                <button
                  className={`mobile-nav-btn ${activeNav === s ? "active" : ""}`}
                  onClick={() => scrollTo(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              </li>
            ),
          )}
        </ul>
        <div className="mobile-actions">
          <Link href="/login" className="btn-login">
            Login
          </Link>
          <Link href="/register" className="btn-register">
            Register
          </Link>
        </div>
      </div>

      {/* ── HERO ── */}
      <section id="home" ref={heroRef as React.RefObject<HTMLElement>}>
        <div className="hero">
          <div className="hero-stripe" />
          <div className="hero-inner">
            <div className="hero-content">
              <div className="hero-tag">
                <IcoPrinterNav />
                Professional Printing Services
              </div>

              <h1 className="hero-title">
                Print with <em>precision.</em>
                <br />
                Deliver with pride.
              </h1>

              <p className="hero-subtitle">
                Your trusted partner for all printing needs — from documents to
                photos, we&apos;ve got you covered with fast, high-quality
                results.
              </p>

              <div className="hero-cta">
                <Link href="/register" className="cta-primary">
                  Get Started Free →
                </Link>
                <Link href="/login" className="cta-secondary">
                  Sign In
                </Link>
              </div>

              <div className="hero-stats">
                {[
                  { value: "500+", label: "Happy Clients" },
                  { value: "5K+", label: "Orders Done" },
                  { value: "5★", label: "Rating" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="hero-stat-value">{s.value}</div>
                    <div className="hero-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section
        id="services"
        ref={servicesRef as React.RefObject<HTMLElement>}
        className="services-section"
      >
        <div
          ref={servicesReveal.ref}
          className={`section-inner reveal ${servicesReveal.inView ? "in" : ""}`}
        >
          <div className="section-tag">What We Offer</div>
          <h2 className="section-title">Our Services</h2>
          <p className="section-subtitle">
            From everyday document printing to specialized photo development, we
            cover all your printing needs under one roof.
          </p>
          <div className="services-grid">
            {SERVICES.map((s, i) => (
              <div
                key={s.title}
                className={`service-card reveal ${servicesReveal.inView ? "in" : ""} reveal-delay-${i + 1}`}
              >
                <div className="service-icon-wrap">{s.icon}</div>
                <div className="service-title">{s.title}</div>
                <div className="service-desc">{s.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section
        id="about"
        ref={aboutRef as React.RefObject<HTMLElement>}
        className="about-section"
      >
        <div
          ref={aboutReveal.ref}
          className={`section-inner reveal ${aboutReveal.inView ? "in" : ""}`}
        >
          <div className="about-grid">
            <div className="about-text">
              <div className="section-tag">Who We Are</div>
              <h2 className="section-title">About Jonayskie Prints</h2>
              <p>
                We are a trusted printing business dedicated to providing
                high-quality printing services to our community. With years of
                experience in the industry, we understand the importance of
                delivering professional results on time.
              </p>
              <p>Our modern order management system allows you to:</p>
              <ul className="about-checklist">
                {[
                  "Upload files directly online",
                  "Track your order status in real-time",
                  "Manage your printing history",
                  "Get instant quotes for your projects",
                ].map((item, i) => (
                  <li
                    key={item}
                    className={`about-check reveal ${aboutReveal.inView ? "in" : ""} reveal-delay-${i + 1}`}
                  >
                    <span className="check-dot">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="feature-cards">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className={`feature-card reveal ${aboutReveal.inView ? "in" : ""} reveal-delay-${i + 1}`}
                >
                  <div className="feature-icon">{f.icon}</div>
                  <div>
                    <div className="feature-title">{f.title}</div>
                    <div className="feature-desc">{f.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section
        id="contact"
        ref={contactRef as React.RefObject<HTMLElement>}
        className="contact-section"
      >
        <div
          ref={contactReveal.ref}
          className={`section-inner reveal ${contactReveal.inView ? "in" : ""}`}
        >
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div className="section-tag" style={{ justifyContent: "center" }}>
              Get In Touch
            </div>
            <h2 className="section-title" style={{ textAlign: "center" }}>
              Contact Us
            </h2>
          </div>
          <div className="contact-grid">
            {CONTACT_ITEMS.map((c, i) => (
              <div
                key={c.label}
                className={`contact-card reveal ${contactReveal.inView ? "in" : ""} reveal-delay-${i + 1}`}
              >
                <div className="contact-icon">{c.icon}</div>
                <div>
                  <div className="contact-label">{c.label}</div>
                  <div className="contact-value">{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-brand-name">
                <div className="footer-logo-box">
                  <IcoPrinterNav />
                </div>
                Jonayskie Prints
              </div>
              <p className="footer-brand-desc">
                Your trusted partner for professional printing services.
              </p>
            </div>

            <div>
              <div className="footer-col-title">Quick Links</div>
              <ul className="footer-links">
                {(["home", "services", "about", "contact"] as NavSection[]).map(
                  (s) => (
                    <li key={s}>
                      <button
                        className="footer-link-btn"
                        onClick={() => scrollTo(s)}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Services</div>
              <ul className="footer-links">
                {[
                  "Document Printing",
                  "Photocopying",
                  "Scanning",
                  "Photo Development",
                  "Laminating",
                ].map((s) => (
                  <li key={s}>
                    <button
                      className="footer-link-btn"
                      onClick={() => scrollTo("services")}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 Jonayskie Prints. All rights reserved.</span>
            <span>Brgy. San Joseph, Santa Rosa, Nueva Ecija</span>
          </div>
        </div>
      </footer>
    </>
  );
}
