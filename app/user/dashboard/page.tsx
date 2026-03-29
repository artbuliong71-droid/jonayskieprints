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

const DRAFT_KEY = "newOrderDraft";

// ── Replace these with your actual Cloudinary credentials ──────────────────
const CLOUDINARY_CLOUD_NAME = "dz56yoeaf";
const CLOUDINARY_UPLOAD_PRESET = "jonayskie_avatars";
// ───────────────────────────────────────────────────────────────────────────

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showTosModal, setShowTosModal] = useState(false);

  // ── Initialize activeSection — always start on dashboard for fresh logins ──
  const [activeSection, setActiveSection] = useState<Section>(() => {
    try {
      if (!sessionStorage.getItem("dashboard_loaded")) return "dashboard";
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.noService) return "new-order";
      }
    } catch {}
    return "dashboard";
  });

  // ── Mark dashboard as loaded so draft can be restored on future renders ──
  useEffect(() => {
    sessionStorage.setItem("dashboard_loaded", "true");
  }, []);

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

  // ── New-order form state — initialize from localStorage draft ──
  const [step, setStep] = useState<number>(() => {
    try {
      if (!sessionStorage.getItem("dashboard_loaded")) return 0;
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).step ?? 0;
    } catch {}
    return 0;
  });
  const [noService, setNoService] = useState<string>(() => {
    try {
      if (!sessionStorage.getItem("dashboard_loaded")) return "";
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noService ?? "";
    } catch {}
    return "";
  });
  const [noQuantity, setNoQuantity] = useState<number | "">(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noQuantity ?? "";
    } catch {}
    return "";
  });
  const [noCopies, setNoCopies] = useState<number | "">(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noCopies ?? 1;
    } catch {}
    return 1;
  });
  const [noDelivery, setNoDelivery] = useState<DeliveryOption>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noDelivery ?? "pickup";
    } catch {}
    return "pickup";
  });
  const [noAddress, setNoAddress] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noAddress ?? "";
    } catch {}
    return "";
  });
  const [noPickupTime, setNoPickupTime] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noPickupTime ?? "";
    } catch {}
    return "";
  });
  const [noPaperSize, setNoPaperSize] = useState<PaperSize>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noPaperSize ?? "A4";
    } catch {}
    return "A4";
  });
  const [noPhotoSize, setNoPhotoSize] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noPhotoSize ?? "4x6";
    } catch {}
    return "4x6";
  });
  const [noPaperType, setNoPaperType] = useState<PaperType>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noPaperType ?? "white";
    } catch {}
    return "white";
  });
  const [noPhotoFinish, setNoPhotoFinish] = useState<PhotoFinish>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noPhotoFinish ?? "glossy";
    } catch {}
    return "glossy";
  });
  const [noColorOption, setNoColorOption] = useState<ColorOption>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noColorOption ?? "bw";
    } catch {}
    return "bw";
  });
  const [noLamination, setNoLamination] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noLamination ?? false;
    } catch {}
    return false;
  });
  const [noFolder, setNoFolder] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noFolder ?? false;
    } catch {}
    return false;
  });
  const [noFolderSize, setNoFolderSize] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noFolderSize ?? "A4";
    } catch {}
    return "A4";
  });
  const [noFolderQty, setNoFolderQty] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noFolderQty ?? 1;
    } catch {}
    return 1;
  });
  const [noFolderColor, setNoFolderColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noFolderColor ?? "White";
    } catch {}
    return "White";
  });
  const [noSpecs, setNoSpecs] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noSpecs ?? "";
    } catch {}
    return "";
  });
  const [noPaymentMethod, setNoPaymentMethod] = useState<"cash" | "gcash">(
    () => {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) return JSON.parse(saved).noPaymentMethod ?? "cash";
      } catch {}
      return "cash";
    },
  );
  const [noGcashPayType, setNoGcashPayType] = useState<"downpayment" | "full">(
    () => {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) return JSON.parse(saved).noGcashPayType ?? "full";
      } catch {}
      return "full";
    },
  );
  const [noGcashRefNum, setNoGcashRefNum] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved).noGcashRefNum ?? "";
    } catch {}
    return "";
  });

  const [noFiles, setNoFiles] = useState<FileList | null>(null);
  const [noSubmitting, setNoSubmitting] = useState(false);
  const [noPdfPages, setNoPdfPages] = useState(0);
  const [noGcashReceipt, setNoGcashReceipt] = useState<File | null>(null);
  const [noGcashReceiptPreview, setNoGcashReceiptPreview] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gcashReceiptRef = useRef<HTMLInputElement>(null);

  // ── Save draft to localStorage on every change ────────────────────────────
  useEffect(() => {
    try {
      const draft = {
        step,
        noService,
        noQuantity,
        noCopies,
        noDelivery,
        noAddress,
        noPickupTime,
        noPaperSize,
        noPhotoSize,
        noPaperType,
        noPhotoFinish,
        noColorOption,
        noLamination,
        noFolder,
        noFolderSize,
        noFolderQty,
        noFolderColor,
        noSpecs,
        noPaymentMethod,
        noGcashPayType,
        noGcashRefNum,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    step,
    noService,
    noQuantity,
    noCopies,
    noDelivery,
    noAddress,
    noPickupTime,
    noPaperSize,
    noPhotoSize,
    noPaperType,
    noPhotoFinish,
    noColorOption,
    noLamination,
    noFolder,
    noFolderSize,
    noFolderQty,
    noFolderColor,
    noSpecs,
    noPaymentMethod,
    noGcashPayType,
    noGcashRefNum,
  ]);

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
  const [eoFolder, setEoFolder] = useState(false);
  const [eoFolderSize, setEoFolderSize] = useState("A4");
  const [eoFolderQty, setEoFolderQty] = useState(1);
  const [eoFolderColor, setEoFolderColor] = useState("White");
  const [eoSpecs, setEoSpecs] = useState("");
  const [eoSubmitting, setEoSubmitting] = useState(false);
  const [eoPdfPages, setEoPdfPages] = useState(0);
  const [eoBasePages, setEoBasePages] = useState(0);
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

  // ── fetchUser: now also loads avatarUrl from DB ───────────────────────────
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
        setProfAvatar(u.avatarUrl || null); // ← Load avatar from DB
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

  // ── handleAvatarChange: uploads to Cloudinary, saves URL to MongoDB ──────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB.", "error");
      return;
    }

    try {
      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "avatars");

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );

      if (!cloudRes.ok) {
        showToast("Failed to upload photo. Try again.", "error");
        return;
      }

      const cloudData = await cloudRes.json();
      const imageUrl: string = cloudData.secure_url;

      // 2. Update UI immediately
      setProfAvatar(imageUrl);

      // 3. Save URL to MongoDB via API
      const saveRes = await fetch("/api/user/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: imageUrl }),
      });

      if (!saveRes.ok) {
        showToast("Photo uploaded but failed to save. Try again.", "error");
        return;
      }

      showToast("Profile photo updated!", "success");
    } catch {
      showToast("Failed to upload photo.", "error");
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!profFirstName.trim()) errs.push("First name is required.");
    else if (!/^(?=.*[A-Za-z])[A-Za-z\s'-]+$/.test(profFirstName.trim()))
      errs.push("First name must not contain numbers.");
    if (!profLastName.trim()) errs.push("Last name is required.");
    else if (!/^(?=.*[A-Za-z])[A-Za-z\s'-]+$/.test(profLastName.trim()))
      errs.push("Last name must not contain numbers.");
    if (!profEmail.trim() || !/\S+@\S+\.\S+/.test(profEmail))
      errs.push("Valid email is required.");
    if (profPhone.trim() && !/^(09\d{9}|639\d{9})$/.test(profPhone.trim()))
      errs.push("Phone number must be a valid Philippine mobile number.");
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

  function buildFileList(files: File[]) {
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    return dt.files;
  }

  async function applySelectedFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      setNoFiles(null);
      setNoPdfPages(0);
      setNoQuantity("");
      return;
    }

    setNoFiles(files);
    setNoPdfPages(0);

    if (noService === "Print" || noService === "Photocopy") {
      setNoQuantity("");
      const totalPages = await countPagesFromFiles(files);
      if (totalPages > 0) {
        setNoPdfPages(totalPages);
        const copies = Number(noCopies) || 1;
        setNoQuantity(copies);
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

  async function handleFileChange(files: FileList | null) {
    if (!files || files.length === 0) return;

    const existingFiles = noFiles ? Array.from(noFiles) : [];
    const mergedFiles = [...existingFiles];
    const seen = new Set(
      existingFiles.map(
        (file) => `${file.name}-${file.size}-${file.lastModified}-${file.type}`,
      ),
    );

    Array.from(files).forEach((file) => {
      const fileKey = `${file.name}-${file.size}-${file.lastModified}-${file.type}`;
      if (seen.has(fileKey)) return;
      seen.add(fileKey);
      mergedFiles.push(file);
    });

    await applySelectedFiles(buildFileList(mergedFiles));

    if (fileInputRef.current) fileInputRef.current.value = "";
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
    if (val !== "") setNoQuantity(Number(val));
  }
  function handleEoCopiesChange(val: number | "") {
    setEoCopies(val);
    if (val !== "") setEoQuantity(Number(val));
  }

  async function handleSmartEditFileChange(files: FileList | null) {
    setEoNewFiles(files);

    if (eoService !== "Print" && eoService !== "Photocopy") return;

    const newPages =
      files && files.length > 0 ? await countPagesFromFiles(files) : 0;
    const totalPages = eoBasePages + newPages;
    const copies = Number(eoCopies) || 1;

    setEoPdfPages(totalPages);
    setEoQuantity(copies);

    if (files && files.length > 0) {
      const countedFiles = Array.from(files).filter((f) => {
        const n = f.name.toLowerCase();
        return n.endsWith(".pdf") || n.endsWith(".docx");
      }).length;
      showToast(
        `${countedFiles} new file${files.length > 1 ? "s" : ""} added - ${totalPages} total page${totalPages > 1 ? "s" : ""} x ${copies} copies = ${totalPages * copies} total`,
        "success",
      );
    }
  }

  function handleSmartEoCopiesChange(val: number | "") {
    setEoCopies(val);
    if (val !== "") setEoQuantity(Number(val));
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
    localStorage.removeItem(DRAFT_KEY);
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
      showsCopiesNow
        ? Number(noCopies) || 1
        : noQuantity !== "" && Number(noQuantity) >= 1
          ? Number(noQuantity)
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
            undefined,
            undefined,
            showsCopiesNow ? noPdfPages : undefined,
          )
        : 0;
    if (noPaymentMethod === "cash" && total >= 500) {
      showToast(
        "Orders over ₱500 require a GCash downpayment. Please switch to Pay via GCash.",
        "error",
      );
      return;
    }

    const finalQuantity = showsCopiesNow
      ? Number(noCopies) || 1
      : Number(noQuantity) || 1;
    setNoSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("service", noService);
      fd.append("quantity", String(finalQuantity));
      if (showsCopiesNow && noPdfPages > 0)
        fd.append("page_count", String(noPdfPages));

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
      const p = parseSpecsOptions(o.specifications);
      const existingCopies =
        o.service === "Print" || o.service === "Photocopy"
          ? p.copies || o.quantity || 1
          : 1;
      setEoCopies(existingCopies);
      setEoDelivery(o.delivery_option as DeliveryOption);
      setEoAddress(o.delivery_address || "");
      setEoPickupTime(o.pickup_time || "");
      setEoSpecs(extractUserSpecs(o.specifications));
      setEoPaperSize(p.paperSize || "A4");
      setEoPhotoSize(p.photoSize || "A4");
      setEoColorOption(
        p.colorOption || (o.service === "Photocopy" ? "color" : "bw"),
      );
      setEoLamination(p.addLamination);
      const existingPages =
        o.service === "Print" || o.service === "Photocopy"
          ? p.pageCount ||
            (Number.isInteger(o.quantity / existingCopies)
              ? o.quantity / existingCopies
              : o.quantity)
          : 0;
      setEoBasePages(existingPages);
      setEoPdfPages(existingPages);
      setEoExistingFiles([]);
      setEoNewFiles(null);
      setEoFolder(false);
      setEoFolderSize("A4");
      setEoFolderQty(1);
      setEoFolderColor("White");
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
    const finalQty = eoShowsCopies
      ? Number(eoCopies) || 1
      : Number(eoQuantity) || 1;
    setEoSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("action", "updateOrder");
      fd.append("order_id", String(editOrder.order_id));
      fd.append("service", eoService);
      fd.append("quantity", String(finalQty));
      if (eoShowsCopies && eoPdfPages > 0)
        fd.append("page_count", String(eoPdfPages));
      fd.append("specifications", eoSpecs);
      fd.append("delivery_option", eoDelivery);
      if (eoDelivery === "delivery") fd.append("delivery_address", eoAddress);
      if (eoDelivery === "pickup" && eoPickupTime)
        fd.append("pickup_time", eoPickupTime);
      fd.append("paper_size", eoPaperSize);
      fd.append("photo_size", eoPhotoSize);
      fd.append("color_option", eoColorOption);
      if (eoLamination) fd.append("add_lamination", "on");
      if (eoFolder) {
        fd.append("add_folder", "on");
        fd.append("folder_size", eoFolderSize);
        fd.append("folder_qty", String(eoFolderQty));
        fd.append("folder_color", eoFolderColor);
      }
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
                replaceFiles={applySelectedFiles}
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
          eoFolder={eoFolder}
          setEoFolder={setEoFolder}
          eoFolderSize={eoFolderSize}
          setEoFolderSize={setEoFolderSize}
          eoFolderQty={eoFolderQty}
          setEoFolderQty={setEoFolderQty}
          eoFolderColor={eoFolderColor}
          setEoFolderColor={setEoFolderColor}
          eoSpecs={eoSpecs}
          setEoSpecs={setEoSpecs}
          eoExistingFiles={eoExistingFiles}
          setEoExistingFiles={setEoExistingFiles}
          eoNewFiles={eoNewFiles}
          editFileInputRef={editFileInputRef}
          eoSubmitting={eoSubmitting}
          onSubmit={handleEditSubmit}
          onClose={() => setEditModalOpen(false)}
          prices={prices}
          handleEditFileChange={handleSmartEditFileChange}
          handleEoCopiesChange={handleSmartEoCopiesChange}
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
