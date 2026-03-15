"use client";

import { useRef } from "react";
import { IC } from "./icons";

type ProfTab = "info" | "password";

interface ProfileSectionProps {
  profTab: ProfTab;
  setProfTab: (t: ProfTab) => void;
  profAvatar: string | null;
  setProfAvatar: (v: string | null) => void;
  profFirstName: string;
  setProfFirstName: (v: string) => void;
  profLastName: string;
  setProfLastName: (v: string) => void;
  profEmail: string;
  setProfEmail: (v: string) => void;
  profPhone: string;
  setProfPhone: (v: string) => void;
  profCurrentPw: string;
  setProfCurrentPw: (v: string) => void;
  profNewPw: string;
  setProfNewPw: (v: string) => void;
  profConfirmPw: string;
  setProfConfirmPw: (v: string) => void;
  showCurrPw: boolean;
  setShowCurrPw: (v: boolean) => void;
  showNewPw: boolean;
  setShowNewPw: (v: boolean) => void;
  showConfirmPw: boolean;
  setShowConfirmPw: (v: boolean) => void;
  profSubmitting: boolean;
  pwStrength: number;
  pwLabel: string;
  pwColor: string;
  pwMatch: string;
  profInitials: string;
  onSubmit: (e: React.FormEvent) => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export function ProfileSection({
  profTab,
  setProfTab,
  profAvatar,
  profFirstName,
  setProfFirstName,
  profLastName,
  setProfLastName,
  profEmail,
  setProfEmail,
  profPhone,
  setProfPhone,
  profCurrentPw,
  setProfCurrentPw,
  profNewPw,
  setProfNewPw,
  profConfirmPw,
  setProfConfirmPw,
  showCurrPw,
  setShowCurrPw,
  showNewPw,
  setShowNewPw,
  showConfirmPw,
  setShowConfirmPw,
  profSubmitting,
  pwStrength,
  pwLabel,
  pwColor,
  pwMatch,
  profInitials,
  onSubmit,
  onAvatarChange,
}: ProfileSectionProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="np-card">
      <div className="np-bar" />

      {/* Hero */}
      <div className="np-hero">
        <div
          className="np-avatar-wrap"
          onClick={() => avatarInputRef.current?.click()}
          title="Change photo"
        >
          <div className="np-avatar">
            {profAvatar ? <img src={profAvatar} alt="avatar" /> : profInitials}
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
            onChange={onAvatarChange}
          />
        </div>

        <div className="np-hero-info">
          <div className="np-hero-name">
            {profFirstName} {profLastName}
          </div>
          <div className="np-hero-email">{profEmail}</div>
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

      {/* Tabs */}
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

      {/* Body */}
      <div className="np-body">
        <form onSubmit={onSubmit}>
          {/* ── Info tab ── */}
          {profTab === "info" && (
            <div className="np-fadein">
              <div className="np-g2" style={{ marginBottom: ".9rem" }}>
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
                        setProfPhone(e.target.value.replace(/[^0-9]/g, ""))
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
                  <IC.User />
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
                <span className="np-save-hint">* Required fields</span>
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

          {/* ── Password tab ── */}
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
                Leave all fields blank if you don't want to change your
                password.
              </div>
              <div className="np-group" style={{ marginBottom: ".9rem" }}>
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
                    onClick={() => setShowCurrPw(!showCurrPw)}
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
                      onClick={() => setShowNewPw(!showNewPw)}
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
                              background: i <= pwStrength ? pwColor : "#e5e7eb",
                            }}
                          />
                        ))}
                      </div>
                      <div className="np-pw-lbl" style={{ color: pwColor }}>
                        {pwLabel}
                      </div>
                    </div>
                  )}
                  <div className="np-hint">
                    8+ chars · 1 uppercase · 1 number
                  </div>
                </div>
                <div className="np-group">
                  <label className="np-label">Confirm New Password</label>
                  <div className="np-iw">
                    <input
                      className={`np-input has-icon ${pwMatch === "match" ? "inp-ok" : pwMatch === "mismatch" ? "inp-err" : ""}`}
                      type={showConfirmPw ? "text" : "password"}
                      value={profConfirmPw}
                      onChange={(e) => setProfConfirmPw(e.target.value)}
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      className="np-ico"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                    >
                      {showConfirmPw ? <IC.EyeOff /> : <IC.Eye />}
                    </button>
                  </div>
                  {pwMatch === "match" && (
                    <div className="np-match" style={{ color: "#22c55e" }}>
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
                    <div className="np-match" style={{ color: "#ef4444" }}>
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
                        <rect x="3" y="11" width="18" height="11" rx="2" />
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
  );
}
