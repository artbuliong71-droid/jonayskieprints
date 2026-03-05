"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import Link from "next/link";

interface User {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
}
interface Prices {
  print_bw: number;
  print_color: number;
  photocopying: number;
  scanning: number;
  photo_development: number;
  laminating: number;
}
interface Order {
  order_id: number;
  service: string;
  quantity: number;
  specifications: string;
  delivery_option: string;
  delivery_address: string | null;
  pickup_time: string | null;
  status: string;
  payment_method: string;
  created_at: string;
  total_amount: string;
}
interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: string;
}
interface Toast {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

type Section = "dashboard" | "new-order" | "orders" | "profile";
type PaperSize = "A4" | "Short" | "Long";
type ColorOption = "bw" | "color";
type DeliveryOption = "pickup" | "delivery";

const SERVICES = [
  "Print",
  "Photocopy",
  "Scanning",
  "Photo Development",
  "Laminating",
];

const DEFAULT_PRICES: Prices = {
  print_bw: 1.0,
  print_color: 2.0,
  photocopying: 2.0,
  scanning: 5.0,
  photo_development: 15.0,
  laminating: 20.0,
};
const PAPER_MULTIPLIERS: Record<PaperSize, number> = {
  A4: 1.0,
  Short: 1.0,
  Long: 1.2,
};

async function getPdfPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const text = new TextDecoder("latin1").decode(bytes);
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

function formatPickupTime(time24: string): string {
  try {
    const [h, m] = time24.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  } catch {
    return time24;
  }
}

function extractUserSpecs(specifications: string): string {
  return specifications
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return (
        t === "" ||
        (!t.startsWith("Paper Size:") &&
          !t.startsWith("Print Type:") &&
          !t.startsWith("Copy Type:") &&
          !t.startsWith("Scan Type:") &&
          !t.startsWith("Photo Size:") &&
          !t.startsWith("Add Lamination: Yes") &&
          !t.startsWith("PDF Pages:") &&
          !t.startsWith("Copies:") &&
          !t.startsWith("Pickup Time:"))
      );
    })
    .join("\n")
    .trim();
}

function parseSpecsOptions(specifications: string) {
  const result: {
    paperSize: PaperSize | null;
    photoSize: string | null;
    colorOption: ColorOption | null;
    addLamination: boolean;
    pickupTime: string | null;
  } = {
    paperSize: null,
    photoSize: null,
    colorOption: null,
    addLamination: false,
    pickupTime: null,
  };
  for (const line of specifications.split("\n")) {
    const t = line.trim();
    if (t.startsWith("Paper Size:")) {
      const sz = t.split(":")[1]?.trim() as PaperSize;
      if (["A4", "Short", "Long"].includes(sz)) result.paperSize = sz;
    } else if (t.startsWith("Print Type:") || t.startsWith("Scan Type:"))
      result.colorOption = t.includes("Color") ? "color" : "bw";
    else if (t.startsWith("Copy Type:")) result.colorOption = "color";
    else if (t.startsWith("Photo Size:"))
      result.photoSize = t.split(":")[1]?.trim().replace("Glossy ", "") || null;
    else if (t.startsWith("Add Lamination: Yes")) result.addLamination = true;
  }
  return result;
}

function sp(val: unknown, fallback: number): number {
  const parsed = Number(val);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

function calcTotal(
  service: string,
  quantity: number,
  colorOption: ColorOption,
  paperSize: PaperSize,
  photoSize: string,
  addLamination: boolean,
  prices: Prices,
): number {
  const qty = Number(quantity);
  if (!service || isNaN(qty) || qty < 1) return 0;
  const sl = service.toLowerCase().trim();
  const m = PAPER_MULTIPLIERS[paperSize] ?? 1.0;
  let unitPrice = 0;
  if (sl === "print")
    unitPrice =
      (colorOption === "color"
        ? sp(prices.print_color, 2)
        : sp(prices.print_bw, 1)) * m;
  else if (sl === "photocopy") unitPrice = sp(prices.photocopying, 2) * m;
  else if (sl === "scanning") unitPrice = sp(prices.scanning, 5) * m;
  else if (sl === "photo development")
    unitPrice = sp(prices.photo_development, 15);
  else if (sl === "laminating") unitPrice = sp(prices.laminating, 20);
  let total = unitPrice * qty;
  if (addLamination && sl !== "laminating")
    total += sp(prices.laminating, 20) * qty;
  return total;
}

// ── Icons ─────────────────────────────────────────────────────────────────
const IC = {
  Menu: () => (
    <svg
      width="20"
      height="20"
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
  ),
  Grid: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Plus: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  List: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1.2" fill="currentColor" />
      <circle cx="3" cy="12" r="1.2" fill="currentColor" />
      <circle cx="3" cy="18" r="1.2" fill="currentColor" />
    </svg>
  ),
  User: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  Logout: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Printer: () => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Copy: () => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  ),
  Scan: () => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
  Camera: () => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Layers: () => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Cart: () => (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57l1.65-8.43H6" />
    </svg>
  ),
  Clock: () => (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Check: () => (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Card: () => (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  Tag: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  Refresh: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  ),
  Eye: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  Pencil: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Home: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Truck: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  PDF: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  ),
  Lock: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  Info: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Calendar: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  ClockSmall: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  XCircle: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

function ToastNotification({ toast }: { toast: Toast }) {
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

function StatCard({
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

// ── Cancel Confirmation Modal ────────────────────────────────────────────────
function CancelConfirmModal({
  orderId,
  onConfirm,
  onClose,
}: {
  orderId: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        zIndex: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          width: "100%",
          maxWidth: 380,
          padding: "1.5rem 1.4rem",
          boxShadow: "0 24px 60px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".6rem",
            marginBottom: ".75rem",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <div
              style={{ fontWeight: 700, fontSize: ".95rem", color: "#111827" }}
            >
              Cancel Order
            </div>
            <div style={{ fontSize: ".73rem", color: "#6b7280", marginTop: 2 }}>
              Order #{orderId}
            </div>
          </div>
        </div>
        <p
          style={{
            fontSize: ".83rem",
            color: "#374151",
            lineHeight: 1.6,
            marginBottom: "1.2rem",
          }}
        >
          Are you sure you want to cancel this order? This action{" "}
          <strong>cannot be undone</strong>.
        </p>
        <div
          style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}
        >
          <button
            onClick={onClose}
            style={{
              padding: ".55rem 1.1rem",
              borderRadius: 8,
              border: "1.5px solid #e5e7eb",
              background: "transparent",
              color: "#374151",
              fontFamily: "'Inter',sans-serif",
              fontSize: ".83rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Keep Order
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: ".55rem 1.1rem",
              borderRadius: 8,
              border: "none",
              background: "#ef4444",
              color: "#fff",
              fontFamily: "'Inter',sans-serif",
              fontSize: ".83rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(239,68,68,.3)",
            }}
          >
            Yes, Cancel Order
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<Toast>({
    message: "",
    type: "success",
    visible: false,
  });
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);
  const [priceUpdateTime, setPriceUpdateTime] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: "0.00",
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ── Cancel modal state ──
  const [cancelModalOrderId, setCancelModalOrderId] = useState<number | null>(
    null,
  );
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // ── New Order state ──
  const [step, setStep] = useState(0);
  const [noService, setNoService] = useState("");
  const [noQuantity, setNoQuantity] = useState<number | "">("");
  const [noCopies, setNoCopies] = useState<number | "">(1);
  const [noDelivery, setNoDelivery] = useState<DeliveryOption>("pickup");
  const [noAddress, setNoAddress] = useState("");
  const [noPickupTime, setNoPickupTime] = useState("");
  const [noPaperSize, setNoPaperSize] = useState<PaperSize>("A4");
  const [noPhotoSize, setNoPhotoSize] = useState("A4");
  const [noColorOption, setNoColorOption] = useState<ColorOption>("bw");
  const [noLamination, setNoLamination] = useState(false);
  const [noSpecs, setNoSpecs] = useState("");
  const [noFiles, setNoFiles] = useState<FileList | null>(null);
  const [noSubmitting, setNoSubmitting] = useState(false);
  const [noPdfPages, setNoPdfPages] = useState(0);

  // ── Edit Order state ──
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Partial<Order> | null>(null);
  const [eoService, setEoService] = useState("");
  const [eoQuantity, setEoQuantity] = useState<number | "">("");
  const [eoCopies, setEoCopies] = useState<number | "">(1);
  const [eoDelivery, setEoDelivery] = useState<DeliveryOption>("pickup");
  const [eoAddress, setEoAddress] = useState("");
  const [eoPickupTime, setEoPickupTime] = useState("");
  const [eoPaperSize, setEoPaperSize] = useState<PaperSize>("A4");
  const [eoPhotoSize, setEoPhotoSize] = useState("A4");
  const [eoColorOption, setEoColorOption] = useState<ColorOption>("bw");
  const [eoLamination, setEoLamination] = useState(false);
  const [eoSpecs, setEoSpecs] = useState("");
  const [eoSubmitting, setEoSubmitting] = useState(false);
  const [eoPdfPages, setEoPdfPages] = useState(0);

  // ── Profile state ──
  const [user, setUser] = useState<User>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "customer",
  });
  const [profFirstName, setProfFirstName] = useState("");
  const [profLastName, setProfLastName] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profCurrentPw, setProfCurrentPw] = useState("");
  const [profNewPw, setProfNewPw] = useState("");
  const [profConfirmPw, setProfConfirmPw] = useState("");
  const [showCurrPw, setShowCurrPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [profSubmitting, setProfSubmitting] = useState(false);
  const [profTab, setProfTab] = useState<"info" | "password">("info");
  const [profAvatar, setProfAvatar] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type, visible: true });
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 5000);
    },
    [],
  );

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(`/api/pricing?t=${Date.now()}`);
      const data = await res.json();
      setPrices({
        print_bw: sp(data.print_bw, DEFAULT_PRICES.print_bw),
        print_color: sp(data.print_color, DEFAULT_PRICES.print_color),
        photocopying: sp(data.photocopying, DEFAULT_PRICES.photocopying),
        scanning: sp(data.scanning, DEFAULT_PRICES.scanning),
        photo_development: sp(
          data.photo_development,
          DEFAULT_PRICES.photo_development,
        ),
        laminating: sp(data.laminating, DEFAULT_PRICES.laminating),
      });
      setPriceUpdateTime(new Date().toLocaleTimeString());
    } catch {
      setPrices(DEFAULT_PRICES);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard?action=getDashboardStats");
      const r = await res.json();
      if (r.success) setStats(r.data);
    } catch {}
  }, []);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard?action=getOrders");
      const r = await res.json();
      if (r.success) setRecentOrders(r.data.orders.slice(0, 5));
    } catch {}
  }, []);

  const fetchOrders = useCallback(async (status = "") => {
    setOrdersLoading(true);
    try {
      const url = status
        ? `/api/dashboard?action=getOrders&status=${status}`
        : "/api/dashboard?action=getOrders";
      const res = await fetch(url);
      const r = await res.json();
      if (r.success) setAllOrders(r.data.orders);
    } catch {}
    setOrdersLoading(false);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard?action=getUser");
      const r = await res.json();
      if (r.success) {
        const u = r.data;
        setUser(u);
        setProfFirstName(u.first_name);
        setProfLastName(u.last_name);
        setProfEmail(u.email);
        setProfPhone(u.phone || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchStats();
    fetchRecentOrders();
    fetchUser();
    const iv = setInterval(fetchPrices, 10000);
    return () => clearInterval(iv);
  }, [fetchPrices, fetchStats, fetchRecentOrders, fetchUser]);

  useEffect(() => {
    if (activeSection === "orders") fetchOrders(orderFilter);
    if (activeSection === "dashboard") {
      fetchStats();
      fetchRecentOrders();
      fetchPrices();
    }
  }, [
    activeSection,
    orderFilter,
    fetchOrders,
    fetchStats,
    fetchRecentOrders,
    fetchPrices,
  ]);

  // ── CANCEL ORDER HANDLER ──────────────────────────────────────────────────
  async function handleCancelOrder(orderId: number) {
    setCancellingId(orderId);
    try {
      const fd = new FormData();
      fd.append("order_id", String(orderId));
      fd.append("status", "cancelled");
      const res = await fetch("/api/dashboard?action=cancelOrder", {
        method: "POST",
        body: fd,
      });
      const r = await res.json();
      if (r.success) {
        showToast("Order cancelled successfully.");
        fetchOrders(orderFilter);
        fetchStats();
        fetchRecentOrders();
      } else {
        showToast(r.message || "Could not cancel order.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    }
    setCancellingId(null);
    setCancelModalOrderId(null);
  }

  const showsPaper = ["Print", "Photocopy", "Scanning"].includes(noService);
  const showsPhoto = noService === "Photo Development";
  const showsColor = noService === "Print" || noService === "Scanning";
  const showsLam = [
    "Print",
    "Photocopy",
    "Scanning",
    "Photo Development",
  ].includes(noService);
  const showsCopies = noService === "Print" || noService === "Photocopy";
  const eoShowsPaper = ["Print", "Photocopy", "Scanning"].includes(eoService);
  const eoShowsPhoto = eoService === "Photo Development";
  const eoShowsColor = eoService === "Print" || eoService === "Scanning";
  const eoShowsLam = [
    "Print",
    "Photocopy",
    "Scanning",
    "Photo Development",
  ].includes(eoService);
  const eoShowsCopies = eoService === "Print" || eoService === "Photocopy";

  const effectiveQuantity = (() => {
    if (noQuantity !== "" && Number(noQuantity) >= 1) return Number(noQuantity);
    if (showsCopies) return Number(noCopies) || 1;
    return 0;
  })();

  const summaryTotal =
    noService && effectiveQuantity >= 1
      ? calcTotal(
          noService,
          effectiveQuantity,
          noColorOption,
          noPaperSize,
          noPhotoSize,
          noLamination,
          prices,
        )
      : 0;

  async function handleFileChange(files: FileList | null) {
    setNoFiles(files);
    setNoPdfPages(0);
    if (!files || files.length === 0) return;
    if (noService === "Print" || noService === "Photocopy") {
      const pdfFile = Array.from(files).find((f) =>
        f.name.toLowerCase().endsWith(".pdf"),
      );
      if (pdfFile) {
        const pages = await getPdfPageCount(pdfFile);
        if (pages > 0) {
          setNoPdfPages(pages);
          const copies = Number(noCopies) || 1;
          setNoQuantity(pages * copies);
          showToast(
            `PDF: ${pages} pages × ${copies} copies = ${pages * copies} total`,
            "success",
          );
        }
      }
    }
  }

  async function handleEditFileChange(files: FileList | null) {
    setEoPdfPages(0);
    if (!files || files.length === 0) return;
    if (eoService === "Print" || eoService === "Photocopy") {
      const pdfFile = Array.from(files).find((f) =>
        f.name.toLowerCase().endsWith(".pdf"),
      );
      if (pdfFile) {
        const pages = await getPdfPageCount(pdfFile);
        if (pages > 0) {
          setEoPdfPages(pages);
          const copies = Number(eoCopies) || 1;
          setEoQuantity(pages * copies);
          showToast(
            `PDF: ${pages} pages × ${copies} copies = ${pages * copies} total`,
            "success",
          );
        }
      }
    }
  }

  function handleCopiesChange(val: number | "") {
    setNoCopies(val);
    if (noPdfPages > 0 && val !== "") setNoQuantity(noPdfPages * Number(val));
  }
  function handleEoCopiesChange(val: number | "") {
    setEoCopies(val);
    if (eoPdfPages > 0 && val !== "") setEoQuantity(eoPdfPages * Number(val));
  }

  function validateStep(n: number): boolean {
    if (n === 1) {
      if (!noService) {
        showToast("Service is required.", "error");
        return false;
      }
      if (showsCopies) {
        if (noCopies === "" || Number(noCopies) < 1) {
          showToast("Number of copies must be at least 1.", "error");
          return false;
        }
      } else {
        if (noQuantity === "" || Number(noQuantity) < 1) {
          showToast("Quantity must be at least 1.", "error");
          return false;
        }
      }
      if (noDelivery === "pickup" && !noPickupTime) {
        showToast("Please select a preferred pickup time.", "error");
        return false;
      }
      if (noDelivery === "delivery" && !noAddress.trim()) {
        showToast("Delivery address is required.", "error");
        return false;
      }
    }
    if (n === 2) {
      if (!noSpecs.trim()) {
        showToast("Specifications are required.", "error");
        return false;
      }
    }
    return true;
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (
      ["Print", "Photocopy", "Photo Development"].includes(noService) &&
      (!noFiles || noFiles.length === 0)
    ) {
      showToast("Please upload at least one file.", "error");
      return;
    }
    let finalQuantity = Number(noQuantity);
    if (showsCopies && (finalQuantity < 1 || noQuantity === ""))
      finalQuantity = Number(noCopies) || 1;
    setNoSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("service", noService);
      fd.append("quantity", String(finalQuantity));
      fd.append("specifications", noSpecs);
      fd.append("delivery_option", noDelivery);
      if (noDelivery === "delivery") fd.append("delivery_address", noAddress);
      if (noDelivery === "pickup" && noPickupTime)
        fd.append("pickup_time", noPickupTime);
      fd.append("paper_size", noPaperSize);
      fd.append("photo_size", noPhotoSize);
      fd.append("color_option", noColorOption);
      if (noLamination) fd.append("add_lamination", "on");
      if (showsCopies) fd.append("copies", String(noCopies || 1));
      if (noFiles) Array.from(noFiles).forEach((f) => fd.append("files[]", f));
      const res = await fetch("/api/dashboard?action=createOrder", {
        method: "POST",
        body: fd,
      });
      const r = await res.json();
      if (r.success) {
        showToast(`Order placed! ID: ${r.data.order_id}`);
        resetForm();
        setActiveSection("dashboard");
        fetchStats();
        fetchRecentOrders();
      } else showToast(r.message || "Error placing order", "error");
    } catch (err: unknown) {
      showToast(
        "Error: " + (err instanceof Error ? err.message : String(err)),
        "error",
      );
    }
    setNoSubmitting(false);
  }

  function resetForm() {
    setStep(0);
    setNoService("");
    setNoQuantity("");
    setNoCopies(1);
    setNoDelivery("pickup");
    setNoAddress("");
    setNoPickupTime("");
    setNoPaperSize("A4");
    setNoPhotoSize("A4");
    setNoColorOption("bw");
    setNoLamination(false);
    setNoSpecs("");
    setNoFiles(null);
    setNoPdfPages(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function openEditModal(orderId: number) {
    try {
      const res = await fetch(
        `/api/dashboard?action=getOrder&order_id=${orderId}`,
      );
      const r = await res.json();
      if (!r.success) {
        showToast(r.message || "Order not found", "error");
        return;
      }
      const o: Order = r.data;

      // ── BLOCK editing cancelled orders ──
      if (o.status === "cancelled") {
        showToast("Cancelled orders cannot be edited.", "error");
        return;
      }

      setEditOrder(o);
      setEoService(o.service);
      setEoQuantity(o.quantity);
      setEoCopies(1);
      setEoDelivery(o.delivery_option as DeliveryOption);
      setEoAddress(o.delivery_address || "");
      setEoPickupTime(o.pickup_time || "");
      setEoSpecs(extractUserSpecs(o.specifications));
      const p = parseSpecsOptions(o.specifications);
      setEoPaperSize(p.paperSize || "A4");
      setEoPhotoSize(p.photoSize || "A4");
      setEoColorOption(
        p.colorOption || (o.service === "Photocopy" ? "color" : "bw"),
      );
      setEoLamination(p.addLamination);
      setEoPdfPages(0);
      setEditModalOpen(true);
    } catch {
      showToast("Error loading order", "error");
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrder) return;
    if (!eoService || !eoSpecs.trim()) {
      showToast("Fill in all required fields", "error");
      return;
    }
    if (!eoShowsCopies && (eoQuantity === "" || Number(eoQuantity) < 1)) {
      showToast("Quantity must be at least 1.", "error");
      return;
    }
    if (eoShowsCopies && (eoCopies === "" || Number(eoCopies) < 1)) {
      showToast("Number of copies must be at least 1.", "error");
      return;
    }
    if (eoDelivery === "pickup" && !eoPickupTime) {
      showToast("Please select a preferred pickup time.", "error");
      return;
    }
    if (eoDelivery === "delivery" && !eoAddress.trim()) {
      showToast("Delivery address is required", "error");
      return;
    }
    let finalQty = Number(eoQuantity);
    if (eoShowsCopies && (finalQty < 1 || eoQuantity === ""))
      finalQty = Number(eoCopies) || 1;
    setEoSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("order_id", String(editOrder.order_id));
      fd.append("service", eoService);
      fd.append("quantity", String(finalQty));
      fd.append("specifications", eoSpecs);
      fd.append("delivery_option", eoDelivery);
      if (eoDelivery === "delivery") fd.append("delivery_address", eoAddress);
      if (eoDelivery === "pickup" && eoPickupTime)
        fd.append("pickup_time", eoPickupTime);
      fd.append("paper_size", eoPaperSize);
      fd.append("photo_size", eoPhotoSize);
      fd.append("color_option", eoColorOption);
      if (eoLamination) fd.append("add_lamination", "on");
      if (eoShowsCopies) fd.append("copies", String(eoCopies || 1));
      if (editFileInputRef.current?.files?.length)
        Array.from(editFileInputRef.current.files).forEach((f) =>
          fd.append("new_files[]", f),
        );
      const res = await fetch("/api/dashboard?action=updateOrder", {
        method: "POST",
        body: fd,
      });
      const r = await res.json();
      if (r.success) {
        showToast("Order updated!");
        setEditModalOpen(false);
        fetchOrders(orderFilter);
        fetchStats();
        fetchRecentOrders();
      } else showToast(r.message || "Error updating order", "error");
    } catch (err: unknown) {
      showToast(
        "Error: " + (err instanceof Error ? err.message : String(err)),
        "error",
      );
    }
    setEoSubmitting(false);
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!profFirstName.trim()) errs.push("First name is required.");
    if (!profLastName.trim()) errs.push("Last name is required.");
    if (!profEmail.trim() || !/\S+@\S+\.\S+/.test(profEmail))
      errs.push("Valid email is required.");
    const chPw = profNewPw.trim().length > 0;
    if (chPw) {
      if (!profCurrentPw) errs.push("Current password required.");
      if (profNewPw !== profConfirmPw) errs.push("Passwords do not match.");
      if (
        profNewPw.length < 8 ||
        !/[A-Z]/.test(profNewPw) ||
        !/[0-9]/.test(profNewPw)
      )
        errs.push("Password needs 8+ chars, 1 uppercase, 1 number.");
    }
    if (errs.length) {
      showToast(errs[0], "error");
      return;
    }
    setProfSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("update_profile", "1");
      fd.append("first_name", profFirstName);
      fd.append("last_name", profLastName);
      fd.append("email", profEmail);
      fd.append("phone", profPhone);
      if (chPw) {
        fd.append("current_password", profCurrentPw);
        fd.append("new_password", profNewPw);
        fd.append("confirm_password", profConfirmPw);
      }
      const res = await fetch("/api/dashboard", { method: "POST", body: fd });
      if (res.ok) {
        showToast(
          chPw
            ? "Profile & password updated!"
            : "Profile updated successfully!",
        );
        setUser((u) => ({
          ...u,
          first_name: profFirstName,
          last_name: profLastName,
          email: profEmail,
          phone: profPhone,
        }));
        setProfCurrentPw("");
        setProfNewPw("");
        setProfConfirmPw("");
      } else showToast("Update failed.", "error");
    } catch {
      showToast("Network error.", "error");
    }
    setProfSubmitting(false);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setProfAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const pwStrength = (() => {
    if (!profNewPw) return 0;
    let s = 0;
    if (profNewPw.length >= 8) s++;
    if (/[A-Z]/.test(profNewPw)) s++;
    if (/[0-9]/.test(profNewPw)) s++;
    if (/[^a-zA-Z0-9]/.test(profNewPw)) s++;
    return s;
  })();
  const pwLabel = ["", "Weak", "Fair", "Good", "Strong"][pwStrength];
  const pwColor = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"][pwStrength];
  const pwMatch =
    profNewPw && profConfirmPw
      ? profNewPw === profConfirmPw
        ? "match"
        : "mismatch"
      : "";
  const profInitials =
    `${profFirstName?.[0] ?? ""}${profLastName?.[0] ?? ""}`.toUpperCase() ||
    "U";

  const pricingCards = [
    {
      name: "Print B&W",
      price: sp(prices.print_bw, 1),
      icon: <IC.Printer />,
      unit: "per page",
    },
    {
      name: "Print Color",
      price: sp(prices.print_color, 2),
      icon: <IC.Printer />,
      unit: "per page",
    },
    {
      name: "Photocopy",
      price: sp(prices.photocopying, 2),
      icon: <IC.Copy />,
      unit: "per page",
    },
    {
      name: "Scanning",
      price: sp(prices.scanning, 5),
      icon: <IC.Scan />,
      unit: "per page",
    },
    {
      name: "Photo Dev.",
      price: sp(prices.photo_development, 15),
      icon: <IC.Camera />,
      unit: "per photo",
    },
    {
      name: "Laminating",
      price: sp(prices.laminating, 20),
      icon: <IC.Layers />,
      unit: "per item",
    },
  ];

  const navItems: { id: Section; icon: React.ReactNode; label: string }[] = [
    { id: "dashboard", icon: <IC.Grid />, label: "Dashboard" },
    { id: "new-order", icon: <IC.Plus />, label: "New Order" },
    { id: "orders", icon: <IC.List />, label: "My Orders" },
  ];

  function badgeClass(s: string) {
    return s === "pending"
      ? "badge-pending"
      : s === "cancelled"
        ? "badge-cancelled"
        : s === "in-progress"
          ? "badge-progress"
          : "badge-completed";
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --grad:linear-gradient(135deg,#5b6dee 0%,#7c3aed 50%,#a855f7 100%);
          --sidebar:#ffffff;--sidebar-border:#e5e7eb;--active:#7c3aed;
          --bg:#f3f4f6;--surface:#fff;--border:#e5e7eb;
          --text:#111827;--muted:#6b7280;--success:#22c55e;
          --sw:220px;--hh:56px;--r:12px
        }
        html,body{height:100%}
        body{font-family:'Inter',sans-serif;background:var(--bg);min-height:100dvh}
        .shell{display:flex;height:100dvh;overflow:hidden}
        .sidebar{width:var(--sw);background:var(--sidebar);border-right:1px solid var(--sidebar-border);display:flex;flex-direction:column;flex-shrink:0;height:100%;z-index:200;transition:transform .28s cubic-bezier(.4,0,.2,1);box-shadow:2px 0 12px rgba(0,0,0,.06)}
        .sb-brand{display:flex;align-items:center;gap:.6rem;padding:.9rem .9rem .8rem;background:#2563eb}
        .sb-icon{width:34px;height:34px;background:rgba(255,255,255,.2);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
        .sb-name{font-size:.82rem;font-weight:700;color:#fff;line-height:1.25}
        .sb-name span{display:block;font-size:.56rem;font-weight:400;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.07em}
        .sb-nav{flex:1;padding:.65rem .55rem;display:flex;flex-direction:column;gap:2px;overflow-y:auto}
        .nav-btn{display:flex;align-items:center;gap:.55rem;padding:.55rem .75rem;border-radius:8px;color:#6b7280;font-size:.83rem;font-weight:500;cursor:pointer;border:none;background:none;width:100%;text-align:left;transition:all .15s;-webkit-tap-highlight-color:transparent}
        .nav-btn:hover{background:#f3f4f6;color:#7c3aed}
        .nav-btn.active{background:#ede9fe;color:#7c3aed;font-weight:600}
        .sb-foot{padding:.55rem;border-top:1px solid var(--sidebar-border)}
        .logout-btn{display:flex;align-items:center;gap:.55rem;padding:.55rem .75rem;border-radius:8px;color:#9ca3af;font-size:.8rem;font-weight:500;cursor:pointer;transition:all .15s;text-decoration:none;width:100%;border:none;background:none;-webkit-tap-highlight-color:transparent}
        .logout-btn:hover{background:#fee2e2;color:#ef4444}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .header{height:var(--hh);background:var(--grad);display:flex;align-items:center;justify-content:space-between;padding:0 1rem;flex-shrink:0;box-shadow:0 2px 12px rgba(91,109,238,.25)}
        .header-l{display:flex;align-items:center;gap:.55rem;min-width:0}
        .pg-title{font-size:.98rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .hamburger{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.9);padding:6px;min-width:40px;min-height:40px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;flex-shrink:0}
        .header-r{display:flex;align-items:center;gap:.45rem;flex-shrink:0}
        .welcome{font-size:.76rem;color:rgba(255,255,255,.82);white-space:nowrap}
        .welcome strong{color:#fff;font-weight:600}
        .avatar{width:32px;height:32px;background:rgba(255,255,255,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.7rem;font-weight:700;border:2px solid rgba(255,255,255,.4);flex-shrink:0;overflow:hidden;cursor:pointer;transition:transform .15s,box-shadow .15s}
        .avatar:hover{transform:scale(1.08);box-shadow:0 0 0 3px rgba(255,255,255,.5)}
        .avatar img{width:100%;height:100%;object-fit:cover}
        .content{flex:1;overflow-y:auto;overflow-x:hidden;padding:.85rem;background:#f3f4f6}
        .panel{display:none}.panel.active{display:block}
        .p-board{border-radius:var(--r);padding:.8rem .8rem .85rem;margin-bottom:.75rem;background:var(--grad);position:relative;overflow:hidden;box-shadow:0 4px 20px rgba(91,109,238,.3)}
        .p-board::before{content:'';position:absolute;top:-60px;right:-40px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.1) 0%,transparent 70%);pointer-events:none}
        .p-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem;gap:.4rem;position:relative;z-index:1}
        .p-label{font-size:.76rem;font-weight:600;color:rgba(255,255,255,.92);display:flex;align-items:center;gap:.35rem}
        .p-chips{display:flex;align-items:center;gap:.35rem}
        .chip{background:rgba(255,255,255,.15);color:rgba(255,255,255,.85);font-size:.6rem;padding:3px 8px;border-radius:99px;display:flex;align-items:center;gap:3px}
        .chip-btn{background:rgba(255,255,255,.15);color:rgba(255,255,255,.85);font-size:.6rem;padding:3px 8px;border-radius:99px;border:none;cursor:pointer;display:flex;align-items:center;gap:3px;transition:background .2s;-webkit-tap-highlight-color:transparent;font-family:'Inter',sans-serif}
        .chip-btn:hover{background:rgba(255,255,255,.28);color:#fff}
        .p-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem;position:relative;z-index:1}
        .p-card{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:.55rem .2rem .5rem;text-align:center;backdrop-filter:blur(6px);transition:background .2s}
        .p-card:hover{background:rgba(255,255,255,.22)}
        .p-ico{width:30px;height:30px;margin:0 auto .22rem;background:rgba(255,255,255,.18);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
        .p-name{font-size:.56rem;color:rgba(255,255,255,.75);font-weight:500;margin-bottom:.15rem}
        .p-price{font-size:.9rem;font-weight:700;color:#fff;letter-spacing:-.02em}
        .p-unit{font-size:.5rem;color:rgba(255,255,255,.5);margin-top:1px}
        .stats-wrap{margin-bottom:.75rem}
        .stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.55rem}
        .stat-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:.8rem 1rem;display:flex;align-items:center;gap:.75rem;box-shadow:0 1px 4px rgba(0,0,0,.06);transition:box-shadow .15s}
        .stat-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1)}
        .stat-icon-wrap{width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .stat-right{display:flex;flex-direction:column;min-width:0}
        .stat-value{font-size:1.35rem;font-weight:700;color:var(--text);letter-spacing:-.03em;line-height:1}
        .stat-label{font-size:.62rem;color:var(--muted);margin-top:4px;white-space:nowrap}
        .card{background:var(--surface);border-radius:var(--r);border:1px solid var(--border);overflow:hidden;margin-bottom:.75rem;box-shadow:0 1px 3px rgba(0,0,0,.06)}
        .card-head{padding:.6rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600;color:var(--text)}
        .ro-empty{padding:2rem;text-align:center;color:var(--muted);font-size:.78rem}
        .ro-table{width:100%;border-collapse:collapse}
        .ro-thead th{font-size:.62rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);padding:.55rem .85rem;text-align:left;border-bottom:1px solid var(--border);background:#fafafa}
        .ro-thead th:last-child{text-align:right}
        .ro-row td{padding:.7rem .85rem;font-size:.78rem;border-bottom:1px solid var(--border);vertical-align:middle;color:var(--text)}
        .ro-row:last-child td{border-bottom:none}
        .ro-row:hover td{background:#f9fafb}
        .ro-id{font-weight:700}.ro-svc{color:var(--muted)}.ro-date{color:var(--muted);white-space:nowrap}.ro-amount{font-weight:700;text-align:right}
        .badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:99px;font-size:.58rem;font-weight:600;white-space:nowrap}
        .badge-pending{background:#fef3c7;color:#92400e}
        .badge-completed{background:#d1fae5;color:#065f46}
        .badge-progress{background:#dbeafe;color:#1e40af}
        .badge-cancelled{background:#fee2e2;color:#991b1b}
        .form-group{margin-bottom:.8rem}
        .form-label{display:block;font-size:.64rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text);margin-bottom:.32rem}
        .form-input,.form-select,.form-textarea{width:100%;padding:.58rem .78rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Inter',sans-serif;font-size:max(16px,.875rem);color:var(--text);background:#fff;transition:border-color .2s,box-shadow .2s;outline:none;-webkit-appearance:none}
        .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.1)}
        .form-textarea{resize:vertical;min-height:70px}
        .form-row-2{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
        .radio-group{display:flex;gap:.9rem;flex-wrap:wrap}
        .radio-label{display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.83rem;color:#555;padding:4px 0}
        .radio-label input{accent-color:var(--active);width:16px;height:16px}
        .check-label{display:flex;align-items:center;gap:.45rem;cursor:pointer;font-size:.83rem;color:#555}
        .check-label input{accent-color:var(--active);width:16px;height:16px}
        .steps{display:flex;align-items:flex-start;gap:0;margin-bottom:1.4rem}
        .step-node{text-align:center}
        .step-dot{width:27px;height:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700;border:2px solid var(--border);color:var(--muted);background:#fff;margin:0 auto;transition:all .2s}
        .step-dot.done{background:var(--success);border-color:var(--success);color:#fff}
        .step-dot.active{background:#7c3aed;border-color:#7c3aed;color:#fff}
        .step-line{flex:1;height:2px;background:var(--border);margin:12px 4px 0}
        .step-line.done{background:var(--success)}
        .step-box{display:none}.step-box.active{display:block}
        .sum-box{background:#f9fafb;border:1.5px solid var(--border);border-radius:10px;padding:.8rem .9rem;margin-top:.9rem}
        .sum-row{display:flex;justify-content:space-between;font-size:.78rem;padding:3px 0;color:var(--muted)}
        .sum-row span:last-child{color:var(--text);font-weight:500}
        .sum-total{display:flex;justify-content:space-between;font-weight:700;font-size:.92rem;color:#7c3aed;border-top:1px solid var(--border);padding-top:.5rem;margin-top:.4rem}
        .btn{padding:.58rem 1.1rem;border-radius:8px;font-family:'Inter',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border:none;transition:all .15s;display:inline-flex;align-items:center;gap:.38rem;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
        .btn-primary{background:linear-gradient(135deg,#5b6dee,#7c3aed);color:#fff;box-shadow:0 4px 12px rgba(91,109,238,.3)}
        .btn-primary:hover:not(:disabled){box-shadow:0 6px 20px rgba(91,109,238,.45);transform:translateY(-1px)}
        .btn-accent{background:linear-gradient(135deg,#5b6dee,#7c3aed);color:#fff;box-shadow:0 4px 12px rgba(91,109,238,.3)}
        .btn-accent:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
        .btn-ghost{background:transparent;color:var(--text);border:1.5px solid var(--border)}
        .btn-ghost:hover:not(:disabled){border-color:#7c3aed;background:#f3f4f6;color:#7c3aed}
        .btn:disabled{opacity:.5;cursor:not-allowed;transform:none!important}
        .btn-full{width:100%;justify-content:center}
        .btn-row{display:flex;gap:.6rem;justify-content:flex-end;margin-top:.9rem;flex-wrap:wrap}
        .btn-row.between{justify-content:space-between}
        .ord-item{padding:.7rem .85rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:.55rem;transition:background .15s}
        .ord-item:last-child{border-bottom:none}
        .ord-item:hover{background:#f9fafb}
        .ord-id{font-weight:600;font-size:.8rem;color:var(--text)}
        .ord-meta{font-size:.7rem;color:var(--muted);margin-top:2px;line-height:1.4}
        .ord-right{text-align:right;flex-shrink:0}
        .ord-actions{display:flex;flex-direction:column;gap:4px;align-items:flex-end;margin-top:4px}
        .edit-btn{font-size:.68rem;color:#7c3aed;font-weight:600;cursor:pointer;background:none;border:none;padding:0;display:flex;align-items:center;gap:3px;justify-content:flex-end;min-height:26px}
        .edit-btn:hover{opacity:.75}
        .cancel-btn{font-size:.68rem;color:#ef4444;font-weight:600;cursor:pointer;background:none;border:none;padding:0;display:flex;align-items:center;gap:3px;justify-content:flex-end;min-height:26px}
        .cancel-btn:hover:not(:disabled){opacity:.75}
        .cancel-btn:disabled{opacity:.4;cursor:not-allowed}
        .cancelled-note{font-size:.63rem;color:#9ca3af;margin-top:4px;display:flex;align-items:center;gap:3px;justify-content:flex-end}
        .filter-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem}
        .filter-title{font-size:.98rem;font-weight:700;color:var(--text)}
        .filter-chips{display:flex;gap:.3rem}
        .fchip{padding:.28rem .75rem;border-radius:99px;border:1.5px solid var(--border);font-size:.7rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;background:#fff;color:var(--muted);-webkit-tap-highlight-color:transparent}
        .fchip.active{background:#7c3aed;border-color:#7c3aed;color:#fff}
        .fchip:hover:not(.active){border-color:#7c3aed;color:#7c3aed}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;display:flex;align-items:flex-end;justify-content:center}
        .modal{background:var(--surface);border-radius:18px 18px 0 0;width:100%;max-width:100%;max-height:92dvh;overflow-y:auto;overflow-x:hidden;padding:1.2rem .95rem;box-shadow:0 -8px 40px rgba(109,40,217,.2)}
        .modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.95rem;padding-bottom:.65rem;border-bottom:1px solid var(--border);position:sticky;top:-1.2rem;background:var(--surface);z-index:1}
        .modal-title{font-size:.93rem;font-weight:700;color:var(--text)}
        .modal-close{background:none;border:none;font-size:1.5rem;color:var(--muted);cursor:pointer;line-height:1;min-width:40px;min-height:40px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
        .modal-close:hover{color:var(--text)}
        .pickup-time-box{background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:8px;padding:.5rem .75rem;margin-top:.5rem;display:flex;align-items:center;gap:.4rem;font-size:.72rem;color:#7c3aed;font-weight:600}
        .pw-wrap{position:relative}
        .pw-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);cursor:pointer;min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
        .pw-toggle:hover{color:var(--text)}
        .pdf-info{background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:8px;padding:.5rem .75rem;margin-top:.5rem;display:flex;align-items:center;gap:.4rem;font-size:.72rem;color:#7c3aed;font-weight:600}
        .copies-info{background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:8px;padding:.4rem .75rem;margin-top:.4rem;font-size:.7rem;color:#16a34a;font-weight:600}
        .hint-text{font-size:.68rem;color:var(--muted);margin-top:.25rem}
        .sb-overlay{display:none;position:fixed;inset:0;background:rgba(30,27,75,.5);z-index:190}
        .sb-overlay.on{display:block}
        .empty-state{padding:2.2rem;text-align:center;color:var(--muted);font-size:.82rem}
        .np-card{background:#fff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 2px 16px rgba(0,0,0,.07);overflow:hidden;max-width:700px;font-family:'Inter',sans-serif}
        .np-bar{height:5px;background:linear-gradient(90deg,#5b6dee 0%,#7c3aed 55%,#a855f7 100%)}
        .np-hero{position:relative;padding:1.5rem 1.5rem 1.2rem;background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 60%,#e9d5ff 100%);border-bottom:1px solid #ddd6fe;display:flex;align-items:flex-end;gap:1.1rem}
        .np-hero::before{content:'';position:absolute;top:0;right:0;width:220px;height:100%;background:radial-gradient(ellipse at top right,rgba(167,139,250,.25) 0%,transparent 70%);pointer-events:none}
        .np-avatar-wrap{position:relative;flex-shrink:0;cursor:pointer}
        .np-avatar{width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#5b6dee 0%,#7c3aed 60%,#a855f7 100%);display:flex;align-items:center;justify-content:center;font-size:1.55rem;font-weight:800;color:#fff;border:3px solid #fff;box-shadow:0 4px 18px rgba(124,58,237,.35);overflow:hidden;transition:filter .2s;user-select:none}
        .np-avatar img{width:100%;height:100%;object-fit:cover}
        .np-avatar-wrap:hover .np-avatar{filter:brightness(.82)}
        .np-avatar-overlay{position:absolute;inset:0;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);opacity:0;transition:opacity .2s;font-size:.55rem;color:#fff;font-weight:700;letter-spacing:.04em;text-transform:uppercase;flex-direction:column;gap:2px}
        .np-avatar-wrap:hover .np-avatar-overlay{opacity:1}
        .np-avatar-input{display:none}
        .np-hero-info{min-width:0;flex:1;position:relative;z-index:1}
        .np-hero-name{font-size:1.1rem;font-weight:800;color:#111827;line-height:1.25}
        .np-hero-email{font-size:.75rem;color:#6b7280;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .np-hero-badges{display:flex;align-items:center;gap:.4rem;margin-top:.45rem;flex-wrap:wrap}
        .np-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:99px;font-size:.59rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
        .np-badge-purple{background:#ede9fe;color:#7c3aed}
        .np-badge-green{background:#dcfce7;color:#16a34a}
        .np-tabs{display:flex;border-bottom:1px solid #e5e7eb;background:#fafafa;padding:0 1.5rem}
        .np-tab{padding:.72rem 0;margin-right:1.8rem;font-size:.81rem;font-weight:600;color:#6b7280;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;border-bottom:2.5px solid transparent;transition:all .18s;display:flex;align-items:center;gap:.38rem;-webkit-tap-highlight-color:transparent}
        .np-tab:hover{color:#7c3aed}
        .np-tab.active{color:#7c3aed;border-bottom-color:#7c3aed}
        .np-body{padding:1.4rem 1.5rem 1.7rem}
        .np-g2{display:grid;grid-template-columns:1fr 1fr;gap:.88rem}
        .np-group{display:flex;flex-direction:column;gap:.28rem}
        .np-label{font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#374151}
        .np-hint{font-size:.62rem;color:#9ca3af;margin-top:.12rem}
        .np-iw{position:relative}
        .np-input{width:100%;padding:.62rem .85rem;border:1.5px solid #e5e7eb;border-radius:9px;font-family:'Inter',sans-serif;font-size:max(16px,.875rem);color:#111827;background:#fff;outline:none;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none}
        .np-input:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.1)}
        .np-input::placeholder{color:#c4c9d4}
        .np-input.has-icon{padding-right:2.6rem}
        .np-input.inp-err{border-color:#ef4444}
        .np-input.inp-ok{border-color:#22c55e}
        .np-ico{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:#9ca3af;cursor:pointer;min-width:34px;min-height:34px;display:flex;align-items:center;justify-content:center;transition:color .15s;-webkit-tap-highlight-color:transparent}
        .np-ico:hover{color:#7c3aed}
        .np-ico-static{pointer-events:none}
        .np-pw-bar-wrap{display:flex;align-items:center;gap:.4rem;margin-top:.32rem}
        .np-pw-bars{display:flex;gap:3px;flex:1}
        .np-pw-bar{height:3px;border-radius:99px;flex:1;background:#e5e7eb;transition:background .25s}
        .np-pw-lbl{font-size:.62rem;font-weight:700;min-width:38px;text-align:right}
        .np-match{display:flex;align-items:center;gap:.3rem;font-size:.63rem;font-weight:600;margin-top:.28rem}
        .np-divider{border:none;border-top:1px solid #f3f4f6;margin:1.25rem 0}
        .np-ro-row{display:flex;align-items:center;gap:.55rem;padding:.62rem .85rem;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:9px;margin-bottom:.5rem}
        .np-ro-icon{color:#9ca3af;flex-shrink:0}
        .np-ro-lbl{font-size:.6rem;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
        .np-ro-val{font-size:.83rem;color:#374151;font-weight:500}
        .np-save-row{display:flex;align-items:center;justify-content:space-between;margin-top:1.35rem;flex-wrap:wrap;gap:.6rem}
        .np-save-hint{font-size:.68rem;color:#9ca3af}
        .np-btn{display:inline-flex;align-items:center;gap:.42rem;padding:.68rem 1.45rem;background:linear-gradient(135deg,#5b6dee 0%,#7c3aed 100%);color:#fff;font-family:'Inter',sans-serif;font-size:.86rem;font-weight:700;border:none;border-radius:10px;cursor:pointer;box-shadow:0 4px 14px rgba(91,109,238,.35);transition:all .2s;-webkit-tap-highlight-color:transparent}
        .np-btn:hover:not(:disabled){box-shadow:0 6px 22px rgba(91,109,238,.48);transform:translateY(-1px)}
        .np-btn:disabled{opacity:.55;cursor:not-allowed;transform:none!important}
        .np-btn-ghost{display:inline-flex;align-items:center;gap:.38rem;padding:.63rem 1.1rem;background:transparent;color:#6b7280;font-family:'Inter',sans-serif;font-size:.82rem;font-weight:600;border:1.5px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:all .15s;-webkit-tap-highlight-color:transparent}
        .np-btn-ghost:hover{border-color:#7c3aed;color:#7c3aed;background:#faf5ff}
        .np-pw-info{background:#faf5ff;border:1.5px solid #ddd6fe;border-radius:10px;padding:.7rem 1rem;margin-bottom:1.1rem;display:flex;align-items:flex-start;gap:.5rem;font-size:.73rem;color:#7c3aed;font-weight:500;line-height:1.5}
        @keyframes np-spin{to{transform:rotate(360deg)}}
        .np-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:np-spin .65s linear infinite}
        @keyframes np-fadeup{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .np-fadein{animation:np-fadeup .24s ease both}
        @media(min-width:1025px){.hamburger{display:none}.p-grid{grid-template-columns:repeat(6,1fr)}.stats-grid{grid-template-columns:repeat(4,1fr)}}
        @media(max-width:1024px){.sidebar{position:fixed;top:0;left:0;height:100%;transform:translateX(-100%)}.sidebar.open{transform:translateX(0);box-shadow:4px 0 30px rgba(0,0,0,.25)}.hamburger{display:flex}}
        @media(max-width:640px){.ro-thead th:nth-child(3),.ro-row td:nth-child(3){display:none}.np-g2{grid-template-columns:1fr}}
        @media(max-width:480px){.hamburger{display:flex}.welcome{display:none}.content{padding:.6rem}.p-board{padding:.65rem .65rem .7rem;margin-bottom:.6rem}.stats-wrap{margin-bottom:.6rem}.form-row-2{grid-template-columns:1fr}.modal{padding:.95rem .85rem;max-height:94dvh}.modal-head{top:-.95rem}.ro-thead th,.ro-row td{padding:.5rem .6rem;font-size:.72rem}.np-hero{padding:1.1rem 1rem 1rem}.np-avatar{width:62px;height:62px;font-size:1.3rem}.np-body{padding:1.1rem 1rem 1.4rem}.np-tabs{padding:0 1rem}}
        @media(max-width:359px){.p-grid{grid-template-columns:repeat(2,1fr)}.btn-row{flex-direction:column-reverse}.btn-row.between{flex-direction:row}}
        @media(min-width:641px){.modal-overlay{align-items:center;padding:1rem}.modal{border-radius:14px;max-width:560px;max-height:90vh}.modal-head{top:-1.2rem}}
        @media(min-width:768px){.modal{padding:1.4rem 1.6rem}.modal-head{top:-1.4rem}}
        @supports(padding:max(0px)){.content{padding-left:max(.85rem,env(safe-area-inset-left));padding-right:max(.85rem,env(safe-area-inset-right))}.header{padding-left:max(1rem,env(safe-area-inset-left));padding-right:max(1rem,env(safe-area-inset-right))}}
      `}</style>

      <ToastNotification toast={toast} />

      {/* ── CANCEL CONFIRMATION MODAL ── */}
      {cancelModalOrderId !== null && (
        <CancelConfirmModal
          orderId={cancelModalOrderId}
          onConfirm={() => handleCancelOrder(cancelModalOrderId)}
          onClose={() => setCancelModalOrderId(null)}
        />
      )}

      <div className="shell">
        <div
          className={`sb-overlay ${sidebarOpen ? "on" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sb-brand">
            <div className="sb-icon">
              <IC.Printer />
            </div>
            <div className="sb-name">
              Jonayskie Prints<span>Printing Studio</span>
            </div>
          </div>
          <nav className="sb-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`nav-btn ${activeSection === item.id ? "active" : ""}`}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
              >
                <span
                  style={{
                    width: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="sb-foot">
            <Link href="/logout" className="logout-btn">
              <IC.Logout /> Logout
            </Link>
          </div>
        </aside>

        <div className="main">
          <header className="header">
            <div className="header-l">
              <button
                className="hamburger"
                onClick={() => setSidebarOpen(true)}
                aria-label="Menu"
              >
                <IC.Menu />
              </button>
              <div className="pg-title">
                {activeSection === "dashboard" && "Dashboard"}
                {activeSection === "new-order" && "New Order"}
                {activeSection === "orders" && "My Orders"}
                {activeSection === "profile" && "Profile"}
              </div>
            </div>
            <div className="header-r">
              <span className="welcome">
                Welcome, <strong>{user.first_name || "User"}</strong>
              </span>
              <div
                className="avatar"
                onClick={() => setActiveSection("profile")}
                title="Go to Profile"
              >
                {profAvatar ? (
                  <img src={profAvatar} alt="avatar" />
                ) : (
                  (user.first_name?.[0] || "U").toUpperCase()
                )}
              </div>
            </div>
          </header>

          <main className="content">
            {/* ══ DASHBOARD ══ */}
            <section
              className={`panel ${activeSection === "dashboard" ? "active" : ""}`}
            >
              <div className="p-board">
                <div className="p-top">
                  <div className="p-label">
                    <IC.Tag /> Current Pricing
                  </div>
                  <div className="p-chips">
                    <span className="chip">{priceUpdateTime || "..."}</span>
                    <button
                      className="chip-btn"
                      onClick={async () => {
                        await fetchPrices();
                        showToast("Prices refreshed");
                      }}
                    >
                      <IC.Refresh /> Refresh
                    </button>
                  </div>
                </div>
                <div className="p-grid">
                  {pricingCards.map((s) => (
                    <div key={s.name} className="p-card">
                      <div className="p-ico">{s.icon}</div>
                      <div className="p-name">{s.name}</div>
                      <div className="p-price">₱{s.price.toFixed(2)}</div>
                      <div className="p-unit">{s.unit}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="stats-wrap">
                <div className="stats-grid">
                  <StatCard
                    label="Total Orders"
                    value={stats.totalOrders}
                    icon={<IC.Cart />}
                    iconBg="#dbeafe"
                    iconColor="#2563eb"
                  />
                  <StatCard
                    label="Pending Orders"
                    value={stats.pendingOrders}
                    icon={<IC.Clock />}
                    iconBg="#fef3c7"
                    iconColor="#d97706"
                  />
                  <StatCard
                    label="Completed"
                    value={stats.completedOrders}
                    icon={<IC.Check />}
                    iconBg="#d1fae5"
                    iconColor="#16a34a"
                  />
                  <StatCard
                    label="Total Spent"
                    value={`₱${stats.totalSpent}`}
                    icon={<IC.Card />}
                    iconBg="#ede9fe"
                    iconColor="#7c3aed"
                  />
                </div>
              </div>
              <div className="card">
                <div className="card-head">Recent Orders</div>
                {recentOrders.length === 0 ? (
                  <div className="ro-empty">No orders yet</div>
                ) : (
                  <table className="ro-table">
                    <thead>
                      <tr className="ro-thead">
                        <th>Order ID</th>
                        <th>Service</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o, idx) => (
                        <tr
                          key={`recent-${o.order_id ?? idx}`}
                          className="ro-row"
                        >
                          <td className="ro-id">{o.order_id}</td>
                          <td className="ro-svc">{o.service}</td>
                          <td className="ro-date">
                            {new Date(o.created_at).toLocaleDateString(
                              "en-PH",
                              {
                                month: "numeric",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </td>
                          <td>
                            <span className={`badge ${badgeClass(o.status)}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="ro-amount">
                            ₱{parseFloat(o.total_amount || "0").toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* ══ NEW ORDER ══ */}
            <section
              className={`panel ${activeSection === "new-order" ? "active" : ""}`}
            >
              <div className="card" style={{ padding: "1rem" }}>
                <div
                  style={{
                    fontSize: ".93rem",
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: "1.2rem",
                  }}
                >
                  Create New Order
                </div>
                <div className="steps">
                  {["Service", "Details", "Review"].map((lbl, i) => (
                    <Fragment key={`step-${i}`}>
                      <div className="step-node">
                        <div
                          className={`step-dot ${i < step ? "done" : i === step ? "active" : ""}`}
                        >
                          {i < step ? <IC.Check /> : i + 1}
                        </div>
                        <div className="step-lbl">{lbl}</div>
                      </div>
                      {i < 2 && (
                        <div
                          className={`step-line ${i < step ? "done" : ""}`}
                        />
                      )}
                    </Fragment>
                  ))}
                </div>
                <form onSubmit={handleSubmitOrder}>
                  <div className={`step-box ${step === 0 ? "active" : ""}`}>
                    <div className="form-group">
                      <label className="form-label">Select Service</label>
                      <select
                        className="form-select"
                        value={noService}
                        onChange={(e) => {
                          setNoService(e.target.value);
                          setNoColorOption(
                            e.target.value === "Photocopy" ? "color" : "bw",
                          );
                          setNoLamination(false);
                          setNoPdfPages(0);
                          setNoQuantity("");
                          setNoCopies(1);
                        }}
                      >
                        <option value="">-- Select Service --</option>
                        {SERVICES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row-2">
                      {showsCopies ? (
                        <div className="form-group">
                          <label className="form-label">Number of Copies</label>
                          <input
                            className="form-input"
                            type="number"
                            min={1}
                            inputMode="numeric"
                            placeholder="e.g. 3"
                            value={noCopies}
                            onChange={(e) => {
                              const val =
                                e.target.value === ""
                                  ? ""
                                  : Math.max(1, parseInt(e.target.value) || 1);
                              handleCopiesChange(val);
                            }}
                          />
                          <div className="hint-text">
                            Upload PDF in Step 3 — pages will be auto-counted
                          </div>
                          {noPdfPages > 0 && Number(noCopies) > 0 && (
                            <div className="copies-info">
                              ✓ {noPdfPages} pages × {noCopies} copies ={" "}
                              {noPdfPages * Number(noCopies)} total pages
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="form-group">
                          <label className="form-label">Quantity</label>
                          <input
                            className="form-input"
                            type="number"
                            min={1}
                            inputMode="numeric"
                            placeholder="Enter quantity"
                            value={noQuantity}
                            onChange={(e) => {
                              setNoQuantity(
                                e.target.value === ""
                                  ? ""
                                  : Math.max(1, parseInt(e.target.value) || 1),
                              );
                              setNoPdfPages(0);
                            }}
                          />
                        </div>
                      )}
                      <div className="form-group">
                        <label className="form-label">Delivery</label>
                        <div
                          className="radio-group"
                          style={{ marginTop: ".5rem" }}
                        >
                          {(["pickup", "delivery"] as DeliveryOption[]).map(
                            (d) => (
                              <label key={d} className="radio-label">
                                <input
                                  type="radio"
                                  name="no_del"
                                  value={d}
                                  checked={noDelivery === d}
                                  onChange={() => {
                                    setNoDelivery(d);
                                    setNoPickupTime("");
                                  }}
                                />
                                {d === "pickup" ? (
                                  <>
                                    <IC.Home /> Pickup
                                  </>
                                ) : (
                                  <>
                                    <IC.Truck /> Delivery
                                  </>
                                )}
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                    {noDelivery === "pickup" && (
                      <div className="form-group">
                        <label
                          className="form-label"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: ".35rem",
                          }}
                        >
                          <IC.ClockSmall /> Preferred Pickup Time
                        </label>
                        <input
                          className="form-input"
                          type="time"
                          value={noPickupTime}
                          min="08:00"
                          max="18:00"
                          onChange={(e) => setNoPickupTime(e.target.value)}
                          required
                        />
                        <div className="hint-text">
                          Business hours: 8:00 AM – 6:00 PM
                        </div>
                        {noPickupTime && (
                          <div className="pickup-time-box">
                            <IC.ClockSmall /> Pickup at{" "}
                            {formatPickupTime(noPickupTime)}
                          </div>
                        )}
                      </div>
                    )}
                    {noDelivery === "delivery" && (
                      <div className="form-group">
                        <label className="form-label">Delivery Address</label>
                        <textarea
                          className="form-textarea"
                          placeholder="Enter complete address"
                          value={noAddress}
                          onChange={(e) => setNoAddress(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          if (validateStep(1)) setStep(1);
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>

                  <div className={`step-box ${step === 1 ? "active" : ""}`}>
                    {showsPaper && (
                      <div className="form-group">
                        <label className="form-label">Paper Size</label>
                        <select
                          className="form-select"
                          value={noPaperSize}
                          onChange={(e) =>
                            setNoPaperSize(e.target.value as PaperSize)
                          }
                        >
                          {(["A4", "Short", "Long"] as PaperSize[]).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {showsPhoto && (
                      <div className="form-group">
                        <label className="form-label">Photo Size</label>
                        <select
                          className="form-select"
                          value={noPhotoSize}
                          onChange={(e) => setNoPhotoSize(e.target.value)}
                        >
                          <option value="A4">Glossy A4</option>
                          <option value="4x6">Glossy 4x6</option>
                        </select>
                      </div>
                    )}
                    {showsColor && (
                      <div className="form-group">
                        <label className="form-label">Print Type</label>
                        <div
                          className="radio-group"
                          style={{ marginTop: ".4rem" }}
                        >
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="no_col"
                              value="bw"
                              checked={noColorOption === "bw"}
                              onChange={() => setNoColorOption("bw")}
                            />{" "}
                            B&W
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="no_col"
                              value="color"
                              checked={noColorOption === "color"}
                              onChange={() => setNoColorOption("color")}
                            />{" "}
                            Color
                          </label>
                        </div>
                      </div>
                    )}
                    {showsLam && (
                      <div className="form-group">
                        <label className="check-label">
                          <input
                            type="checkbox"
                            checked={noLamination}
                            onChange={(e) => setNoLamination(e.target.checked)}
                          />
                          Add Lamination (+₱
                          {sp(prices.laminating, 20).toFixed(2)}/item)
                        </label>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Specifications</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Describe your order or type N/A."
                        value={noSpecs}
                        onChange={(e) => setNoSpecs(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="btn-row between">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setStep(0)}
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          if (validateStep(2)) setStep(2);
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>

                  <div className={`step-box ${step === 2 ? "active" : ""}`}>
                    <div className="form-group">
                      <label className="form-label">
                        Upload Files{" "}
                        <span
                          style={{
                            fontSize: ".6rem",
                            color: "var(--muted)",
                            fontWeight: 400,
                            textTransform: "none",
                            letterSpacing: 0,
                            marginLeft: 5,
                          }}
                        >
                          (Optional for Scanning/Laminating)
                        </span>
                      </label>
                      <input
                        className="form-input"
                        type="file"
                        multiple
                        ref={fileInputRef}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => handleFileChange(e.target.files)}
                      />
                      {noFiles &&
                        Array.from(noFiles).map((f, fi) => (
                          <div
                            key={`${fi}-${f.name}`}
                            style={{
                              fontSize: ".7rem",
                              color: "var(--muted)",
                              marginTop: 3,
                            }}
                          >
                            📎 {f.name}
                          </div>
                        ))}
                      {noPdfPages > 0 && (
                        <div className="pdf-info">
                          <IC.PDF />
                          {showsCopies
                            ? `${noPdfPages} pages × ${noCopies} copies = ${noPdfPages * Number(noCopies)} total pages`
                            : `${noPdfPages} pages detected`}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: ".8rem",
                        color: "#7c3aed",
                        fontWeight: 600,
                        marginBottom: ".8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: ".4rem",
                      }}
                    >
                      <IC.Card /> Payment: Cash Only
                    </div>
                    <div className="sum-box">
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: ".8rem",
                          marginBottom: ".6rem",
                          color: "var(--text)",
                        }}
                      >
                        Order Summary
                      </div>
                      <div className="sum-row">
                        <span>Service</span>
                        <span>{noService || "—"}</span>
                      </div>
                      {showsCopies && (
                        <div className="sum-row">
                          <span>Copies</span>
                          <span>{noCopies || 1}</span>
                        </div>
                      )}
                      {noPdfPages > 0 && (
                        <div className="sum-row">
                          <span>Pages per Copy</span>
                          <span>{noPdfPages}</span>
                        </div>
                      )}
                      <div className="sum-row">
                        <span>{showsCopies ? "Total Pages" : "Quantity"}</span>
                        <span>
                          {effectiveQuantity || "—"}
                          {noPdfPages > 0 && (
                            <span
                              style={{
                                color: "#7c3aed",
                                fontSize: ".68rem",
                                marginLeft: 4,
                              }}
                            >
                              (auto)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="sum-row">
                        <span>Delivery</span>
                        <span>
                          {noDelivery.charAt(0).toUpperCase() +
                            noDelivery.slice(1)}
                        </span>
                      </div>
                      {noDelivery === "pickup" && noPickupTime && (
                        <div className="sum-row">
                          <span>Pickup Time</span>
                          <span style={{ color: "#7c3aed", fontWeight: 600 }}>
                            {formatPickupTime(noPickupTime)}
                          </span>
                        </div>
                      )}
                      {showsPaper && (
                        <div className="sum-row">
                          <span>Paper</span>
                          <span>{noPaperSize}</span>
                        </div>
                      )}
                      {showsPhoto && (
                        <div className="sum-row">
                          <span>Photo Size</span>
                          <span>Glossy {noPhotoSize}</span>
                        </div>
                      )}
                      {showsColor && (
                        <div className="sum-row">
                          <span>Print Type</span>
                          <span>
                            {noColorOption === "color" ? "Color" : "B&W"}
                          </span>
                        </div>
                      )}
                      <div className="sum-row">
                        <span>Lamination</span>
                        <span>
                          {noLamination && effectiveQuantity >= 1
                            ? `Yes (+₱${(sp(prices.laminating, 20) * effectiveQuantity).toFixed(2)})`
                            : "No"}
                        </span>
                      </div>
                      <div className="sum-total">
                        <span>Total</span>
                        <span>₱{summaryTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <div
                      className="btn-row between"
                      style={{ marginTop: ".9rem" }}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setStep(1)}
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        className="btn btn-accent"
                        disabled={noSubmitting}
                      >
                        {noSubmitting ? "Placing..." : "Place Order"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>

            {/* ══ MY ORDERS ══ */}
            <section
              className={`panel ${activeSection === "orders" ? "active" : ""}`}
            >
              <div className="filter-bar">
                <div className="filter-title">My Orders</div>
                <div className="filter-chips">
                  {[
                    { val: "", label: "All" },
                    { val: "pending", label: "Pending" },
                    { val: "completed", label: "Done" },
                  ].map(({ val, label }) => (
                    <button
                      key={val || "all"}
                      className={`fchip ${orderFilter === val ? "active" : ""}`}
                      onClick={() => setOrderFilter(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card">
                {ordersLoading ? (
                  <div className="empty-state">Loading...</div>
                ) : allOrders.length === 0 ? (
                  <div className="empty-state">No orders found</div>
                ) : (
                  allOrders.map((o, idx) => {
                    const prev =
                      o.specifications.length > 75
                        ? o.specifications.slice(0, 75) + "…"
                        : o.specifications;
                    const isCancelling = cancellingId === o.order_id;
                    return (
                      <div
                        key={`order-${o.order_id ?? idx}`}
                        className="ord-item"
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="ord-id">
                            #{o.order_id} — {o.service}
                          </div>
                          <div className="ord-meta">{prev}</div>
                          <div className="ord-meta">
                            Qty: {o.quantity} · ₱
                            {parseFloat(o.total_amount || "0").toFixed(2)}
                            {o.delivery_option === "pickup" &&
                              o.pickup_time && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    color: "#7c3aed",
                                    fontWeight: 600,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  · <IC.ClockSmall />{" "}
                                  {formatPickupTime(o.pickup_time)}
                                </span>
                              )}
                          </div>
                        </div>
                        <div className="ord-right">
                          <span className={`badge ${badgeClass(o.status)}`}>
                            {o.status}
                          </span>
                          <div
                            style={{
                              fontSize: ".63rem",
                              color: "var(--muted)",
                              marginTop: 3,
                            }}
                          >
                            {new Date(o.created_at).toLocaleDateString()}
                          </div>

                          {/* ── PENDING: show Edit + Cancel ── */}
                          {o.status === "pending" && (
                            <div className="ord-actions">
                              <button
                                className="edit-btn"
                                onClick={() => openEditModal(o.order_id)}
                              >
                                <IC.Pencil /> Edit
                              </button>
                              <button
                                className="cancel-btn"
                                disabled={isCancelling}
                                onClick={() =>
                                  setCancelModalOrderId(o.order_id)
                                }
                              >
                                <IC.XCircle />{" "}
                                {isCancelling
                                  ? "Cancelling..."
                                  : "Cancel Order"}
                              </button>
                            </div>
                          )}

                          {/* ── CANCELLED: locked, no edit/cancel ── */}
                          {o.status === "cancelled" && (
                            <div className="cancelled-note">
                              <IC.Lock /> Order cancelled
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* ══ PROFILE ══ */}
            <section
              className={`panel ${activeSection === "profile" ? "active" : ""}`}
            >
              <div className="np-card">
                <div className="np-bar" />
                <div className="np-hero">
                  <div
                    className="np-avatar-wrap"
                    onClick={() => avatarInputRef.current?.click()}
                    title="Change photo"
                  >
                    <div className="np-avatar">
                      {profAvatar ? (
                        <img src={profAvatar} alt="avatar" />
                      ) : (
                        profInitials
                      )}
                    </div>
                    <div className="np-avatar-overlay">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span
                        style={{
                          fontSize: ".55rem",
                          letterSpacing: ".04em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        Change
                      </span>
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      className="np-avatar-input"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div className="np-hero-info">
                    <div className="np-hero-name">
                      {profFirstName || user.first_name}{" "}
                      {profLastName || user.last_name}
                    </div>
                    <div className="np-hero-email">
                      {profEmail || user.email}
                    </div>
                    <div className="np-hero-badges">
                      <span className="np-badge np-badge-purple">
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                        Customer
                      </span>
                      <span className="np-badge np-badge-green">
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Active
                      </span>
                    </div>
                  </div>
                </div>
                <div className="np-tabs">
                  <button
                    className={`np-tab ${profTab === "info" ? "active" : ""}`}
                    onClick={() => setProfTab("info")}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                    Personal Info
                  </button>
                  <button
                    className={`np-tab ${profTab === "password" ? "active" : ""}`}
                    onClick={() => setProfTab("password")}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    Change Password
                  </button>
                </div>
                <div className="np-body">
                  <form onSubmit={handleProfileSubmit}>
                    {profTab === "info" && (
                      <div className="np-fadein">
                        <div
                          className="np-g2"
                          style={{ marginBottom: ".9rem" }}
                        >
                          <div className="np-group">
                            <label className="np-label">First Name *</label>
                            <input
                              className="np-input"
                              type="text"
                              value={profFirstName}
                              onChange={(e) => setProfFirstName(e.target.value)}
                              placeholder="Jane"
                            />
                          </div>
                          <div className="np-group">
                            <label className="np-label">Last Name *</label>
                            <input
                              className="np-input"
                              type="text"
                              value={profLastName}
                              onChange={(e) => setProfLastName(e.target.value)}
                              placeholder="Doe"
                            />
                          </div>
                        </div>
                        <div className="np-g2">
                          <div className="np-group">
                            <label className="np-label">Email Address *</label>
                            <div className="np-iw">
                              <input
                                className="np-input has-icon"
                                type="email"
                                inputMode="email"
                                value={profEmail}
                                onChange={(e) => setProfEmail(e.target.value)}
                                placeholder="you@example.com"
                              />
                              <span className="np-ico np-ico-static">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                >
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                  <polyline points="22,6 12,13 2,6" />
                                </svg>
                              </span>
                            </div>
                          </div>
                          <div className="np-group">
                            <label className="np-label">Phone Number</label>
                            <div className="np-iw">
                              <input
                                className="np-input has-icon"
                                type="tel"
                                inputMode="numeric"
                                value={profPhone}
                                onChange={(e) =>
                                  setProfPhone(
                                    e.target.value.replace(/[^0-9]/g, ""),
                                  )
                                }
                                placeholder="09123456789"
                                maxLength={15}
                              />
                              <span className="np-ico np-ico-static">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                >
                                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.02z" />
                                </svg>
                              </span>
                            </div>
                          </div>
                        </div>
                        <hr className="np-divider" />
                        <div
                          style={{
                            fontSize: ".7rem",
                            fontWeight: 700,
                            color: "#9ca3af",
                            letterSpacing: ".07em",
                            textTransform: "uppercase",
                            marginBottom: ".65rem",
                          }}
                        >
                          Account Details
                        </div>
                        <div className="np-ro-row">
                          <span className="np-ro-icon">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <circle cx="12" cy="8" r="4" />
                              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                            </svg>
                          </span>
                          <div style={{ flex: 1 }}>
                            <div className="np-ro-lbl">Role</div>
                            <div className="np-ro-val">Customer</div>
                          </div>
                        </div>
                        <div className="np-ro-row">
                          <span className="np-ro-icon">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </span>
                          <div style={{ flex: 1 }}>
                            <div className="np-ro-lbl">Member Since</div>
                            <div className="np-ro-val">
                              {new Date().toLocaleDateString("en-PH", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="np-save-row">
                          <span className="np-save-hint">
                            * Required fields
                          </span>
                          <button
                            type="submit"
                            className="np-btn"
                            disabled={profSubmitting}
                          >
                            {profSubmitting ? (
                              <>
                                <div className="np-spinner" /> Saving…
                              </>
                            ) : (
                              <>
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#fff"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>{" "}
                                Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    {profTab === "password" && (
                      <div className="np-fadein">
                        <div className="np-pw-info">
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            style={{ flexShrink: 0, marginTop: 1 }}
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          Leave all fields blank if you don't want to change
                          your password. Your name and email will still be
                          saved.
                        </div>
                        <div
                          className="np-group"
                          style={{ marginBottom: ".9rem" }}
                        >
                          <label className="np-label">Current Password</label>
                          <div className="np-iw">
                            <input
                              className="np-input has-icon"
                              type={showCurrPw ? "text" : "password"}
                              value={profCurrentPw}
                              onChange={(e) => setProfCurrentPw(e.target.value)}
                              placeholder="Enter your current password"
                            />
                            <button
                              type="button"
                              className="np-ico"
                              onClick={() => setShowCurrPw((v) => !v)}
                            >
                              {showCurrPw ? <IC.EyeOff /> : <IC.Eye />}
                            </button>
                          </div>
                        </div>
                        <div className="np-g2">
                          <div className="np-group">
                            <label className="np-label">New Password</label>
                            <div className="np-iw">
                              <input
                                className={`np-input has-icon ${profNewPw ? (pwStrength >= 3 ? "inp-ok" : pwStrength === 1 ? "inp-err" : "") : ""}`}
                                type={showNewPw ? "text" : "password"}
                                value={profNewPw}
                                onChange={(e) => setProfNewPw(e.target.value)}
                                placeholder="New password"
                              />
                              <button
                                type="button"
                                className="np-ico"
                                onClick={() => setShowNewPw((v) => !v)}
                              >
                                {showNewPw ? <IC.EyeOff /> : <IC.Eye />}
                              </button>
                            </div>
                            {profNewPw && (
                              <div className="np-pw-bar-wrap">
                                <div className="np-pw-bars">
                                  {[1, 2, 3, 4].map((i) => (
                                    <div
                                      key={i}
                                      className="np-pw-bar"
                                      style={{
                                        background:
                                          i <= pwStrength ? pwColor : "#e5e7eb",
                                      }}
                                    />
                                  ))}
                                </div>
                                <div
                                  className="np-pw-lbl"
                                  style={{ color: pwColor }}
                                >
                                  {pwLabel}
                                </div>
                              </div>
                            )}
                            <div className="np-hint">
                              8+ chars · 1 uppercase · 1 number
                            </div>
                          </div>
                          <div className="np-group">
                            <label className="np-label">
                              Confirm New Password
                            </label>
                            <div className="np-iw">
                              <input
                                className={`np-input has-icon ${pwMatch === "match" ? "inp-ok" : pwMatch === "mismatch" ? "inp-err" : ""}`}
                                type={showConfirmPw ? "text" : "password"}
                                value={profConfirmPw}
                                onChange={(e) =>
                                  setProfConfirmPw(e.target.value)
                                }
                                placeholder="Confirm password"
                              />
                              <button
                                type="button"
                                className="np-ico"
                                onClick={() => setShowConfirmPw((v) => !v)}
                              >
                                {showConfirmPw ? <IC.EyeOff /> : <IC.Eye />}
                              </button>
                            </div>
                            {pwMatch === "match" && (
                              <div
                                className="np-match"
                                style={{ color: "#22c55e" }}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Passwords match
                              </div>
                            )}
                            {pwMatch === "mismatch" && (
                              <div
                                className="np-match"
                                style={{ color: "#ef4444" }}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                Passwords don't match
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="np-save-row">
                          <button
                            type="button"
                            className="np-btn-ghost"
                            onClick={() => {
                              setProfCurrentPw("");
                              setProfNewPw("");
                              setProfConfirmPw("");
                            }}
                          >
                            Clear
                          </button>
                          <button
                            type="submit"
                            className="np-btn"
                            disabled={profSubmitting}
                          >
                            {profSubmitting ? (
                              <>
                                <div className="np-spinner" /> Saving…
                              </>
                            ) : (
                              <>
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#fff"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <rect
                                    x="3"
                                    y="11"
                                    width="18"
                                    height="11"
                                    rx="2"
                                  />
                                  <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>{" "}
                                Update Password
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ══ EDIT ORDER MODAL ══ */}
      {editModalOpen && editOrder && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">
                Edit Order #{editOrder.order_id}
              </div>
              <button
                className="modal-close"
                onClick={() => setEditModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Service</label>
                <select
                  className="form-select"
                  value={eoService}
                  onChange={(e) => {
                    setEoService(e.target.value);
                    setEoColorOption(
                      e.target.value === "Photocopy" ? "color" : "bw",
                    );
                    setEoLamination(false);
                    setEoPdfPages(0);
                  }}
                >
                  <option value="">-- Select Service --</option>
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row-2">
                {eoShowsCopies ? (
                  <div className="form-group">
                    <label className="form-label">Number of Copies</label>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="e.g. 3"
                      value={eoCopies}
                      onChange={(e) => {
                        const val =
                          e.target.value === ""
                            ? ""
                            : Math.max(1, parseInt(e.target.value) || 1);
                        handleEoCopiesChange(val);
                      }}
                    />
                    {eoPdfPages > 0 && Number(eoCopies) > 0 && (
                      <div className="copies-info">
                        ✓ {eoPdfPages} pages × {eoCopies} copies ={" "}
                        {eoPdfPages * Number(eoCopies)} total
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input
                      className="form-input"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="Enter quantity"
                      value={eoQuantity}
                      onChange={(e) => {
                        setEoQuantity(
                          e.target.value === ""
                            ? ""
                            : Math.max(1, parseInt(e.target.value) || 1),
                        );
                        setEoPdfPages(0);
                      }}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Delivery</label>
                  <div className="radio-group" style={{ marginTop: ".5rem" }}>
                    {(["pickup", "delivery"] as DeliveryOption[]).map((d) => (
                      <label key={d} className="radio-label">
                        <input
                          type="radio"
                          name="eo_del"
                          value={d}
                          checked={eoDelivery === d}
                          onChange={() => {
                            setEoDelivery(d);
                            setEoPickupTime("");
                          }}
                        />
                        {d === "pickup" ? (
                          <>
                            <IC.Home /> Pickup
                          </>
                        ) : (
                          <>
                            <IC.Truck /> Delivery
                          </>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {eoDelivery === "pickup" && (
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".35rem",
                    }}
                  >
                    <IC.ClockSmall /> Preferred Pickup Time
                  </label>
                  <input
                    className="form-input"
                    type="time"
                    value={eoPickupTime}
                    min="08:00"
                    max="18:00"
                    onChange={(e) => setEoPickupTime(e.target.value)}
                    required
                  />
                  <div className="hint-text">
                    Business hours: 8:00 AM – 6:00 PM
                  </div>
                  {eoPickupTime && (
                    <div className="pickup-time-box">
                      <IC.ClockSmall /> Pickup at{" "}
                      {formatPickupTime(eoPickupTime)}
                    </div>
                  )}
                </div>
              )}
              {eoDelivery === "delivery" && (
                <div className="form-group">
                  <label className="form-label">Delivery Address</label>
                  <textarea
                    className="form-textarea"
                    value={eoAddress}
                    onChange={(e) => setEoAddress(e.target.value)}
                  />
                </div>
              )}
              {eoShowsPaper && (
                <div className="form-group">
                  <label className="form-label">Paper Size</label>
                  <select
                    className="form-select"
                    value={eoPaperSize}
                    onChange={(e) =>
                      setEoPaperSize(e.target.value as PaperSize)
                    }
                  >
                    {(["A4", "Short", "Long"] as PaperSize[]).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {eoShowsPhoto && (
                <div className="form-group">
                  <label className="form-label">Photo Size</label>
                  <select
                    className="form-select"
                    value={eoPhotoSize}
                    onChange={(e) => setEoPhotoSize(e.target.value)}
                  >
                    <option value="A4">Glossy A4</option>
                    <option value="4x6">Glossy 4x6</option>
                  </select>
                </div>
              )}
              {eoShowsColor && (
                <div className="form-group">
                  <label className="form-label">Print Type</label>
                  <div className="radio-group" style={{ marginTop: ".4rem" }}>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="eo_col"
                        value="bw"
                        checked={eoColorOption === "bw"}
                        onChange={() => setEoColorOption("bw")}
                      />{" "}
                      B&W
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="eo_col"
                        value="color"
                        checked={eoColorOption === "color"}
                        onChange={() => setEoColorOption("color")}
                      />{" "}
                      Color
                    </label>
                  </div>
                </div>
              )}
              {eoShowsLam && (
                <div className="form-group">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={eoLamination}
                      onChange={(e) => setEoLamination(e.target.checked)}
                    />
                    Add Lamination (+₱{sp(prices.laminating, 20).toFixed(2)}
                    /item)
                  </label>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Specifications</label>
                <textarea
                  className="form-textarea"
                  value={eoSpecs}
                  onChange={(e) => setEoSpecs(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Replace Files{" "}
                  <span
                    style={{
                      fontSize: ".6rem",
                      color: "var(--muted)",
                      fontWeight: 400,
                      textTransform: "none",
                      letterSpacing: 0,
                      marginLeft: 5,
                    }}
                  >
                    (Optional)
                  </span>
                </label>
                <input
                  className="form-input"
                  type="file"
                  multiple
                  ref={editFileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => handleEditFileChange(e.target.files)}
                />
                {eoPdfPages > 0 && (
                  <div className="pdf-info">
                    <IC.PDF />
                    {eoShowsCopies
                      ? `${eoPdfPages} pages × ${eoCopies} copies = ${eoPdfPages * Number(eoCopies)} total`
                      : `${eoPdfPages} pages detected`}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-accent btn-full"
                disabled={eoSubmitting}
              >
                {eoSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
