"use client";

import { useState, useEffect, useRef } from "react";
import { IcoGCash, IcoCash } from "./icons";

// ─── Terms of Service Modal ───────────────────────────────────────────────────

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

export function FirstLoginTosModal({
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

          {/* Header */}
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

          {/* Scrollable body */}
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

            {/* Section 03 — payment (styled) */}
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
                {/* GCash card */}
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
                {/* Cash card */}
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

            <TosSection
              num="04"
              title="Order Processing & Turnaround"
              body="Standard orders are processed within 1–2 business days. Urgent requests may be accommodated based on availability and may incur additional rush fees. Jonayskie Prints is not liable for delays caused by incomplete file submissions, unclear instructions, or force majeure events."
            />
            <TosSection
              num="05"
              title="File Submission & Quality"
              body="Customers are responsible for submitting print-ready files in accepted formats (PDF, JPG, PNG, DOCX). Jonayskie Prints will print files as submitted. We are not responsible for pixelation, incorrect margins, spelling errors, or layout issues present in the original file. A digital proof may be requested before final printing."
            />
            <TosSection
              num="06"
              title="Payments & Pricing"
              body="All prices are in Philippine Peso (PHP). Final pricing is calculated based on paper size, color, quantity, and finishing options. Accepted payment methods: (1) Cash on pickup for any order amount. (2) GCash — customers may pay the full amount online, or pay a 50% downpayment via GCash for cash orders exceeding ₱500.00 with the balance due on pickup. GCash is the only accepted online payment channel."
            />
            <TosSection
              num="07"
              title="Cancellations & Refunds"
              body="Orders may be cancelled without charge prior to processing. Once production has commenced, cancellations are not accepted and downpayments are forfeited. In cases where we cannot fulfill an order, a full refund will be issued within 3–5 business days."
            />
            <TosSection
              num="08"
              title="Privacy & Data Protection"
              body="Your personal information is collected solely for order processing and service delivery. We do not sell, rent, or share your data with third parties. All submitted files are deleted from our systems within 30 days of order completion."
            />
            <TosSection
              num="09"
              title="Prohibited Content"
              body="Jonayskie Prints reserves the right to refuse printing of any content deemed illegal, defamatory, obscene, or in violation of intellectual property rights. Customers are solely responsible for ensuring their content complies with applicable laws."
            />
            <TosSection
              num="10"
              title="Limitation of Liability"
              body="Our maximum liability for any claim shall not exceed the amount paid for the specific order. We are not liable for indirect, incidental, or consequential damages including lost profits or data loss."
            />
            <TosSection
              num="11"
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

          {/* Footer buttons */}
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
                  ? "✓ I Accept These Terms"
                  : "Read All Terms First"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Cancel Confirm Modal ─────────────────────────────────────────────────────

export function CancelConfirmModal({
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
