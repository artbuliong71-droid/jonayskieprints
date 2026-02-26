"use client";
import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}
interface LoginResponse {
  success: boolean;
  message: string;
  redirect?: string;
  user?: { id: number; name: string; email: string; role: string };
}
interface NotificationState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notification, setNotification] = useState<NotificationState>({
    message: "",
    type: "error",
    visible: false,
  });
  const [errors, setErrors] = useState<
    Partial<LoginFormData & { general: string }>
  >({});

  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() =>
      setCheckingAuth(false),
    );
  }, []);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type, visible: true });
    setTimeout(() => setNotification((n) => ({ ...n, visible: false })), 4000);
  };

  const validate = (): boolean => {
    const newErrors: Partial<LoginFormData & { general: string }> = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email format";
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    try {
      const body = new FormData();
      body.append("email", formData.email);
      body.append("password", formData.password);
      if (formData.remember) body.append("remember", "on");

      const response = await fetch("/api/login", {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });

      const data: LoginResponse = await response.json();

      if (data.success) {
        showNotification(data.message, "success");
        setTimeout(() => {
          if (data.redirect) router.replace(data.redirect);
          else if (data.user?.role === "admin") router.replace("/dashboard");
          else router.replace("/user/dashboard");
        }, 1200);
      } else {
        showNotification(
          data.message || "Login failed. Please try again.",
          "error",
        );
      }
    } catch {
      showNotification("An error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background:
            "linear-gradient(135deg,#5b6dee 0%,#7c3aed 50%,#a855f7 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid rgba(255,255,255,.3)",
            borderTop: "3px solid #fff",
            borderRadius: "50%",
            animation: "spin .7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body { font-family: 'Inter', sans-serif; min-height: 100vh; min-height: 100dvh; }
        .page {
          min-height: 100vh; min-height: 100dvh;
          background: linear-gradient(135deg, #5b6dee 0%, #7c3aed 50%, #a855f7 100%);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: clamp(1rem,4vw,2.5rem) clamp(0.75rem,4vw,1.5rem);
          position: relative; overflow: hidden; gap: 1rem;
        }
        .page::before {
          content: ''; position: absolute; top: -10%; left: -10%;
          width: clamp(200px,40vw,450px); height: clamp(200px,40vw,450px);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%);
          pointer-events: none;
        }
        .page::after {
          content: ''; position: absolute; bottom: -8%; right: -8%;
          width: clamp(180px,35vw,400px); height: clamp(180px,35vw,400px);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .card {
          background: #fff; border-radius: clamp(14px,3vw,22px);
          padding: clamp(1.5rem,5vw,2.75rem) clamp(1.25rem,5vw,2.5rem);
          width: 100%; max-width: min(440px,100%);
          box-shadow: 0 24px 60px rgba(0,0,0,.22), 0 8px 24px rgba(0,0,0,.13);
          position: relative; z-index: 1;
        }
        .brand { display: flex; flex-direction: column; align-items: center; margin-bottom: clamp(1rem,3vw,1.5rem); gap: .55rem; }
        .brand-icon {
          width: clamp(48px,10vw,66px); height: clamp(48px,10vw,66px);
          background: linear-gradient(135deg,#5b6dee,#7c3aed);
          border-radius: clamp(12px,2.5vw,17px);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 20px rgba(124,58,237,.38); flex-shrink: 0;
        }
        .brand-icon svg { width: clamp(22px,4.5vw,31px); height: clamp(22px,4.5vw,31px); color: #fff; }
        .brand-name { font-size: clamp(.82rem,2.5vw,1rem); font-weight: 700; color: #111827; letter-spacing: -.01em; text-align: center; }
        .form-header { text-align: center; margin-bottom: clamp(1.25rem,3.5vw,1.85rem); }
        .form-header h2 { font-size: clamp(1.35rem,5vw,1.65rem); font-weight: 800; color: #111827; letter-spacing: -.03em; margin-bottom: .3rem; }
        .form-header p  { font-size: clamp(.78rem,2.5vw,.86rem); color: #6b7280; line-height: 1.5; }
        .form-group { margin-bottom: clamp(.75rem,2.5vw,1rem); }
        .form-group label { display: block; font-size: clamp(.72rem,2vw,.79rem); font-weight: 600; letter-spacing: .04em; color: #374151; margin-bottom: .4rem; }
        .input-wrapper { position: relative; }
        .input-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; display: flex; align-items: center; }
        .input-icon svg { width: clamp(14px,3vw,17px); height: clamp(14px,3vw,17px); }
        .form-input {
          width: 100%;
          padding: clamp(.62rem,2.5vw,.78rem) 1rem clamp(.62rem,2.5vw,.78rem) 2.6rem;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-family: 'Inter', sans-serif; font-size: max(16px,.875rem);
          color: #111827; background: #fff;
          transition: border-color .2s, box-shadow .2s; outline: none; -webkit-appearance: none;
        }
        .form-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
        .form-input.has-error { border-color: #ef4444; }
        .toggle-btn {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #9ca3af;
          padding: clamp(6px,1.5vw,8px); display: flex; align-items: center;
          transition: color .2s; min-width: 40px; min-height: 40px; justify-content: center;
        }
        .toggle-btn:hover { color: #374151; }
        .field-error { font-size: clamp(.7rem,2vw,.75rem); color: #ef4444; margin-top: .3rem; font-weight: 500; }
        .form-footer-row {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: clamp(1.1rem,3vw,1.6rem); gap: .5rem; flex-wrap: wrap;
        }
        .checkbox-label {
          display: flex; align-items: center; gap: .5rem; cursor: pointer;
          font-size: clamp(.8rem,2.3vw,.86rem); color: #4b5563;
          user-select: none; padding: 4px 0;
        }
        .custom-checkbox {
          width: clamp(15px,3.5vw,18px); height: clamp(15px,3.5vw,18px);
          border: 1.5px solid #d1d5db; border-radius: 4px; background: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all .15s;
        }
        .custom-checkbox.checked { background: #7c3aed; border-color: #7c3aed; }
        .forgot-link {
          font-size: clamp(.78rem,2.2vw,.84rem); color: #7c3aed; font-weight: 600;
          text-decoration: none; transition: opacity .2s; white-space: nowrap; padding: 4px 0;
        }
        .forgot-link:hover { opacity: .75; }
        .btn-signin {
          width: 100%; padding: clamp(.75rem,3vw,.9rem);
          background: linear-gradient(135deg,#5b6dee,#7c3aed); color: #fff;
          border: none; border-radius: 10px;
          font-family: 'Inter', sans-serif; font-size: clamp(.86rem,2.5vw,.92rem);
          font-weight: 600; letter-spacing: .02em; cursor: pointer;
          transition: opacity .2s, transform .15s;
          display: flex; align-items: center; justify-content: center; gap: .5rem;
          margin-bottom: clamp(.75rem,2vw,1rem);
          box-shadow: 0 4px 14px rgba(124,58,237,.4);
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .btn-signin:hover:not(:disabled) { opacity: .92; transform: translateY(-1px); }
        .btn-signin:active:not(:disabled) { transform: translateY(0); opacity: .85; }
        .btn-signin:disabled { opacity: .6; cursor: not-allowed; transform: none; }
        .btn-register {
          width: 100%; padding: clamp(.72rem,2.5vw,.85rem);
          background: transparent; color: #7c3aed; border: 1.5px solid #c4b5fd;
          border-radius: 10px; font-family: 'Inter', sans-serif;
          font-size: clamp(.84rem,2.5vw,.9rem); font-weight: 600; cursor: pointer;
          text-align: center; text-decoration: none;
          display: flex; align-items: center; justify-content: center; gap: .5rem;
          transition: border-color .2s, background .2s; margin-bottom: .6rem;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .btn-register:hover  { border-color: #7c3aed; background: #faf5ff; }
        .btn-register:active { background: #f3e8ff; }
        .btn-google {
          width: 100%; padding: clamp(.72rem,2.5vw,.85rem);
          background: #fff; color: #374151;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-family: 'Inter', sans-serif;
          font-size: clamp(.84rem,2.5vw,.9rem); font-weight: 600; cursor: pointer;
          text-align: center; text-decoration: none;
          display: flex; align-items: center; justify-content: center; gap: .65rem;
          transition: border-color .2s, background .2s, box-shadow .2s;
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .btn-google:hover  { border-color: #d1d5db; background: #f9fafb; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
        .btn-google:active { background: #f3f4f6; }
        .divider {
          display: flex; align-items: center; gap: .75rem;
          margin: clamp(.75rem,2.5vw,1rem) 0;
          color: #9ca3af; font-size: clamp(.72rem,2vw,.79rem);
        }
        .divider::before, .divider::after { content:''; flex:1; height:1px; background:#e5e7eb; }
        .back-link {
          display: block; text-align: center;
          font-size: clamp(.78rem,2.2vw,.84rem); color: rgba(255,255,255,.78);
          text-decoration: none; font-weight: 500; transition: color .2s;
          position: relative; z-index: 1;
          width: 100%; max-width: min(440px,100%); padding: .5rem 0;
          -webkit-tap-highlight-color: transparent;
        }
        .back-link:hover { color: #fff; }
        .notification {
          position: fixed; top: env(safe-area-inset-top, 1rem);
          right: 1rem; left: 1rem; max-width: 360px; margin: 0 auto;
          padding: .85rem 1.25rem; border-radius: 10px; color: #fff;
          font-weight: 600; font-size: clamp(.8rem,2.5vw,.88rem);
          z-index: 9999; transform: translateY(-10px); opacity: 0;
          transition: all .3s; pointer-events: none;
          box-shadow: 0 8px 24px rgba(0,0,0,.2);
          display: flex; align-items: center; gap: .5rem;
          font-family: 'Inter', sans-serif;
        }
        .notification.visible  { transform: translateY(0); opacity: 1; }
        .notification.success  { background: #22c55e; }
        .notification.error    { background: #ef4444; }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
          border-radius: 50%; animation: spin .65s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 359px) {
          .card { padding: 1.35rem 1rem; }
          .form-footer-row { flex-direction: column; align-items: flex-start; gap: .5rem; }
          .brand-name { font-size: .78rem; }
        }
        @media (max-height: 600px) and (orientation: landscape) {
          .page { justify-content: flex-start; padding-top: 1rem; padding-bottom: 1rem; }
          .brand { margin-bottom: .75rem; flex-direction: row; gap: .75rem; }
          .brand-icon { width: 40px; height: 40px; }
          .form-header { margin-bottom: 1rem; }
          .form-header h2 { font-size: 1.25rem; }
          .form-group { margin-bottom: .6rem; }
          .form-footer-row { margin-bottom: .85rem; }
        }
        @media (min-width: 768px) {
          .notification { top: 1.5rem; right: 1.5rem; left: auto; margin: 0; }
          .card { padding: 2.75rem 2.5rem; }
        }
        @supports (padding: max(0px)) {
          .page {
            padding-left:   max(clamp(.75rem,4vw,1.5rem), env(safe-area-inset-left));
            padding-right:  max(clamp(.75rem,4vw,1.5rem), env(safe-area-inset-right));
            padding-bottom: max(clamp(1rem,4vw,2.5rem),   env(safe-area-inset-bottom));
          }
        }
      `}</style>

      <div className="page">
        <div className="card">
          <div className="brand">
            <div className="brand-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </div>
            <div className="brand-name">Jonayskie Prints</div>
          </div>

          <div className="form-header">
            <h2>Welcome!</h2>
            <p>Sign in to your account to manage your orders</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg
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
                </span>
                <input
                  className={`form-input ${errors.email ? "has-error" : ""}`}
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, email: e.target.value }));
                    if (errors.email)
                      setErrors((err) => ({ ...err, email: undefined }));
                  }}
                />
              </div>
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg
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
                </span>
                <input
                  className={`form-input ${errors.password ? "has-error" : ""}`}
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, password: e.target.value }));
                    if (errors.password)
                      setErrors((err) => ({ ...err, password: undefined }));
                  }}
                  style={{ paddingRight: "3rem" }}
                />
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="field-error">{errors.password}</p>
              )}
            </div>

            <div className="form-footer-row">
              <label
                className="checkbox-label"
                onClick={() =>
                  setFormData((f) => ({ ...f, remember: !f.remember }))
                }
              >
                <div
                  className={`custom-checkbox ${formData.remember ? "checked" : ""}`}
                >
                  {formData.remember && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                Remember me
              </label>
              <Link href="/forgot-password" className="forgot-link">
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className="btn-signin" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {/* ── Google Sign-In ── */}
            <div className="divider">or continue with</div>

            <a href="/api/auth/google" className="btn-google">
              <svg
                width="18"
                height="18"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
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
              Continue with Google
            </a>

            <div className="divider">Don&apos;t have an account?</div>

            <Link href="/register" className="btn-register">
              Create Account
            </Link>
          </form>
        </div>

        <Link href="/" className="back-link">
          ← Back to Home
        </Link>
      </div>

      <div
        className={`notification ${notification.type} ${notification.visible ? "visible" : ""}`}
      >
        {notification.type === "success" ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ flexShrink: 0 }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ flexShrink: 0 }}
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
        {notification.message}
      </div>
    </>
  );
}
