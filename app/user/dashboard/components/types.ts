// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
}

export interface Prices {
  print_bw: number;
  print_color: number;
  photocopying: number;
  scanning: number;
  photo_development: number;
  laminating: number;
  folder: number;
}

export interface Order {
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

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: string;
}

export interface Toast {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

export type Section = "dashboard" | "new-order" | "orders" | "profile";
export type PaperSize = "A4" | "Short" | "Long";
export type ColorOption = "bw" | "color";
export type DeliveryOption = "pickup" | "delivery";

// ─── Constants ───────────────────────────────────────────────────────────────

export const SERVICES = [
  "Print",
  "Photocopy",
  "Scanning",
  "Photo Development",
  "Laminating",
];

export const DEFAULT_PRICES: Prices = {
  print_bw: 1.0,
  print_color: 2.0,
  photocopying: 2.0,
  scanning: 5.0,
  photo_development: 15.0,
  laminating: 20.0,
  folder: 10.0,
};

export const PAPER_MULTIPLIERS: Record<PaperSize, number> = {
  A4: 1.0,
  Short: 1.0,
  Long: 1.2,
};

export const TOS_ACCEPTED_KEY = "jonayskie_tos_accepted";

export const PICKUP_TIMES = [
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

// ─── Utilities ────────────────────────────────────────────────────────────────

export function sp(val: unknown, fallback: number): number {
  const parsed = Number(val);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export function formatPickupTime(time24: string): string {
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

export function extractUserSpecs(specifications: string): string {
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
          !t.startsWith("Add Folder:") &&
          !t.startsWith("PDF Pages:") &&
          !t.startsWith("Copies:") &&
          !t.startsWith("Pickup Time:"))
      );
    })
    .join("\n")
    .trim();
}

export function parseSpecsOptions(specifications: string) {
  const result: {
    paperSize: PaperSize | null;
    photoSize: string | null;
    colorOption: ColorOption | null;
    addLamination: boolean;
    addFolder: boolean;
    folderSize: string;
    folderQty: number;
    pickupTime: string | null;
  } = {
    paperSize: null,
    photoSize: null,
    colorOption: null,
    addLamination: false,
    addFolder: false,
    folderSize: "A4",
    folderQty: 1,
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
    else if (t.startsWith("Add Folder:")) {
      result.addFolder = true;
      const parts = t.replace("Add Folder:", "").trim();
      const sizeMatch = parts.match(/(A4|Short|Long)/);
      const qtyMatch = parts.match(/(\d+)\s*pc/);
      if (sizeMatch) result.folderSize = sizeMatch[1];
      if (qtyMatch) result.folderQty = parseInt(qtyMatch[1]);
    }
  }
  return result;
}

export function calcTotal(
  service: string,
  quantity: number,
  colorOption: ColorOption,
  paperSize: PaperSize,
  photoSize: string,
  addLamination: boolean,
  prices: Prices,
  addFolder?: boolean,
  folderQty?: number,
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
  if (addFolder && folderQty && folderQty >= 1)
    total += sp(prices.folder, 10) * folderQty;
  return total;
}

export async function getPdfPageCount(file: File): Promise<number> {
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

export async function getDocxPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const match = text.match(/<Pages>(\d+)<\/Pages>/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

export async function countPagesFromFiles(files: FileList): Promise<number> {
  let total = 0;
  for (const f of Array.from(files)) {
    const name = f.name.toLowerCase();
    if (name.endsWith(".pdf")) {
      total += await getPdfPageCount(f);
    } else if (name.endsWith(".docx")) {
      total += await getDocxPageCount(f);
    } else {
      total += 1;
    }
  }
  return total;
}

export async function uploadFilesForOrder(
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

export async function deleteOrderFile(
  orderId: string,
  fileName: string,
): Promise<void> {
  const fd = new FormData();
  fd.append("order_id", orderId);
  fd.append("file_name", fileName);
  await fetch("/api/delete-file", { method: "POST", body: fd });
}

export function displayId(id: string | number | undefined): string {
  return id ? String(id).slice(-6) : "------";
}

export function badgeClass(s: string): string {
  return s === "pending"
    ? "badge-pending"
    : s === "cancelled"
      ? "badge-cancelled"
      : s === "in-progress"
        ? "badge-progress"
        : "badge-completed";
}
