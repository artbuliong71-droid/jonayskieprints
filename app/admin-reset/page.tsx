"use client";
import { useState } from "react";
import Link from "next/link";

export default function AdminResetPage() {
  const [secret, setSecret] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, newPassword }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessageType("success");
      setMessage(data.message || "Password updated!");
    } else {
      setMessageType("error");
      setMessage(data.error || "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }

        .page {
          min-height: 100vh;
          background: linear-gradient(135deg, #5b6dee 0%, #7c3aed 50%, #a855f7 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem;
        }

        .card {
          background: #fff;
          border-radius: 20px;
          padding: 2.5rem 2rem;
          width: 100%; max-width: 420px;
          box-shadow: 0 24px 60px rgba(0,0,0,.22);
          display: flex; flex-direction: column; align-items: center;
        }

        .icon-wrap {
          width: 60px; height: 60px;
          background: #7c3aed;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.25rem;
        }

        h2 {
          font-size: 1.6rem; font-weight: 800;
          color: #111827; margin-bottom: .4rem; text-align: center;
        }

        .subtitle {
          font-size: .88rem; color: #6b7280;
          text-align: center; margin-bottom: 1.75rem; line-height: 1.5;
        }

        .form-group { width: 100%; margin-bottom: 1rem; }
        .form-group label {
          display: block; font-size: .78rem; font-weight: 600;
          color: #374151; margin-bottom: .4rem; letter-spacing: .04em;
        }

        .input-wrapper { position: relative; }
        .input-icon {
          position: absolute; left: 13px; top: 50%;
          transform: translateY(-50%); color: #9ca3af;
          display: flex; align-items: center; pointer-events: none;
        }

        .form-input {
          width: 100%;
          padding: .75rem 1rem .75rem 2.6rem;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-family: 'Inter', sans-serif; font-size: max(16px, .875rem);
          color: #111827; outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .form-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,.12);
        }

        .btn-reset {
          width: 100%; padding: .85rem;
          background: linear-gradient(135deg, #5b6dee, #7c3aed);
          color: #fff; border: none; border-radius: 10px;
          font-family: 'Inter', sans-serif; font-size: .92rem;
          font-weight: 600; cursor: pointer;
          box-shadow: 0 4px 14px rgba(124,58,237,.4);
          transition: opacity .2s, transform .15s;
          margin-top: .5rem; margin-bottom: 1rem;
          display: flex; align-items: center; justify-content: center; gap: .5rem;
        }
        .btn-reset:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        .btn-reset:disabled { opacity: .6; cursor: not-allowed; }

        .btn-back {
          width: 100%; padding: .82rem;
          background: transparent; color: #7c3aed;
          border: 1.5px solid #c4b5fd; border-radius: 10px;
          font-family: 'Inter', sans-serif; font-size: .9rem;
          font-weight: 600; cursor: pointer; text-align: center;
          text-decoration: none; display: block;
          transition: border-color .2s, background .2s;
        }
        .btn-back:hover { border-color: #7c3aed; background: #faf5ff; }

        .message {
          width: 100%; padding: .75rem 1rem;
          border-radius: 8px; font-size: .85rem;
          font-weight: 500; margin-bottom: 1rem; text-align: center;
        }
        .message.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .message.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: #fff; border-radius: 50%;
          animation: spin .65s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="page">
        <div className="card">
          {/* Icon */}
          <div className="icon-wrap">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>

          <h2>Admin Reset</h2>
          <p className="subtitle">
            Enter your secret key and new password to reset admin access.
          </p>

          {message && <div className={`message ${messageType}`}>{message}</div>}

          <div className="form-group">
            <label>Secret Key</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </span>
              <input
                type="password"
                placeholder="Enter secret key"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>New Password</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <button
            className="btn-reset"
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : "Reset Password"}
          </button>

          <Link href="/login" className="btn-back">
            ← Back to Login
          </Link>
        </div>
      </div>
    </>
  );
}
