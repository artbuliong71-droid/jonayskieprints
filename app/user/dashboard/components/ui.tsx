"use client";

import { useState, useEffect, useRef } from "react";
import { Toast, PICKUP_TIMES } from "./types";

// ─── Toast ────────────────────────────────────────────────────────────────────

export function ToastNotification({ toast }: { toast: Toast }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        left: "50%",
        transform: toast.visible
          ? "translate(-50%,0)"
          : "translate(-50%,-12px)",
        width: "calc(100% - 2rem)",
        maxWidth: "400px",
        padding: ".75rem 1rem",
        borderRadius: "10px",
        color: "#fff",
        fontWeight: 600,
        fontSize: ".84rem",
        zIndex: 9999,
        opacity: toast.visible ? 1 : 0,
        transition: "all 0.3s",
        pointerEvents: "none",
        boxShadow: "0 8px 24px rgba(0,0,0,.2)",
        display: "flex",
        alignItems: "center",
        gap: ".5rem",
        background: toast.type === "success" ? "#22c55e" : "#ef4444",
        fontFamily: "'Inter',sans-serif",
      }}
    >
      {toast.type === "success" ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {toast.message}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="stat-card">
      <div
        className="stat-icon-wrap"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="stat-right">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// ─── PickupTimeDropdown ───────────────────────────────────────────────────────

export function PickupTimeDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = PICKUP_TIMES.find((t) => t.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: ".58rem .78rem",
          border: `1.5px solid ${open ? "#7c3aed" : "#e5e7eb"}`,
          borderRadius: 8,
          background: "#fff",
          fontFamily: "'Inter',sans-serif",
          fontSize: ".875rem",
          color: selected ? "#111827" : "#9ca3af",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: open ? "0 0 0 3px rgba(124,58,237,.1)" : "none",
          transition: "border-color .2s, box-shadow .2s",
        }}
      >
        <span>{selected ? selected.label : "-- Select Pickup Time --"}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .2s",
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            zIndex: 9000,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {PICKUP_TIMES.map((t) => (
            <div
              key={t.value}
              onClick={() => {
                onChange(t.value);
                setOpen(false);
              }}
              style={{
                padding: ".55rem .78rem",
                fontSize: ".875rem",
                cursor: "pointer",
                fontFamily: "'Inter',sans-serif",
                background: value === t.value ? "#ede9fe" : "transparent",
                color: value === t.value ? "#7c3aed" : "#111827",
                fontWeight: value === t.value ? 600 : 400,
                transition: "background .1s",
              }}
              onMouseEnter={(e) => {
                if (value !== t.value)
                  (e.currentTarget as HTMLDivElement).style.background =
                    "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                if (value !== t.value)
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
              }}
            >
              {t.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
