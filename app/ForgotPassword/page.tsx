// ForgotPassword.tsx - Styled to match Jonayskie Prints login page
import React, { useState, useEffect } from "react";

type Step = "email" | "otp" | "reset" | "success";

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0)
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const API_BASE = "/api";
  const clearMessages = () => {
    setError("");
    setSuccessMsg("");
  };

  const handleApiCall = async (endpoint: string, body: object) => {
    setLoading(true);
    clearMessages();
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Something went wrong.");
        return null;
      }
      return data;
    } catch {
      setError("Network error. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Please enter your email.");
    const res = await handleApiCall("/forgot-password", { email });
    if (res) {
      setSuccessMsg(res.message);
      setStep("otp");
      setResendTimer(60);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5)
      document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus();
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length < 6)
      return setError("Please enter the complete 6-digit OTP.");
    const res = await handleApiCall("/verify-otp", { email, otp: otpString });
    if (res) {
      setSuccessMsg(res.message);
      setStep("reset");
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    const res = await handleApiCall("/resend-otp", { email });
    if (res) {
      setSuccessMsg("New OTP sent!");
      setResendTimer(60);
      setOtp(["", "", "", "", "", ""]);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword)
      return setError("All fields are required.");
    if (newPassword !== confirmPassword)
      return setError("Passwords do not match.");
    if (newPassword.length < 8)
      return setError("Password must be at least 8 characters.");
    const res = await handleApiCall("/reset-password", {
      email,
      newPassword,
      confirmPassword,
    });
    if (res) {
      setSuccessMsg(res.message);
      setStep("success");
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const S: Record<string, React.CSSProperties> = {
    /* BG: exact gradient from screenshot */
    page: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background:
        "linear-gradient(135deg, #6b7fe8 0%, #7c3aed 40%, #a855f7 100%)",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: "24px",
    },
    card: {
      background: "#ffffff",
      borderRadius: "20px",
      boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
      padding: "40px 36px",
      width: "100%",
      maxWidth: "420px",
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(16px)",
      transition: "opacity 0.4s ease, transform 0.4s ease",
    },
    logoWrap: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      marginBottom: "20px",
    },
    logoBox: {
      width: "64px",
      height: "64px",
      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
      borderRadius: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 8px 20px rgba(124,58,237,0.4)",
    },

    heading: {
      fontSize: "26px",
      fontWeight: 800,
      color: "#111827",
      textAlign: "center",
      marginBottom: "4px",
    },
    subtext: {
      fontSize: "13.5px",
      color: "#6b7280",
      textAlign: "center",
      marginBottom: "22px",
      lineHeight: 1.5,
    },
    label: {
      fontSize: "13px",
      fontWeight: 600,
      color: "#374151",
      display: "block",
      marginBottom: "6px",
    },
    inputWrap: {
      display: "flex",
      alignItems: "center",
      border: "1.5px solid #e5e7eb",
      borderRadius: "10px",
      padding: "0 14px",
      gap: "10px",
      background: "#fff",
    },
    input: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: "15px",
      color: "#111827",
      padding: "13px 0",
      background: "transparent",
    },
    iconGray: { color: "#9ca3af", fontSize: "15px", flexShrink: 0 },
    eyeBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#9ca3af",
      display: "flex",
      padding: 0,
    },
    form: { display: "flex", flexDirection: "column", gap: "14px" },
    primaryBtn: {
      width: "100%",
      padding: "14px",
      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      fontSize: "15px",
      fontWeight: 700,
      cursor: "pointer",
      marginTop: "6px",
      boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
    },
    outlineBtn: {
      width: "100%",
      padding: "13px",
      background: "#fff",
      color: "#7c3aed",
      border: "1.5px solid #7c3aed",
      borderRadius: "10px",
      fontSize: "15px",
      fontWeight: 700,
      cursor: "pointer",
      marginTop: "4px",
    },
    dividerRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      margin: "16px 0 4px",
    },
    dividerLine: { flex: 1, height: "1px", background: "#e5e7eb" },
    dividerTxt: { fontSize: "12px", color: "#d1d5db" },
    otpRow: {
      display: "flex",
      gap: "10px",
      justifyContent: "center",
    },
    otpInput: {
      width: "46px",
      height: "52px",
      textAlign: "center",
      fontSize: "22px",
      fontWeight: 700,
      border: "1.5px solid #e5e7eb",
      borderRadius: "10px",
      outline: "none",
      color: "#7c3aed",
    },
    resendRow: {
      textAlign: "center",
      fontSize: "13px",
      color: "#6b7280",
    },
    resendBtn: {
      background: "none",
      border: "none",
      color: "#7c3aed",
      fontWeight: 700,
      fontSize: "13px",
      cursor: "pointer",
      padding: 0,
    },
    errorBox: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      color: "#dc2626",
      borderRadius: "10px",
      padding: "10px 14px",
      fontSize: "13px",
      marginBottom: "12px",
    },
    successBox: {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      color: "#16a34a",
      borderRadius: "10px",
      padding: "10px 14px",
      fontSize: "13px",
      marginBottom: "12px",
    },
    successCenter: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "14px",
      textAlign: "center",
    },
    checkCircle: {
      width: "72px",
      height: "72px",
      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 8px 24px rgba(124,58,237,0.35)",
    },
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Icon */}
        <div style={S.logoWrap}>
          <div style={S.logoBox}>
            {step === "email" && (
              <svg
                viewBox="0 0 24 24"
                width="30"
                height="30"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
            {step === "otp" && (
              <svg
                viewBox="0 0 24 24"
                width="30"
                height="30"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            )}
            {step === "reset" && (
              <svg
                viewBox="0 0 24 24"
                width="30"
                height="30"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            )}
            {step === "success" && (
              <svg
                viewBox="0 0 24 24"
                width="30"
                height="30"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>

        {/* Heading */}
        <h2 style={S.heading}>
          {step === "email" && "Forgot Password?"}
          {step === "otp" && "Check Your Email"}
          {step === "reset" && "Set New Password"}
          {step === "success" && "Password Reset!"}
        </h2>
        <p style={S.subtext}>
          {step === "email" &&
            "Enter your email address to receive a one-time password."}
          {step === "otp" && `We sent a 6-digit OTP to ${email}`}
          {step === "reset" && "Create a strong new password for your account."}
          {step === "success" && "Your password has been updated successfully."}
        </p>

        {error && <div style={S.errorBox}>{error}</div>}
        {successMsg && <div style={S.successBox}>{successMsg}</div>}

        {/* ── Step 1: Email ── */}
        {step === "email" && (
          <form onSubmit={handleSendOTP} style={S.form}>
            <div>
              <label style={S.label}>Email Address</label>
              <div style={S.inputWrap}>
                <span style={S.iconGray}>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={S.input}
                  required
                />
              </div>
            </div>
            <button type="submit" style={S.primaryBtn} disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOTP} style={S.form}>
            <div style={S.otpRow}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOTPChange(i, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(i, e)}
                  style={{
                    ...S.otpInput,
                    borderColor: digit ? "#7c3aed" : "#e5e7eb",
                    background: digit ? "#faf5ff" : "#fff",
                  }}
                />
              ))}
            </div>
            <div style={S.resendRow}>
              {resendTimer > 0 ? (
                `Resend OTP in ${resendTimer}s`
              ) : (
                <>
                  Didn't receive it?{" "}
                  <button
                    type="button"
                    style={S.resendBtn}
                    onClick={handleResendOTP}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                </>
              )}
            </div>
            <button type="submit" style={S.primaryBtn} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        )}

        {/* ── Step 3: Reset Password ── */}
        {step === "reset" && (
          <form onSubmit={handleResetPassword} style={S.form}>
            <div>
              <label style={S.label}>New Password</label>
              <div style={S.inputWrap}>
                <span style={S.iconGray}>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={S.input}
                  required
                />
                <button
                  type="button"
                  style={S.eyeBtn}
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? (
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label style={S.label}>Confirm Password</label>
              <div style={S.inputWrap}>
                <span style={S.iconGray}>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={S.input}
                  required
                />
                <button
                  type="button"
                  style={S.eyeBtn}
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? (
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" style={S.primaryBtn} disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {/* ── Step 4: Success ── */}
        {step === "success" && (
          <div style={S.successCenter}>
            <div style={S.checkCircle}>
              <svg
                viewBox="0 0 24 24"
                width="36"
                height="36"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>
              You can now sign in with your new password.
            </p>
            <button
              style={S.primaryBtn}
              onClick={() => (window.location.href = "/login")}
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Divider + Back to Login */}
        {step !== "success" && (
          <>
            <div style={S.dividerRow}>
              <div style={S.dividerLine} />
            </div>
            <button
              style={S.outlineBtn}
              onClick={() => (window.location.href = "/login")}
            >
              ← Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
