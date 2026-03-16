"use client";

import { Order, DashboardStats, Prices } from "./types";
import { IC } from "./icons";
import { StatCard } from "./ui";
import { displayId, badgeClass, sp } from "./types";

const pricingCards = (prices: Prices) => [
  {
    name: "Print B&W",
    price: sp(prices.print_bw, 1),
    icon: <IC.Printer />,
    unit: "per page",
    service: "Print",
  },
  {
    name: "Print Color",
    price: sp(prices.print_color, 2),
    icon: <IC.Printer />,
    unit: "per page",
    service: "Print",
  },
  {
    name: "Photocopy",
    price: sp(prices.photocopying, 2),
    icon: <IC.Copy />,
    unit: "per page",
    service: "Photocopy",
  },
  {
    name: "Scanning",
    price: sp(prices.scanning, 5),
    icon: <IC.Scan />,
    unit: "per page",
    service: "Scanning",
  },
  {
    name: "Photo Dev.",
    price: sp(prices.photo_development, 15),
    icon: <IC.Camera />,
    unit: "per photo",
    service: "Photo Development",
  },
  {
    name: "Laminating",
    price: sp(prices.laminating, 20),
    icon: <IC.Layers />,
    unit: "per item",
    service: "Laminating",
  },
];

export function DashboardSection({
  stats,
  prices,
  recentOrders,
  onViewAll,
  onNewOrder,
}: {
  stats: DashboardStats;
  prices: Prices;
  recentOrders: Order[];
  onViewAll: () => void;
  onNewOrder: () => void;
}) {
  return (
    <>
      {/* Pricing board */}
      <div className="p-board">
        <div className="p-top">
          <div className="p-label">
            <IC.Tag /> Current Pricing
          </div>
          <div
            style={{ fontSize: ".68rem", color: "#9ca3af", fontWeight: 500 }}
          >
            Tap a service to order
          </div>
        </div>
        <div className="p-grid">
          {pricingCards(prices).map((s) => (
            <div
              key={s.name}
              className="p-card"
              onClick={onNewOrder}
              title={`Order ${s.name}`}
              style={{ cursor: "pointer" }}
            >
              <div className="p-ico">{s.icon}</div>
              <div className="p-name">{s.name}</div>
              <div className="p-price">₱{s.price.toFixed(2)}</div>
              <div className="p-unit">{s.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
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

      {/* Recent orders */}
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
            onClick={onViewAll}
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
                  onClick={onViewAll}
                  style={{ cursor: "pointer" }}
                  title="View in My Orders"
                >
                  <td className="ro-id">#{displayId(o.order_id)}</td>
                  <td className="ro-svc">{o.service}</td>
                  <td className="ro-date">
                    {new Date(o.created_at).toLocaleDateString("en-PH", {
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                    })}
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
    </>
  );
}
