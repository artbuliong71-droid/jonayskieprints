"use client";

import {
  Order,
  Prices,
  parseSpecsOptions,
  formatPickupTime,
  displayId,
  badgeClass,
  sp,
  PAPER_MULTIPLIERS,
  PaperSize,
} from "./types";
import { IC, IcoGCash, IcoCash } from "./icons";

interface ViewDetailsModalProps {
  order: Order;
  files: { name: string; url: string; type: string }[];
  receipt: { url: string } | null;
  prices: Prices;
  onClose: () => void;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
}

export function ViewDetailsModal({
  order,
  files,
  receipt,
  prices,
  onClose,
  onEdit,
  onCancel,
}: ViewDetailsModalProps) {
  const statusColor = {
    completed: { bg: "#d1fae5", text: "#065f46" },
    cancelled: { bg: "#fee2e2", text: "#991b1b" },
    "in-progress": { bg: "#dbeafe", text: "#1e40af" },
    pending: { bg: "#fef3c7", text: "#92400e" },
  }[order.status] ?? { bg: "#fef3c7", text: "#92400e" };

  // Price breakdown
  const specs = order.specifications;
  const p = parseSpecsOptions(specs);
  const sl = order.service.toLowerCase().trim();
  const paperSize = (p.paperSize || "A4") as PaperSize;
  const m = PAPER_MULTIPLIERS[paperSize] ?? 1.0;
  const colorOpt = p.colorOption || "bw";
  const qty = order.quantity;
  const copies = ["print", "photocopy"].includes(sl) ? p.copies || qty : qty;
  const pageCount =
    ["print", "photocopy"].includes(sl) ? p.pageCount || files.length || 1 : qty;
  const billableQty =
    ["print", "photocopy"].includes(sl) ? copies * pageCount : qty;
  let unitPrice = 0,
    priceNote = "";
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
  if (sl === "print" || sl === "photocopy") {
    priceNote = `${pageCount} page${pageCount > 1 ? "s" : ""} x ${copies} cop${copies > 1 ? "ies" : "y"} x P${unitPrice.toFixed(2)}`;
  } else if (sl === "scanning") {
    priceNote = `${qty} page${qty > 1 ? "s" : ""} x P${unitPrice.toFixed(2)}`;
  } else if (sl === "photo development") {
    priceNote = `${qty} photo${qty > 1 ? "s" : ""} x P${unitPrice.toFixed(2)}`;
  } else if (sl === "laminating") {
    priceNote = `${qty} item${qty > 1 ? "s" : ""} x P${unitPrice.toFixed(2)}`;
  }
  const baseTotal = unitPrice * billableQty;
  const lamTotal =
    p.addLamination && sl !== "laminating"
      ? sp(prices.laminating, 20) * billableQty
      : 0;
  const grandTotal = parseFloat(order.total_amount || "0");
  const isGCash = (order.payment_method || "").toLowerCase().includes("gcash");

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        {/* Header */}
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: ".55rem" }}>
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
                Order #{displayId(order.order_id)}
              </div>
              <div
                style={{ fontSize: ".63rem", color: "#9ca3af", marginTop: 1 }}
              >
                {new Date(order.created_at).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Status banner */}
        <div
          style={{
            background: statusColor.bg,
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
              color: statusColor.text,
            }}
          >
            Status:{" "}
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
          <span className={`badge ${badgeClass(order.status)}`}>
            {order.status}
          </span>
        </div>

        {/* Service details */}
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
              ["Service", order.service],
              [
                ["print", "photocopy"].includes(sl) ? "Copies" : "Quantity",
                String(["print", "photocopy"].includes(sl) ? copies : order.quantity),
              ],
              [
                "Delivery",
                order.delivery_option.charAt(0).toUpperCase() +
                  order.delivery_option.slice(1),
              ],
              ...(order.pickup_time
                ? [["Pickup Time", formatPickupTime(order.pickup_time)]]
                : []),
              ...(order.delivery_address
                ? [["Delivery Address", order.delivery_address]]
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

        {/* Specifications */}
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
            {order.specifications || "No specifications provided."}
          </div>
        </div>

        {/* Price breakdown */}
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
                {order.service}{" "}
                <span style={{ fontSize: ".68rem", color: "#9ca3af" }}>
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
                <span style={{ fontSize: ".75rem", color: "#6b7280" }}>
                  Lamination add-on{" "}
                  <span style={{ fontSize: ".68rem", color: "#9ca3af" }}>
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
                style={{ fontSize: "1rem", fontWeight: 800, color: "#7c3aed" }}
              >
                ₱{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment method */}
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
              color: isGCash ? "#7c3aed" : "#111827",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {isGCash ? (
              <>
                <IcoGCash size={14} color="#7c3aed" /> GCash
              </>
            ) : (
              <>
                <IcoCash size={14} color="#374151" />{" "}
                {order.payment_method || "Cash"}
              </>
            )}
          </span>
        </div>

        {/* Uploaded files */}
        {files.length > 0 && (
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
              Uploaded Files
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {files.map((f, i) => {
                const ext = f.name?.split(".").pop()?.toLowerCase() ?? "";
                const isViewable = [
                  "jpg",
                  "jpeg",
                  "png",
                  "gif",
                  "webp",
                  "pdf",
                ].includes(ext);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".55rem",
                      background: "#f9fafb",
                      border: "1.5px solid #e5e7eb",
                      borderRadius: 8,
                      padding: ".5rem .75rem",
                    }}
                  >
                    <IC.PDF />
                    <span
                      style={{
                        flex: 1,
                        fontSize: ".78rem",
                        color: "#374151",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.name}
                    </span>
                    <span
                      style={{
                        fontSize: ".6rem",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "#ede9fe",
                        color: "#7c3aed",
                      }}
                    >
                      {ext.toUpperCase()}
                    </span>
                    {isViewable && (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#7c3aed",
                          background: "#ede9fe",
                          border: "none",
                          borderRadius: 4,
                          padding: "3px 7px",
                          fontSize: ".7rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <IC.Eye /> View
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GCash receipt */}
        {receipt && (
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
              GCash Payment Receipt
            </div>
            <div
              style={{
                background: "#f5f3ff",
                border: "1.5px solid #ddd6fe",
                borderRadius: 10,
                padding: ".75rem",
                textAlign: "center",
              }}
            >
              <img
                src={receipt.url}
                alt="GCash receipt"
                style={{
                  maxWidth: "100%",
                  maxHeight: 280,
                  borderRadius: 8,
                  border: "1.5px solid #ddd6fe",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div style={{ marginTop: ".5rem" }}>
                <a
                  href={receipt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#7c3aed",
                    fontSize: ".75rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <IC.Eye /> Open full receipt
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {order.status === "pending" ? (
          <div style={{ display: "flex", gap: ".6rem" }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => {
                onClose();
                onEdit(order.order_id);
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
                onClose();
                onCancel(order.order_id);
              }}
            >
              <IC.XCircle /> Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-full" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
