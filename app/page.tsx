"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type NavSection = "home" | "services" | "about" | "contact";

interface ServiceCard {
  icon: string;
  title: string;
  description: string;
}

interface ContactItem {
  icon: string;
  label: string;
  value: string;
}

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const SERVICES: ServiceCard[] = [
  { icon: "🖨", title: "Document Printing", description: "High-quality document printing in various sizes and formats." },
  { icon: "📋", title: "Photocopying (Xerox)", description: "Fast and reliable photocopying services for all your needs." },
  { icon: "🔍", title: "Scanning", description: "Professional scanning services to digitize your documents." },
  { icon: "📷", title: "Photo Development", description: "Beautiful photo prints in various sizes and finishes." },
  { icon: "✨", title: "Laminating", description: "Protect your important documents with our laminating service." },
  { icon: "⚡", title: "Quick Turnaround", description: "Fast processing times to meet your urgent printing needs." },
];

const FEATURES: FeatureCard[] = [
  { icon: "👥", title: "Free Membership", description: "No registration fees — join our community for free!" },
  { icon: "📤", title: "Easy File Upload", description: "Upload your files securely through our platform." },
  { icon: "📍", title: "Order Tracking", description: "Monitor your order progress from start to finish." },
];

const CONTACT_ITEMS: ContactItem[] = [
  { icon: "📍", label: "Address", value: "Brgy. San Joseph, Santa Rosa, Nueva Ecija" },
  { icon: "📞", label: "Phone", value: "+6393 5033 6938" },
  { icon: "✉", label: "Email", value: "info@jonayskieprints.com" },
  { icon: "🕐", label: "Business Hours", value: "Mon–Sat: 8:00 AM – 6:00 PM" },
];

// ─── Hook: Intersection Observer ─────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── PrinterSVG (decorative) ─────────────────────────────────────────────────

function PrinterSVG() {
  return (
    <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: "340px" }}>
      <rect x="30" y="70" width="160" height="90" rx="14" fill="rgba(255,255,255,0.08)" />
      <rect x="60" y="40" width="100" height="45" rx="8" fill="rgba(255,255,255,0.05)" />
      <rect x="75" y="140" width="70" height="52" rx="6" fill="rgba(255,255,255,0.06)" />
      <rect x="85" y="152" width="50" height="3" rx="2" fill="rgba(255,255,255,0.3)" />
      <rect x="85" y="161" width="38" height="3" rx="2" fill="rgba(255,255,255,0.2)" />
      <rect x="85" y="170" width="44" height="3" rx="2" fill="rgba(255,255,255,0.15)" />
      <circle cx="155" cy="112" r="7" fill="#e63329" opacity="0.9" />
      <circle cx="172" cy="112" r="7" fill="rgba(255,255,255,0.15)" />
      <rect x="48" y="88" width="60" height="6" rx="3" fill="rgba(255,255,255,0.12)" />
      <rect x="48" y="100" width="40" height="6" rx="3" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
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
      home: heroRef, services: servicesRef, about: aboutRef, contact: contactRef,
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
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 200;
          padding: 0 2rem;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          box-shadow: 0 1px 0 var(--border);
        }
        .nav.scrolled {
          background: #ffffff;
          box-shadow: 0 1px 8px rgba(0,0,0,0.08);
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          text-decoration: none;
          cursor: pointer;
        }

        .nav-logo-icon {
          width: 38px;
          height: 38px;
          background: transparent;   /* removed background */
          border-radius: 0;           /* optional: remove rounded box */
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.05rem;
          color: var(--ink);
          line-height: 1.1;
          letter-spacing: -0.01em;
        }

        .nav-logo-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.62rem;
          font-weight: 300;
          color: var(--muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          display: block;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          list-style: none;
        }

        .nav-link-btn {
          background: none; border: none; cursor: pointer;
          padding: 0.45rem 0.85rem;
          border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--ink);
          transition: color 0.2s, background 0.2s;
        }
        .nav-link-btn:hover { color: var(--accent); background: rgba(37,99,235,0.06); }
        .nav-link-btn.active { color: var(--accent) !important; font-weight: 600; }

        .nav-actions { display: flex; align-items: center; gap: 0.65rem; }

        .btn-login {
          padding: 0.5rem 1.25rem;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 99px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
          display: inline-flex; align-items: center;
        }
        .btn-login:hover { background: var(--accent-dark); transform: translateY(-1px); }

        .btn-register {
          padding: 0.5rem 1.25rem;
          background: transparent;
          color: var(--accent);
          border: 2px solid var(--accent);
          border-radius: 99px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          display: inline-flex; align-items: center;
        }
        .btn-register:hover { background: rgba(37,99,235,0.06); }
        .hamburger {
          display: none;
          background: none; border: none; cursor: pointer;
          color: var(--ink); font-size: 1.3rem; padding: 4px;
        }

        .mobile-menu {
          position: fixed;
          top: 68px; left: 0; right: 0;
          background: var(--paper);
          border-bottom: 1px solid var(--border);
          padding: 1rem 2rem 1.5rem;
          z-index: 190;
          transform: translateY(-110%);
          transition: transform 0.3s;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .mobile-menu.open { transform: translateY(0); }

        .mobile-nav-links { list-style: none; display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
        .mobile-nav-btn {
          width: 100%; text-align: left;
          background: none; border: none; cursor: pointer;
          padding: 0.65rem 0.75rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem; font-weight: 500; color: var(--ink);
          border-radius: 7px;
          transition: background 0.15s;
        }
        .mobile-nav-btn:hover { background: rgba(0,0,0,0.04); }
        .mobile-nav-btn.active { color: var(--accent); font-weight: 600; }
        .mobile-actions { display: flex; gap: 0.75rem; }
        .mobile-actions .btn-login, .mobile-actions .btn-register {
          flex: 1; justify-content: center;
          color: var(--ink) !important;
          border-color: var(--border) !important;
        }
        .mobile-actions .btn-login { background: var(--accent); color: #fff !important; border-color: var(--accent) !important; }

        /* ── HERO ── */
        .hero {
          min-height: 100vh;
          background: linear-gradient(135deg, #5b6dee 0%, #7c3aed 50%, #a855f7 100%);
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
          padding: 7rem 2rem 4rem;
        }

        .hero::before {
          content: '';
          position: absolute;
          top: -120px; left: -120px;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero::after {
          content: '';
          position: absolute;
          bottom: -80px; right: 15%;
          width: 350px; height: 350px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        /* diagonal accent stripe */
        .hero-stripe {
          position: absolute;
          top: 0; right: 0;
          width: 38%;
          height: 100%;
          background: rgba(255,255,255,0.025);
          clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%);
          pointer-events: none;
        }

        .hero-inner {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3rem;
          position: relative;
          z-index: 1;
          text-align: center;
        }

        .hero-content { flex: 1; max-width: 720px; display: flex; flex-direction: column; align-items: center; }

        .hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(37,99,235,0.3);
          color: rgba(255,255,255,0.9);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 99px;
          margin-bottom: 1.5rem;
          animation: fadeUp 0.6s ease both;
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.8rem, 5.5vw, 4.5rem);
          line-height: 1.12;
          color: #fff;
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
          animation: fadeUp 0.65s 0.1s ease both;
        }

        .hero-title em {
          color: #93c5fd;
          font-style: italic;
        }

        .hero-subtitle {
          font-size: 1rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.7;
          max-width: 520px;
          font-weight: 300;
          margin-bottom: 2.25rem;
          animation: fadeUp 0.65s 0.2s ease both;
        }

        .hero-cta {
          display: flex;
          gap: 0.85rem;
          flex-wrap: wrap;
          animation: fadeUp 0.65s 0.3s ease both;
          justify-content: center;
        }

        .cta-primary {
          padding: 0.9rem 2rem;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 99px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .cta-primary:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

        .cta-secondary {
          padding: 0.9rem 2rem;
          background: transparent;
          color: #fff;
          border: 2px solid rgba(255,255,255,0.7);
          border-radius: 99px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .cta-secondary:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.9); }

        .hero-visual {
          flex: 0 0 340px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeUp 0.7s 0.35s ease both;
          position: relative;
        }

        .hero-visual-bg {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
        }

        .hero-stats {
          display: flex;
          gap: 2.5rem;
          margin-top: 3rem;
          animation: fadeUp 0.65s 0.45s ease both;
          justify-content: center;
        }

        .hero-stat-value {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          color: #fff;
          font-weight: 700;
        }

        .hero-stat-label {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
          margin-top: 1px;
        }

        /* ── SECTIONS SHARED ── */
        .section-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 5rem 2rem;
        }

        .section-tag {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 0.65rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .section-tag::before {
          content: '';
          display: inline-block;
          width: 20px; height: 2px;
          background: var(--accent);
          border-radius: 2px;
        }
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.75rem, 3.5vw, 2.5rem);
          color: var(--ink);
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-bottom: 0.75rem;
        }

        .section-subtitle {
          font-size: 0.95rem;
          color: var(--muted);
          font-weight: 300;
          line-height: 1.65;
          max-width: 500px;
          margin-bottom: 3rem;
        }

        /* ── REVEAL ANIMATION ── */
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

        .services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }

        .service-card {
          background: var(--paper);
          border: 1.5px solid var(--border);
          border-radius: 14px;
          padding: 2rem 1.5rem;
          text-align: center;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          cursor: default;
        }
        .service-card:hover {
          border-color: var(--accent);
          box-shadow: 0 8px 28px rgba(37,99,235,0.1);
          transform: translateY(-3px);
        }

        .service-icon-wrap {
          width: 56px; height: 56px;
          background: var(--accent);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem;
          margin: 0 auto 1rem;
          transition: background 0.2s;
        }
        .service-card:hover .service-icon-wrap { background: var(--accent-dark); }

        .service-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.05rem;
          color: var(--ink);
          margin-bottom: 0.5rem;
          letter-spacing: -0.01em;
        }

        .service-desc {
          font-size: 0.85rem;
          color: var(--muted);
          line-height: 1.6;
          font-weight: 300;
        }

        /* ── ABOUT ── */
        .about-section { background: var(--paper); min-height: 100vh; display: flex; align-items: center; }

        .about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: start;
        }

        .about-text p {
          font-size: 0.95rem;
          color: #555;
          line-height: 1.8;
          font-weight: 300;
          margin-bottom: 1.25rem;
        }

        .about-checklist {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          margin-top: 1rem;
        }

        .about-check {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.9rem;
          color: var(--ink);
          font-weight: 400;
        }

        .check-dot {
          width: 20px; height: 20px;
          background: var(--success);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem;
          color: #fff;
          flex-shrink: 0;
        }

        .feature-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .feature-card {
          background: #fff;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .feature-card:hover { border-color: var(--accent); box-shadow: 0 4px 16px rgba(37,99,235,0.08); }

        .feature-icon {
          width: 42px; height: 42px;
          background: var(--accent);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .feature-title {
          font-family: 'Playfair Display', serif;
          font-size: 0.95rem;
          color: var(--ink);
          margin-bottom: 0.25rem;
        }

        .feature-desc {
          font-size: 0.82rem;
          color: var(--muted);
          line-height: 1.55;
          font-weight: 300;
        }

        /* ── CONTACT ── */
        .contact-section { background: #fff; min-height: 100vh; display: flex; align-items: center; }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .contact-card {
          background: var(--paper);
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .contact-card:hover { border-color: var(--accent); box-shadow: 0 4px 16px rgba(37,99,235,0.08); }

        .contact-icon {
          width: 44px; height: 44px;
          background: var(--accent);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .contact-label {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 3px;
        }

        .contact-value {
          font-size: 0.9rem;
          color: var(--ink);
          font-weight: 500;
        }

        /* ── FOOTER ── */
        .footer {
          background: var(--ink);
          padding: 3.5rem 2rem 2rem;
        }

        .footer-inner {
          max-width: 1100px;
          margin: 0 auto;
        }

        .footer-top {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr;
          gap: 3rem;
          padding-bottom: 2.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 1.5rem;
        }

        .footer-brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 0.65rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .footer-brand-desc {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.4);
          line-height: 1.7;
          font-weight: 300;
        }

        .footer-col-title {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 1rem;
        }

        .footer-links { list-style: none; display: flex; flex-direction: column; gap: 0.55rem; }
        .footer-link-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.45);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 400;
          text-align: left;
          padding: 0;
          transition: color 0.2s;
        }
        .footer-link-btn:hover { color: rgba(255,255,255,0.85); }

        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.25);
          flex-wrap: wrap;
          gap: 0.5rem;
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
          .hero-visual { display: none; }
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
          {(["home", "services", "about", "contact"] as NavSection[]).map((s) => (
            <li key={s}>
              <button className={`nav-link-btn ${activeNav === s ? "active" : ""}`} onClick={() => scrollTo(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          <Link href="/login" className="btn-login">Login</Link>
          <Link href="/register" className="btn-register">Register</Link>
        </div>

        <button className="hamburger" onClick={() => setMenuOpen((v) => !v)}>☰</button>
      </nav>

      {/* ── MOBILE MENU ── */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <ul className="mobile-nav-links">
          {(["home", "services", "about", "contact"] as NavSection[]).map((s) => (
            <li key={s}>
              <button className={`mobile-nav-btn ${activeNav === s ? "active" : ""}`} onClick={() => scrollTo(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            </li>
          ))}
        </ul>
        <div className="mobile-actions">
          <Link href="/login" className="btn-login">Login</Link>
          <Link href="/register" className="btn-register">Register</Link>
        </div>
      </div>

      {/* ── HERO ── */}
      <section id="home" ref={heroRef as React.RefObject<HTMLElement>}>
        <div className="hero">
          <div className="hero-stripe" />
          <div className="hero-inner">
            <div className="hero-content">
              <div className="hero-tag">
                <span>🖨</span> Professional Printing Services
              </div>

              <h1 className="hero-title">
                Print with <em>precision.</em>
                <br />Deliver with pride.
              </h1>

              <p className="hero-subtitle">
                Your trusted partner for all printing needs — from documents to photos,
                we've got you covered with fast, high-quality results.
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
      <section id="services" ref={servicesRef as React.RefObject<HTMLElement>} className="services-section">
        <div ref={servicesReveal.ref} className={`section-inner reveal ${servicesReveal.inView ? "in" : ""}`}>
          <div className="section-tag">What We Offer</div>
          <h2 className="section-title">Our Services</h2>
          <p className="section-subtitle">
            From everyday document printing to specialized photo development, we cover all your printing needs under one roof.
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
      <section id="about" ref={aboutRef as React.RefObject<HTMLElement>} className="about-section">
        <div ref={aboutReveal.ref} className={`section-inner reveal ${aboutReveal.inView ? "in" : ""}`}>
          <div className="about-grid">
            <div className="about-text">
              <div className="section-tag">Who We Are</div>
              <h2 className="section-title">About Jonayskie Prints</h2>
              <p>
                We are a trusted printing business dedicated to providing high-quality
                printing services to our community. With years of experience in the
                industry, we understand the importance of delivering professional results on time.
              </p>
              <p>
                Our modern order management system allows you to:
              </p>

              <ul className="about-checklist">
                {[
                  "Upload files directly online",
                  "Track your order status in real-time",
                  "Manage your printing history",
                  "Get instant quotes for your projects",
                ].map((item, i) => (
                  <li key={item} className={`about-check reveal ${aboutReveal.inView ? "in" : ""} reveal-delay-${i + 1}`}>
                    <span className="check-dot">✓</span>
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
      <section id="contact" ref={contactRef as React.RefObject<HTMLElement>} className="contact-section">
        <div ref={contactReveal.ref} className={`section-inner reveal ${contactReveal.inView ? "in" : ""}`}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div className="section-tag" style={{ justifyContent: "center" }}>Get In Touch</div>
            <h2 className="section-title" style={{ textAlign: "center" }}>Contact Us</h2>
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
                <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>JP</div>
                Jonayskie Prints
              </div>
              <p className="footer-brand-desc">
                Your trusted partner for professional printing services.
              </p>
            </div>

            <div>
              <div className="footer-col-title">Quick Links</div>
              <ul className="footer-links">
                {(["home", "services", "about", "contact"] as NavSection[]).map((s) => (
                  <li key={s}>
                    <button className="footer-link-btn" onClick={() => scrollTo(s)}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Services</div>
              <ul className="footer-links">
                {["Document Printing", "Photocopying", "Scanning", "Photo Development", "Laminating"].map((s) => (
                  <li key={s}>
                    <button className="footer-link-btn" onClick={() => scrollTo("services")}>{s}</button>
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