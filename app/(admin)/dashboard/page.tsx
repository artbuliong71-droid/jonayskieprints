"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface AdminStats {
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalRevenue: string;
  inProgressOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}
interface FileData {
  url: string;
  resource_type: string;
}
interface Order {
  _id: string;
  order_id: string;
  user_name: string;
  user_email: string;
  service: string;
  quantity: number;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  total_amount: number;
  delivery_option: string;
  delivery_address?: string;
  pickup_time?: string | null;
  specifications: string;
  created_at: string;
  files?: FileData[];
}
interface DeletedOrder {
  _id: string;
  order_id: string;
  user_name: string;
  user_email: string;
  service: string;
  quantity: number;
  status: string;
  total_amount: number;
  delivery_option: string;
  pickup_time?: string | null;
  created_at: string;
  deleted_at: string;
}
interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
  total_orders: number;
}
interface Pricing {
  print_bw: number;
  print_color: number;
  photocopying: number;
  scanning: number;
  photo_development: number;
  laminating: number;
}
interface PricingStr {
  print_bw: string;
  print_color: string;
  photocopying: string;
  scanning: string;
  photo_development: string;
  laminating: string;
}
type Section =
  | "dashboard"
  | "orders"
  | "customers"
  | "reports"
  | "settings"
  | "deleted";

function getOrderId(o: Order): string {
  return o.order_id || o._id || "";
}
function getOrderDisplay(o: Order | DeletedOrder): string {
  const id = o.order_id || o._id || "";
  return id ? String(id).slice(-6) : "------";
}
function getFileName(url: string) {
  try {
    return decodeURIComponent(url.split("/").pop()?.split("?")[0] || url);
  } catch {
    return url;
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
function pricingStrToNum(p: PricingStr): Pricing {
  return {
    print_bw: parseFloat(p.print_bw) || 0,
    print_color: parseFloat(p.print_color) || 0,
    photocopying: parseFloat(p.photocopying) || 0,
    scanning: parseFloat(p.scanning) || 0,
    photo_development: parseFloat(p.photo_development) || 0,
    laminating: parseFloat(p.laminating) || 0,
  };
}

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
  Clipboard: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  ),
  Users: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  BarChart: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Settings: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  Trash: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
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
  Bell: () => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  Printer: () => (
    <svg
      width="18"
      height="18"
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
  Cart: () => (
    <svg
      width="20"
      height="20"
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
      width="20"
      height="20"
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
  Lock: () => (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  Check: () => (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  People: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  CreditCard: () => (
    <svg
      width="20"
      height="20"
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
  TrendUp: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Package: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  CheckCircle: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  Coin: () => (
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
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M22 10H2" />
      <path d="M7 15h.01M11 15h2" />
    </svg>
  ),
  Save: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  ArrowRight: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  PriceTag: () => (
    <svg
      width="17"
      height="17"
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
      width="14"
      height="14"
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
  File: () => (
    <svg
      width="14"
      height="14"
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
  X: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Image: () => (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  Download: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  XCircle: () => (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Calendar: () => (
    <svg
      width="15"
      height="15"
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
};

import {
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 9999,
        padding: ".7rem 1rem",
        borderRadius: 10,
        color: "#fff",
        fontWeight: 600,
        fontSize: ".82rem",
        background: type === "success" ? "#22c55e" : "#ef4444",
        boxShadow: "0 8px 24px rgba(0,0,0,.2)",
        display: "flex",
        alignItems: "center",
        gap: ".4rem",
        animation: "fadeIn .3s ease",
        maxWidth: "calc(100vw - 2rem)",
      }}
    >
      {type === "success" ? (
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
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
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
      {msg}
    </div>
  );
}

function DetailsModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const detailRows = [
    { label: "Customer", value: `${order.user_name} (${order.user_email})` },
    { label: "Service", value: order.service },
    { label: "Quantity", value: order.quantity },
    { label: "Delivery", value: order.delivery_option },
    ...(order.delivery_option === "pickup" && order.pickup_time
      ? [
          {
            label: "Pickup Time",
            value: formatPickupTime(order.pickup_time),
            highlight: true,
          },
        ]
      : []),
    { label: "Address", value: order.delivery_address || "N/A" },
    { label: "Amount", value: `₱${Number(order.total_amount).toFixed(2)}` },
    { label: "Status", value: order.status },
    { label: "Date", value: new Date(order.created_at).toLocaleString() },
  ];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        zIndex: 800,
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
          maxWidth: 540,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: ".9rem 1.2rem",
            borderBottom: "1px solid #e5e7eb",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <div
            style={{ fontWeight: 700, fontSize: ".95rem", color: "#111827" }}
          >
            Order Details —{" "}
            <span style={{ color: "#7c3aed" }}>#{getOrderDisplay(order)}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 6,
            }}
          >
            <IC.X />
          </button>
        </div>
        <div style={{ padding: "1.1rem 1.2rem" }}>
          {detailRows.map((row: any) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                gap: ".75rem",
                padding: ".45rem 0",
                borderBottom: "1px solid #f3f4f6",
                fontSize: ".84rem",
              }}
            >
              <div
                style={{
                  width: 90,
                  color: "#6b7280",
                  fontWeight: 600,
                  flexShrink: 0,
                  fontSize: ".75rem",
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  paddingTop: 2,
                }}
              >
                {row.label}
              </div>
              <div
                style={{
                  color: row.highlight ? "#7c3aed" : "#111827",
                  flex: 1,
                  fontWeight: row.highlight ? 700 : 400,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {row.highlight && <IC.ClockSmall />}
                {String(row.value)}
              </div>
            </div>
          ))}
          <div style={{ marginTop: ".85rem" }}>
            <div
              style={{
                fontSize: ".75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".04em",
                color: "#6b7280",
                marginBottom: ".4rem",
              }}
            >
              Specifications
            </div>
            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: ".65rem .85rem",
                fontSize: ".83rem",
                color: "#374151",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {order.specifications || "N/A"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilesModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const files: FileData[] = (order.files || []).map((f: any) =>
    typeof f === "string" ? { url: f, resource_type: "image" } : f,
  );
  async function handleDownload(url: string, filename: string) {
    const finalName = filename.toLowerCase().endsWith(".pdf")
      ? filename
      : filename + ".pdf";
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        zIndex: 800,
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
          maxWidth: 600,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: ".9rem 1.2rem",
            borderBottom: "1px solid #e5e7eb",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <div
            style={{ fontWeight: 700, fontSize: ".95rem", color: "#111827" }}
          >
            Uploaded Files —{" "}
            <span style={{ color: "#7c3aed" }}>#{getOrderDisplay(order)}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 6,
            }}
          >
            <IC.X />
          </button>
        </div>
        <div style={{ padding: "1.1rem 1.2rem" }}>
          {files.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "#9ca3af",
                fontSize: ".85rem",
              }}
            >
              <div style={{ marginBottom: ".5rem", opacity: 0.4 }}>
                <IC.Image />
              </div>
              No files uploaded for this order.
            </div>
          ) : (
            <>
              {files.length > 1 && (
                <div
                  style={{
                    marginBottom: ".85rem",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() =>
                      files.forEach((f) =>
                        handleDownload(f.url, getFileName(f.url)),
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: ".38rem .85rem",
                      borderRadius: 8,
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontSize: ".75rem",
                      fontWeight: 600,
                      fontFamily: "inherit",
                    }}
                  >
                    <IC.Download /> Download All ({files.length})
                  </button>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: ".75rem",
                }}
              >
                {files.map((file, i) => {
                  const { url, resource_type } = file;
                  const isImage = resource_type === "image";
                  return (
                    <div
                      key={i}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "#fafafa",
                      }}
                    >
                      {isImage ? (
                        <div>
                          <img
                            src={url}
                            alt={`File ${i + 1}`}
                            style={{
                              width: "100%",
                              maxHeight: 340,
                              objectFit: "contain",
                              display: "block",
                              background: "#f3f4f6",
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                          <div
                            style={{
                              padding: ".5rem .75rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: ".5rem",
                              borderTop: "1px solid #e5e7eb",
                            }}
                          >
                            <span
                              style={{
                                fontSize: ".75rem",
                                color: "#6b7280",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                              }}
                            >
                              {getFileName(url)}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                gap: ".5rem",
                                flexShrink: 0,
                              }}
                            >
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: ".72rem",
                                  color: "#7c3aed",
                                  fontWeight: 600,
                                  textDecoration: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <IC.Eye /> Open
                              </a>
                              <button
                                onClick={() =>
                                  handleDownload(url, getFileName(url))
                                }
                                style={{
                                  fontSize: ".72rem",
                                  color: "#16a34a",
                                  fontWeight: 600,
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontFamily: "inherit",
                                  padding: 0,
                                }}
                              >
                                <IC.Download /> Download
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: ".75rem 1rem",
                            display: "flex",
                            alignItems: "center",
                            gap: ".75rem",
                          }}
                        >
                          <div style={{ color: "#7c3aed", flexShrink: 0 }}>
                            <IC.File />
                          </div>
                          <span
                            style={{
                              fontSize: ".8rem",
                              color: "#374151",
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getFileName(url)}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              gap: ".5rem",
                              flexShrink: 0,
                            }}
                          >
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: ".72rem",
                                color: "#7c3aed",
                                fontWeight: 600,
                                textDecoration: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <IC.Eye /> View
                            </a>
                            <button
                              onClick={() =>
                                handleDownload(url, getFileName(url))
                              }
                              style={{
                                fontSize: ".72rem",
                                color: "#16a34a",
                                fontWeight: 600,
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                fontFamily: "inherit",
                                padding: 0,
                              }}
                            >
                              <IC.Download /> Download
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CompletedBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "#dcfce7",
        color: "#16a34a",
        border: "1.5px solid #bbf7d0",
        padding: "4px 10px",
        borderRadius: 99,
        fontSize: ".72rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <IC.Check /> Completed <IC.Lock />
    </span>
  );
}
function CancelledBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "#fee2e2",
        color: "#991b1b",
        border: "1.5px solid #fecaca",
        padding: "4px 10px",
        borderRadius: 99,
        fontSize: ".72rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <IC.XCircle /> Cancelled <IC.Lock />
    </span>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    totalRevenue: "0.00",
    inProgressOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [deletedOrders, setDeletedOrders] = useState<DeletedOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pricingStr, setPricingStr] = useState<PricingStr>({
    print_bw: "1",
    print_color: "2",
    photocopying: "2",
    scanning: "5",
    photo_development: "15",
    laminating: "20",
  });
  const [orderFilter, setOrderFilter] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [filesOrder, setFilesOrder] = useState<Order | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSeen, setNotifSeen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifCount = stats.pendingOrders;
  const showBadge = notifCount > 0 && !notifSeen;
  const [reportPeriod, setReportPeriod] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [reportDate, setReportDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [reportLoading, setReportLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportSummary, setReportSummary] = useState({
    totalOrders: 0,
    totalRevenue: "0.00",
    newCustomers: 0,
    completionRate: 0,
  });
  const [reportChartData, setReportChartData] = useState<
    { label: string; Revenue: number; Orders: number }[]
  >([]);

  useEffect(() => {
    if (!notifOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  useEffect(() => {
    setNotifSeen(false);
  }, [stats.pendingOrders]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/stats");
      const d = await r.json();
      if (d.success) setStats(d.data);
    } catch {}
  }, []);

  const fetchOrders = useCallback(async (status = "") => {
    setOrdersLoading(true);
    try {
      const url = status
        ? `/api/admin/orders?status=${status}`
        : "/api/admin/orders";
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) setOrders(d.data);
    } catch {}
    setOrdersLoading(false);
  }, []);

  const fetchDeletedOrders = useCallback(async () => {
    setDeletedLoading(true);
    try {
      const r = await fetch("/api/admin/deleted-orders");
      const d = await r.json();
      if (d.success) setDeletedOrders(d.data);
    } catch {}
    setDeletedLoading(false);
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/customers");
      const d = await r.json();
      if (d.success) setCustomers(d.data);
    } catch {}
  }, []);

  const fetchPricing = useCallback(async () => {
    try {
      const r = await fetch("/api/pricing");
      const d = await r.json();
      setPricingStr({
        print_bw: String(d.print_bw ?? 1),
        print_color: String(d.print_color ?? 2),
        photocopying: String(d.photocopying ?? 2),
        scanning: String(d.scanning ?? 5),
        photo_development: String(d.photo_development ?? 15),
        laminating: String(d.laminating ?? 20),
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPricing();
  }, [fetchStats, fetchPricing]);

  useEffect(() => {
    if (section === "orders") fetchOrders(orderFilter);
    if (section === "customers") fetchCustomers();
    if (section === "deleted") fetchDeletedOrders();
    if (section === "dashboard") {
      fetchStats();
      fetchOrders("");
    }
  }, [
    section,
    orderFilter,
    fetchOrders,
    fetchStats,
    fetchCustomers,
    fetchDeletedOrders,
  ]);

  async function generateReport() {
    setReportLoading(true);
    try {
      const res = await fetch(
        `/api/admin/stats?period=${reportPeriod}&date=${reportDate}`,
      );
      const d = await res.json();
      if (d.success && d.reportData) {
        setReportSummary(d.reportData);
        setReportChartData(d.chartData || []);
      } else {
        // Fallback: use real stats and show totals at the midpoint so chart is visible
        const completionRate =
          stats.totalOrders > 0
            ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
            : 0;
        const totalRev = parseFloat(stats.totalRevenue) || 0;
        setReportSummary({
          totalOrders: stats.totalOrders,
          totalRevenue: stats.totalRevenue,
          newCustomers: stats.totalCustomers,
          completionRate,
        });
        const slots =
          reportPeriod === "daily" ? 24 : reportPeriod === "weekly" ? 7 : 30;
        const labels = Array.from({ length: slots }, (_, i) =>
          reportPeriod === "daily"
            ? `${String(i).padStart(2, "0")}:00`
            : reportPeriod === "weekly"
              ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i % 7]
              : `Day ${i + 1}`,
        );
        const chartData = labels.map((label) => ({
          label,
          Revenue: 0,
          Orders: 0,
        }));
        // Place real totals at the midpoint so the chart shows visible data
        if (stats.totalOrders > 0 || totalRev > 0) {
          const mid = Math.floor(slots / 2);
          chartData[mid] = {
            label: chartData[mid].label,
            Revenue: totalRev,
            Orders: stats.totalOrders,
          };
        }
        setReportChartData(chartData);
      }
      setReportGenerated(true);
    } catch {
      showToast("Failed to generate report", "error");
    }
    setReportLoading(false);
  }

  async function updateOrderStatus(orderId: string, status: string) {
    if (!orderId) {
      showToast("Invalid order ID", "error");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("order_id", orderId);
      fd.append("status", status);
      const r = await fetch("/api/admin/orders", { method: "PATCH", body: fd }); // ✅ PATCH to correct route
      const d = await r.json();
      if (d.success) {
        showToast("Status updated!");
        fetchOrders(orderFilter);
        fetchStats();
      } else showToast(d.message || "Update failed", "error");
    } catch {
      showToast("Network error", "error");
    }
  }

  async function deleteOrder(orderId: string) {
    if (!orderId) {
      showToast("Invalid order ID", "error");
      return;
    }
    if (
      !confirm("Delete this order? It will be saved in Deleted Transactions.")
    )
      return;
    try {
      const r = await fetch(`/api/admin/orders?order_id=${orderId}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (d.success) {
        showToast("Order deleted and archived!");
        fetchOrders(orderFilter);
        fetchStats();
      } else showToast(d.message || "Delete failed", "error");
    } catch {
      showToast("Network error", "error");
    }
  }

  async function savePricing(e: React.FormEvent) {
    e.preventDefault();
    setPricingSaving(true);
    const pricing = pricingStrToNum(pricingStr);
    try {
      const r = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing),
      });
      const d = await r.json();
      if (d.success) {
        showToast("Pricing updated!");
        fetchPricing();
      } else showToast(d.message || "Failed", "error");
    } catch {
      showToast("Network error", "error");
    }
    setPricingSaving(false);
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

  const sColor: Record<string, string> = {
    pending: "#eab308",
    "in-progress": "#3b82f6",
    completed: "#22c55e",
    cancelled: "#ef4444",
  };
  const sBg: Record<string, string> = {
    pending: "#fef9c3",
    "in-progress": "#dbeafe",
    completed: "#dcfce7",
    cancelled: "#fee2e2",
  };

  const navItems: { id: Section; icon: React.ReactNode; label: string }[] = [
    { id: "dashboard", icon: <IC.Grid />, label: "Dashboard" },
    { id: "orders", icon: <IC.Clipboard />, label: "Manage Orders" },
    { id: "customers", icon: <IC.Users />, label: "Customers" },
    { id: "reports", icon: <IC.BarChart />, label: "Reports" },
    { id: "settings", icon: <IC.Settings />, label: "Settings" },
    { id: "deleted", icon: <IC.Trash />, label: "Deleted Transactions" },
  ];

  const filterOpts = [
    { val: "", label: "All" },
    { val: "pending", label: "Pending" },
    { val: "in-progress", label: "In Progress" },
    { val: "completed", label: "Completed" },
    { val: "cancelled", label: "Cancelled" },
  ];

  const pricingFields = [
    { key: "print_bw", label: "Print B&W / page" },
    { key: "print_color", label: "Print Color / page" },
    { key: "photocopying", label: "Photocopy / page" },
    { key: "scanning", label: "Scanning / page" },
    { key: "photo_development", label: "Photo Dev / photo" },
    { key: "laminating", label: "Laminating / item" },
  ];

  function StatusCell({ o }: { o: Order }) {
    if (o.status === "completed") return <CompletedBadge />;
    if (o.status === "cancelled") return <CancelledBadge />;
    return (
      <div className="status-sel-wrap">
        <select
          className="status-sel"
          value={o.status}
          onChange={(e) => updateOrderStatus(getOrderId(o), e.target.value)}
          style={{
            color: sColor[o.status] || "#374151",
            borderColor: sBg[o.status] || "#e5e7eb",
            background: sBg[o.status] || "#fff",
          }}
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    );
  }

  // Report stat cards with icons
  const reportStatCards = [
    {
      label: "Total Orders",
      value: reportGenerated ? reportSummary.totalOrders : stats.totalOrders,
      ico: <IC.Package />,
      c: "#2563eb",
    },
    {
      label: "Total Revenue",
      value: `₱${reportGenerated ? reportSummary.totalRevenue : stats.totalRevenue}`,
      ico: <IC.Coin />,
      c: "#7c3aed",
    },
    {
      label: "New Customers",
      value: reportGenerated
        ? reportSummary.newCustomers
        : stats.totalCustomers,
      ico: <IC.People />,
      c: "#16a34a",
    },
    {
      label: "Completion Rate",
      value: `${reportGenerated ? reportSummary.completionRate : stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%`,
      ico: <IC.CheckCircle />,
      c: "#eab308",
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--active:#7c3aed;--grad:linear-gradient(135deg,#5b6dee 0%,#7c3aed 50%,#a855f7 100%);--surface:#fff;--bg:#f3f4f6;--border:#e5e7eb;--text:#111827;--muted:#6b7280;--sw:235px;--hh:56px;--r:12px}
        html,body{height:100%}
        body{font-family:'Inter',sans-serif;background:var(--bg);min-height:100dvh}
        .shell{display:flex;height:100dvh;overflow:hidden}
        .sidebar{width:var(--sw);background:#ffffff;border-right:1px solid #e5e7eb;box-shadow:2px 0 12px rgba(0,0,0,.06);display:flex;flex-direction:column;height:100%;flex-shrink:0;z-index:200;transition:transform .28s cubic-bezier(.4,0,.2,1)}
        .sb-brand{display:flex;align-items:center;gap:.6rem;padding:.9rem .95rem .8rem;background:#2563eb}
        .sb-icon{width:34px;height:34px;background:rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
        .sb-name{font-size:.88rem;font-weight:700;color:#fff;line-height:1.25}
        .sb-sub{font-size:.58rem;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.08em}
        .sb-nav{flex:1;padding:.65rem .6rem;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
        .nav-btn{display:flex;align-items:center;gap:.55rem;padding:.58rem .75rem;border-radius:8px;color:#6b7280;font-size:.83rem;font-weight:500;cursor:pointer;border:none;background:none;width:100%;text-align:left;transition:background .15s,color .15s;-webkit-tap-highlight-color:transparent}
        .nav-btn:hover{background:#f3f4f6;color:#7c3aed}
        .nav-btn.active{background:#ede9fe;color:#7c3aed;font-weight:600}
        .sb-foot{padding:.55rem;border-top:1px solid #e5e7eb}
        .logout-btn{display:flex;align-items:center;gap:.55rem;padding:.58rem .75rem;border-radius:8px;color:#9ca3af;font-size:.82rem;font-weight:500;cursor:pointer;border:none;background:none;width:100%;text-align:left;transition:background .15s,color .15s;-webkit-tap-highlight-color:transparent}
        .logout-btn:hover{background:#fee2e2;color:#ef4444}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .header{height:var(--hh);background:var(--grad);display:flex;align-items:center;justify-content:space-between;padding:0 1rem;flex-shrink:0;box-shadow:0 2px 12px rgba(91,109,238,.25)}
        .hdr-l{display:flex;align-items:center;gap:.55rem;min-width:0}
        .hdr-title{font-size:.98rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .hamburger{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.9);padding:6px;min-width:40px;min-height:40px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;flex-shrink:0}
        .hdr-r{display:flex;align-items:center;gap:.5rem;flex-shrink:0}
        .notif-wrapper{position:relative}
        .notif-btn{position:relative;background:rgba(255,255,255,.15);border:none;border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;transition:background .15s;-webkit-tap-highlight-color:transparent}
        .notif-btn:hover{background:rgba(255,255,255,.25)}
        .notif-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:.58rem;font-weight:700;min-width:16px;height:16px;border-radius:99px;display:flex;align-items:center;justify-content:center;padding:0 3px;animation:badgePop .25s ease}
        .notif-dropdown{position:absolute;top:calc(100% + 10px);right:0;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.13);width:310px;z-index:999;overflow:hidden;animation:fadeIn .18s ease}
        .notif-dropdown-head{padding:.65rem 1rem;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}
        .notif-dropdown-title{font-weight:700;font-size:.84rem;color:#111827}
        .notif-count-badge{background:#fef9c3;color:#92400e;font-size:.65rem;font-weight:700;padding:2px 8px;border-radius:99px}
        .notif-list{max-height:280px;overflow-y:auto}
        .notif-item{padding:.6rem 1rem;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background .15s;display:flex;justify-content:space-between;align-items:center;gap:.5rem}
        .notif-item:hover{background:#f9fafb}
        .notif-item:last-child{border-bottom:none}
        .notif-item-id{font-weight:600;font-size:.8rem;color:#111827}
        .notif-item-meta{font-size:.72rem;color:#6b7280;margin-top:1px}
        .notif-item-amount{font-size:.78rem;font-weight:700;color:#111827;flex-shrink:0}
        .notif-empty{padding:1.25rem;text-align:center;color:#9ca3af;font-size:.8rem}
        .notif-footer{padding:.6rem 1rem;text-align:center;font-size:.76rem;font-weight:600;color:#7c3aed;border-top:1px solid #e5e7eb;cursor:pointer;transition:background .15s}
        .notif-footer:hover{background:#f5f3ff}
        .welcome{font-size:.78rem;color:rgba(255,255,255,.85);font-weight:500;white-space:nowrap}
        .avatar{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.72rem;font-weight:700;border:2px solid rgba(255,255,255,.4);flex-shrink:0}
        .content{flex:1;overflow-y:auto;overflow-x:hidden;padding:1rem;background:var(--bg)}
        .panel{display:none}.panel.active{display:block}
        .banner{background:var(--grad);border-radius:var(--r);padding:.85rem 1rem;margin-bottom:.9rem;display:flex;align-items:center;gap:.5rem;box-shadow:0 4px 20px rgba(91,109,238,.3)}
        .banner-title{font-size:.9rem;font-weight:700;color:#fff;display:flex;align-items:center;gap:.45rem}
        .stats-wrap{background:var(--grad);border-radius:var(--r);padding:.75rem .9rem 1rem;margin-bottom:.9rem;box-shadow:0 4px 20px rgba(91,109,238,.3)}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.65rem}
        .stat-card{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:.75rem .5rem;display:flex;flex-direction:column;align-items:center;text-align:center;backdrop-filter:blur(6px);transition:background .2s}
        .stat-card:hover{background:rgba(255,255,255,.2)}
        .stat-ico{display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.85);margin-bottom:.28rem}
        .stat-val{font-size:1.35rem;font-weight:700;color:#fff;letter-spacing:-.03em;line-height:1}
        .stat-lbl{font-size:.6rem;color:rgba(255,255,255,.65);margin-top:3px}
        .card{background:var(--surface);border-radius:var(--r);border:1px solid var(--border);overflow:hidden;margin-bottom:.9rem;box-shadow:0 1px 3px rgba(0,0,0,.06)}
        .card-head{padding:.7rem .95rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.6rem}
        .card-head-title{font-size:.88rem;font-weight:600;color:var(--text)}
        .chart-card{background:var(--surface);border-radius:var(--r);border:1px solid var(--border);padding:1rem 1.1rem;margin-bottom:.9rem}
        .chart-title{font-size:.88rem;font-weight:600;color:var(--text);margin-bottom:1rem}
        .tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%}
        table{width:100%;border-collapse:collapse;min-width:700px}
        thead{background:#f9fafb}
        th{padding:.52rem .8rem;text-align:left;font-size:.62rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
        td{padding:.65rem .8rem;font-size:.82rem;color:var(--text);border-bottom:1px solid var(--border);vertical-align:middle}
        tr:last-child td{border-bottom:none}
        tbody tr:hover{background:#f9fafb}
        .action-btn{display:inline-flex;align-items:center;gap:5px;padding:.32rem .65rem;border-radius:6px;font-size:.72rem;font-weight:600;cursor:pointer;border:1.5px solid;transition:all .15s;white-space:nowrap;font-family:'Inter',sans-serif;text-decoration:none}
        .action-btn-details{background:#eff6ff;color:#2563eb;border-color:#bfdbfe}
        .action-btn-details:hover{background:#dbeafe}
        .action-btn-files{background:#f5f3ff;color:#7c3aed;border-color:#ddd6fe}
        .action-btn-files:hover{background:#ede9fe}
        .action-btns{display:flex;gap:.35rem;flex-wrap:wrap}
        .m-card{padding:.65rem .9rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;transition:background .15s}
        .m-card:last-child{border-bottom:none}
        .m-card:hover{background:#f9fafb}
        .m-card-main{min-width:0;flex:1}
        .m-id{font-weight:700;font-size:.78rem;color:var(--text)}
        .m-name{font-size:.76rem;font-weight:500;color:var(--text);margin-top:1px}
        .m-meta{font-size:.68rem;color:var(--muted);margin-top:2px;line-height:1.4}
        .m-card-right{text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:.3rem}
        .m-amount{font-size:.78rem;font-weight:700;color:var(--text)}
        .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:.63rem;font-weight:600;white-space:nowrap}
        .pickup-badge{display:inline-flex;align-items:center;gap:3px;background:#f5f3ff;color:#7c3aed;font-size:.65rem;font-weight:600;padding:2px 7px;border-radius:99px;white-space:nowrap;border:1px solid #ddd6fe}
        .status-sel-wrap{position:relative;display:inline-block;max-width:130px;width:100%}
        .status-sel-wrap::after{content:'▾';position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:.7rem;color:var(--muted);pointer-events:none}
        .status-sel{padding:3px 24px 3px 7px;border-radius:6px;border:1.5px solid var(--border);font-size:.76rem;font-family:'Inter',sans-serif;color:var(--text);background:#fff;cursor:pointer;outline:none;width:100%;-webkit-appearance:none;appearance:none}
        .status-sel:focus{border-color:#7c3aed}
        .filter-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem;flex-wrap:wrap;gap:.55rem}
        .filter-title{font-size:.98rem;font-weight:700;color:var(--text)}
        .filter-chips{display:flex;gap:.28rem;flex-wrap:wrap}
        .fchip{padding:.26rem .7rem;border-radius:99px;border:1.5px solid var(--border);font-size:.68rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;background:#fff;color:var(--muted);-webkit-tap-highlight-color:transparent}
        .fchip.active{background:#7c3aed;border-color:#7c3aed;color:#fff}
        .fchip:hover:not(.active){border-color:#7c3aed;color:#7c3aed}
        .btn{padding:.52rem 1rem;border-radius:8px;font-family:'Inter',sans-serif;font-size:.82rem;font-weight:600;cursor:pointer;border:none;transition:all .15s;display:inline-flex;align-items:center;gap:.38rem;-webkit-tap-highlight-color:transparent}
        .btn-primary{background:linear-gradient(135deg,#5b6dee,#7c3aed);color:#fff;box-shadow:0 4px 12px rgba(91,109,238,.3)}
        .btn-primary:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
        .btn-primary:disabled{opacity:.55;cursor:not-allowed;transform:none}
        .btn-danger{background:#ef4444;color:#fff}
        .btn-danger:hover:not(:disabled){background:#dc2626}
        .btn-danger:disabled{opacity:.3;cursor:not-allowed}
        .btn-sm{padding:.35rem .7rem;font-size:.75rem}
        .form-group{margin-bottom:.85rem}
        .form-label{display:block;font-size:.64rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text);margin-bottom:.32rem}
        .form-input{width:100%;padding:.58rem .78rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Inter',sans-serif;font-size:max(16px,.875rem);color:var(--text);background:#fff;outline:none;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none}
        .form-input:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.1)}
        .form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.85rem}
        .rpt-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1rem}
        .rpt-stat-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem 1.1rem;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:box-shadow .15s;display:flex;align-items:center;gap:.85rem}
        .rpt-stat-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1)}
        .rpt-stat-ico{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .rpt-stat-lbl{font-size:.72rem;color:#6b7280;font-weight:600;margin-bottom:.35rem}
        .rpt-stat-val{font-size:1.55rem;font-weight:700;color:#111827;letter-spacing:-.03em}
        .rpt-controls{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
        .rpt-select{padding:.45rem .9rem;border-radius:8px;border:1.5px solid #e5e7eb;font-family:'Inter',sans-serif;font-size:.83rem;color:#374151;background:#fff;cursor:pointer;outline:none;transition:border-color .2s;-webkit-appearance:none;appearance:none;padding-right:2rem;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .6rem center}
        .rpt-select:focus{border-color:#7c3aed}
        .rpt-date{padding:.45rem .9rem;border-radius:8px;border:1.5px solid #e5e7eb;font-family:'Inter',sans-serif;font-size:.83rem;color:#374151;background:#fff;outline:none;transition:border-color .2s}
        .rpt-date:focus{border-color:#7c3aed}
        .rpt-chart-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1.1rem 1.1rem 1.3rem;margin-bottom:1rem}
        .rpt-chart-title{font-size:.84rem;font-weight:600;color:#111827;margin-bottom:.9rem;display:flex;align-items:center;gap:.4rem}
        .rpt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:220px;color:#9ca3af;font-size:.84rem;gap:.5rem}
        .sb-overlay{display:none;position:fixed;inset:0;background:rgba(30,27,75,.5);z-index:190}
        .sb-overlay.on{display:block}
        .empty-state{padding:2.5rem;text-align:center;color:var(--muted);font-size:.84rem}
        @media(min-width:1025px){.hamburger{display:none}.welcome{display:block}}
        @media(max-width:1024px){.sidebar{position:fixed;top:0;left:0;height:100%;transform:translateX(-100%)}.sidebar.open{transform:translateX(0);box-shadow:4px 0 30px rgba(0,0,0,.25)}.hamburger{display:flex}}
        @media(max-width:900px){.stats-grid{grid-template-columns:repeat(2,1fr)}.form-grid{grid-template-columns:repeat(2,1fr)}.rpt-stat-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:768px){.welcome{display:none}.notif-dropdown{width:280px;right:-8px}}
        @media(max-width:600px){.content{padding:.65rem}.desktop-tbl{display:none}.mobile-cards{display:block}.stats-wrap{padding:.6rem .7rem .8rem}.rpt-stat-grid{grid-template-columns:repeat(2,1fr)}.rpt-controls{gap:.4rem}}
        @media(min-width:601px){.mobile-cards{display:none}.desktop-tbl{display:block}}
        @media(max-width:400px){.stats-grid{grid-template-columns:repeat(2,1fr);gap:.4rem}.form-grid{grid-template-columns:1fr}.stat-val{font-size:1.1rem}.rpt-stat-grid{grid-template-columns:1fr 1fr}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes badgePop{from{transform:scale(0)}to{transform:scale(1)}}
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {detailsOrder && (
        <DetailsModal
          order={detailsOrder}
          onClose={() => setDetailsOrder(null)}
        />
      )}
      {filesOrder && (
        <FilesModal order={filesOrder} onClose={() => setFilesOrder(null)} />
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
            <div>
              <div className="sb-name">Admin Dashboard</div>
              <div className="sb-sub">Jonayskie Prints</div>
            </div>
          </div>
          <nav className="sb-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`nav-btn ${section === item.id ? "active" : ""}`}
                onClick={() => {
                  setSection(item.id);
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
            <div className="hdr-l">
              <button
                className="hamburger"
                onClick={() => setSidebarOpen(true)}
                aria-label="Menu"
              >
                <IC.Menu />
              </button>
              <div className="hdr-title">Admin Dashboard</div>
            </div>
            <div className="hdr-r">
              <div className="notif-wrapper" ref={notifRef}>
                <button
                  className="notif-btn"
                  aria-label="Notifications"
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setNotifSeen(true);
                  }}
                >
                  <IC.Bell />
                  {showBadge && (
                    <span className="notif-badge">
                      {notifCount > 99 ? "99+" : notifCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="notif-dropdown">
                    <div className="notif-dropdown-head">
                      <span className="notif-dropdown-title">
                        Pending Orders
                      </span>
                      <span className="notif-count-badge">
                        {notifCount} pending
                      </span>
                    </div>
                    <div className="notif-list">
                      {orders.filter((o) => o.status === "pending").length ===
                      0 ? (
                        <div className="notif-empty">No pending orders 🎉</div>
                      ) : (
                        orders
                          .filter((o) => o.status === "pending")
                          .map((o) => (
                            <div
                              key={o._id}
                              className="notif-item"
                              onClick={() => {
                                setSection("orders");
                                setOrderFilter("pending");
                                setNotifOpen(false);
                              }}
                            >
                              <div>
                                <div className="notif-item-id">
                                  #{getOrderDisplay(o)}
                                </div>
                                <div className="notif-item-meta">
                                  {o.user_name} · {o.service}
                                  {o.pickup_time && (
                                    <span
                                      style={{
                                        marginLeft: 4,
                                        color: "#7c3aed",
                                      }}
                                    >
                                      · 🕐 {formatPickupTime(o.pickup_time)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="notif-item-amount">
                                ₱{Number(o.total_amount).toFixed(2)}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                    <div
                      className="notif-footer"
                      onClick={() => {
                        setSection("orders");
                        setOrderFilter("pending");
                        setNotifOpen(false);
                      }}
                    >
                      View all pending orders →
                    </div>
                  </div>
                )}
              </div>
              <span className="welcome">Welcome, Admin</span>
              <div className="avatar">A</div>
            </div>
          </header>

          <main className="content">
            {/* ══ DASHBOARD ══ */}
            <section
              className={`panel ${section === "dashboard" ? "active" : ""}`}
            >
              <div className="banner">
                <div className="banner-title">
                  <IC.TrendUp /> Dashboard Overview
                </div>
              </div>
              <div className="stats-wrap">
                <div className="stats-grid">
                  {[
                    {
                      ico: <IC.Cart />,
                      val: stats.totalOrders,
                      lbl: "Total Orders",
                    },
                    {
                      ico: <IC.Clock />,
                      val: stats.pendingOrders,
                      lbl: "Pending",
                    },
                    {
                      ico: <IC.People />,
                      val: stats.totalCustomers,
                      lbl: "Customers",
                    },
                    {
                      ico: <IC.CreditCard />,
                      val: `₱${stats.totalRevenue}`,
                      lbl: "Revenue",
                    },
                  ].map((s) => (
                    <div key={s.lbl} className="stat-card">
                      <div className="stat-ico">{s.ico}</div>
                      <div className="stat-val">{s.val}</div>
                      <div className="stat-lbl">{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="chart-card">
                <div className="chart-title">Orders Overview</div>
                {(() => {
                  const total =
                    stats.pendingOrders +
                    stats.inProgressOrders +
                    stats.completedOrders +
                    stats.cancelledOrders;
                  if (total === 0)
                    return (
                      <div
                        style={{
                          textAlign: "center",
                          color: "#9ca3af",
                          padding: "2rem 1rem",
                          fontSize: ".84rem",
                        }}
                      >
                        No order data yet
                      </div>
                    );
                  const segs = [
                    {
                      label: "Pending",
                      value: stats.pendingOrders,
                      color: "#eab308",
                    },
                    {
                      label: "In Progress",
                      value: stats.inProgressOrders,
                      color: "#3b82f6",
                    },
                    {
                      label: "Completed",
                      value: stats.completedOrders,
                      color: "#22c55e",
                    },
                    {
                      label: "Cancelled",
                      value: stats.cancelledOrders,
                      color: "#ef4444",
                    },
                  ];
                  const r = 80,
                    cx = 110,
                    cy = 110,
                    sw = 38,
                    circ = 2 * Math.PI * r;
                  let off = 0;
                  const arcs = segs.map((s) => {
                    const dash = (s.value / total) * circ,
                      gap = circ - dash,
                      so = circ - off;
                    off += dash;
                    return { ...s, dash, gap, so };
                  });
                  return (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: ".9rem",
                      }}
                    >
                      <svg
                        width={220}
                        height={220}
                        viewBox="0 0 220 220"
                        style={{ maxWidth: "100%", height: "auto" }}
                      >
                        {arcs.map((a, i) => (
                          <circle
                            key={i}
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill="none"
                            stroke={a.color}
                            strokeWidth={sw}
                            strokeDasharray={`${a.dash} ${a.gap}`}
                            strokeDashoffset={a.so}
                            style={{ transition: "stroke-dasharray .6s ease" }}
                          />
                        ))}
                        <text
                          x={cx}
                          y={cy - 6}
                          textAnchor="middle"
                          fontSize="22"
                          fontWeight="700"
                          fill="#111827"
                        >
                          {total}
                        </text>
                        <text
                          x={cx}
                          y={cy + 14}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#6b7280"
                        >
                          Total Orders
                        </text>
                      </svg>
                      <div
                        style={{
                          display: "flex",
                          gap: ".75rem",
                          flexWrap: "wrap",
                          justifyContent: "center",
                        }}
                      >
                        {segs.map((s) => (
                          <div
                            key={s.label}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: ".76rem",
                              color: "#374151",
                            }}
                          >
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: s.color,
                                flexShrink: 0,
                              }}
                            />
                            {s.label}{" "}
                            <span style={{ color: "#9ca3af" }}>
                              ({s.value})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="card">
                <div className="card-head">
                  <div className="card-head-title">Recent Orders</div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setSection("orders")}
                  >
                    View All <IC.ArrowRight />
                  </button>
                </div>
                <div className="desktop-tbl">
                  <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Service</th>
                          <th>Pickup Time</th>
                          <th>Status</th>
                          <th>Amount</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="empty-state">
                              No orders yet
                            </td>
                          </tr>
                        ) : (
                          orders.slice(0, 5).map((o) => (
                            <tr key={o._id || o.order_id}>
                              <td style={{ fontWeight: 600 }}>
                                #{getOrderDisplay(o)}
                              </td>
                              <td>
                                <div style={{ fontWeight: 500 }}>
                                  {o.user_name}
                                </div>
                                <div
                                  style={{
                                    fontSize: ".7rem",
                                    color: "#9ca3af",
                                  }}
                                >
                                  {o.user_email}
                                </div>
                              </td>
                              <td>{o.service}</td>
                              <td>
                                {o.delivery_option === "pickup" &&
                                o.pickup_time ? (
                                  <span className="pickup-badge">
                                    <IC.ClockSmall />
                                    {formatPickupTime(o.pickup_time)}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      color: "#9ca3af",
                                      fontSize: ".75rem",
                                    }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                              <td>
                                <span
                                  className="badge"
                                  style={{
                                    background: sBg[o.status] || "#f3f4f6",
                                    color: sColor[o.status] || "#374151",
                                  }}
                                >
                                  {o.status}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                ₱{Number(o.total_amount).toFixed(2)}
                              </td>
                              <td style={{ color: "#9ca3af" }}>
                                {new Date(o.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mobile-cards">
                  {orders.slice(0, 5).map((o) => (
                    <div key={o._id || o.order_id} className="m-card">
                      <div className="m-card-main">
                        <div className="m-id">#{getOrderDisplay(o)}</div>
                        <div className="m-name">{o.user_name}</div>
                        <div className="m-meta">
                          {o.service} ·{" "}
                          {new Date(o.created_at).toLocaleDateString()}
                          {o.delivery_option === "pickup" && o.pickup_time && (
                            <span style={{ marginLeft: 4, color: "#7c3aed" }}>
                              · 🕐 {formatPickupTime(o.pickup_time)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="m-card-right">
                        <div className="m-amount">
                          ₱{Number(o.total_amount).toFixed(2)}
                        </div>
                        <span
                          className="badge"
                          style={{
                            background: sBg[o.status] || "#f3f4f6",
                            color: sColor[o.status] || "#374151",
                          }}
                        >
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══ MANAGE ORDERS ══ */}
            <section
              className={`panel ${section === "orders" ? "active" : ""}`}
            >
              <div className="filter-bar">
                <div className="filter-title">Manage Orders</div>
                <div className="filter-chips">
                  {filterOpts.map(({ val, label }) => (
                    <button
                      key={val}
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
                  <div className="empty-state">Loading orders…</div>
                ) : orders.length === 0 ? (
                  <div className="empty-state">No orders found</div>
                ) : (
                  <>
                    <div className="desktop-tbl">
                      <div className="tbl-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Customer</th>
                              <th>Service</th>
                              <th>Qty</th>
                              <th>Delivery</th>
                              <th>Pickup Time</th>
                              <th>Amount</th>
                              <th>Details</th>
                              <th>Files</th>
                              <th>Status</th>
                              <th>Date</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((o, i) => (
                              <tr key={o._id || o.order_id || i}>
                                <td style={{ fontWeight: 600 }}>
                                  #{getOrderDisplay(o)}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 500 }}>
                                    {o.user_name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: ".68rem",
                                      color: "#9ca3af",
                                    }}
                                  >
                                    {o.user_email}
                                  </div>
                                </td>
                                <td>{o.service}</td>
                                <td>{o.quantity}</td>
                                <td style={{ textTransform: "capitalize" }}>
                                  {o.delivery_option}
                                </td>
                                <td>
                                  {o.delivery_option === "pickup" &&
                                  o.pickup_time ? (
                                    <span className="pickup-badge">
                                      <IC.ClockSmall />
                                      {formatPickupTime(o.pickup_time)}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        color: "#9ca3af",
                                        fontSize: ".75rem",
                                      }}
                                    >
                                      —
                                    </span>
                                  )}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  ₱{Number(o.total_amount).toFixed(2)}
                                </td>
                                <td>
                                  <button
                                    className="action-btn action-btn-details"
                                    onClick={() => setDetailsOrder(o)}
                                  >
                                    <IC.Eye /> View Details
                                  </button>
                                </td>
                                <td>
                                  <button
                                    className="action-btn action-btn-files"
                                    onClick={() => setFilesOrder(o)}
                                  >
                                    <IC.File />
                                    {o.files && o.files.length > 0
                                      ? `View (${o.files.length})`
                                      : "View"}
                                  </button>
                                </td>
                                <td>
                                  <StatusCell o={o} />
                                </td>
                                <td
                                  style={{
                                    color: "#9ca3af",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {new Date(o.created_at).toLocaleDateString()}
                                </td>
                                <td>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => deleteOrder(getOrderId(o))}
                                    disabled={
                                      o.status === "completed" ||
                                      o.status === "cancelled"
                                    }
                                  >
                                    <IC.Trash />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="mobile-cards">
                      {orders.map((o, i) => (
                        <div key={o._id || o.order_id || i} className="m-card">
                          <div className="m-card-main">
                            <div className="m-id">
                              #{getOrderDisplay(o)} — {o.service}
                            </div>
                            <div className="m-name">{o.user_name}</div>
                            <div className="m-meta">
                              Qty: {o.quantity} · {o.delivery_option} ·{" "}
                              {new Date(o.created_at).toLocaleDateString()}
                              {o.delivery_option === "pickup" &&
                                o.pickup_time && (
                                  <span
                                    style={{
                                      marginLeft: 4,
                                      color: "#7c3aed",
                                      fontWeight: 600,
                                    }}
                                  >
                                    · 🕐 {formatPickupTime(o.pickup_time)}
                                  </span>
                                )}
                            </div>
                            <div
                              className="action-btns"
                              style={{ marginTop: ".45rem" }}
                            >
                              <button
                                className="action-btn action-btn-details"
                                onClick={() => setDetailsOrder(o)}
                              >
                                <IC.Eye /> Details
                              </button>
                              <button
                                className="action-btn action-btn-files"
                                onClick={() => setFilesOrder(o)}
                              >
                                <IC.File /> Files
                                {o.files && o.files.length > 0
                                  ? ` (${o.files.length})`
                                  : ""}
                              </button>
                            </div>
                            <div style={{ marginTop: ".4rem" }}>
                              <StatusCell o={o} />
                            </div>
                          </div>
                          <div className="m-card-right">
                            <div className="m-amount">
                              ₱{Number(o.total_amount).toFixed(2)}
                            </div>
                            <span
                              className="badge"
                              style={{
                                background: sBg[o.status] || "#f3f4f6",
                                color: sColor[o.status] || "#374151",
                              }}
                            >
                              {o.status}
                            </span>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => deleteOrder(getOrderId(o))}
                              disabled={
                                o.status === "completed" ||
                                o.status === "cancelled"
                              }
                            >
                              <IC.Trash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ══ CUSTOMERS ══ */}
            <section
              className={`panel ${section === "customers" ? "active" : ""}`}
            >
              <div className="filter-bar">
                <div className="filter-title">Customers</div>
                <div style={{ fontSize: ".82rem", color: "#6b7280" }}>
                  {customers.length} customer{customers.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="card">
                {customers.length === 0 ? (
                  <div className="empty-state">No customers found</div>
                ) : (
                  <>
                    <div className="desktop-tbl">
                      <div className="tbl-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Phone</th>
                              <th>Orders</th>
                              <th>Joined</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customers.map((c) => (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 500 }}>
                                  {c.first_name} {c.last_name}
                                </td>
                                <td style={{ fontSize: ".8rem" }}>{c.email}</td>
                                <td>{c.phone || "—"}</td>
                                <td>
                                  <span
                                    className="badge"
                                    style={{
                                      background: "#ede9fe",
                                      color: "#5b21b6",
                                    }}
                                  >
                                    {c.total_orders}
                                  </span>
                                </td>
                                <td style={{ color: "#9ca3af" }}>
                                  {new Date(c.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="mobile-cards">
                      {customers.map((c) => (
                        <div key={c.id} className="m-card">
                          <div className="m-card-main">
                            <div className="m-name">
                              {c.first_name} {c.last_name}
                            </div>
                            <div className="m-meta">{c.email}</div>
                            <div className="m-meta">
                              {c.phone || "No phone"} · Joined{" "}
                              {new Date(c.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="m-card-right">
                            <span
                              className="badge"
                              style={{
                                background: "#ede9fe",
                                color: "#5b21b6",
                              }}
                            >
                              {c.total_orders} orders
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ══ REPORTS ══ */}
            <section
              className={`panel ${section === "reports" ? "active" : ""}`}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: ".6rem",
                }}
              >
                <div className="filter-title">Reports &amp; Analytics</div>
                <div className="rpt-controls">
                  <select
                    className="rpt-select"
                    value={reportPeriod}
                    onChange={(e) =>
                      setReportPeriod(
                        e.target.value as "daily" | "weekly" | "monthly",
                      )
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <input
                    type="date"
                    className="rpt-date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={generateReport}
                    disabled={reportLoading}
                  >
                    <IC.BarChart />
                    {reportLoading ? "Loading…" : "Generate Report"}
                  </button>
                </div>
              </div>

              {/* 4 stat cards with icons */}
              <div className="rpt-stat-grid">
                {reportStatCards.map((s) => (
                  <div key={s.label} className="rpt-stat-card">
                    <div
                      className="rpt-stat-ico"
                      style={{ background: s.c + "18", color: s.c }}
                    >
                      {s.ico}
                    </div>
                    <div>
                      <div className="rpt-stat-lbl">{s.label}</div>
                      <div className="rpt-stat-val">{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Line chart */}
              <div className="rpt-chart-card">
                <div className="rpt-chart-title">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  Revenue &amp; Orders Over Time
                </div>
                {!reportGenerated ? (
                  <div className="rpt-empty">
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#d1d5db"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <span>
                      Select a period and date, then click{" "}
                      <strong>Generate Report</strong>
                    </span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                      data={reportChartData}
                      margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="rev"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        width={55}
                        tickFormatter={(v) =>
                          v === 0 ? "0" : `₱${Number(v).toFixed(0)}`
                        }
                      />
                      <YAxis
                        yAxisId="ord"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          fontSize: ".78rem",
                          boxShadow: "0 4px 12px rgba(0,0,0,.1)",
                        }}
                        formatter={(
                          value: number | string | undefined,
                          name: string | undefined,
                        ): [string, string] => [
                          name === "Revenue"
                            ? `₱${Number(value ?? 0).toFixed(2)}`
                            : String(value ?? ""),
                          String(name ?? ""),
                        ]}
                      />
                      <Legend
                        iconType="rect"
                        iconSize={10}
                        formatter={(v) => (
                          <span
                            style={{ fontSize: ".73rem", color: "#374151" }}
                          >
                            {v}
                          </span>
                        )}
                      />
                      <Line
                        yAxisId="rev"
                        type="monotone"
                        dataKey="Revenue"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#3b82f6" }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        yAxisId="ord"
                        type="monotone"
                        dataKey="Orders"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#f43f5e" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* ══ SETTINGS ══ */}
            <section
              className={`panel ${section === "settings" ? "active" : ""}`}
            >
              <div className="filter-title" style={{ marginBottom: ".9rem" }}>
                Settings
              </div>
              <div className="card" style={{ padding: "1rem 1.1rem 1.3rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".45rem",
                    fontWeight: 600,
                    fontSize: ".88rem",
                    color: "var(--text)",
                    marginBottom: "1rem",
                  }}
                >
                  <IC.PriceTag /> Manage Service Pricing
                </div>
                <form onSubmit={savePricing}>
                  <div className="form-grid">
                    {pricingFields.map(({ key, label }) => (
                      <div className="form-group" key={key}>
                        <label className="form-label">{label}</label>
                        <input
                          className="form-input"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.01}
                          value={(pricingStr as any)[key]}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setPricingStr((p) => ({ ...p, [key]: raw }));
                          }}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            setPricingStr((p) => ({
                              ...p,
                              [key]: isNaN(val) ? "0" : String(val),
                            }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={pricingSaving}
                  >
                    <IC.Save /> {pricingSaving ? "Saving…" : "Save Pricing"}
                  </button>
                </form>
              </div>
            </section>

            {/* ══ DELETED TRANSACTIONS ══ */}
            <section
              className={`panel ${section === "deleted" ? "active" : ""}`}
            >
              <div className="filter-bar">
                <div className="filter-title">Deleted Transactions</div>
                <div style={{ fontSize: ".82rem", color: "#6b7280" }}>
                  {deletedOrders.length} record
                  {deletedOrders.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="card">
                {deletedLoading ? (
                  <div className="empty-state">Loading…</div>
                ) : deletedOrders.length === 0 ? (
                  <div className="empty-state">
                    No deleted transactions found
                  </div>
                ) : (
                  <>
                    <div className="desktop-tbl">
                      <div className="tbl-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Order ID</th>
                              <th>Customer</th>
                              <th>Service</th>
                              <th>Qty</th>
                              <th>Pickup Time</th>
                              <th>Amount</th>
                              <th>Last Status</th>
                              <th>Order Date</th>
                              <th>Deleted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deletedOrders.map((o, i) => (
                              <tr key={o._id || i}>
                                <td style={{ fontWeight: 600 }}>
                                  #{getOrderDisplay(o)}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 500 }}>
                                    {o.user_name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: ".7rem",
                                      color: "#9ca3af",
                                    }}
                                  >
                                    {o.user_email}
                                  </div>
                                </td>
                                <td>{o.service}</td>
                                <td>{o.quantity}</td>
                                <td>
                                  {o.delivery_option === "pickup" &&
                                  o.pickup_time ? (
                                    <span className="pickup-badge">
                                      <IC.ClockSmall />
                                      {formatPickupTime(o.pickup_time)}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        color: "#9ca3af",
                                        fontSize: ".75rem",
                                      }}
                                    >
                                      —
                                    </span>
                                  )}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  ₱{Number(o.total_amount).toFixed(2)}
                                </td>
                                <td>
                                  <span
                                    className="badge"
                                    style={{
                                      background: "#fee2e2",
                                      color: "#ef4444",
                                    }}
                                  >
                                    {o.status}
                                  </span>
                                </td>
                                <td style={{ color: "#9ca3af" }}>
                                  {new Date(o.created_at).toLocaleDateString()}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                      color: "#ef4444",
                                      fontSize: ".75rem",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <IC.Trash />{" "}
                                    {new Date(
                                      o.deleted_at,
                                    ).toLocaleDateString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="mobile-cards">
                      {deletedOrders.map((o, i) => (
                        <div key={o._id || i} className="m-card">
                          <div className="m-card-main">
                            <div className="m-id">
                              #{getOrderDisplay(o)} — {o.service}
                            </div>
                            <div className="m-name">{o.user_name}</div>
                            <div className="m-meta">
                              Qty: {o.quantity} ·{" "}
                              {new Date(o.created_at).toLocaleDateString()}
                            </div>
                            <div
                              className="m-meta"
                              style={{
                                color: "#ef4444",
                                marginTop: 2,
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <IC.Trash /> Deleted{" "}
                              {new Date(o.deleted_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="m-card-right">
                            <div className="m-amount">
                              ₱{Number(o.total_amount).toFixed(2)}
                            </div>
                            <span
                              className="badge"
                              style={{
                                background: "#fee2e2",
                                color: "#ef4444",
                              }}
                            >
                              {o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
