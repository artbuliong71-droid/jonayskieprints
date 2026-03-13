"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Fragment,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  order_id: string;
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

async function getDocxPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    // DOCX files are ZIP archives. app.xml contains <Pages>N</Pages>.
    // We decode the raw bytes as UTF-8 and search for the Pages tag.
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const match = text.match(/<Pages>(\d+)<\/Pages>/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

async function countPagesFromFiles(files: FileList): Promise<number> {
  let total = 0;
  for (const f of Array.from(files)) {
    const name = f.name.toLowerCase();
    if (name.endsWith(".pdf")) {
      const n = await getPdfPageCount(f);
      total += n;
    } else if (name.endsWith(".docx")) {
      const n = await getDocxPageCount(f);
      total += n;
    } else {
      total += 1; // ← each image file (PNG, JPG) counts as 1 page
    }
  }
  return total;
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

const TOS_ACCEPTED_KEY = "jonayskie_tos_accepted";

// ── SVG Icon helpers ──────────────────────────────────────────────
const IcoFullPayment = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IcoDownpayment = () => (
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
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const IcoGCash = ({
  size = 13,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
  >
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const IcoCash = ({
  size = 13,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
  >
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const IcoWarning = ({ color = "#92400e" }: { color?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IcoPeso = ({
  size = 14,
  color = "#fff",
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <text
      x="4"
      y="18"
      fontFamily="sans-serif"
      fontSize="16"
      fontWeight="bold"
      fill={color}
      stroke="none"
    >
      ₱
    </text>
  </svg>
);

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
      width="19"
      height="19"
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
      width="19"
      height="19"
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
      width="19"
      height="19"
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
      width="19"
      height="19"
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
      width="19"
      height="19"
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

function TosSection({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <div style={{ marginBottom: "1.3rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".55rem",
          marginBottom: ".45rem",
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "#f0eef9",
            color: "#7c3aed",
            fontSize: ".65rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {num}
        </div>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: ".97rem",
            color: "#111827",
            fontWeight: 700,
          }}
        >
          {title}
        </div>
      </div>
      <p
        style={{
          fontSize: ".83rem",
          color: "#4b5563",
          lineHeight: 1.75,
          paddingLeft: "2.6rem",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function FirstLoginTosModal({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40)
      setHasScrolled(true);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
        @keyframes tosBackdropIn { from{opacity:0} to{opacity:1} }
        @keyframes tosModalIn { from{opacity:0;transform:scale(.9) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes tosBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
        .tos-bounce { animation: tosBounce 1.6s ease infinite; }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 3000,
          background: "rgba(8,6,18,0.78)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          animation: "tosBackdropIn .2s ease",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            width: "100%",
            maxWidth: 560,
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 40px 100px rgba(0,0,0,.4)",
            animation: "tosModalIn .32s cubic-bezier(.34,1.56,.64,1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 4,
              background: "linear-gradient(90deg,#5b6dee,#7c3aed,#a855f7)",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".9rem",
              padding: "1.2rem 1.5rem 1rem",
              borderBottom: "1.5px solid #f0eef9",
              flexShrink: 0,
              background: "linear-gradient(135deg,#faf9ff,#f5f3ff)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                background: "linear-gradient(135deg,#5b6dee,#7c3aed)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 14px rgba(124,58,237,.35)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                Terms of Service
              </div>
              <div
                style={{ fontSize: ".72rem", color: "#9ca3af", marginTop: 2 }}
              >
                Jonayskie Prints — Effective January 1, 2026
              </div>
            </div>
          </div>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ flex: 1, overflowY: "auto", padding: "1.3rem 1.5rem" }}
          >
            <div
              style={{
                background: "#f5f3ff",
                border: "1.5px solid #ddd6fe",
                borderLeft: "4px solid #7c3aed",
                borderRadius: "0 8px 8px 0",
                padding: ".85rem 1rem",
                marginBottom: "1.4rem",
                fontSize: ".83rem",
                color: "#4b5563",
                lineHeight: 1.7,
              }}
            >
              By using <strong>Jonayskie Prints</strong>, you acknowledge that
              you have read, understood, and agree to be bound by the following
              Terms of Service.
            </div>
            <TosSection
              num="01"
              title="Acceptance of Terms"
              body="By creating an account, placing an order, or using any of our services, you confirm that you have the legal capacity to enter into a binding agreement. Use of this platform constitutes full acceptance of these terms."
            />
            <TosSection
              num="02"
              title="Services Offered"
              body="Jonayskie Prints provides professional printing services including, but not limited to: document printing, photocopying (Xerox), scanning, photo development, and laminating. All services are subject to availability and may vary based on current equipment and supplies."
            />
            <div style={{ marginBottom: "1.4rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".55rem",
                  marginBottom: ".55rem",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: "linear-gradient(135deg,#5b6dee,#7c3aed)",
                    color: "#fff",
                    fontSize: ".65rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  03
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: ".97rem",
                    color: "#1d4ed8",
                    fontWeight: 700,
                  }}
                >
                  Payment Methods & Downpayment Policy
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: ".65rem",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg,#f5f3ff,#faf5ff)",
                    border: "1.5px solid #ddd6fe",
                    borderRadius: 12,
                    padding: "1rem 1.1rem",
                    display: "flex",
                    gap: ".85rem",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IcoGCash size={18} color="#fff" />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: ".84rem",
                        color: "#374151",
                        lineHeight: 1.65,
                        marginBottom: ".45rem",
                        fontWeight: 700,
                      }}
                    >
                      Online Payments — GCash Only
                    </p>
                    <p
                      style={{
                        fontSize: ".82rem",
                        color: "#374151",
                        lineHeight: 1.65,
                        marginBottom: ".4rem",
                      }}
                    >
                      All online payments (downpayments and full payments) are
                      processed exclusively through <strong>GCash</strong>. No
                      other online payment channels are accepted.
                    </p>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: ".3rem",
                      }}
                    >
                      {[
                        "Customers may choose to pay the full amount via GCash before the order is processed.",
                        "GCash payers must provide a valid reference number and upload a receipt screenshot as proof of payment.",
                        "Payments are verified before any order proceeds to production.",
                      ].map((item, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: ".81rem",
                            color: "#374151",
                            paddingLeft: "1rem",
                            position: "relative",
                            lineHeight: 1.6,
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              left: 0,
                              color: "#7c3aed",
                              fontWeight: 700,
                            }}
                          >
                            ›
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div
                  style={{
                    background: "linear-gradient(135deg,#eff6ff,#f5f3ff)",
                    border: "1.5px solid #c7d2fe",
                    borderRadius: 12,
                    padding: "1rem 1.1rem",
                    display: "flex",
                    gap: ".85rem",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "linear-gradient(135deg,#2563eb,#7c3aed)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    <IcoCash size={18} color="#fff" />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: ".84rem",
                        color: "#374151",
                        lineHeight: 1.65,
                        marginBottom: ".45rem",
                        fontWeight: 700,
                      }}
                    >
                      Cash Payments & ₱500+ Downpayment Requirement
                    </p>
                    <p
                      style={{
                        fontSize: ".82rem",
                        color: "#374151",
                        lineHeight: 1.65,
                        marginBottom: ".4rem",
                      }}
                    >
                      Cash on pickup is accepted for all orders. However,{" "}
                      <strong>cash orders exceeding ₱500.00</strong> require a{" "}
                      <strong>50% downpayment via GCash</strong> before
                      processing begins:
                    </p>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: ".3rem",
                      }}
                    >
                      {[
                        "Downpayment must be settled via GCash prior to processing — no exceptions.",
                        "Remaining balance is paid in cash upon pickup or delivery.",
                        "Orders will not be processed until the GCash downpayment is confirmed.",
                        "Downpayment is non-refundable if cancellation occurs after processing begins.",
                        "Customers choosing full GCash payment are exempt from this cash downpayment rule.",
                      ].map((item, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: ".81rem",
                            color: "#374151",
                            paddingLeft: "1rem",
                            position: "relative",
                            lineHeight: 1.6,
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              left: 0,
                              color: "#7c3aed",
                              fontWeight: 700,
                            }}
                          >
                            ›
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: "1.4rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".55rem",
                  marginBottom: ".55rem",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: "linear-gradient(135deg,#5b6dee,#7c3aed)",
                    color: "#fff",
                    fontSize: ".65rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  04
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: ".97rem",
                    color: "#1d4ed8",
                    fontWeight: 700,
                  }}
                >
                  Personal Information Requirements
                </div>
              </div>
              <div
                style={{
                  background: "linear-gradient(135deg,#eff6ff,#f5f3ff)",
                  border: "1.5px solid #c7d2fe",
                  borderRadius: 12,
                  padding: "1rem 1.1rem",
                  display: "flex",
                  gap: ".85rem",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: ".83rem",
                      color: "#374151",
                      lineHeight: 1.65,
                      marginBottom: ".5rem",
                    }}
                  >
                    For large transactions and order verification, we require:
                  </p>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: ".38rem",
                    }}
                  >
                    {[
                      "Full legal name (first and last name)",
                      "Valid contact number (active mobile number)",
                      "Email address for order confirmations and receipts",
                      "Complete delivery address (if delivery is requested)",
                      "Valid government-issued ID may be requested for orders above ₱1,000.00",
                    ].map((item, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: ".82rem",
                          color: "#374151",
                          paddingLeft: "1rem",
                          position: "relative",
                          lineHeight: 1.6,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            color: "#7c3aed",
                            fontWeight: 700,
                          }}
                        >
                          ›
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <TosSection
              num="05"
              title="Order Processing & Turnaround"
              body="Standard orders are processed within 1–2 business days. Urgent requests may be accommodated based on availability and may incur additional rush fees. Jonayskie Prints is not liable for delays caused by incomplete file submissions, unclear instructions, or force majeure events."
            />
            <TosSection
              num="06"
              title="File Submission & Quality"
              body="Customers are responsible for submitting print-ready files in accepted formats (PDF, JPG, PNG, DOCX). Jonayskie Prints will print files as submitted. We are not responsible for pixelation, incorrect margins, spelling errors, or layout issues present in the original file. A digital proof may be requested before final printing."
            />
            <TosSection
              num="07"
              title="Payments & Pricing"
              body="All prices are in Philippine Peso (PHP). Final pricing is calculated based on paper size, color, quantity, and finishing options. Accepted payment methods: (1) Cash on pickup for any order amount. (2) GCash — customers may pay the full amount online, or pay a 50% downpayment via GCash for cash orders exceeding ₱500.00 with the balance due on pickup. GCash is the only accepted online payment channel."
            />
            <TosSection
              num="08"
              title="Cancellations & Refunds"
              body="Orders may be cancelled without charge prior to processing. Once production has commenced, cancellations are not accepted and downpayments are forfeited. In cases where we cannot fulfill an order, a full refund will be issued within 3–5 business days."
            />
            <TosSection
              num="09"
              title="Privacy & Data Protection"
              body="Your personal information is collected solely for order processing and service delivery. We do not sell, rent, or share your data with third parties. All submitted files are deleted from our systems within 30 days of order completion."
            />
            <TosSection
              num="10"
              title="Prohibited Content"
              body="Jonayskie Prints reserves the right to refuse printing of any content deemed illegal, defamatory, obscene, or in violation of intellectual property rights. Customers are solely responsible for ensuring their content complies with applicable laws."
            />
            <TosSection
              num="11"
              title="Limitation of Liability"
              body="Our maximum liability for any claim shall not exceed the amount paid for the specific order. We are not liable for indirect, incidental, or consequential damages including lost profits or data loss."
            />
            <TosSection
              num="12"
              title="Amendments"
              body="Jonayskie Prints reserves the right to update these Terms of Service at any time. Continued use of the platform after changes are published constitutes acceptance of the updated terms. Material changes will be communicated via email or platform notification."
            />
            <div
              style={{
                background: "#f9fafb",
                border: "1.5px solid #e5e7eb",
                borderRadius: 10,
                padding: ".9rem 1rem",
                fontSize: ".8rem",
                color: "#4b5563",
                lineHeight: 1.6,
              }}
            >
              <strong>Questions?</strong> Contact us at{" "}
              <span style={{ color: "#7c3aed", fontWeight: 600 }}>
                jonalynpascual2704@gmail.com
              </span>{" "}
              or call{" "}
              <span style={{ color: "#7c3aed", fontWeight: 600 }}>
                +63 935 033 6938
              </span>{" "}
              — Mon–Sat, 8:00 AM – 6:00 PM.
            </div>
          </div>
          <div
            style={{
              padding: ".95rem 1.5rem 1.2rem",
              borderTop: "1.5px solid #f0eef9",
              flexShrink: 0,
              background: "#fafafa",
            }}
          >
            {!hasScrolled && (
              <p
                className="tos-bounce"
                style={{
                  textAlign: "center",
                  fontSize: ".72rem",
                  color: "#9ca3af",
                  marginBottom: ".7rem",
                }}
              >
                ↓ Scroll down to read all terms before accepting
              </p>
            )}
            <div style={{ display: "flex", gap: ".7rem" }}>
              <button
                onClick={onDecline}
                style={{
                  flex: 1,
                  padding: ".68rem",
                  background: "transparent",
                  color: "#6b7280",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: 10,
                  fontFamily: "'Inter',sans-serif",
                  fontSize: ".84rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Decline & Logout
              </button>
              <button
                onClick={hasScrolled ? onAccept : undefined}
                style={{
                  flex: 2,
                  padding: ".68rem",
                  border: "none",
                  borderRadius: 10,
                  fontFamily: "'Inter',sans-serif",
                  fontSize: ".84rem",
                  fontWeight: 700,
                  cursor: hasScrolled ? "pointer" : "not-allowed",
                  background: hasScrolled
                    ? "linear-gradient(135deg,#5b6dee,#7c3aed)"
                    : "#e5e7eb",
                  color: hasScrolled ? "#fff" : "#9ca3af",
                  boxShadow: hasScrolled
                    ? "0 4px 14px rgba(124,58,237,.35)"
                    : "none",
                  transition: "all .3s",
                }}
              >
                {hasScrolled
                  ? "\u2713 I Accept These Terms"
                  : "Read All Terms First"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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

function CancelConfirmModal({
  orderId,
  onConfirm,
  onClose,
}: {
  orderId: string;
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
              Order #{String(orderId).slice(-6)}
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

const PICKUP_TIMES = [
  { value: "08:00", label: "8:00 AM" },
  { value: "08:30", label: "8:30 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "09:30", label: "9:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "13:30", label: "1:30 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "14:30", label: "2:30 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "15:30", label: "3:30 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "16:30", label: "4:30 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "17:30", label: "5:30 PM" },
  { value: "18:00", label: "6:00 PM" },
];

function PickupTimeDropdown({
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

async function uploadFilesForOrder(
  orderId: string,
  files: FileList,
): Promise<void> {
  if (!files || files.length === 0) return;
  const fd = new FormData();
  fd.append("order_id", orderId);
  Array.from(files).forEach((f) => fd.append("files", f));
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const r = await res.json();
  if (!r.success) throw new Error(r.message || "File upload failed");
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showTosModal, setShowTosModal] = useState(false);

  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<Toast>({
    message: "",
    type: "success",
    visible: false,
  });
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);
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
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(
    null,
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [viewDetailsOrder, setViewDetailsOrder] = useState<Order | null>(null);
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
  const [noPaymentMethod, setNoPaymentMethod] = useState<"cash" | "gcash">(
    "cash",
  );
  const [noGcashPayType, setNoGcashPayType] = useState<"downpayment" | "full">(
    "full",
  );
  const [noGcashReceipt, setNoGcashReceipt] = useState<File | null>(null);
  const [noGcashReceiptPreview, setNoGcashReceiptPreview] = useState<
    string | null
  >(null);
  const [noGcashRefNum, setNoGcashRefNum] = useState("");
  const gcashReceiptRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const accepted = localStorage.getItem(TOS_ACCEPTED_KEY);
    if (!accepted) setShowTosModal(true);
  }, []);

  function handleTosAccept() {
    localStorage.setItem(TOS_ACCEPTED_KEY, "true");
    setShowTosModal(false);
    showToast("Welcome! You have agreed to our Terms of Service.", "success");
  }

  async function handleTosDecline() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    router.replace("/login");
  }

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

  useEffect(() => {
    if (searchParams.get("welcome") !== "true") return;
    if (!user.first_name) return;
    window.history.replaceState({}, "", "/user/dashboard");
    const timer = setTimeout(() => {
      showToast(`Welcome back, ${user.first_name}! 👋`, "success");
    }, 300);
    return () => clearTimeout(timer);
  }, [searchParams, user.first_name, showToast]);

  async function handleCancelOrder(orderId: string) {
    setCancellingId(orderId);
    try {
      const fd = new FormData();
      fd.append("action", "cancelOrder");
      fd.append("order_id", orderId);
      const res = await fetch("/api/dashboard", { method: "POST", body: fd });
      const r = await res.json();
      if (r.success) {
        showToast("Order cancelled successfully.");
        fetchOrders(orderFilter);
        fetchStats();
        fetchRecentOrders();
      } else showToast(r.message || "Could not cancel order.", "error");
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

  // ── NEW: unified multi-file handler for new order ──
  async function handleFileChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    setNoFiles(files);
    setNoPdfPages(0);
    setNoQuantity("");
    if (noService === "Print" || noService === "Photocopy") {
      const totalPages = await countPagesFromFiles(files);
      if (totalPages > 0) {
        setNoPdfPages(totalPages);
        const copies = Number(noCopies) || 1;
        setNoQuantity(totalPages * copies);
        const fileCount = Array.from(files).filter((f) => {
          const n = f.name.toLowerCase();
          return n.endsWith(".pdf") || n.endsWith(".docx");
        }).length;
        showToast(
          `${fileCount} file${fileCount > 1 ? "s" : ""} — ${totalPages} total page${totalPages > 1 ? "s" : ""} × ${copies} copies = ${totalPages * copies} total`,
          "success",
        );
      } else {
        setNoQuantity("");
        setNoPdfPages(0);
      }
    }
  }

  // ── NEW: unified multi-file handler for edit order ──
  async function handleEditFileChange(files: FileList | null) {
    if (!files || files.length === 0) {
      setEoPdfPages(0);
      setEoQuantity("");
      return;
    }
    setEoPdfPages(0);
    if (eoService === "Print" || eoService === "Photocopy") {
      const totalPages = await countPagesFromFiles(files);
      if (totalPages > 0) {
        setEoPdfPages(totalPages);
        const copies = Number(eoCopies) || 1;
        setEoQuantity(totalPages * copies);
        const fileCount = Array.from(files).filter((f) => {
          const n = f.name.toLowerCase();
          return n.endsWith(".pdf") || n.endsWith(".docx");
        }).length;
        showToast(
          `${fileCount} file${fileCount > 1 ? "s" : ""} — ${totalPages} total page${totalPages > 1 ? "s" : ""} × ${copies} copies = ${totalPages * copies} total`,
          "success",
        );
      } else {
        setEoQuantity("");
        setEoPdfPages(0);
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
    if (noPaymentMethod === "gcash" && !noGcashReceipt) {
      showToast(
        "Please upload your GCash receipt as proof of payment.",
        "error",
      );
      return;
    }
    if (noPaymentMethod === "gcash" && !noGcashRefNum.trim()) {
      showToast("Please enter your GCash reference number.", "error");
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
      fd.append(
        "payment_method",
        noPaymentMethod === "gcash" ? "GCash" : "Cash",
      );
      if (noPaymentMethod === "gcash") {
        fd.append("gcash_pay_type", noGcashPayType);
        if (noGcashRefNum) fd.append("gcash_ref_num", noGcashRefNum);
        if (noGcashReceipt) fd.append("gcash_receipt", noGcashReceipt);
      }
      if (noFiles && noFiles.length > 0) {
        Array.from(noFiles).forEach((f) => fd.append("files", f));
      }

      const res = await fetch("/api/dashboard", { method: "POST", body: fd });
      const r = await res.json();

      if (!r.success) {
        showToast(r.message || "Error placing order", "error");
        setNoSubmitting(false);
        return;
      }

      const newOrderId: string = r.data.order_id;

      if (noFiles && noFiles.length > 0) {
        try {
          await uploadFilesForOrder(newOrderId, noFiles);
        } catch {
          showToast(
            `Order placed! But file upload failed. Please contact support.`,
            "error",
          );
          resetForm();
          setActiveSection("dashboard");
          fetchStats();
          fetchRecentOrders();
          setNoSubmitting(false);
          return;
        }
      }

      if (noPaymentMethod === "gcash" && noGcashReceipt) {
        try {
          const gfd = new FormData();
          gfd.append("order_id", newOrderId);
          gfd.append("gcash_receipt", noGcashReceipt);
          gfd.append("gcash_ref_num", noGcashRefNum);
          await fetch("/api/gcash-receipt", { method: "POST", body: gfd });
        } catch {
          // non-fatal
        }
      }

      showToast(
        `Order placed successfully! ID: #${String(newOrderId).slice(-6)}`,
      );
      resetForm();
      setActiveSection("dashboard");
      fetchStats();
      fetchRecentOrders();
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
    setNoPaymentMethod("cash");
    setNoGcashPayType("full");
    setNoGcashReceipt(null);
    setNoGcashReceiptPreview(null);
    setNoGcashRefNum("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (gcashReceiptRef.current) gcashReceiptRef.current.value = "";
  }

  async function openEditModal(orderId: string) {
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
      fd.append("action", "updateOrder");
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

      const res = await fetch("/api/dashboard", { method: "POST", body: fd });
      const r = await res.json();

      if (!r.success) {
        showToast(r.message || "Error updating order", "error");
        setEoSubmitting(false);
        return;
      }

      const newFiles = editFileInputRef.current?.files;
      if (newFiles && newFiles.length > 0) {
        try {
          await uploadFilesForOrder(String(editOrder.order_id!), newFiles);
        } catch {
          showToast("Order updated, but new files failed to upload.", "error");
          setEditModalOpen(false);
          fetchOrders(orderFilter);
          setEoSubmitting(false);
          return;
        }
      }

      showToast("Order updated successfully!");
      setEditModalOpen(false);
      fetchOrders(orderFilter);
      fetchStats();
      fetchRecentOrders();
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

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
    }
    router.replace("/login");
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

  function displayId(id: string | number | undefined): string {
    return id ? String(id).slice(-6) : "------";
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
        .logout-btn{display:flex;align-items:center;gap:.55rem;padding:.55rem .75rem;border-radius:8px;color:#9ca3af;font-size:.8rem;font-weight:500;cursor:pointer;transition:all .15s;width:100%;border:none;background:none;-webkit-tap-highlight-color:transparent;font-family:'Inter',sans-serif}
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
        .p-board{border-radius:var(--r);padding:1rem 1rem 1.1rem;margin-bottom:.75rem;background:var(--grad);position:relative;overflow:hidden;box-shadow:0 4px 20px rgba(91,109,238,.3)}
        .p-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;gap:.4rem;position:relative;z-index:1}
        .p-label{font-size:.76rem;font-weight:600;color:rgba(255,255,255,.92);display:flex;align-items:center;gap:.35rem}
        .p-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem;position:relative;z-index:1}
        .p-card{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:1rem .5rem .9rem;text-align:center;backdrop-filter:blur(6px);transition:background .2s,transform .15s}
        .p-card:hover{background:rgba(255,255,255,.24);transform:translateY(-2px)}
        .p-ico{width:44px;height:44px;margin:0 auto .45rem;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
        .p-name{font-size:.72rem;color:rgba(255,255,255,.88);font-weight:600;margin-bottom:.22rem;letter-spacing:.01em}
        .p-price{font-size:1.25rem;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1}
        .p-unit{font-size:.62rem;color:rgba(255,255,255,.62);margin-top:3px}
        .stats-wrap{margin-bottom:.75rem}
        .stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.55rem}
        .stat-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:.8rem 1rem;display:flex;align-items:center;gap:.75rem;box-shadow:0 1px 4px rgba(0,0,0,.06);transition:box-shadow .15s}
        .stat-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1)}
        .stat-icon-wrap{width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .stat-right{display:flex;flex-direction:column;min-width:0}
        .stat-value{font-size:1.35rem;font-weight:700;color:var(--text);letter-spacing:-.03em;line-height:1}
        .stat-label{font-size:.62rem;color:var(--muted);margin-top:4px;white-space:nowrap}
        .card{background:var(--surface);border-radius:var(--r);border:1px solid var(--border);overflow:visible;margin-bottom:.75rem;box-shadow:0 1px 3px rgba(0,0,0,.06)}
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
        .pdf-info{background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:8px;padding:.5rem .75rem;margin-top:.5rem;display:flex;align-items:center;gap:.4rem;font-size:.72rem;color:#7c3aed;font-weight:600}
        .copies-info{background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:8px;padding:.4rem .75rem;margin-top:.4rem;font-size:.7rem;color:#16a34a;font-weight:600}
        .hint-text{font-size:.68rem;color:var(--muted);margin-top:.25rem}
        .sb-overlay{display:none;position:fixed;inset:0;background:rgba(30,27,75,.5);z-index:190}
        .sb-overlay.on{display:block}
        .empty-state{padding:2.2rem;text-align:center;color:var(--muted);font-size:.82rem}
        .np-card{background:#fff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 2px 16px rgba(0,0,0,.07);overflow:hidden;max-width:700px;font-family:'Inter',sans-serif}
        .np-bar{height:5px;background:linear-gradient(90deg,#5b6dee 0%,#7c3aed 55%,#a855f7 100%)}
        .np-hero{position:relative;padding:1.5rem 1.5rem 1.2rem;background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 60%,#e9d5ff 100%);border-bottom:1px solid #ddd6fe;display:flex;align-items:flex-end;gap:1.1rem}
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
        .file-list{margin-top:.4rem;display:flex;flex-direction:column;gap:3px}
        .file-item{display:flex;align-items:center;gap:.35rem;font-size:.7rem;color:var(--muted);background:#f9fafb;border:1px solid var(--border);border-radius:6px;padding:.28rem .55rem}
        .file-item-badge{font-size:.58rem;font-weight:700;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#7c3aed;flex-shrink:0}
        @media(max-width:359px){.p-grid{grid-template-columns:repeat(2,1fr);gap:.4rem}.stats-grid{grid-template-columns:1fr 1fr}.btn-row{flex-direction:column-reverse}.btn-row.between{flex-direction:row}.form-row-2{grid-template-columns:1fr}}
        @media(min-width:360px) and (max-width:479px){.p-grid{grid-template-columns:repeat(2,1fr);gap:.5rem}.form-row-2{grid-template-columns:1fr}}
        @media(min-width:480px) and (max-width:639px){.p-grid{grid-template-columns:repeat(3,1fr);gap:.5rem}.stats-grid{grid-template-columns:repeat(2,1fr)}}
        @media(min-width:640px) and (max-width:767px){.p-grid{grid-template-columns:repeat(3,1fr);gap:.6rem}.stats-grid{grid-template-columns:repeat(4,1fr)}.modal-overlay{align-items:center;padding:1rem}.modal{border-radius:14px;max-width:560px;max-height:90vh}}
        @media(min-width:768px) and (max-width:1023px){.p-grid{grid-template-columns:repeat(3,1fr);gap:.65rem}.stats-grid{grid-template-columns:repeat(4,1fr)}.modal-overlay{align-items:center;padding:1rem}.modal{border-radius:14px;max-width:560px;max-height:90vh;padding:1.4rem 1.6rem}}
        @media(min-width:1024px){.hamburger{display:none}.p-grid{grid-template-columns:repeat(6,1fr);gap:.65rem}.stats-grid{grid-template-columns:repeat(4,1fr)}.modal-overlay{align-items:center;padding:1rem}.modal{border-radius:14px;max-width:560px;max-height:90vh;padding:1.4rem 1.6rem}}
        @media(max-width:1023px){.sidebar{position:fixed;top:0;left:0;height:100%;transform:translateX(-100%)}.sidebar.open{transform:translateX(0);box-shadow:4px 0 30px rgba(0,0,0,.25)}.hamburger{display:flex}}
        @media(max-width:639px){.ro-thead th:nth-child(3),.ro-row td:nth-child(3){display:none}.np-g2{grid-template-columns:1fr}}
        @media(max-width:479px){.content{padding:.6rem}.p-board{padding:.75rem .75rem .8rem;margin-bottom:.6rem}.stats-wrap{margin-bottom:.6rem}.form-row-2{grid-template-columns:1fr}.modal{padding:.95rem .85rem;max-height:94dvh}.np-hero{padding:1.1rem 1rem 1rem}.np-avatar{width:62px;height:62px;font-size:1.3rem}.np-body{padding:1.1rem 1rem 1.4rem}.np-tabs{padding:0 1rem}.welcome{display:none}}
        @media(min-width:1400px){.content{padding:1rem 1.5rem}.p-board{padding:1.15rem 1.15rem 1.2rem}}
      `}</style>

      <ToastNotification toast={toast} />

      {showTosModal && (
        <FirstLoginTosModal
          onAccept={handleTosAccept}
          onDecline={handleTosDecline}
        />
      )}

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
            <button className="logout-btn" onClick={handleLogout}>
              <IC.Logout /> Logout
            </button>
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
              <div className="card" style={{ overflow: "hidden" }}>
                <div
                  className="card-head"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Recent Orders</span>
                  <button
                    onClick={() => setActiveSection("orders")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#7c3aed",
                      fontSize: ".75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: ".25rem",
                      padding: "2px 0",
                      fontFamily: "'Inter',sans-serif",
                    }}
                  >
                    View All →
                  </button>
                </div>
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
                          onClick={() => setActiveSection("orders")}
                          style={{ cursor: "pointer" }}
                          title="View in My Orders"
                        >
                          <td className="ro-id">#{displayId(o.order_id)}</td>
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
              <div
                className="card"
                style={{
                  padding: "1rem",
                  paddingBottom: "2rem",
                  overflow: "visible",
                }}
              >
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
                  {/* Step 0 */}
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
                            Upload PDF/DOCX in Step 3 — pages will be
                            auto-counted
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
                              <label
                                key={d}
                                className="radio-label"
                                style={{ alignItems: "flex-start" }}
                              >
                                <input
                                  type="radio"
                                  name="no_del"
                                  value={d}
                                  checked={noDelivery === d}
                                  onChange={() => {
                                    setNoDelivery(d);
                                    setNoPickupTime("");
                                  }}
                                  style={{ marginTop: 3 }}
                                />
                                <div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: ".3rem",
                                      fontWeight: 600,
                                      fontSize: ".83rem",
                                      color: "#111827",
                                    }}
                                  >
                                    {d === "pickup" ? (
                                      <>
                                        <IC.Home /> Pickup
                                      </>
                                    ) : (
                                      <>
                                        <IC.Truck /> Delivery
                                      </>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: ".68rem",
                                      color: "#6b7280",
                                      marginTop: 2,
                                    }}
                                  >
                                    {d === "pickup"
                                      ? "Pick up at our store"
                                      : "Santa Rosa area only"}
                                  </div>
                                </div>
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
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
                        <PickupTimeDropdown
                          value={noPickupTime}
                          onChange={setNoPickupTime}
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

                  {/* Step 1 */}
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

                  {/* Step 2 */}
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
                          (PDF, JPG, PNG, DOCX)
                        </span>
                      </label>
                      <input
                        className="form-input"
                        type="file"
                        multiple
                        ref={fileInputRef}
                        accept=".pdf,.jpg,.jpeg,.png,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileChange(e.target.files);
                          }
                          // if e.target.files is empty (user cancelled), do nothing — keep previous noFiles
                        }}
                      />
                      {/* File list display */}
                      {noFiles && noFiles.length > 0 && (
                        <div className="file-list">
                          {Array.from(noFiles).map((f, fi) => {
                            const ext =
                              f.name.split(".").pop()?.toLowerCase() ?? "";
                            const isPaged = ext === "pdf" || ext === "docx";
                            return (
                              <div
                                key={`${fi}-${f.name}`}
                                className="file-item"
                              >
                                <IC.PDF />
                                <span
                                  style={{
                                    flex: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {f.name}
                                </span>
                                <span
                                  className="file-item-badge"
                                  style={
                                    isPaged
                                      ? {}
                                      : {
                                          background: "#f3f4f6",
                                          color: "#6b7280",
                                        }
                                  }
                                >
                                  {ext.toUpperCase()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {noPdfPages > 0 && (
                        <div className="pdf-info">
                          <IC.PDF />
                          {showsCopies
                            ? `${noPdfPages} pages × ${noCopies} copies = ${noPdfPages * Number(noCopies)} total pages`
                            : `${noPdfPages} pages detected`}
                        </div>
                      )}
                    </div>

                    {/* ── PAYMENT METHOD ── */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        className="form-label"
                        style={{ marginBottom: ".5rem" }}
                      >
                        Payment Method
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: ".6rem",
                          marginBottom: ".75rem",
                        }}
                      >
                        {(["cash", "gcash"] as const).map((pm) => (
                          <button
                            key={pm}
                            type="button"
                            onClick={() => setNoPaymentMethod(pm)}
                            style={{
                              flex: 1,
                              padding: ".65rem .5rem",
                              border: `2px solid ${noPaymentMethod === pm ? (pm === "gcash" ? "#7c3aed" : "#16a34a") : "#e5e7eb"}`,
                              borderRadius: 10,
                              background:
                                noPaymentMethod === pm
                                  ? pm === "gcash"
                                    ? "#f5f3ff"
                                    : "#f0fdf4"
                                  : "#fff",
                              cursor: "pointer",
                              fontFamily: "'Inter',sans-serif",
                              fontWeight: 700,
                              fontSize: ".82rem",
                              color:
                                noPaymentMethod === pm
                                  ? pm === "gcash"
                                    ? "#7c3aed"
                                    : "#16a34a"
                                  : "#6b7280",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: ".4rem",
                              transition: "all .15s",
                            }}
                          >
                            {pm === "cash" ? (
                              <>
                                <IcoCash
                                  size={15}
                                  color={
                                    noPaymentMethod === "cash"
                                      ? "#16a34a"
                                      : "#6b7280"
                                  }
                                />
                                Cash on Pickup
                              </>
                            ) : (
                              <>
                                <IcoGCash
                                  size={15}
                                  color={
                                    noPaymentMethod === "gcash"
                                      ? "#7c3aed"
                                      : "#6b7280"
                                  }
                                />
                                Pay via GCash
                              </>
                            )}
                          </button>
                        ))}
                      </div>

                      {noPaymentMethod === "cash" && (
                        <div
                          style={{
                            background: "#f0fdf4",
                            border: "1.5px solid #bbf7d0",
                            borderRadius: 10,
                            padding: ".65rem .9rem",
                            display: "flex",
                            alignItems: "center",
                            gap: ".5rem",
                            fontSize: ".78rem",
                            color: "#374151",
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#16a34a"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Pay in cash when you pick up or receive your order. No
                          advance payment needed.
                        </div>
                      )}

                      {noPaymentMethod === "gcash" && (
                        <div
                          style={{
                            border: "2px solid #7c3aed",
                            borderRadius: 12,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              background:
                                "linear-gradient(135deg,#5b6dee,#7c3aed)",
                              padding: ".65rem 1rem",
                              display: "flex",
                              alignItems: "center",
                              gap: ".5rem",
                            }}
                          >
                            <IcoGCash size={16} color="#fff" />
                            <span
                              style={{
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: ".84rem",
                              }}
                            >
                              Pay via GCash
                            </span>
                            <span
                              style={{
                                marginLeft: "auto",
                                background: "rgba(255,255,255,.2)",
                                color: "#fff",
                                fontSize: ".65rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 99,
                              }}
                            >
                              Online Payment
                            </span>
                          </div>

                          <div style={{ padding: "1rem" }}>
                            <div style={{ marginBottom: "1rem" }}>
                              <div
                                style={{
                                  fontSize: ".72rem",
                                  fontWeight: 700,
                                  color: "#374151",
                                  textTransform: "uppercase",
                                  letterSpacing: ".06em",
                                  marginBottom: ".5rem",
                                }}
                              >
                                How much would you like to pay?
                              </div>
                              <div style={{ display: "flex", gap: ".5rem" }}>
                                {[
                                  {
                                    val: "full" as const,
                                    label: "Full Payment",
                                    sub: `₱${summaryTotal.toFixed(2)}`,
                                    icon: <IcoFullPayment />,
                                    disabled: false as const,
                                  },
                                  {
                                    val: "downpayment" as const,
                                    label: "Downpayment (50%)",
                                    sub:
                                      summaryTotal >= 500
                                        ? `₱${(summaryTotal * 0.5).toFixed(2)}`
                                        : "Only for ₱500+",
                                    icon: <IcoDownpayment />,
                                    disabled: summaryTotal < 500,
                                  },
                                ].map(({ val, label, sub, icon, disabled }) => (
                                  <button
                                    key={val}
                                    type="button"
                                    disabled={!!disabled}
                                    onClick={() =>
                                      !disabled && setNoGcashPayType(val)
                                    }
                                    style={{
                                      flex: 1,
                                      padding: ".6rem .5rem",
                                      border: `2px solid ${noGcashPayType === val && !disabled ? "#7c3aed" : "#e5e7eb"}`,
                                      borderRadius: 10,
                                      background:
                                        noGcashPayType === val && !disabled
                                          ? "#f5f3ff"
                                          : disabled
                                            ? "#f9fafb"
                                            : "#fff",
                                      cursor: disabled
                                        ? "not-allowed"
                                        : "pointer",
                                      fontFamily: "'Inter',sans-serif",
                                      transition: "all .15s",
                                      opacity: disabled ? 0.45 : 1,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: 4,
                                        color:
                                          noGcashPayType === val && !disabled
                                            ? "#7c3aed"
                                            : "#9ca3af",
                                      }}
                                    >
                                      {icon}
                                    </div>
                                    <div
                                      style={{
                                        fontWeight: 700,
                                        fontSize: ".76rem",
                                        color:
                                          noGcashPayType === val && !disabled
                                            ? "#7c3aed"
                                            : "#374151",
                                      }}
                                    >
                                      {label}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: ".68rem",
                                        color:
                                          noGcashPayType === val && !disabled
                                            ? "#7c3aed"
                                            : "#9ca3af",
                                        fontWeight: 600,
                                        marginTop: 1,
                                      }}
                                    >
                                      {sub}
                                    </div>
                                  </button>
                                ))}
                              </div>
                              {noGcashPayType === "downpayment" &&
                                summaryTotal >= 500 && (
                                  <div
                                    style={{
                                      marginTop: ".5rem",
                                      background: "#fffbeb",
                                      border: "1px solid #fcd34d",
                                      borderRadius: 8,
                                      padding: ".45rem .7rem",
                                      fontSize: ".72rem",
                                      color: "#92400e",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: ".4rem",
                                    }}
                                  >
                                    <span
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <IcoWarning />
                                    </span>
                                    Balance of{" "}
                                    <strong>
                                      ₱{(summaryTotal * 0.5).toFixed(2)}
                                    </strong>{" "}
                                    is due on pickup/delivery.
                                  </div>
                                )}
                            </div>

                            <div
                              style={{
                                background: "#f5f3ff",
                                border: "1.5px solid #ddd6fe",
                                borderRadius: 8,
                                padding: ".5rem .85rem",
                                marginBottom: "1rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: ".76rem",
                                  color: "#6b7280",
                                  fontWeight: 600,
                                }}
                              >
                                Send exactly:
                              </span>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: "1.05rem",
                                  color: "#7c3aed",
                                }}
                              >
                                ₱
                                {(noGcashPayType === "downpayment" &&
                                summaryTotal >= 500
                                  ? summaryTotal * 0.5
                                  : summaryTotal
                                ).toFixed(2)}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: ".6rem",
                                marginBottom: ".85rem",
                              }}
                            >
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: "50%",
                                  background: "#7c3aed",
                                  color: "#fff",
                                  fontSize: ".7rem",
                                  fontWeight: 800,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                1
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: ".8rem",
                                    color: "#111827",
                                    marginBottom: ".4rem",
                                  }}
                                >
                                  Scan the GCash QR Code
                                </div>
                                <div
                                  style={{
                                    background: "#fff",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: 10,
                                    padding: ".75rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: ".5rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      position: "relative",
                                      width: 200,
                                      height: 200,
                                    }}
                                  >
                                    <img
                                      src="/gcash-qr.jpg"
                                      alt="GCash QR Code"
                                      style={{
                                        width: 200,
                                        height: 200,
                                        objectFit: "contain",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        display: "block",
                                      }}
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                        const fallback =
                                          document.getElementById(
                                            "gcash-qr-fallback",
                                          );
                                        if (fallback)
                                          fallback.style.display = "flex";
                                      }}
                                    />
                                    <div
                                      id="gcash-qr-fallback"
                                      style={{
                                        width: 200,
                                        height: 200,
                                        background: "#f3f4f6",
                                        border: "2px dashed #d1d5db",
                                        borderRadius: 8,
                                        display: "none",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexDirection: "column",
                                        gap: 4,
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                      }}
                                    >
                                      <IcoGCash size={32} color="#9ca3af" />
                                      <span
                                        style={{
                                          fontSize: ".65rem",
                                          color: "#9ca3af",
                                          textAlign: "center",
                                        }}
                                      >
                                        Place gcash-qr.jpg in
                                        <br />
                                        your /public folder
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: ".72rem",
                                      color: "#6b7280",
                                      textAlign: "center",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    Open GCash → Scan QR
                                    <br />
                                    <strong style={{ color: "#7c3aed" }}>
                                      Jonayskie Prints
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: ".6rem",
                                marginBottom: ".85rem",
                              }}
                            >
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: "50%",
                                  background: "#7c3aed",
                                  color: "#fff",
                                  fontSize: ".7rem",
                                  fontWeight: 800,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                2
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: ".8rem",
                                    color: "#111827",
                                    marginBottom: ".35rem",
                                  }}
                                >
                                  Enter GCash Reference Number
                                </div>
                                <input
                                  className="form-input"
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="e.g. 1234567890123"
                                  value={noGcashRefNum}
                                  onChange={(e) =>
                                    setNoGcashRefNum(
                                      e.target.value.replace(/[^0-9]/g, ""),
                                    )
                                  }
                                  maxLength={20}
                                  style={{ fontSize: "max(16px,.875rem)" }}
                                />
                                <div className="hint-text">
                                  Found in your GCash transaction receipt
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: ".6rem",
                              }}
                            >
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: "50%",
                                  background: "#7c3aed",
                                  color: "#fff",
                                  fontSize: ".7rem",
                                  fontWeight: 800,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                3
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: ".8rem",
                                    color: "#111827",
                                    marginBottom: ".35rem",
                                  }}
                                >
                                  Upload GCash Receipt Screenshot{" "}
                                  <span style={{ color: "#ef4444" }}>*</span>
                                </div>
                                <input
                                  ref={gcashReceiptRef}
                                  className="form-input"
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setNoGcashReceipt(file);
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) =>
                                        setNoGcashReceiptPreview(
                                          ev.target?.result as string,
                                        );
                                      reader.readAsDataURL(file);
                                    } else setNoGcashReceiptPreview(null);
                                  }}
                                />
                                {noGcashReceiptPreview && (
                                  <div
                                    style={{
                                      marginTop: ".5rem",
                                      position: "relative",
                                      display: "inline-block",
                                    }}
                                  >
                                    <img
                                      src={noGcashReceiptPreview}
                                      alt="Receipt preview"
                                      style={{
                                        width: "100%",
                                        maxWidth: 200,
                                        borderRadius: 8,
                                        border: "2px solid #22c55e",
                                        display: "block",
                                      }}
                                    />
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: 4,
                                        right: 4,
                                        background: "#22c55e",
                                        borderRadius: "50%",
                                        width: 20,
                                        height: 20,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <svg
                                        width="10"
                                        height="10"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#fff"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                      >
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNoGcashReceipt(null);
                                        setNoGcashReceiptPreview(null);
                                        if (gcashReceiptRef.current)
                                          gcashReceiptRef.current.value = "";
                                      }}
                                      style={{
                                        position: "absolute",
                                        top: 4,
                                        left: 4,
                                        background: "rgba(0,0,0,.55)",
                                        border: "none",
                                        borderRadius: "50%",
                                        width: 20,
                                        height: 20,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        color: "#fff",
                                        fontSize: "10px",
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                                <div className="hint-text">
                                  Screenshot of your GCash payment confirmation
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── ORDER SUMMARY ── */}
                    <div className="sum-box">
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: ".85rem",
                          marginBottom: ".75rem",
                          color: "var(--text)",
                          display: "flex",
                          alignItems: "center",
                          gap: ".4rem",
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#7c3aed"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        Order Summary
                      </div>

                      <div
                        style={{
                          background: "#f5f3ff",
                          borderRadius: 8,
                          padding: ".55rem .75rem",
                          marginBottom: ".65rem",
                        }}
                      >
                        <div className="sum-row" style={{ paddingBottom: 2 }}>
                          <span style={{ fontWeight: 600, color: "#374151" }}>
                            Service
                          </span>
                          <span style={{ fontWeight: 700, color: "#7c3aed" }}>
                            {noService || "—"}
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
                            <span>Paper Size</span>
                            <span>
                              {noPaperSize}
                              {noPaperSize === "Long" ? " (+20%)" : ""}
                            </span>
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
                      </div>

                      <div
                        style={{
                          borderTop: "1px dashed #e5e7eb",
                          paddingTop: ".6rem",
                          marginBottom: ".5rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: ".63rem",
                            fontWeight: 700,
                            letterSpacing: ".07em",
                            textTransform: "uppercase",
                            color: "#9ca3af",
                            marginBottom: ".4rem",
                          }}
                        >
                          Price Breakdown
                        </div>

                        {noService &&
                          effectiveQuantity >= 1 &&
                          (() => {
                            const sl = noService.toLowerCase().trim();
                            const m = PAPER_MULTIPLIERS[noPaperSize] ?? 1.0;
                            let unitPrice = 0;
                            let priceLabel = "";
                            if (sl === "print") {
                              unitPrice =
                                (noColorOption === "color"
                                  ? sp(prices.print_color, 2)
                                  : sp(prices.print_bw, 1)) * m;
                              priceLabel = `₱${(noColorOption === "color" ? sp(prices.print_color, 2) : sp(prices.print_bw, 1)).toFixed(2)}/page${noPaperSize === "Long" ? " × 1.2 (Long)" : ""}`;
                            } else if (sl === "photocopy") {
                              unitPrice = sp(prices.photocopying, 2) * m;
                              priceLabel = `₱${sp(prices.photocopying, 2).toFixed(2)}/page${noPaperSize === "Long" ? " × 1.2 (Long)" : ""}`;
                            } else if (sl === "scanning") {
                              unitPrice = sp(prices.scanning, 5) * m;
                              priceLabel = `₱${sp(prices.scanning, 5).toFixed(2)}/page${noPaperSize === "Long" ? " × 1.2 (Long)" : ""}`;
                            } else if (sl === "photo development") {
                              unitPrice = sp(prices.photo_development, 15);
                              priceLabel = `₱${sp(prices.photo_development, 15).toFixed(2)}/photo`;
                            } else if (sl === "laminating") {
                              unitPrice = sp(prices.laminating, 20);
                              priceLabel = `₱${sp(prices.laminating, 20).toFixed(2)}/item`;
                            }
                            const baseTotal = unitPrice * effectiveQuantity;
                            return (
                              <div
                                className="sum-row"
                                style={{
                                  padding: "4px 0",
                                  alignItems: "flex-start",
                                }}
                              >
                                <span style={{ flex: 1 }}>
                                  {noService}
                                  {showsCopies && noPdfPages > 0 && (
                                    <span
                                      style={{
                                        display: "block",
                                        fontSize: ".63rem",
                                        color: "#9ca3af",
                                        marginTop: 1,
                                      }}
                                    >
                                      {noPdfPages} pages × {noCopies} copies × ₱
                                      {(
                                        (noService.toLowerCase() === "print"
                                          ? noColorOption === "color"
                                            ? sp(prices.print_color, 2)
                                            : sp(prices.print_bw, 1)
                                          : sp(prices.photocopying, 2)) *
                                        (PAPER_MULTIPLIERS[noPaperSize] ?? 1)
                                      ).toFixed(2)}
                                      /page
                                    </span>
                                  )}
                                  {showsCopies && noPdfPages === 0 && (
                                    <span
                                      style={{
                                        display: "block",
                                        fontSize: ".63rem",
                                        color: "#9ca3af",
                                        marginTop: 1,
                                      }}
                                    >
                                      {effectiveQuantity} copies × ₱
                                      {(
                                        (noService.toLowerCase() === "print"
                                          ? noColorOption === "color"
                                            ? sp(prices.print_color, 2)
                                            : sp(prices.print_bw, 1)
                                          : sp(prices.photocopying, 2)) *
                                        (PAPER_MULTIPLIERS[noPaperSize] ?? 1)
                                      ).toFixed(2)}
                                      /page
                                    </span>
                                  )}
                                  {!showsCopies && (
                                    <span
                                      style={{
                                        display: "block",
                                        fontSize: ".63rem",
                                        color: "#9ca3af",
                                        marginTop: 1,
                                      }}
                                    >
                                      {effectiveQuantity} × {priceLabel}
                                    </span>
                                  )}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: "#111827",
                                    whiteSpace: "nowrap",
                                    paddingLeft: 8,
                                  }}
                                >
                                  ₱{baseTotal.toFixed(2)}
                                </span>
                              </div>
                            );
                          })()}

                        {noLamination &&
                          noService.toLowerCase() !== "laminating" &&
                          effectiveQuantity >= 1 && (
                            <div
                              className="sum-row"
                              style={{ padding: "4px 0" }}
                            >
                              <span>
                                Lamination add-on{" "}
                                <span
                                  style={{
                                    fontSize: ".63rem",
                                    color: "#9ca3af",
                                  }}
                                >
                                  {effectiveQuantity} × ₱
                                  {sp(prices.laminating, 20).toFixed(2)}
                                </span>
                              </span>
                              <span
                                style={{ fontWeight: 600, color: "#111827" }}
                              >
                                ₱
                                {(
                                  sp(prices.laminating, 20) * effectiveQuantity
                                ).toFixed(2)}
                              </span>
                            </div>
                          )}
                      </div>

                      <div
                        style={{
                          background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
                          borderRadius: 8,
                          padding: ".6rem .75rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: ".3rem",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: ".88rem",
                            color: "#374151",
                          }}
                        >
                          Total Amount
                        </span>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "1.15rem",
                            color: "#7c3aed",
                            letterSpacing: "-.02em",
                          }}
                        >
                          ₱{summaryTotal.toFixed(2)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: ".55rem",
                          padding: ".5rem .75rem",
                          background: "#f9fafb",
                          border: "1.5px solid #e5e7eb",
                          borderRadius: 8,
                          fontSize: ".75rem",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>Payment via</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              noPaymentMethod === "gcash"
                                ? "#7c3aed"
                                : "#16a34a",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {noPaymentMethod === "gcash" ? (
                            <>
                              <IcoGCash size={13} color="#7c3aed" /> GCash{" "}
                              {noGcashPayType === "downpayment" &&
                              summaryTotal >= 500 ? (
                                <span
                                  style={{ fontWeight: 500, color: "#9ca3af" }}
                                >
                                  · 50% downpayment
                                </span>
                              ) : (
                                <span
                                  style={{ fontWeight: 500, color: "#9ca3af" }}
                                >
                                  · full payment
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <IcoCash size={13} color="#16a34a" /> Cash on
                              Pickup
                            </>
                          )}
                        </span>
                      </div>

                      {noPaymentMethod === "gcash" && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: ".4rem",
                            padding: ".5rem .75rem",
                            background: "#f5f3ff",
                            border: "1.5px solid #ddd6fe",
                            borderRadius: 8,
                            fontSize: ".75rem",
                          }}
                        >
                          <span style={{ color: "#7c3aed", fontWeight: 600 }}>
                            Send via GCash now:
                          </span>
                          <span
                            style={{
                              fontWeight: 800,
                              color: "#7c3aed",
                              fontSize: ".9rem",
                            }}
                          >
                            ₱
                            {(noGcashPayType === "downpayment" &&
                            summaryTotal >= 500
                              ? summaryTotal * 0.5
                              : summaryTotal
                            ).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {noPaymentMethod === "gcash" &&
                        noGcashPayType === "downpayment" &&
                        summaryTotal >= 500 && (
                          <div
                            style={{
                              background: "#fffbeb",
                              border: "1.5px solid #fcd34d",
                              borderRadius: 8,
                              padding: ".5rem .75rem",
                              marginTop: ".4rem",
                              fontSize: ".72rem",
                              color: "#92400e",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: ".4rem",
                              lineHeight: 1.5,
                            }}
                          >
                            <span
                              style={{
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                paddingTop: 1,
                              }}
                            >
                              <IcoWarning />
                            </span>
                            <span>
                              Balance of{" "}
                              <strong>
                                ₱{(summaryTotal * 0.5).toFixed(2)}
                              </strong>{" "}
                              is due upon pickup or delivery.
                            </span>
                          </div>
                        )}

                      {noPaymentMethod === "cash" && summaryTotal >= 500 && (
                        <div
                          style={{
                            background: "#fffbeb",
                            border: "1.5px solid #fcd34d",
                            borderRadius: 8,
                            padding: ".5rem .75rem",
                            marginTop: ".55rem",
                            fontSize: ".72rem",
                            color: "#92400e",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: ".4rem",
                            lineHeight: 1.5,
                          }}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              paddingTop: 1,
                            }}
                          >
                            <IcoWarning />
                          </span>
                          <span>
                            Your order exceeds <strong>₱500.00</strong>. A{" "}
                            <strong>
                              50% GCash downpayment of ₱
                              {(summaryTotal * 0.5).toFixed(2)}
                            </strong>{" "}
                            is required before processing. Switch to GCash above
                            to pay the downpayment (or full amount) now.
                            Remaining cash balance of{" "}
                            <strong>₱{(summaryTotal * 0.5).toFixed(2)}</strong>{" "}
                            is due on pickup/delivery.
                          </span>
                        </div>
                      )}
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
              <div className="card" style={{ overflow: "hidden" }}>
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
                            #{displayId(o.order_id)} — {o.service}
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
                          <div className="ord-actions">
                            <button
                              className="edit-btn"
                              style={{ color: "#2563eb" }}
                              onClick={() => setViewDetailsOrder(o)}
                            >
                              <IC.Eye /> View Details
                            </button>
                            {o.status === "pending" && (
                              <>
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
                              </>
                            )}
                            {o.status === "cancelled" && (
                              <div className="cancelled-note">
                                <IC.Lock /> Order cancelled
                              </div>
                            )}
                          </div>
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
                          your password.
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

      {/* ══ VIEW ORDER DETAILS MODAL ══ */}
      {viewDetailsOrder && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewDetailsOrder(null);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div
                style={{ display: "flex", alignItems: "center", gap: ".55rem" }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "linear-gradient(135deg,#5b6dee,#7c3aed)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IC.List />
                </div>
                <div>
                  <div className="modal-title">
                    Order #{displayId(viewDetailsOrder.order_id)}
                  </div>
                  <div
                    style={{
                      fontSize: ".63rem",
                      color: "#9ca3af",
                      marginTop: 1,
                    }}
                  >
                    {new Date(viewDetailsOrder.created_at).toLocaleDateString(
                      "en-PH",
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                  </div>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setViewDetailsOrder(null)}
              >
                ×
              </button>
            </div>

            <div
              style={{
                background:
                  viewDetailsOrder.status === "completed"
                    ? "#d1fae5"
                    : viewDetailsOrder.status === "cancelled"
                      ? "#fee2e2"
                      : viewDetailsOrder.status === "in-progress"
                        ? "#dbeafe"
                        : "#fef3c7",
                borderRadius: 10,
                padding: ".65rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: ".8rem",
                  fontWeight: 700,
                  color:
                    viewDetailsOrder.status === "completed"
                      ? "#065f46"
                      : viewDetailsOrder.status === "cancelled"
                        ? "#991b1b"
                        : viewDetailsOrder.status === "in-progress"
                          ? "#1e40af"
                          : "#92400e",
                }}
              >
                Status:{" "}
                {viewDetailsOrder.status.charAt(0).toUpperCase() +
                  viewDetailsOrder.status.slice(1)}
              </span>
              <span
                className={`badge ${viewDetailsOrder.status === "pending" ? "badge-pending" : viewDetailsOrder.status === "cancelled" ? "badge-cancelled" : viewDetailsOrder.status === "in-progress" ? "badge-progress" : "badge-completed"}`}
              >
                {viewDetailsOrder.status}
              </span>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  fontSize: ".63rem",
                  fontWeight: 700,
                  letterSpacing: ".07em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: ".5rem",
                }}
              >
                Service Details
              </div>
              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: 10,
                  border: "1.5px solid #e5e7eb",
                  overflow: "hidden",
                }}
              >
                {[
                  ["Service", viewDetailsOrder.service],
                  ["Quantity", String(viewDetailsOrder.quantity)],
                  [
                    "Delivery",
                    viewDetailsOrder.delivery_option.charAt(0).toUpperCase() +
                      viewDetailsOrder.delivery_option.slice(1),
                  ],
                  ...(viewDetailsOrder.pickup_time
                    ? [
                        [
                          "Pickup Time",
                          formatPickupTime(viewDetailsOrder.pickup_time),
                        ],
                      ]
                    : []),
                  ...(viewDetailsOrder.delivery_address
                    ? [["Delivery Address", viewDetailsOrder.delivery_address]]
                    : []),
                ].map(([label, val], i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: ".5rem .85rem",
                      borderBottom: "1px solid #f3f4f6",
                      gap: "1rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: ".75rem",
                        color: "#6b7280",
                        flexShrink: 0,
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: ".75rem",
                        fontWeight: 600,
                        color: "#111827",
                        textAlign: "right",
                      }}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  fontSize: ".63rem",
                  fontWeight: 700,
                  letterSpacing: ".07em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: ".5rem",
                }}
              >
                Specifications
              </div>
              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: 10,
                  border: "1.5px solid #e5e7eb",
                  padding: ".7rem .85rem",
                  fontSize: ".78rem",
                  color: "#374151",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {viewDetailsOrder.specifications ||
                  "No specifications provided."}
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  fontSize: ".63rem",
                  fontWeight: 700,
                  letterSpacing: ".07em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: ".5rem",
                }}
              >
                Price Breakdown
              </div>
              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: 10,
                  border: "1.5px solid #e5e7eb",
                  overflow: "hidden",
                }}
              >
                {(() => {
                  const specs = viewDetailsOrder.specifications;
                  const p = parseSpecsOptions(specs);
                  const sl = viewDetailsOrder.service.toLowerCase().trim();
                  const paperSize = p.paperSize || "A4";
                  const m = PAPER_MULTIPLIERS[paperSize as PaperSize] ?? 1.0;
                  const colorOpt = p.colorOption || "bw";
                  const qty = viewDetailsOrder.quantity;
                  let unitPrice = 0;
                  let priceNote = "";
                  if (sl === "print") {
                    unitPrice =
                      (colorOpt === "color"
                        ? sp(prices.print_color, 2)
                        : sp(prices.print_bw, 1)) * m;
                    priceNote = `${qty} page${qty > 1 ? "s" : ""} × ₱${((colorOpt === "color" ? sp(prices.print_color, 2) : sp(prices.print_bw, 1)) * m).toFixed(2)}`;
                  } else if (sl === "photocopy") {
                    unitPrice = sp(prices.photocopying, 2) * m;
                    priceNote = `${qty} page${qty > 1 ? "s" : ""} × ₱${(sp(prices.photocopying, 2) * m).toFixed(2)}`;
                  } else if (sl === "scanning") {
                    unitPrice = sp(prices.scanning, 5) * m;
                    priceNote = `${qty} page${qty > 1 ? "s" : ""} × ₱${(sp(prices.scanning, 5) * m).toFixed(2)}`;
                  } else if (sl === "photo development") {
                    unitPrice = sp(prices.photo_development, 15);
                    priceNote = `${qty} photo${qty > 1 ? "s" : ""} × ₱${sp(prices.photo_development, 15).toFixed(2)}`;
                  } else if (sl === "laminating") {
                    unitPrice = sp(prices.laminating, 20);
                    priceNote = `${qty} item${qty > 1 ? "s" : ""} × ₱${sp(prices.laminating, 20).toFixed(2)}`;
                  }
                  const baseTotal = unitPrice * qty;
                  const lamTotal =
                    p.addLamination && sl !== "laminating"
                      ? sp(prices.laminating, 20) * qty
                      : 0;
                  const grandTotal = parseFloat(
                    viewDetailsOrder.total_amount || "0",
                  );
                  return (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: ".5rem .85rem",
                          borderBottom: "1px solid #f3f4f6",
                          gap: "1rem",
                        }}
                      >
                        <span style={{ fontSize: ".75rem", color: "#6b7280" }}>
                          {viewDetailsOrder.service}{" "}
                          <span
                            style={{ fontSize: ".68rem", color: "#9ca3af" }}
                          >
                            ({priceNote})
                          </span>
                        </span>
                        <span
                          style={{
                            fontSize: ".75rem",
                            fontWeight: 600,
                            color: "#111827",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₱{baseTotal.toFixed(2)}
                        </span>
                      </div>
                      {p.addLamination && sl !== "laminating" && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: ".5rem .85rem",
                            borderBottom: "1px solid #f3f4f6",
                            gap: "1rem",
                          }}
                        >
                          <span
                            style={{ fontSize: ".75rem", color: "#6b7280" }}
                          >
                            Lamination add-on{" "}
                            <span
                              style={{ fontSize: ".68rem", color: "#9ca3af" }}
                            >
                              ({qty} × ₱{sp(prices.laminating, 20).toFixed(2)})
                            </span>
                          </span>
                          <span
                            style={{
                              fontSize: ".75rem",
                              fontWeight: 600,
                              color: "#111827",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ₱{lamTotal.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: ".6rem .85rem",
                          background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: ".82rem",
                            fontWeight: 700,
                            color: "#374151",
                          }}
                        >
                          Total Amount
                        </span>
                        <span
                          style={{
                            fontSize: "1rem",
                            fontWeight: 800,
                            color: "#7c3aed",
                          }}
                        >
                          ₱{grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f9fafb",
                border: "1.5px solid #e5e7eb",
                borderRadius: 10,
                padding: ".6rem .85rem",
                marginBottom: "1rem",
              }}
            >
              <span
                style={{
                  fontSize: ".75rem",
                  color: "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  gap: ".4rem",
                }}
              >
                <IC.Card /> Payment Method
              </span>
              <span
                style={{
                  fontSize: ".78rem",
                  fontWeight: 700,
                  color: (viewDetailsOrder.payment_method || "")
                    .toLowerCase()
                    .includes("gcash")
                    ? "#7c3aed"
                    : "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {(viewDetailsOrder.payment_method || "")
                  .toLowerCase()
                  .includes("gcash") ? (
                  <>
                    <IcoGCash size={14} color="#7c3aed" /> GCash
                  </>
                ) : (
                  <>
                    <IcoCash size={14} color="#374151" />{" "}
                    {viewDetailsOrder.payment_method || "Cash"}
                  </>
                )}
              </span>
            </div>

            {viewDetailsOrder.status === "pending" && (
              <div style={{ display: "flex", gap: ".6rem" }}>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    setViewDetailsOrder(null);
                    openEditModal(viewDetailsOrder.order_id);
                  }}
                >
                  <IC.Pencil /> Edit Order
                </button>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    background: "#fee2e2",
                    color: "#ef4444",
                    border: "none",
                    fontWeight: 700,
                  }}
                  onClick={() => {
                    setViewDetailsOrder(null);
                    setCancelModalOrderId(viewDetailsOrder.order_id);
                  }}
                >
                  <IC.XCircle /> Cancel
                </button>
              </div>
            )}
            {viewDetailsOrder.status !== "pending" && (
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setViewDetailsOrder(null)}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

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
                Edit Order #{displayId(editOrder.order_id)}
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
                      <label
                        key={d}
                        className="radio-label"
                        style={{ alignItems: "flex-start" }}
                      >
                        <input
                          type="radio"
                          name="eo_del"
                          value={d}
                          checked={eoDelivery === d}
                          onChange={() => {
                            setEoDelivery(d);
                            setEoPickupTime("");
                          }}
                          style={{ marginTop: 3 }}
                        />
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: ".3rem",
                              fontWeight: 600,
                              fontSize: ".83rem",
                              color: "#111827",
                            }}
                          >
                            {d === "pickup" ? (
                              <>
                                <IC.Home /> Pickup
                              </>
                            ) : (
                              <>
                                <IC.Truck /> Delivery
                              </>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: ".68rem",
                              color: "#6b7280",
                              marginTop: 2,
                            }}
                          >
                            {d === "pickup"
                              ? "Pick up at our store"
                              : "Santa Rosa area only"}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
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
                  <PickupTimeDropdown
                    value={eoPickupTime}
                    onChange={setEoPickupTime}
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
                  Add More Files{" "}
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
                    (PDF, JPG, PNG, DOCX)
                  </span>
                </label>
                <input
                  className="form-input"
                  type="file"
                  multiple
                  ref={editFileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={(e) => handleEditFileChange(e.target.files)}
                />
                {/* File list display for edit modal */}
                {editFileInputRef.current?.files &&
                  editFileInputRef.current.files.length > 0 && (
                    <div className="file-list">
                      {Array.from(editFileInputRef.current.files).map(
                        (f, fi) => {
                          const ext =
                            f.name.split(".").pop()?.toLowerCase() ?? "";
                          const isPaged = ext === "pdf" || ext === "docx";
                          return (
                            <div key={`${fi}-${f.name}`} className="file-item">
                              <IC.PDF />
                              <span
                                style={{
                                  flex: 1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {f.name}
                              </span>
                              <span
                                className="file-item-badge"
                                style={
                                  isPaged
                                    ? {}
                                    : {
                                        background: "#f3f4f6",
                                        color: "#6b7280",
                                      }
                                }
                              >
                                {ext.toUpperCase()}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
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

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}
