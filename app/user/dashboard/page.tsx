"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  User,
  Prices,
  Order,
  DashboardStats,
  Toast,
  Section,
  PaperSize,
  ColorOption,
  DeliveryOption,
  DEFAULT_PRICES,
  TOS_ACCEPTED_KEY,
  sp,
  extractUserSpecs,
  parseSpecsOptions,
  calcTotal,
  countPagesFromFiles,
  uploadFilesForOrder,
  deleteOrderFile,
} from "./components/types";

import { ToastNotification } from "./components/ui";
import { IC } from "./components/icons";
import { FirstLoginTosModal, CancelConfirmModal } from "./components/modals";
import { DashboardSection } from "./components/DashboardSection";
import { OrdersSection } from "./components/OrdersSection";
import { ProfileSection } from "./components/ProfileSection";
import {
  NewOrderForm,
  PaperType,
  PhotoFinish,
} from "./components/NewOrderForm";
import { ViewDetailsModal } from "./components/ViewDetailsModal";
import { EditOrderModal } from "./components/EditOrderModal";

const PAPER_TYPE_LABELS: Record<string, string> = {
  white: "White Paper",
  matte: "Matte Paper",
  glossy: "Glossy Photo",
  vellum: "Vellum",
};

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

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type, visible: true });
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 5000);
    },
    [],
  );

  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: "0.00",
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState("");
  const [user, setUser] = useState<User>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "customer",
  });

  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(
    null,
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [viewDetailsOrder, setViewDetailsOrder] = useState<Order | null>(null);
  const [viewDetailsFiles, setViewDetailsFiles] = useState<
    { name: string; url: string; type: string }[]
  >([]);
  const [viewDetailsReceipt, setViewDetailsReceipt] = useState<{
    url: string;
  } | null>(null);

  // New-order form state
  const [step, setStep] = useState(0);
  const [noService, setNoService] = useState("");
  const [noQuantity, setNoQuantity] = useState<number | "">("");
  const [noCopies, setNoCopies] = useState<number | "">(1);
  const [noDelivery, setNoDelivery] = useState<DeliveryOption>("pickup");
  const [noAddress, setNoAddress] = useState("");
  const [noPickupTime, setNoPickupTime] = useState("");
  const [noPaperSize, setNoPaperSize] = useState<PaperSize>("A4");
  const [noPhotoSize, setNoPhotoSize] = useState("4x6");
  const [noPaperType, setNoPaperType] = useState<PaperType>("white");
  const [noPhotoFinish, setNoPhotoFinish] = useState<PhotoFinish>("glossy");
  const [noColorOption, setNoColorOption] = useState<ColorOption>("bw");
  const [noLamination, setNoLamination] = useState(false);
  const [noFolder, setNoFolder] = useState(false);
  const [noFolderSize, setNoFolderSize] = useState("A4");
  const [noFolderQty, setNoFolderQty] = useState(1);
  const [noFolderColor, setNoFolderColor] = useState("White");
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gcashReceiptRef = useRef<HTMLInputElement>(null);

  // Edit-order modal state
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
  const [eoExistingFiles, setEoExistingFiles] = useState<
    { name: string; url: string; type: string }[]
  >([]);
  const [eoNewFiles, setEoNewFiles] = useState<FileList | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
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
        folder: sp(data.folder, DEFAULT_PRICES.folder),
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

  async function fetchOrderFiles(orderId: string) {
    setViewDetailsFiles([]);
    setViewDetailsReceipt(null);
    try {
      const res = await fetch(`/api/order-files?order_id=${orderId}`);
      const r = await res.json();
      if (r.success) {
        setViewDetailsFiles(r.data.files || []);
        setViewDetailsReceipt(r.data.gcash_receipt || null);
      }
    } catch {}
  }

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
    if (!localStorage.getItem(TOS_ACCEPTED_KEY)) setShowTosModal(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("welcome") !== "true" || !user.first_name) return;
    window.history.replaceState({}, "", "/user/dashboard");
    const t = setTimeout(
      () => showToast(`Welcome back, ${user.first_name}! 👋`, "success"),
      300,
    );
    return () => clearTimeout(t);
  }, [searchParams, user.first_name, showToast]);

  function handleTosAccept() {
    localStorage.setItem(TOS_ACCEPTED_KEY, "true");
    setShowTosModal(false);
    showToast("Welcome! You have agreed to our Terms of Service.");
  }
  async function handleTosDecline() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    router.replace("/login");
  }
  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    router.replace("/login");
  }

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
      showToast("Network error.", "error");
    }
    setCancellingId(null);
    setCancelModalOrderId(null);
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

  const showsCopies = noService === "Print" || noService === "Photocopy";

  async function handleFileChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    setNoFiles(files);
    setNoPdfPages(0);
    if (noService === "Print" || noService === "Photocopy") {
      setNoQuantity("");

      const totalPages = await countPagesFromFiles(files);
      if (totalPages > 0) {
        setNoPdfPages(totalPages);
        const copies = Number(noCopies) || 1;
        setNoQuantity(totalPages * copies);
        const fc = Array.from(files).filter((f) => {
          const n = f.name.toLowerCase();
          return n.endsWith(".pdf") || n.endsWith(".docx");
        }).length;
        showToast(
          `${fc} file${fc > 1 ? "s" : ""} — ${totalPages} total page${totalPages > 1 ? "s" : ""} × ${copies} copies = ${totalPages * copies} total`,
          "success",
        );
      } else {
        setNoQuantity("");
        setNoPdfPages(0);
      }
    }
  }

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
        const fc = Array.from(files).filter((f) => {
          const n = f.name.toLowerCase();
          return n.endsWith(".pdf") || n.endsWith(".docx");
        }).length;
        showToast(
          `${fc} file${fc > 1 ? "s" : ""} — ${totalPages} total page${totalPages > 1 ? "s" : ""} × ${copies} copies = ${totalPages * copies} total`,
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
      if (noService === "Scanning" && (!noFiles || noFiles.length === 0)) {
        showToast("Please upload the file(s) you want scanned.", "error");
        return false;
      }
      if (!noSpecs.trim()) {
        showToast("Specifications are required.", "error");
        return false;
      }
    }
    return true;
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
    setNoPhotoSize("4x6");
    setNoPaperType("white");
    setNoPhotoFinish("glossy");
    setNoColorOption("bw");
    setNoLamination(false);
    setNoFolder(false);
    setNoFolderSize("A4");
    setNoFolderQty(1);
    setNoFolderColor("White");
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

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    const showsCopiesNow = noService === "Print" || noService === "Photocopy";
    if (
      ["Print", "Photocopy", "Photo Development", "Scanning"].includes(
        noService,
      ) &&
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
    const effectiveQty =
      noQuantity !== "" && Number(noQuantity) >= 1
        ? Number(noQuantity)
        : showsCopiesNow
          ? Number(noCopies) || 1
          : 0;
    const total =
      noService && effectiveQty >= 1
        ? calcTotal(
            noService,
            effectiveQty,
            noColorOption,
            noPaperSize,
            noPhotoSize,
            noLamination,
            prices,
          )
        : 0;
    if (noPaymentMethod === "cash" && total >= 500) {
      showToast(
        "Orders over ₱500 require a GCash downpayment. Please switch to Pay via GCash.",
        "error",
      );
      return;
    }

    let finalQuantity = Number(noQuantity);
    if (showsCopiesNow && (finalQuantity < 1 || noQuantity === ""))
      finalQuantity = Number(noCopies) || 1;
    setNoSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("service", noService);
      fd.append("quantity", String(finalQuantity));

      // ── Enrich specifications with Paper Type / Photo Finish ──
      let enrichedSpecs = noSpecs;
      if (noService === "Print" && noPaperType) {
        enrichedSpecs =
          `Paper Type: ${PAPER_TYPE_LABELS[noPaperType] || noPaperType}\n` +
          enrichedSpecs;
      }
      if (noService === "Photo Development" && noPhotoFinish) {
        const pfLabel =
          noPhotoFinish.charAt(0).toUpperCase() + noPhotoFinish.slice(1);
        enrichedSpecs = `Photo Finish: ${pfLabel}\n` + enrichedSpecs;
      }
      fd.append("specifications", enrichedSpecs);

      fd.append("delivery_option", noDelivery);
      if (noDelivery === "delivery") fd.append("delivery_address", noAddress);
      if (noDelivery === "pickup" && noPickupTime)
        fd.append("pickup_time", noPickupTime);
      fd.append("paper_size", noPaperSize);
      fd.append("photo_size", noPhotoSize);
      fd.append("paper_type", noPaperType);
      fd.append("photo_finish", noPhotoFinish);
      fd.append("color_option", noColorOption);
      if (noLamination) fd.append("add_lamination", "on");
      if (noFolder) {
        fd.append("add_folder", "on");
        fd.append("folder_size", noFolderSize);
        fd.append("folder_qty", String(noFolderQty));
        fd.append("folder_color", noFolderColor);
      }
      if (showsCopiesNow) fd.append("copies", String(noCopies || 1));
      fd.append(
        "payment_method",
        noPaymentMethod === "gcash" ? "GCash" : "Cash",
      );
      if (noPaymentMethod === "gcash") {
        fd.append("gcash_pay_type", noGcashPayType);
        if (noGcashRefNum) fd.append("gcash_ref_num", noGcashRefNum);
        if (noGcashReceipt) fd.append("gcash_receipt", noGcashReceipt);
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
            "Order placed! But file upload failed. Please contact support.",
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
        } catch {}
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
      setEoExistingFiles([]);
      setEoNewFiles(null);
      try {
        const fr = await fetch(`/api/order-files?order_id=${orderId}`);
        const fd = await fr.json();
        if (fd.success) setEoExistingFiles(fd.data.files || []);
      } catch {}
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
    const eoShowsCopies = eoService === "Print" || eoService === "Photocopy";
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
      if (eoNewFiles && eoNewFiles.length > 0) {
        try {
          await uploadFilesForOrder(String(editOrder.order_id!), eoNewFiles);
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

  const navItems: { id: Section; icon: React.ReactNode; label: string }[] = [
    { id: "dashboard", icon: <IC.Grid />, label: "Dashboard" },
    { id: "new-order", icon: <IC.Plus />, label: "New Order" },
    { id: "orders", icon: <IC.List />, label: "My Orders" },
  ];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
        @keyframes tosBackdropIn { from{opacity:0} to{opacity:1} }
        @keyframes tosModalIn { from{opacity:0;transform:scale(.9) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes tosBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
        .tos-bounce { animation: tosBounce 1.6s ease infinite; }`}</style>

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
            <section
              className={`panel ${activeSection === "dashboard" ? "active" : ""}`}
            >
              <DashboardSection
                stats={stats}
                prices={prices}
                recentOrders={recentOrders}
                onViewAll={() => setActiveSection("orders")}
                onNewOrder={() => setActiveSection("new-order")}
              />
            </section>

            <section
              className={`panel ${activeSection === "new-order" ? "active" : ""}`}
            >
              <NewOrderForm
                step={step}
                setStep={setStep}
                noService={noService}
                setNoService={setNoService}
                noQuantity={noQuantity}
                setNoQuantity={setNoQuantity}
                noCopies={noCopies}
                setNoCopies={setNoCopies}
                noPdfPages={noPdfPages}
                setNoPdfPages={setNoPdfPages}
                noDelivery={noDelivery}
                setNoDelivery={setNoDelivery}
                noAddress={noAddress}
                setNoAddress={setNoAddress}
                noPickupTime={noPickupTime}
                setNoPickupTime={setNoPickupTime}
                noPaperSize={noPaperSize}
                setNoPaperSize={setNoPaperSize}
                noPhotoSize={noPhotoSize}
                setNoPhotoSize={setNoPhotoSize}
                noPaperType={noPaperType}
                setNoPaperType={setNoPaperType}
                noPhotoFinish={noPhotoFinish}
                setNoPhotoFinish={setNoPhotoFinish}
                noColorOption={noColorOption}
                setNoColorOption={setNoColorOption}
                noLamination={noLamination}
                setNoLamination={setNoLamination}
                noFolder={noFolder}
                setNoFolder={setNoFolder}
                noFolderSize={noFolderSize}
                setNoFolderSize={setNoFolderSize}
                noFolderQty={noFolderQty}
                setNoFolderQty={setNoFolderQty}
                noFolderColor={noFolderColor}
                setNoFolderColor={setNoFolderColor}
                noSpecs={noSpecs}
                setNoSpecs={setNoSpecs}
                noFiles={noFiles}
                setNoFiles={setNoFiles}
                fileInputRef={fileInputRef}
                noPaymentMethod={noPaymentMethod}
                setNoPaymentMethod={setNoPaymentMethod}
                noGcashPayType={noGcashPayType}
                setNoGcashPayType={setNoGcashPayType}
                noGcashRefNum={noGcashRefNum}
                setNoGcashRefNum={setNoGcashRefNum}
                noGcashReceipt={noGcashReceipt}
                setNoGcashReceipt={setNoGcashReceipt}
                noGcashReceiptPreview={noGcashReceiptPreview}
                setNoGcashReceiptPreview={setNoGcashReceiptPreview}
                gcashReceiptRef={gcashReceiptRef}
                noSubmitting={noSubmitting}
                onSubmit={handleSubmitOrder}
                prices={prices}
                showToast={showToast}
                handleFileChange={handleFileChange}
                handleCopiesChange={handleCopiesChange}
                validateStep={validateStep}
              />
            </section>

            <section
              className={`panel ${activeSection === "orders" ? "active" : ""}`}
            >
              <OrdersSection
                orders={allOrders}
                loading={ordersLoading}
                filter={orderFilter}
                onFilterChange={setOrderFilter}
                onView={(o) => {
                  setViewDetailsOrder(o);
                  fetchOrderFiles(o.order_id);
                }}
                onEdit={openEditModal}
                onCancel={(id) => setCancelModalOrderId(id)}
                cancellingId={cancellingId}
              />
            </section>

            <section
              className={`panel ${activeSection === "profile" ? "active" : ""}`}
            >
              <ProfileSection
                profTab={profTab}
                setProfTab={setProfTab}
                profAvatar={profAvatar}
                setProfAvatar={setProfAvatar}
                profFirstName={profFirstName}
                setProfFirstName={setProfFirstName}
                profLastName={profLastName}
                setProfLastName={setProfLastName}
                profEmail={profEmail}
                setProfEmail={setProfEmail}
                profPhone={profPhone}
                setProfPhone={setProfPhone}
                profCurrentPw={profCurrentPw}
                setProfCurrentPw={setProfCurrentPw}
                profNewPw={profNewPw}
                setProfNewPw={setProfNewPw}
                profConfirmPw={profConfirmPw}
                setProfConfirmPw={setProfConfirmPw}
                showCurrPw={showCurrPw}
                setShowCurrPw={setShowCurrPw}
                showNewPw={showNewPw}
                setShowNewPw={setShowNewPw}
                showConfirmPw={showConfirmPw}
                setShowConfirmPw={setShowConfirmPw}
                profSubmitting={profSubmitting}
                pwStrength={pwStrength}
                pwLabel={pwLabel}
                pwColor={pwColor}
                pwMatch={pwMatch}
                profInitials={profInitials}
                onSubmit={handleProfileSubmit}
                onAvatarChange={handleAvatarChange}
                showToast={showToast}
              />
            </section>
          </main>
        </div>
      </div>

      {viewDetailsOrder && (
        <ViewDetailsModal
          order={viewDetailsOrder}
          files={viewDetailsFiles}
          receipt={viewDetailsReceipt}
          prices={prices}
          onClose={() => {
            setViewDetailsOrder(null);
            setViewDetailsFiles([]);
            setViewDetailsReceipt(null);
          }}
          onEdit={openEditModal}
          onCancel={(id) => setCancelModalOrderId(id)}
        />
      )}

      {editModalOpen && editOrder && (
        <EditOrderModal
          editOrder={editOrder}
          eoService={eoService}
          setEoService={setEoService}
          eoQuantity={eoQuantity}
          setEoQuantity={setEoQuantity}
          eoCopies={eoCopies}
          setEoCopies={setEoCopies}
          eoPdfPages={eoPdfPages}
          setEoPdfPages={setEoPdfPages}
          eoDelivery={eoDelivery}
          setEoDelivery={setEoDelivery}
          eoAddress={eoAddress}
          setEoAddress={setEoAddress}
          eoPickupTime={eoPickupTime}
          setEoPickupTime={setEoPickupTime}
          eoPaperSize={eoPaperSize}
          setEoPaperSize={setEoPaperSize}
          eoPhotoSize={eoPhotoSize}
          setEoPhotoSize={setEoPhotoSize}
          eoColorOption={eoColorOption}
          setEoColorOption={setEoColorOption}
          eoLamination={eoLamination}
          setEoLamination={setEoLamination}
          eoSpecs={eoSpecs}
          setEoSpecs={setEoSpecs}
          eoExistingFiles={eoExistingFiles}
          setEoExistingFiles={setEoExistingFiles}
          eoNewFiles={eoNewFiles}
          setEoNewFiles={setEoNewFiles}
          editFileInputRef={editFileInputRef}
          eoSubmitting={eoSubmitting}
          onSubmit={handleEditSubmit}
          onClose={() => setEditModalOpen(false)}
          prices={prices}
          handleEditFileChange={handleEditFileChange}
          handleEoCopiesChange={handleEoCopiesChange}
        />
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
