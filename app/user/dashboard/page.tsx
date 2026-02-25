"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User { first_name: string; last_name: string; email: string; phone: string; role: string; }
interface Prices { print_bw: number; print_color: number; photocopying: number; scanning: number; photo_development: number; laminating: number; }
interface Order { order_id: number; service: string; quantity: number; specifications: string; delivery_option: string; delivery_address: string | null; status: string; payment_method: string; created_at: string; total_amount: string; }
interface DashboardStats { totalOrders: number; pendingOrders: number; completedOrders: number; totalSpent: string; }
interface Toast { message: string; type: "success" | "error"; visible: boolean; }

type Section = "dashboard" | "new-order" | "orders" | "profile";
type PaperSize = "A4" | "Short" | "Long";
type ColorOption = "bw" | "color";
type DeliveryOption = "pickup" | "delivery";

const DEFAULT_PRICES: Prices = { print_bw: 1.0, print_color: 2.0, photocopying: 2.0, scanning: 5.0, photo_development: 15.0, laminating: 20.0 };
const PAPER_MULTIPLIERS: Record<PaperSize, number> = { A4: 1.0, Short: 1.0, Long: 1.2 };

function extractUserSpecs(specifications: string): string {
  return specifications.split("\n").filter((line) => {
    const t = line.trim();
    return t === "" || (!t.startsWith("Paper Size:") && !t.startsWith("Print Type:") && !t.startsWith("Copy Type:") && !t.startsWith("Scan Type:") && !t.startsWith("Photo Size:") && !t.startsWith("Add Lamination: Yes"));
  }).join("\n").trim();
}

function parseSpecsOptions(specifications: string) {
  const result: { paperSize: PaperSize | null; photoSize: string | null; colorOption: ColorOption | null; addLamination: boolean } = { paperSize: null, photoSize: null, colorOption: null, addLamination: false };
  for (const line of specifications.split("\n")) {
    const t = line.trim();
    if (t.startsWith("Paper Size:")) { const sz = t.split(":")[1]?.trim() as PaperSize; if (["A4","Short","Long"].includes(sz)) result.paperSize = sz; }
    else if (t.startsWith("Print Type:") || t.startsWith("Scan Type:")) result.colorOption = t.includes("Color") ? "color" : "bw";
    else if (t.startsWith("Copy Type:")) result.colorOption = "color";
    else if (t.startsWith("Photo Size:")) result.photoSize = t.split(":")[1]?.trim().replace("Glossy ","") || null;
    else if (t.startsWith("Add Lamination: Yes")) result.addLamination = true;
  }
  return result;
}

function calcTotal(service: string, quantity: number, colorOption: ColorOption, paperSize: PaperSize, photoSize: string, addLamination: boolean, prices: Prices): number {
  const sl = service.toLowerCase();
  const m = PAPER_MULTIPLIERS[paperSize] ?? 1.0;
  let price = 0;
  if (sl === "print") price = (colorOption === "color" ? (prices.print_color ?? 2) : (prices.print_bw ?? 1)) * m;
  else if (sl === "photocopy") price = prices.photocopying * m;
  else if (sl === "scanning") price = prices.scanning * m;
  else if (sl === "photo development") price = prices.photo_development;
  else if (sl === "laminating") price = prices.laminating;
  let total = price * quantity;
  if (addLamination && sl !== "laminating") total += prices.laminating * quantity;
  return total;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IC = {
  Menu:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Grid:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Plus:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  List:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.2" fill="currentColor"/><circle cx="3" cy="12" r="1.2" fill="currentColor"/><circle cx="3" cy="18" r="1.2" fill="currentColor"/></svg>,
  User:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  Logout:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Printer:  () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Copy:     () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  Scan:     () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>,
  Camera:   () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Layers:   () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Cart:     () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57l1.65-8.43H6"/></svg>,
  Clock:    () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Check:    () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Card:     () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Tag:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Refresh:  () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  Eye:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Pencil:   () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Home:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Truck:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
};

function ToastNotification({ toast }: { toast: Toast }) {
  return (
    <div style={{
      position: "fixed", top: "1rem", left: "50%",
      transform: toast.visible ? "translate(-50%,0)" : "translate(-50%,-12px)",
      width: "calc(100% - 2rem)", maxWidth: "340px",
      padding: "0.75rem 1rem", borderRadius: "10px", color: "#fff",
      fontWeight: 600, fontSize: "0.84rem", zIndex: 9999,
      opacity: toast.visible ? 1 : 0, transition: "all 0.3s", pointerEvents: "none",
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "0.5rem",
      background: toast.type === "success" ? "#22c55e" : "#ef4444",
      fontFamily: "'Inter',sans-serif",
    }}>
      {toast.type === "success"
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      }
      {toast.message}
    </div>
  );
}

// ─── WHITE STAT CARD ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon, iconBg, iconColor }: {
  label: string; value: string | number;
  icon: React.ReactNode; iconBg: string; iconColor: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon-wrap" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="stat-right">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<Toast>({ message: "", type: "success", visible: false });
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);
  const [priceUpdateTime, setPriceUpdateTime] = useState("");
  const [stats, setStats] = useState<DashboardStats>({ totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalSpent: "0.00" });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [step, setStep] = useState(0);
  const [noService, setNoService] = useState("");
  const [noQuantity, setNoQuantity] = useState<number | "">("");
  const [noDelivery, setNoDelivery] = useState<DeliveryOption>("pickup");
  const [noAddress, setNoAddress] = useState("");
  const [noPaperSize, setNoPaperSize] = useState<PaperSize>("A4");
  const [noPhotoSize, setNoPhotoSize] = useState("A4");
  const [noColorOption, setNoColorOption] = useState<ColorOption>("bw");
  const [noLamination, setNoLamination] = useState(false);
  const [noSpecs, setNoSpecs] = useState("");
  const [noFiles, setNoFiles] = useState<FileList | null>(null);
  const [noSubmitting, setNoSubmitting] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Partial<Order> | null>(null);
  const [eoService, setEoService] = useState("");
  const [eoQuantity, setEoQuantity] = useState<number | "">("");
  const [eoDelivery, setEoDelivery] = useState<DeliveryOption>("pickup");
  const [eoAddress, setEoAddress] = useState("");
  const [eoPaperSize, setEoPaperSize] = useState<PaperSize>("A4");
  const [eoPhotoSize, setEoPhotoSize] = useState("A4");
  const [eoColorOption, setEoColorOption] = useState<ColorOption>("bw");
  const [eoLamination, setEoLamination] = useState(false);
  const [eoSpecs, setEoSpecs] = useState("");
  const [eoSubmitting, setEoSubmitting] = useState(false);

  const [user, setUser] = useState<User>({ first_name: "", last_name: "", email: "", phone: "", role: "customer" });
  const [profFirstName, setProfFirstName] = useState(""); const [profLastName, setProfLastName] = useState("");
  const [profEmail, setProfEmail] = useState(""); const [profPhone, setProfPhone] = useState("");
  const [profCurrentPw, setProfCurrentPw] = useState(""); const [profNewPw, setProfNewPw] = useState("");
  const [profConfirmPw, setProfConfirmPw] = useState("");
  const [showCurrPw, setShowCurrPw] = useState(false); const [showNewPw, setShowNewPw] = useState(false); const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [profSubmitting, setProfSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 5000);
  }, []);

  const fetchPrices = useCallback(async () => {
    try { const res = await fetch(`/api/pricing?t=${Date.now()}`); const data: Prices = await res.json(); setPrices(data); setPriceUpdateTime(new Date().toLocaleTimeString()); }
    catch { setPrices(DEFAULT_PRICES); }
  }, []);
  const fetchStats = useCallback(async () => {
    try { const res = await fetch("/api/dashboard?action=getDashboardStats"); const r = await res.json(); if (r.success) setStats(r.data); } catch {}
  }, []);
  const fetchRecentOrders = useCallback(async () => {
    try { const res = await fetch("/api/dashboard?action=getOrders"); const r = await res.json(); if (r.success) setRecentOrders(r.data.orders.slice(0, 5)); } catch {}
  }, []);
  const fetchOrders = useCallback(async (status = "") => {
    setOrdersLoading(true);
    try { const url = status ? `/api/dashboard?action=getOrders&status=${status}` : "/api/dashboard?action=getOrders"; const res = await fetch(url); const r = await res.json(); if (r.success) setAllOrders(r.data.orders); } catch {}
    setOrdersLoading(false);
  }, []);
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard?action=getUser"); const r = await res.json();
      if (r.success) { const u = r.data; setUser(u); setProfFirstName(u.first_name); setProfLastName(u.last_name); setProfEmail(u.email); setProfPhone(u.phone || ""); }
    } catch {}
  }, []);

  useEffect(() => {
    fetchPrices(); fetchStats(); fetchRecentOrders(); fetchUser();
    const iv = setInterval(fetchPrices, 10000);
    return () => clearInterval(iv);
  }, [fetchPrices, fetchStats, fetchRecentOrders, fetchUser]);

  useEffect(() => {
    if (activeSection === "orders") fetchOrders(orderFilter);
    if (activeSection === "dashboard") { fetchStats(); fetchRecentOrders(); fetchPrices(); }
  }, [activeSection, orderFilter, fetchOrders, fetchStats, fetchRecentOrders, fetchPrices]);

  const showsPaper = ["Print","Photocopy","Scanning"].includes(noService);
  const showsPhoto = noService === "Photo Development";
  const showsColor = noService === "Print" || noService === "Scanning";
  const showsLam   = ["Print","Photocopy","Scanning","Photo Development"].includes(noService);
  const eoShowsPaper = ["Print","Photocopy","Scanning"].includes(eoService);
  const eoShowsPhoto = eoService === "Photo Development";
  const eoShowsColor = eoService === "Print" || eoService === "Scanning";
  const eoShowsLam   = ["Print","Photocopy","Scanning","Photo Development"].includes(eoService);
  const summaryTotal = noService && noQuantity !== "" ? calcTotal(noService, noQuantity as number, noColorOption, noPaperSize, noPhotoSize, noLamination, prices) : 0;

  function validateStep(n: number): boolean {
    if (n === 1) {
      if (!noService) { showToast("Service is required.", "error"); return false; }
      if (noQuantity === "" || (noQuantity as number) < 1) { showToast("Quantity must be at least 1.", "error"); return false; }
      if (noDelivery === "delivery" && !noAddress.trim()) { showToast("Delivery address is required.", "error"); return false; }
    }
    if (n === 2) {
      if (!noSpecs.trim()) { showToast("Specifications are required.", "error"); return false; }
    }
    return true;
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (["Print","Photocopy","Photo Development"].includes(noService) && (!noFiles || noFiles.length === 0)) { showToast("Please upload at least one file.", "error"); return; }
    setNoSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("service", noService);
      fd.append("quantity", String(noQuantity));
      fd.append("specifications", noSpecs);
      fd.append("delivery_option", noDelivery);
      if (noDelivery === "delivery") fd.append("delivery_address", noAddress);
      fd.append("paper_size", noPaperSize);
      fd.append("photo_size", noPhotoSize);
      fd.append("color_option", noColorOption);
      if (noLamination) fd.append("add_lamination", "on");
      if (noFiles) Array.from(noFiles).forEach((f) => fd.append("files[]", f));
      const res = await fetch("/api/dashboard?action=createOrder", { method: "POST", body: fd });
      const r = await res.json();
      if (r.success) { showToast(`Order placed! ID: ${r.data.order_id}`); resetForm(); setActiveSection("dashboard"); fetchStats(); fetchRecentOrders(); }
      else showToast(r.message || "Error placing order", "error");
    } catch (err: unknown) { showToast("Error: " + (err instanceof Error ? err.message : String(err)), "error"); }
    setNoSubmitting(false);
  }

  function resetForm() {
    setStep(0); setNoService(""); setNoQuantity(""); setNoDelivery("pickup"); setNoAddress("");
    setNoPaperSize("A4"); setNoPhotoSize("A4"); setNoColorOption("bw"); setNoLamination(false);
    setNoSpecs(""); setNoFiles(null); if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function openEditModal(orderId: number) {
    try {
      const res = await fetch(`/api/dashboard?action=getOrder&order_id=${orderId}`);
      const r = await res.json();
      if (!r.success) { showToast(r.message || "Order not found", "error"); return; }
      const o: Order = r.data;
      setEditOrder(o); setEoService(o.service); setEoQuantity(o.quantity);
      setEoDelivery(o.delivery_option as DeliveryOption); setEoAddress(o.delivery_address || "");
      setEoSpecs(extractUserSpecs(o.specifications));
      const p = parseSpecsOptions(o.specifications);
      setEoPaperSize(p.paperSize || "A4"); setEoPhotoSize(p.photoSize || "A4");
      setEoColorOption(p.colorOption || (o.service === "Photocopy" ? "color" : "bw"));
      setEoLamination(p.addLamination); setEditModalOpen(true);
    } catch { showToast("Error loading order", "error"); }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrder) return;
    if (!eoService || eoQuantity === "" || (eoQuantity as number) < 1 || !eoSpecs.trim()) { showToast("Fill in all required fields", "error"); return; }
    if (eoDelivery === "delivery" && !eoAddress.trim()) { showToast("Delivery address is required", "error"); return; }
    setEoSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("order_id", String(editOrder.order_id));
      fd.append("service", eoService);
      fd.append("quantity", String(eoQuantity));
      fd.append("specifications", eoSpecs);
      fd.append("delivery_option", eoDelivery);
      if (eoDelivery === "delivery") fd.append("delivery_address", eoAddress);
      fd.append("paper_size", eoPaperSize);
      fd.append("photo_size", eoPhotoSize);
      fd.append("color_option", eoColorOption);
      if (eoLamination) fd.append("add_lamination", "on");
      if (editFileInputRef.current?.files?.length) Array.from(editFileInputRef.current.files).forEach((f) => fd.append("new_files[]", f));
      const res = await fetch("/api/dashboard?action=updateOrder", { method: "POST", body: fd });
      const r = await res.json();
      if (r.success) { showToast("Order updated!"); setEditModalOpen(false); fetchOrders(orderFilter); fetchStats(); fetchRecentOrders(); }
      else showToast(r.message || "Error updating order", "error");
    } catch (err: unknown) { showToast("Error: " + (err instanceof Error ? err.message : String(err)), "error"); }
    setEoSubmitting(false);
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!profFirstName.trim()) errs.push("First name is required.");
    if (!profLastName.trim()) errs.push("Last name is required.");
    if (!profEmail.trim() || !/\S+@\S+\.\S+/.test(profEmail)) errs.push("Valid email is required.");
    const chPw = profCurrentPw || profNewPw || profConfirmPw;
    if (chPw) {
      if (!profCurrentPw) errs.push("Current password required.");
      if (!profNewPw) errs.push("New password cannot be empty.");
      if (profNewPw !== profConfirmPw) errs.push("Passwords do not match.");
      if (profNewPw && (profNewPw.length < 8 || !/[A-Z]/.test(profNewPw) || !/[0-9]/.test(profNewPw))) errs.push("Password needs 8+ chars, 1 uppercase, 1 number.");
    }
    if (errs.length) { showToast(errs[0], "error"); return; }
    setProfSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("update_profile","1"); fd.append("first_name",profFirstName); fd.append("last_name",profLastName);
      fd.append("email",profEmail); fd.append("phone",profPhone);
      if (chPw) { fd.append("current_password",profCurrentPw); fd.append("new_password",profNewPw); fd.append("confirm_password",profConfirmPw); }
      const res = await fetch("/api/dashboard", { method:"POST", body:fd });
      if (res.ok) { showToast("Profile updated!"); setUser(u=>({...u,first_name:profFirstName,last_name:profLastName,email:profEmail,phone:profPhone})); setProfCurrentPw(""); setProfNewPw(""); setProfConfirmPw(""); }
      else showToast("Update failed.", "error");
    } catch { showToast("Network error.", "error"); }
    setProfSubmitting(false);
  }

  const SERVICES = ["Print","Photocopy","Scanning","Photo Development","Laminating"];

  const pricingCards = [
    { name:"Print B&W",  price:prices.print_bw??1,         icon:<IC.Printer/>, unit:"per page" },
    { name:"Print Color",price:prices.print_color??2,       icon:<IC.Printer/>, unit:"per page" },
    { name:"Photocopy",  price:prices.photocopying??2,      icon:<IC.Copy/>,    unit:"per page" },
    { name:"Scanning",   price:prices.scanning??5,          icon:<IC.Scan/>,    unit:"per page" },
    { name:"Photo Dev.", price:prices.photo_development??15,icon:<IC.Camera/>,  unit:"per photo" },
    { name:"Laminating", price:prices.laminating??20,       icon:<IC.Layers/>,  unit:"per item" },
  ];

  const navItems: { id: Section; icon: React.ReactNode; label: string }[] = [
    { id:"dashboard", icon:<IC.Grid/>,   label:"Dashboard" },
    { id:"new-order", icon:<IC.Plus/>,   label:"New Order"  },
    { id:"orders",    icon:<IC.List/>,   label:"My Orders"  },
    { id:"profile",   icon:<IC.User/>,   label:"Profile"    },
  ];

  const filterOpts = [{val:"",label:"All"},{val:"pending",label:"Pending"},{val:"completed",label:"Done"}];

  function badgeClass(s: string) { return s==="pending"?"badge-pending":s==="in-progress"?"badge-progress":"badge-completed"; }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --grad:linear-gradient(135deg,#5b6dee 0%,#7c3aed 50%,#a855f7 100%);
          --sidebar:#5b4fa8; --active:#7c3aed;
          --bg:#f3f4f6; --surface:#fff; --border:#e5e7eb;
          --text:#111827; --muted:#6b7280; --success:#22c55e;
          --sw:220px; --hh:56px; --r:12px;
        }
        html,body{height:100%}
        body{font-family:'Inter',sans-serif;background:var(--bg);min-height:100dvh}
        .shell{display:flex;height:100dvh;overflow:hidden}

        /* sidebar */
        .sidebar{width:var(--sw);background:var(--sidebar);display:flex;flex-direction:column;flex-shrink:0;height:100%;z-index:200;transition:transform .28s cubic-bezier(.4,0,.2,1)}
        .sb-brand{display:flex;align-items:center;gap:.6rem;padding:.9rem .9rem .8rem;border-bottom:1px solid rgba(255,255,255,.1)}
        .sb-icon{width:34px;height:34px;background:rgba(255,255,255,.2);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
        .sb-name{font-size:.82rem;font-weight:700;color:#fff;line-height:1.25}
        .sb-name span{display:block;font-size:.56rem;font-weight:400;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.07em}
        .sb-nav{flex:1;padding:.65rem .55rem;display:flex;flex-direction:column;gap:2px;overflow-y:auto}
        .nav-btn{display:flex;align-items:center;gap:.55rem;padding:.55rem .75rem;border-radius:8px;color:rgba(255,255,255,.75);font-size:.83rem;font-weight:500;cursor:pointer;border:none;background:none;width:100%;text-align:left;transition:all .15s;-webkit-tap-highlight-color:transparent}
        .nav-btn:hover{background:rgba(255,255,255,.1);color:rgba(255,255,255,.9)}
        .nav-btn.active{background:var(--active);color:#fff}
        .sb-foot{padding:.55rem;border-top:1px solid rgba(255,255,255,.1)}
        .logout-btn{display:flex;align-items:center;gap:.55rem;padding:.55rem .75rem;border-radius:8px;color:rgba(255,255,255,.4);font-size:.8rem;font-weight:500;cursor:pointer;transition:all .15s;text-decoration:none;width:100%;border:none;background:none;-webkit-tap-highlight-color:transparent}
        .logout-btn:hover{background:rgba(239,68,68,.2);color:#fca5a5}

        /* main */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .header{height:var(--hh);background:var(--grad);display:flex;align-items:center;justify-content:space-between;padding:0 1rem;flex-shrink:0;box-shadow:0 2px 12px rgba(91,109,238,.25)}
        .header-l{display:flex;align-items:center;gap:.55rem;min-width:0}
        .pg-title{font-size:.98rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .hamburger{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.9);padding:6px;min-width:40px;min-height:40px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;flex-shrink:0}
        .header-r{display:flex;align-items:center;gap:.45rem;flex-shrink:0}
        .welcome{font-size:.76rem;color:rgba(255,255,255,.82);white-space:nowrap}
        .welcome strong{color:#fff;font-weight:600}
        .avatar{width:32px;height:32px;background:rgba(255,255,255,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.7rem;font-weight:700;border:2px solid rgba(255,255,255,.4);flex-shrink:0}

        .content{flex:1;overflow-y:auto;overflow-x:hidden;padding:.85rem;background:#f3f4f6}
        .panel{display:none}
        .panel.active{display:block}

        /* pricing */
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

        /* ── WHITE STAT CARDS ─────────────────────────────── */
        .stats-wrap{margin-bottom:.75rem}
        .stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.55rem}
        .stat-card{
          background:#fff;
          border:1px solid var(--border);
          border-radius:12px;
          padding:.8rem 1rem;
          display:flex;
          align-items:center;
          gap:.75rem;
          box-shadow:0 1px 4px rgba(0,0,0,.06);
          transition:box-shadow .15s;
        }
        .stat-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1)}
        .stat-icon-wrap{
          width:44px;height:44px;border-radius:11px;
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;
        }
        .stat-right{display:flex;flex-direction:column;min-width:0}
        .stat-value{font-size:1.35rem;font-weight:700;color:var(--text);letter-spacing:-.03em;line-height:1}
        .stat-label{font-size:.62rem;color:var(--muted);margin-top:4px;white-space:nowrap}
        /* ────────────────────────────────────────────────── */

        /* card */
        .card{background:var(--surface);border-radius:var(--r);border:1px solid var(--border);overflow:hidden;margin-bottom:.75rem;box-shadow:0 1px 3px rgba(0,0,0,.06)}
        .card-head{padding:.6rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600;color:var(--text)}

        /* recent orders table */
        .ro-empty{padding:2rem;text-align:center;color:var(--muted);font-size:.78rem}
        .ro-table{width:100%;border-collapse:collapse}
        .ro-thead th{font-size:.62rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);padding:.55rem .85rem;text-align:left;border-bottom:1px solid var(--border);background:#fafafa}
        .ro-thead th:last-child{text-align:right}
        .ro-row td{padding:.7rem .85rem;font-size:.78rem;border-bottom:1px solid var(--border);vertical-align:middle;color:var(--text)}
        .ro-row:last-child td{border-bottom:none}
        .ro-row:hover td{background:#f9fafb}
        .ro-id{font-weight:700;color:var(--text)}
        .ro-svc{color:var(--muted)}
        .ro-date{color:var(--muted);white-space:nowrap}
        .ro-amount{font-weight:700;color:var(--text);text-align:right}

        /* badge */
        .badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:99px;font-size:.58rem;font-weight:600;white-space:nowrap}
        .badge-pending{background:#fef3c7;color:#92400e}
        .badge-completed{background:#d1fae5;color:#065f46}
        .badge-progress{background:#dbeafe;color:#1e40af}

        /* form */
        .form-group{margin-bottom:.8rem}
        .form-label{display:block;font-size:.64rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text);margin-bottom:.32rem}
        .form-input,.form-select,.form-textarea{width:100%;padding:.58rem .78rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Inter',sans-serif;font-size:max(16px,.875rem);color:var(--text);background:#fff;transition:border-color .2s,box-shadow .2s;outline:none;-webkit-appearance:none}
        .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.1)}
        .form-textarea{resize:vertical;min-height:70px}
        .form-row-2{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
        .form-row-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.7rem}
        .radio-group{display:flex;gap:.9rem;flex-wrap:wrap}
        .radio-label{display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.83rem;color:#555;padding:4px 0}
        .radio-label input{accent-color:var(--active);width:16px;height:16px}
        .check-label{display:flex;align-items:center;gap:.45rem;cursor:pointer;font-size:.83rem;color:#555}
        .check-label input{accent-color:var(--active);width:16px;height:16px}

        /* steps */
        .steps{display:flex;align-items:flex-start;gap:0;margin-bottom:1.4rem}
        .step-node{text-align:center}
        .step-dot{width:27px;height:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700;border:2px solid var(--border);color:var(--muted);background:#fff;margin:0 auto;transition:all .2s}
        .step-dot.done{background:var(--success);border-color:var(--success);color:#fff}
        .step-dot.active{background:#7c3aed;border-color:#7c3aed;color:#fff}
        .step-line{flex:1;height:2px;background:var(--border);margin:12px 4px 0}
        .step-line.done{background:var(--success)}
        .step-box{display:none}
        .step-box.active{display:block}

        /* summary */
        .sum-box{background:#f9fafb;border:1.5px solid var(--border);border-radius:10px;padding:.8rem .9rem;margin-top:.9rem}
        .sum-row{display:flex;justify-content:space-between;font-size:.78rem;padding:3px 0;color:var(--muted)}
        .sum-row span:last-child{color:var(--text);font-weight:500}
        .sum-total{display:flex;justify-content:space-between;font-weight:700;font-size:.92rem;color:#7c3aed;border-top:1px solid var(--border);padding-top:.5rem;margin-top:.4rem}

        /* buttons */
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

        /* my orders list */
        .ord-item{padding:.7rem .85rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:.55rem;transition:background .15s}
        .ord-item:last-child{border-bottom:none}
        .ord-item:hover{background:#f9fafb}
        .ord-id{font-weight:600;font-size:.8rem;color:var(--text)}
        .ord-meta{font-size:.7rem;color:var(--muted);margin-top:2px;line-height:1.4}
        .ord-right{text-align:right;flex-shrink:0}
        .edit-btn{font-size:.68rem;color:#7c3aed;font-weight:600;cursor:pointer;background:none;border:none;padding:0;margin-top:4px;display:flex;align-items:center;gap:3px;justify-content:flex-end;min-height:26px}
        .edit-btn:hover{opacity:.75}

        /* filter */
        .filter-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem}
        .filter-title{font-size:.98rem;font-weight:700;color:var(--text)}
        .filter-chips{display:flex;gap:.3rem}
        .fchip{padding:.28rem .75rem;border-radius:99px;border:1.5px solid var(--border);font-size:.7rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;background:#fff;color:var(--muted);-webkit-tap-highlight-color:transparent}
        .fchip.active{background:#7c3aed;border-color:#7c3aed;color:#fff}
        .fchip:hover:not(.active){border-color:#7c3aed;color:#7c3aed}

        /* modal */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;display:flex;align-items:flex-end;justify-content:center}
        .modal{background:var(--surface);border-radius:18px 18px 0 0;width:100%;max-width:100%;max-height:92dvh;overflow-y:auto;overflow-x:hidden;padding:1.2rem .95rem;box-shadow:0 -8px 40px rgba(109,40,217,.2)}
        .modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.95rem;padding-bottom:.65rem;border-bottom:1px solid var(--border);position:sticky;top:-1.2rem;background:var(--surface);z-index:1}
        .modal-title{font-size:.93rem;font-weight:700;color:var(--text)}
        .modal-close{background:none;border:none;font-size:1.5rem;color:var(--muted);cursor:pointer;line-height:1;min-width:40px;min-height:40px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
        .modal-close:hover{color:var(--text)}

        /* profile */
        .sec-title{font-size:.93rem;font-weight:700;color:var(--text);margin-bottom:.95rem}
        .divider{border:none;border-top:1px solid var(--border);margin:1.15rem 0}
        .sec-sub{font-size:.82rem;font-weight:600;color:var(--text);margin-bottom:.22rem}
        .sec-hint{font-size:.72rem;color:var(--muted);margin-bottom:.8rem}
        .pw-wrap{position:relative}
        .pw-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);cursor:pointer;min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
        .pw-toggle:hover{color:var(--text)}

        /* overlay */
        .sb-overlay{display:none;position:fixed;inset:0;background:rgba(30,27,75,.5);z-index:190}
        .sb-overlay.on{display:block}
        .empty-state{padding:2.2rem;text-align:center;color:var(--muted);font-size:.82rem}

        /* responsive */
        @media(min-width:1025px){
          .hamburger{display:none}
          .p-grid{grid-template-columns:repeat(6,1fr)}
          .stats-grid{grid-template-columns:repeat(4,1fr)}
        }
        @media(max-width:1024px){
          .sidebar{position:fixed;top:0;left:0;height:100%;transform:translateX(-100%)}
          .sidebar.open{transform:translateX(0);box-shadow:4px 0 30px rgba(0,0,0,.25)}
          .hamburger{display:flex}
        }
        @media(max-width:640px){
          .ro-thead th:nth-child(3),.ro-row td:nth-child(3){display:none}
        }
        @media(max-width:480px){
          .hamburger{display:flex}
          .welcome{display:none}
          .content{padding:.6rem}
          .p-board{padding:.65rem .65rem .7rem;margin-bottom:.6rem}
          .stats-wrap{margin-bottom:.6rem}
          .form-row-2{grid-template-columns:1fr}
          .form-row-3{grid-template-columns:1fr}
          .modal{padding:.95rem .85rem;max-height:94dvh}
          .modal-head{top:-.95rem}
          .ro-thead th,.ro-row td{padding:.5rem .6rem;font-size:.72rem}
        }
        @media(max-width:359px){
          .p-grid{grid-template-columns:repeat(2,1fr)}
          .btn-row{flex-direction:column-reverse}
          .btn-row.between{flex-direction:row}
        }
        @media(min-width:641px){
          .modal-overlay{align-items:center;padding:1rem}
          .modal{border-radius:14px;max-width:560px;max-height:90vh}
          .modal-head{top:-1.2rem}
        }
        @media(min-width:768px){
          .modal{padding:1.4rem 1.6rem}
          .modal-head{top:-1.4rem}
        }
        @supports(padding:max(0px)){
          .content{padding-left:max(.85rem,env(safe-area-inset-left));padding-right:max(.85rem,env(safe-area-inset-right))}
          .header{padding-left:max(1rem,env(safe-area-inset-left));padding-right:max(1rem,env(safe-area-inset-right))}
        }
      `}</style>

      <ToastNotification toast={toast} />

      <div className="shell">
        <div className={`sb-overlay ${sidebarOpen ? "on" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sb-brand">
            <div className="sb-icon"><IC.Printer /></div>
            <div className="sb-name">Jonayskie Prints<span>Printing Studio</span></div>
          </div>
          <nav className="sb-nav">
            {navItems.map(item => (
              <button key={item.id} className={`nav-btn ${activeSection === item.id ? "active" : ""}`}
                onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}>
                <span style={{ width:16, display:"flex", alignItems:"center", justifyContent:"center" }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="sb-foot">
            <Link href="/logout" className="logout-btn"><IC.Logout /> Logout</Link>
          </div>
        </aside>

        <div className="main">
          <header className="header">
            <div className="header-l">
              <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu"><IC.Menu /></button>
              <div className="pg-title">
                {activeSection === "dashboard" && "Dashboard"}
                {activeSection === "new-order" && "New Order"}
                {activeSection === "orders"    && "My Orders"}
                {activeSection === "profile"   && "Profile"}
              </div>
            </div>
            <div className="header-r">
              <span className="welcome">Welcome, <strong>{user.first_name || "User"}</strong></span>
              <div className="avatar">{(user.first_name?.[0] || "U").toUpperCase()}</div>
            </div>
          </header>

          <main className="content">

            {/* ══ DASHBOARD ══ */}
            <section className={`panel ${activeSection === "dashboard" ? "active" : ""}`}>
              <div className="p-board">
                <div className="p-top">
                  <div className="p-label"><IC.Tag /> Current Pricing</div>
                  <div className="p-chips">
                    <span className="chip">{priceUpdateTime || "..."}</span>
                    <button className="chip-btn" onClick={async () => { await fetchPrices(); showToast("Prices refreshed"); }}>
                      <IC.Refresh /> Refresh
                    </button>
                  </div>
                </div>
                <div className="p-grid">
                  {pricingCards.map(s => (
                    <div key={s.name} className="p-card">
                      <div className="p-ico">{s.icon}</div>
                      <div className="p-name">{s.name}</div>
                      <div className="p-price">₱{s.price.toFixed(2)}</div>
                      <div className="p-unit">{s.unit}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── WHITE STAT CARDS ── */}
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
                    label="Completed Orders"
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
                        <tr key={`recent-${o.order_id ?? idx}`} className="ro-row">
                          <td className="ro-id">{o.order_id}</td>
                          <td className="ro-svc">{o.service}</td>
                          <td className="ro-date">
                            {new Date(o.created_at).toLocaleDateString("en-PH", {
                              month: "numeric", day: "numeric", year: "numeric"
                            })}
                          </td>
                          <td><span className={`badge ${badgeClass(o.status)}`}>{o.status}</span></td>
                          <td className="ro-amount">₱{parseFloat(o.total_amount || "0").toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* ══ NEW ORDER ══ */}
            <section className={`panel ${activeSection === "new-order" ? "active" : ""}`}>
              <div className="card" style={{ padding:"1rem" }}>
                <div style={{ fontSize:".93rem",fontWeight:700,color:"var(--text)",marginBottom:"1.2rem" }}>Create New Order</div>
                <div className="steps">
                  {["Service","Details","Review"].map((lbl,i) => (
                    <Fragment key={`step-${i}`}>
                      <div className="step-node">
                        <div className={`step-dot ${i<step?"done":i===step?"active":""}`}>
                          {i<step ? <IC.Check /> : i+1}
                        </div>
                        <div className="step-lbl">{lbl}</div>
                      </div>
                      {i<2 && <div className={`step-line ${i<step?"done":""}`} />}
                    </Fragment>
                  ))}
                </div>
                <form onSubmit={handleSubmitOrder}>
                  {/* step 0 */}
                  <div className={`step-box ${step===0?"active":""}`}>
                    <div className="form-group">
                      <label className="form-label">Select Service</label>
                      <select className="form-select" value={noService} onChange={e=>{setNoService(e.target.value);setNoColorOption(e.target.value==="Photocopy"?"color":"bw");setNoLamination(false)}}>
                        <option value="">-- Select Service --</option>
                        {SERVICES.map(s=><option key={`svc-${s}`} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="form-label">Quantity</label>
                        <input
                          className="form-input"
                          type="number"
                          min={1}
                          inputMode="numeric"
                          placeholder="Enter quantity"
                          value={noQuantity}
                          onChange={e => setNoQuantity(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Delivery</label>
                        <div className="radio-group" style={{marginTop:".5rem"}}>
                          {(["pickup","delivery"] as DeliveryOption[]).map(d=>(
                            <label key={`del-${d}`} className="radio-label">
                              <input type="radio" name="no_del" value={d} checked={noDelivery===d} onChange={()=>setNoDelivery(d)} />
                              {d==="pickup"?<><IC.Home/> Pickup</>:<><IC.Truck/> Delivery</>}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    {noDelivery==="delivery"&&<div className="form-group"><label className="form-label">Delivery Address</label><textarea className="form-textarea" placeholder="Enter complete address" value={noAddress} onChange={e=>setNoAddress(e.target.value)}/></div>}
                    <div className="btn-row"><button type="button" className="btn btn-primary" onClick={()=>{if(validateStep(1))setStep(1)}}>Next →</button></div>
                  </div>

                  {/* step 1 */}
                  <div className={`step-box ${step===1?"active":""}`}>
                    {showsPaper&&<div className="form-group"><label className="form-label">Paper Size</label><select className="form-select" value={noPaperSize} onChange={e=>setNoPaperSize(e.target.value as PaperSize)}>{(["A4","Short","Long"] as PaperSize[]).map(s=><option key={`ps-${s}`} value={s}>{s}</option>)}</select></div>}
                    {showsPhoto&&<div className="form-group"><label className="form-label">Photo Size</label><select className="form-select" value={noPhotoSize} onChange={e=>setNoPhotoSize(e.target.value)}><option value="A4">Glossy A4</option><option value="4x6">Glossy 4x6</option></select></div>}
                    {showsColor&&<div className="form-group"><label className="form-label">Print Type</label><div className="radio-group" style={{marginTop:".4rem"}}><label className="radio-label"><input type="radio" name="no_col" value="bw" checked={noColorOption==="bw"} onChange={()=>setNoColorOption("bw")}/> B&W</label><label className="radio-label"><input type="radio" name="no_col" value="color" checked={noColorOption==="color"} onChange={()=>setNoColorOption("color")}/> Color</label></div></div>}
                    {showsLam&&<div className="form-group"><label className="check-label"><input type="checkbox" checked={noLamination} onChange={e=>setNoLamination(e.target.checked)}/>Add Lamination (+₱{(prices.laminating??20).toFixed(2)}/item)</label></div>}
                    <div className="form-group"><label className="form-label">Specifications</label><textarea className="form-textarea" placeholder="Describe your order or type N/A." value={noSpecs} onChange={e=>setNoSpecs(e.target.value)} rows={4}/></div>
                    <div className="btn-row between">
                      <button type="button" className="btn btn-ghost" onClick={()=>setStep(0)}>← Back</button>
                      <button type="button" className="btn btn-primary" onClick={()=>{if(validateStep(2))setStep(2)}}>Next →</button>
                    </div>
                  </div>

                  {/* step 2 */}
                  <div className={`step-box ${step===2?"active":""}`}>
                    <div className="form-group">
                      <label className="form-label">Upload Files <span style={{fontSize:".6rem",color:"var(--muted)",fontWeight:400,textTransform:"none",letterSpacing:0,marginLeft:5}}>(Optional for Scanning/Laminating)</span></label>
                      <input className="form-input" type="file" multiple ref={fileInputRef} onChange={e=>setNoFiles(e.target.files)}/>
                      {noFiles&&Array.from(noFiles).map((f,fi)=><div key={`file-${fi}-${f.name}`} style={{fontSize:".7rem",color:"var(--muted)",marginTop:3}}>📎 {f.name}</div>)}
                    </div>
                    <div style={{fontSize:".8rem",color:"#7c3aed",fontWeight:600,marginBottom:".8rem",display:"flex",alignItems:"center",gap:".4rem"}}>
                      <IC.Card/> Payment: Cash Only
                    </div>
                    <div className="sum-box">
                      <div style={{fontWeight:600,fontSize:".8rem",marginBottom:".6rem",color:"var(--text)"}}>Order Summary</div>
                      <div className="sum-row"><span>Service</span><span>{noService||"—"}</span></div>
                      <div className="sum-row"><span>Quantity</span><span>{noQuantity || "—"}</span></div>
                      <div className="sum-row"><span>Delivery</span><span>{noDelivery.charAt(0).toUpperCase()+noDelivery.slice(1)}</span></div>
                      {showsPaper&&<div className="sum-row"><span>Paper</span><span>{noPaperSize}</span></div>}
                      {showsPhoto&&<div className="sum-row"><span>Photo Size</span><span>Glossy {noPhotoSize}</span></div>}
                      {showsColor&&<div className="sum-row"><span>Print Type</span><span>{noColorOption==="color"?"Color":"B&W"}</span></div>}
                      <div className="sum-row"><span>Lamination</span><span>{noLamination?`Yes (+₱${(prices.laminating*(noQuantity as number||0)).toFixed(2)})`:"No"}</span></div>
                      <div className="sum-total"><span>Total</span><span>₱{summaryTotal.toFixed(2)}</span></div>
                    </div>
                    <div className="btn-row between" style={{marginTop:".9rem"}}>
                      <button type="button" className="btn btn-ghost" onClick={()=>setStep(1)}>← Back</button>
                      <button type="submit" className="btn btn-accent" disabled={noSubmitting}>{noSubmitting?"Placing...":"Place Order"}</button>
                    </div>
                  </div>
                </form>
              </div>
            </section>

            {/* ══ MY ORDERS ══ */}
            <section className={`panel ${activeSection === "orders" ? "active" : ""}`}>
              <div className="filter-bar">
                <div className="filter-title">My Orders</div>
                <div className="filter-chips">
                  {filterOpts.map(({val,label})=>(
                    <button key={`filter-${val || "all"}`} className={`fchip ${orderFilter===val?"active":""}`} onClick={()=>setOrderFilter(val)}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="card">
                {ordersLoading?<div className="empty-state">Loading...</div>
                :allOrders.length===0?<div className="empty-state">No orders found</div>
                :allOrders.map((o, idx)=>{
                  const prev=o.specifications.length>75?o.specifications.slice(0,75)+"…":o.specifications;
                  return(
                    <div key={`order-${o.order_id ?? idx}`} className="ord-item">
                      <div style={{minWidth:0,flex:1}}>
                        <div className="ord-id">#{o.order_id} — {o.service}</div>
                        <div className="ord-meta">{prev}</div>
                        <div className="ord-meta">Qty: {o.quantity} · ₱{parseFloat(o.total_amount||"0").toFixed(2)}</div>
                      </div>
                      <div className="ord-right">
                        <span className={`badge ${badgeClass(o.status)}`}>{o.status}</span>
                        <div style={{fontSize:".63rem",color:"var(--muted)",marginTop:3}}>{new Date(o.created_at).toLocaleDateString()}</div>
                        {o.status==="pending"&&<button className="edit-btn" onClick={()=>openEditModal(o.order_id)}><IC.Pencil/> Edit</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ══ PROFILE ══ */}
            <section className={`panel ${activeSection === "profile" ? "active" : ""}`}>
              <div className="card" style={{padding:"1rem 1rem 1.2rem",maxWidth:"680px"}}>
                <div className="sec-title">Update Your Profile</div>
                <form onSubmit={handleProfileSubmit}>
                  <div className="form-row-2">
                    <div className="form-group"><label className="form-label">First Name *</label><input className="form-input" type="text" value={profFirstName} onChange={e=>setProfFirstName(e.target.value)} placeholder="Jane"/></div>
                    <div className="form-group"><label className="form-label">Last Name *</label><input className="form-input" type="text" value={profLastName} onChange={e=>setProfLastName(e.target.value)} placeholder="Doe"/></div>
                    <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" inputMode="email" value={profEmail} onChange={e=>setProfEmail(e.target.value)} placeholder="you@example.com"/></div>
                    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" inputMode="numeric" value={profPhone} onChange={e=>setProfPhone(e.target.value.replace(/[^0-9]/g,""))} placeholder="09123456789" maxLength={15}/></div>
                  </div>
                  <hr className="divider"/>
                  <div className="sec-sub">Change Password</div>
                  <div className="sec-hint">Leave blank if you don't want to change your password.</div>
                  <div className="form-row-3">
                    {[
                      {label:"Current Password",val:profCurrentPw,set:setProfCurrentPw,show:showCurrPw,toggle:()=>setShowCurrPw(v=>!v),ph:"Current password"},
                      {label:"New Password",     val:profNewPw,    set:setProfNewPw,    show:showNewPw, toggle:()=>setShowNewPw(v=>!v), ph:"New password"},
                      {label:"Confirm New",      val:profConfirmPw,set:setProfConfirmPw,show:showConfirmPw,toggle:()=>setShowConfirmPw(v=>!v),ph:"Confirm password"},
                    ].map(f=>(
                      <div key={`pwfield-${f.label}`} className="form-group">
                        <label className="form-label">{f.label}</label>
                        <div className="pw-wrap">
                          <input className="form-input" style={{paddingRight:"2.4rem"}} type={f.show?"text":"password"} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}/>
                          <button type="button" className="pw-toggle" onClick={f.toggle}>{f.show?<IC.EyeOff/>:<IC.Eye/>}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={profSubmitting}>{profSubmitting?"Saving...":"Save Changes"}</button>
                </form>
              </div>
            </section>

          </main>
        </div>
      </div>

      {/* ══ EDIT MODAL ══ */}
      {editModalOpen && editOrder && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setEditModalOpen(false)}}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Edit Order #{editOrder.order_id}</div>
              <button className="modal-close" onClick={()=>setEditModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Service</label>
                <select className="form-select" value={eoService} onChange={e=>{setEoService(e.target.value);setEoColorOption(e.target.value==="Photocopy"?"color":"bw");setEoLamination(false)}}>
                  <option value="">-- Select Service --</option>
                  {SERVICES.map(s=><option key={`eosvc-${s}`} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Delivery</label>
                  <div className="radio-group" style={{marginTop:".5rem"}}>
                    {(["pickup","delivery"] as DeliveryOption[]).map(d=>(
                      <label key={`eodel-${d}`} className="radio-label">
                        <input type="radio" name="eo_del" value={d} checked={eoDelivery===d} onChange={()=>setEoDelivery(d)}/>
                        {d==="pickup"?<><IC.Home/> Pickup</>:<><IC.Truck/> Delivery</>}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    className="form-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="Enter quantity"
                    value={eoQuantity}
                    onChange={e => setEoQuantity(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>
              {eoDelivery==="delivery"&&<div className="form-group"><label className="form-label">Delivery Address</label><textarea className="form-textarea" value={eoAddress} onChange={e=>setEoAddress(e.target.value)}/></div>}
              {eoShowsPaper&&<div className="form-group"><label className="form-label">Paper Size</label><select className="form-select" value={eoPaperSize} onChange={e=>setEoPaperSize(e.target.value as PaperSize)}>{(["A4","Short","Long"] as PaperSize[]).map(s=><option key={`eops-${s}`} value={s}>{s}</option>)}</select></div>}
              {eoShowsPhoto&&<div className="form-group"><label className="form-label">Photo Size</label><select className="form-select" value={eoPhotoSize} onChange={e=>setEoPhotoSize(e.target.value)}><option value="A4">Glossy A4</option><option value="4x6">Glossy 4x6</option></select></div>}
              {eoShowsColor&&<div className="form-group"><label className="form-label">Print Type</label><div className="radio-group" style={{marginTop:".4rem"}}><label className="radio-label"><input type="radio" name="eo_col" value="bw" checked={eoColorOption==="bw"} onChange={()=>setEoColorOption("bw")}/> B&W</label><label className="radio-label"><input type="radio" name="eo_col" value="color" checked={eoColorOption==="color"} onChange={()=>setEoColorOption("color")}/> Color</label></div></div>}
              {eoShowsLam&&<div className="form-group"><label className="check-label"><input type="checkbox" checked={eoLamination} onChange={e=>setEoLamination(e.target.checked)}/>Add Lamination (+₱{prices.laminating.toFixed(2)}/item)</label></div>}
              <div className="form-group"><label className="form-label">Specifications</label><textarea className="form-textarea" value={eoSpecs} onChange={e=>setEoSpecs(e.target.value)} rows={3}/></div>
              <div className="form-group">
                <label className="form-label">Replace Files <span style={{fontSize:".6rem",color:"var(--muted)",fontWeight:400,textTransform:"none",letterSpacing:0,marginLeft:5}}>(Optional)</span></label>
                <input className="form-input" type="file" multiple ref={editFileInputRef}/>
              </div>
              <button type="submit" className="btn btn-accent btn-full" disabled={eoSubmitting}>{eoSubmitting?"Saving...":"Save Changes"}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}