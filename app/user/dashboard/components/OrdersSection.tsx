"use client";

import { Order } from "./types";
import { IC } from "./icons";
import { displayId, badgeClass, formatPickupTime } from "./types";

export function OrdersSection({
  orders,
  loading,
  filter,
  onFilterChange,
  onView,
  onEdit,
  onCancel,
  cancellingId,
}: {
  orders: Order[];
  loading: boolean;
  filter: string;
  onFilterChange: (f: string) => void;
  onView: (o: Order) => void;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  cancellingId: string | null;
}) {
  return (
    <>
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
              className={`fchip ${filter === val ? "active" : ""}`}
              onClick={() => onFilterChange(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders found</div>
        ) : (
          orders.map((o, idx) => {
            const prev =
              o.specifications.length > 75
                ? o.specifications.slice(0, 75) + "…"
                : o.specifications;
            const isCancelling = cancellingId === o.order_id;
            return (
              <div key={`order-${o.order_id ?? idx}`} className="ord-item">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="ord-id">
                    #{displayId(o.order_id)} — {o.service}
                  </div>
                  <div className="ord-meta">{prev}</div>
                  <div className="ord-meta">
                    Qty: {o.quantity} · ₱
                    {parseFloat(o.total_amount || "0").toFixed(2)}
                    {o.delivery_option === "pickup" && o.pickup_time && (
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
                        · <IC.ClockSmall /> {formatPickupTime(o.pickup_time)}
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
                      onClick={() => onView(o)}
                    >
                      <IC.Eye /> View Details
                    </button>
                    {o.status === "pending" && (
                      <>
                        <button
                          className="edit-btn"
                          onClick={() => onEdit(o.order_id)}
                        >
                          <IC.Pencil /> Edit
                        </button>
                        <button
                          className="cancel-btn"
                          disabled={isCancelling}
                          onClick={() => onCancel(o.order_id)}
                        >
                          <IC.XCircle />{" "}
                          {isCancelling ? "Cancelling..." : "Cancel Order"}
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
    </>
  );
}
