"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PASSWORD_MIN_LENGTH = 8;

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}
interface RegisterResponse {
  success: boolean;
  message: string;
  user_id?: number;
  redirect?: string;
}
interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}
interface NotificationState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}
type PasswordStrength = "none" | "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "none";
  if (password.length < 6) return "weak";
  if (password.length < 10) return "medium";
  return "strong";
}

const IconUser = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconEmail = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const IconPhone = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.4 2.18 2 2 0 012.18 0H5.18a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
  </svg>
);
const IconLock = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const IconEye = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12C2.7 8.1 7 5 12 5s9.3 3.1 11 7c-1.7 3.9-6 7-11 7S2.7 15.9 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeOff = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3L21 21" />
    <path d="M10.6 10.6A2 2 0 0013.4 13.4" />
    <path d="M9.9 5.1A10.9 10.9 0 0112 5c5 0 9.3 3.1 11 7" />
    <path d="M6.2 6.2C4.2 7.4 2.7 9.1 1 12c1.7 3.9 6 7 11 7" />
  </svg>
);
const IconCheck = () => (
  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
    <path
      d="M1 4L3.5 6.5L9 1"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconXSmall = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconNotifySuccess = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconNotifyError = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notification, setNotification] = useState<NotificationState>({
    message: "",
    type: "error",
    visible: false,
  });

  const strength = getPasswordStrength(formData.password);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type, visible: true });
    setTimeout(() => setNotification((n) => ({ ...n, visible: false })), 4000);
  };

  const setField = <K extends keyof RegisterFormData>(
    key: K,
    value: RegisterFormData[K],
  ) => {
    setFormData((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof FieldErrors])
      setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!formData.firstName.trim()) e.firstName = "First name is required";
    if (!formData.lastName.trim()) e.lastName = "Last name is required";
    if (!formData.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      e.email = "Invalid email format";
    if (!formData.phone.trim()) e.phone = "Phone number is required";
    else if (!/^[\d\s\-\+\(\)]{7,15}$/.test(formData.phone))
      e.phone = "Invalid phone number format";
    if (!formData.password) e.password = "Password is required";
    else if (formData.password.length < PASSWORD_MIN_LENGTH)
      e.password = `Min. ${PASSWORD_MIN_LENGTH} characters`;
    if (!formData.confirmPassword)
      e.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (!formData.terms) e.terms = "You must agree to the Terms of Service";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const body = new FormData();
      body.append("first_name", formData.firstName);
      body.append("last_name", formData.lastName);
      body.append("email", formData.email);
      body.append("phone", formData.phone);
      body.append("password", formData.password);
      body.append("confirmPassword", formData.confirmPassword);
      const response = await fetch("/api/register", {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });
      const data: RegisterResponse = await response.json();
      if (data.success) {
        showNotification(data.message || "Registration successful!", "success");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        showNotification(data.message || "Registration failed", "error");
      }
    } catch {
      showNotification("An unexpected error occurred.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body { font-family: 'DM Sans', sans-serif; min-height: 100vh; min-height: 100dvh; }

        .page {
          min-height: 100vh; min-height: 100dvh;
          background: linear-gradient(135deg, #5b6dee 0%, #7c3aed 50%, #a855f7 100%);
          display: flex; align-items: flex-start; justify-content: center;
          padding: clamp(1rem, 4vw, 2.5rem) clamp(0.75rem, 4vw, 1.25rem);
          position: relative; overflow: hidden;
        }
        .page::before {
          content: ''; position: absolute; top: -10%; left: -10%;
          width: clamp(200px, 40vw, 420px); height: clamp(200px, 40vw, 420px);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%);
          pointer-events: none;
        }
        .page::after {
          content: ''; position: absolute; bottom: -8%; right: -8%;
          width: clamp(180px, 35vw, 380px); height: clamp(180px, 35vw, 380px);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        .card {
          background: #fff; border-radius: clamp(14px, 3vw, 22px);
          padding: clamp(1.5rem, 5vw, 2.75rem) clamp(1.25rem, 5vw, 2.25rem);
          width: 100%; max-width: min(490px, 100%);
          box-shadow: 0 20px 60px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12);
          margin: auto 0; position: relative; z-index: 1;
        }

        .card-header { text-align: center; margin-bottom: clamp(1.25rem, 3.5vw, 1.85rem); }

        .brand-logo {
          width: clamp(56px, 12vw, 80px);
          height: clamp(56px, 12vw, 80px);
          object-fit: contain;
          border-radius: clamp(11px, 2.5vw, 15px);
          margin: 0 auto clamp(0.45rem, 1.5vw, 0.65rem);
          display: block;
        }

        .brand-name { font-size: clamp(0.82rem, 2.5vw, 1rem); font-weight: 700; color: #0f0e11; margin-bottom: clamp(0.35rem, 1.5vw, 0.6rem); }
        .card-title { font-size: clamp(1.25rem, 4.5vw, 1.6rem); font-weight: 700; color: #0f0e11; margin-bottom: 0.2rem; letter-spacing: -0.02em; }
        .card-subtitle { font-size: clamp(0.78rem, 2.3vw, 0.88rem); color: #6b7280; }

        .name-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: clamp(0.6rem, 2vw, 0.9rem);
          margin-bottom: clamp(0.75rem, 2.5vw, 1rem);
        }

        .form-group { margin-bottom: clamp(0.7rem, 2.5vw, 1rem); }
        .form-group label { display: block; font-size: clamp(0.75rem, 2vw, 0.85rem); font-weight: 600; color: #0f0e11; margin-bottom: 0.38rem; }

        .input-wrapper { position: relative; }
        .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; display: flex; align-items: center; }

        .form-input {
          width: 100%;
          padding: clamp(0.6rem, 2.5vw, 0.8rem) 1rem clamp(0.6rem, 2.5vw, 0.8rem) 2.45rem;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: max(16px, 0.875rem);
          color: #0f0e11; background: #fff;
          transition: border-color 0.2s, box-shadow 0.2s; outline: none; -webkit-appearance: none;
        }
        .form-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .form-input.has-error { border-color: #e63329; background: #fff8f8; }
        .form-input.with-toggle { padding-right: 2.8rem; }

        .toggle-btn {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #9ca3af;
          min-width: 40px; min-height: 40px; display: flex; align-items: center; justify-content: center;
          transition: color 0.2s; -webkit-tap-highlight-color: transparent;
        }
        .toggle-btn:hover { color: #374151; }

        .field-error { font-size: clamp(0.68rem, 1.8vw, 0.73rem); color: #e63329; margin-top: 0.28rem; font-weight: 500; display: flex; align-items: center; gap: 0.25rem; }

        .strength-bar-wrap { margin-top: 0.42rem; display: flex; gap: 4px; }
        .strength-segment { height: 3px; flex: 1; border-radius: 99px; background: #e5e7eb; transition: background 0.3s; }
        .strength-segment.active.weak   { background: #ef4444; }
        .strength-segment.active.medium { background: #d97706; }
        .strength-segment.active.strong { background: #2d9b5a; }
        .strength-label { font-size: clamp(0.67rem, 1.8vw, 0.72rem); margin-top: 0.28rem; font-weight: 500; color: #9ca3af; }
        .strength-label.weak   { color: #ef4444; }
        .strength-label.medium { color: #d97706; }
        .strength-label.strong { color: #2d9b5a; }

        .terms-row { display: flex; align-items: flex-start; gap: 0.55rem; margin-bottom: clamp(1rem, 3vw, 1.35rem); cursor: pointer; padding: 4px 0; }
        .custom-checkbox {
          width: clamp(16px, 3.5vw, 19px); height: clamp(16px, 3.5vw, 19px);
          border: 1.5px solid #d1d5db; border-radius: 4px; background: #fff;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s; flex-shrink: 0; margin-top: 2px;
        }
        .custom-checkbox.checked { background: #7c3aed; border-color: #7c3aed; }
        .custom-checkbox.err { border-color: #e63329; background: #fff8f8; }
        .terms-text { font-size: clamp(0.8rem, 2.3vw, 0.87rem); color: #374151; line-height: 1.5; user-select: none; }
        .terms-text a { color: #7c3aed; font-weight: 600; text-decoration: none; }
        .terms-text a:hover { opacity: 0.75; }

        .btn-primary {
          width: 100%; padding: clamp(0.75rem, 3vw, 0.9rem);
          background: linear-gradient(135deg, #5b6dee, #7c3aed);
          color: #fff; border: none; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: clamp(0.86rem, 2.5vw, 0.95rem);
          font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          margin-bottom: clamp(0.75rem, 2vw, 1rem);
          box-shadow: 0 4px 14px rgba(124,58,237,0.4);
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary:active:not(:disabled) { transform: translateY(0); opacity: 0.85; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .btn-google {
          width: 100%; padding: clamp(0.72rem, 2.5vw, 0.875rem);
          background: #fff; color: #374151;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: clamp(0.84rem, 2.5vw, 0.92rem);
          font-weight: 600; cursor: pointer; text-align: center; text-decoration: none;
          display: flex; align-items: center; justify-content: center; gap: 0.65rem;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          margin-bottom: clamp(0.75rem, 2vw, 1rem);
          -webkit-tap-highlight-color: transparent;
        }
        .btn-google:hover  { border-color: #d1d5db; background: #f9fafb; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .btn-google:active { background: #f3f4f6; }

        .divider {
          display: flex; align-items: center; gap: 0.75rem;
          margin: 0.2rem 0 clamp(0.75rem, 2vw, 1rem);
          color: #9ca3af; font-size: clamp(0.72rem, 2vw, 0.82rem);
        }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

        .btn-outline {
          width: 100%; padding: clamp(0.72rem, 2.5vw, 0.875rem);
          background: transparent; color: #7c3aed;
          border: 1.5px solid #c4b5fd; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: clamp(0.84rem, 2.5vw, 0.92rem);
          font-weight: 600; cursor: pointer; text-align: center; text-decoration: none;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; -webkit-tap-highlight-color: transparent;
        }
        .btn-outline:hover { border-color: #7c3aed; background: #faf5ff; }
        .btn-outline:active { background: #f3e8ff; }

        .spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .notification {
          position: fixed; top: env(safe-area-inset-top, 1rem);
          left: 1rem; right: 1rem;
          padding: clamp(0.7rem, 2.5vw, 0.85rem) clamp(1rem, 3vw, 1.25rem);
          border-radius: 10px; color: #fff; font-weight: 600;
          font-size: clamp(0.78rem, 2.3vw, 0.88rem);
          z-index: 9999; transform: translateY(-10px); opacity: 0;
          transition: all 0.3s; pointer-events: none;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          display: flex; align-items: center; gap: 0.5rem;
          font-family: 'DM Sans', sans-serif;
        }
        .notification.visible { transform: translateY(0); opacity: 1; }
        .notification.success { background: #2d9b5a; }
        .notification.error   { background: #e63329; }

        @media (max-width: 359px) {
          .card { padding: 1.35rem 1rem; }
          .name-grid { grid-template-columns: 1fr; gap: 0; }
        }
        @media (max-height: 600px) and (orientation: landscape) {
          .page { padding-top: 0.75rem; padding-bottom: 0.75rem; align-items: flex-start; }
          .card-header { margin-bottom: 0.9rem; }
          .brand-logo { width: 38px; height: 38px; margin-bottom: 0.3rem; }
          .card-title { font-size: 1.15rem; }
          .form-group { margin-bottom: 0.55rem; }
          .terms-row { margin-bottom: 0.75rem; }
        }
        @media (min-width: 540px) {
          .notification { top: 1.5rem; right: 1.5rem; left: auto; max-width: 340px; }
        }
        @media (min-width: 768px) {
          .card { padding: 2.75rem 2.5rem; }
          .page { align-items: center; }
        }
        @supports (padding: max(0px)) {
          .page {
            padding-left: max(clamp(0.75rem, 4vw, 1.25rem), env(safe-area-inset-left));
            padding-right: max(clamp(0.75rem, 4vw, 1.25rem), env(safe-area-inset-right));
            padding-bottom: max(clamp(1rem, 4vw, 2.5rem), env(safe-area-inset-bottom));
          }
        }
      `}</style>

      <div className="page">
        <div className="card">
          <div className="card-header">
            {/* ✅ YOUR LOGO */}
            <img
              src="/logo.png"
              alt="Jonayskie Prints"
              className="brand-logo"
            />
            <h1 className="card-title">Create Account</h1>
            <p className="card-subtitle">
              Join our community — it&apos;s completely free!
            </p>
          </div>

          {/* ── Google Sign-Up ── */}
          <a href="/api/auth/google" className="btn-google">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Sign up with Google
          </a>

          <div className="divider">or sign up with email</div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Name Row */}
            <div className="name-grid">
              <div>
                <label htmlFor="firstName">First Name</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <IconUser />
                  </span>
                  <input
                    className={`form-input ${errors.firstName ? "has-error" : ""}`}
                    type="text"
                    id="firstName"
                    placeholder="Jane"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                  />
                </div>
                {errors.firstName && (
                  <p className="field-error">
                    <IconXSmall />
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="lastName">Last Name</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <IconUser />
                  </span>
                  <input
                    className={`form-input ${errors.lastName ? "has-error" : ""}`}
                    type="text"
                    id="lastName"
                    placeholder="Doe"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                  />
                </div>
                {errors.lastName && (
                  <p className="field-error">
                    <IconXSmall />
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <IconEmail />
                </span>
                <input
                  className={`form-input ${errors.email ? "has-error" : ""}`}
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  value={formData.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
              {errors.email && (
                <p className="field-error">
                  <IconXSmall />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <IconPhone />
                </span>
                <input
                  className={`form-input ${errors.phone ? "has-error" : ""}`}
                  type="tel"
                  id="phone"
                  placeholder="+63 912 345 6789"
                  autoComplete="tel"
                  inputMode="tel"
                  value={formData.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>
              {errors.phone && (
                <p className="field-error">
                  <IconXSmall />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <IconLock />
                </span>
                <input
                  className={`form-input with-toggle ${errors.password ? "has-error" : ""}`}
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setField("password", e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password"
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {formData.password && (
                <>
                  <div className="strength-bar-wrap">
                    {(["weak", "medium", "strong"] as const).map((lvl, i) => {
                      const levels: Record<PasswordStrength, number> = {
                        none: 0,
                        weak: 1,
                        medium: 2,
                        strong: 3,
                      };
                      return (
                        <div
                          key={lvl}
                          className={`strength-segment ${i < levels[strength] ? `active ${strength}` : ""}`}
                        />
                      );
                    })}
                  </div>
                  <p className={`strength-label ${strength}`}>
                    {strength === "weak" && "Weak password"}
                    {strength === "medium" && "Medium strength"}
                    {strength === "strong" && "Strong password ✓"}
                  </p>
                </>
              )}
              {errors.password && (
                <p className="field-error">
                  <IconXSmall />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <IconLock />
                </span>
                <input
                  className={`form-input with-toggle ${errors.confirmPassword ? "has-error" : ""}`}
                  type={showConfirm ? "text" : "password"}
                  id="confirmPassword"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label="Toggle confirm password"
                >
                  {showConfirm ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="field-error">
                  <IconXSmall />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms */}
            <div
              className="terms-row"
              onClick={() => setField("terms", !formData.terms)}
            >
              <div
                className={`custom-checkbox ${formData.terms ? "checked" : ""} ${errors.terms ? "err" : ""}`}
              >
                {formData.terms && <IconCheck />}
              </div>
              <span className="terms-text">
                I agree to the{" "}
                <a href="#" onClick={(e) => e.stopPropagation()}>
                  Terms of Service
                </a>
              </span>
            </div>
            {errors.terms && (
              <p
                className="field-error"
                style={{ marginTop: "-0.5rem", marginBottom: "0.75rem" }}
              >
                <IconXSmall />
                {errors.terms}
              </p>
            )}

            {/* Submit */}
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner" /> Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </button>

            <div className="divider">Already have an account?</div>
            <Link href="/login" className="btn-outline">
              Sign In
            </Link>
          </form>
        </div>
      </div>

      <div
        className={`notification ${notification.type} ${notification.visible ? "visible" : ""}`}
      >
        {notification.type === "success" ? (
          <IconNotifySuccess />
        ) : (
          <IconNotifyError />
        )}
        {notification.message}
      </div>
    </>
  );
}
