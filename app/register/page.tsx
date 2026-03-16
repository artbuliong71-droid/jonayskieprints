"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
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
const IconClose = () => (
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconScroll = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ── OTP MODAL ───────────────────────────────────────────────────────
function OtpModal({
  email,
  onVerified,
  onClose,
}: {
  email: string;
  onVerified: () => void;
  onClose: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setIsVerifying(true);
    setError("");
    try {
      const res = await fetch(
        `/api/send-otp?email=${encodeURIComponent(email)}&otp=${otp}`,
      );
      const data = await res.json();
      if (data.success) {
        onVerified();
      } else {
        setError(data.message || "Invalid code");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setResendTimer(60);
    setError("");
    setOtp("");
    await fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  };

  return (
    <div className="tos-backdrop" onClick={onClose}>
      <div className="otp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="otp-icon-wrap">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h2 className="otp-title">Check your email</h2>
        <p className="otp-subtitle">
          We sent a 6-digit code to
          <br />
          <strong>{email}</strong>
        </p>
        <input
          className={`otp-input ${error ? "has-error" : ""}`}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, ""));
            setError("");
          }}
        />
        {error && <p className="otp-error">{error}</p>}
        <button
          className="btn-primary"
          style={{ marginTop: "1rem", marginBottom: 0 }}
          onClick={handleVerify}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <>
              <span className="spinner" /> Verifying…
            </>
          ) : (
            "Verify & Create Account"
          )}
        </button>
        <p className="otp-resend">
          {resendTimer > 0 ? (
            `Resend code in ${resendTimer}s`
          ) : (
            <button className="terms-link" onClick={handleResend}>
              Resend code
            </button>
          )}
        </p>
      </div>
    </div>
  );
}

// ── TERMS OF SERVICE MODAL ──────────────────────────────────────────
function TermsModal({
  onClose,
  onAccept,
}: {
  onClose: () => void;
  onAccept: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40)
      setHasScrolled(true);
  };

  return (
    <div className="tos-backdrop" onClick={onClose}>
      <div className="tos-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tos-header">
          <div className="tos-header-left">
            <div className="tos-icon-wrap">
              <IconScroll />
            </div>
            <div>
              <h2 className="tos-title">Terms of Service</h2>
              <p className="tos-subtitle">
                Jonayskie Prints — Effective January 1, 2026
              </p>
            </div>
          </div>
          <button
            className="tos-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div className="tos-body" ref={scrollRef} onScroll={handleScroll}>
          <div className="tos-intro">
            By registering and using Jonayskie Prints, you acknowledge that you
            have read, understood, and agree to be bound by the following Terms
            of Service. These terms protect both you as a customer and Jonayskie
            Prints as a service provider.
          </div>

          <div className="tos-section">
            <div className="tos-section-badge">01</div>
            <h3 className="tos-section-title">Acceptance of Terms</h3>
            <p>
              By creating an account, placing an order, or using any of our
              services, you confirm that you have the legal capacity to enter
              into a binding agreement. Use of this platform constitutes full
              acceptance of these terms.
            </p>
          </div>

          <div className="tos-section">
            <div className="tos-section-badge">02</div>
            <h3 className="tos-section-title">Services Offered</h3>
            <p>
              Jonayskie Prints provides professional printing services
              including, but not limited to: document printing, photocopying
              (Xerox), scanning, photo development, and laminating. All services
              are subject to availability and may vary based on current
              equipment and supplies.
            </p>
          </div>

          <div className="tos-section highlight-section">
            <div className="tos-section-badge accent">03</div>
            <h3 className="tos-section-title">
              Payment Methods &amp; Downpayment Policy
            </h3>

            <div
              className="tos-highlight-box"
              style={{ marginBottom: "0.75rem" }}
            >
              <div
                className="highlight-icon"
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div>
                <p style={{ fontWeight: 700, marginBottom: "0.4rem" }}>
                  Online Payments — GCash Only
                </p>
                <p>
                  All online payments (downpayments and full payments) are
                  processed exclusively through <strong>GCash</strong>. No other
                  online payment channels are accepted.
                </p>
                <ul className="tos-list" style={{ marginTop: "0.55rem" }}>
                  <li>
                    Customers may choose to pay the full amount via GCash before
                    the order is processed.
                  </li>
                  <li>
                    GCash payers must provide a valid reference number and
                    upload a receipt screenshot as proof of payment.
                  </li>
                  <li>
                    Payments are verified before any order proceeds to
                    production.
                  </li>
                </ul>
              </div>
            </div>

            <div className="tos-highlight-box">
              <div className="highlight-icon">₱</div>
              <div>
                <p style={{ fontWeight: 700, marginBottom: "0.4rem" }}>
                  Cash Payments &amp; ₱500+ Downpayment Requirement
                </p>
                <p>
                  Cash on pickup is accepted for all orders. However,{" "}
                  <strong>cash orders exceeding ₱500.00</strong> require a{" "}
                  <strong>50% downpayment via GCash</strong> before processing
                  begins:
                </p>
                <ul className="tos-list" style={{ marginTop: "0.55rem" }}>
                  <li>
                    Downpayment must be settled via GCash prior to processing —
                    no exceptions.
                  </li>
                  <li>
                    Remaining balance is paid in cash upon pickup or delivery.
                  </li>
                  <li>
                    Orders will <strong>not be processed</strong> until the
                    GCash downpayment is confirmed.
                  </li>
                  <li>
                    Downpayment is <strong>non-refundable</strong> if
                    cancellation occurs after processing begins.
                  </li>
                  <li>
                    Customers choosing full GCash payment are exempt from this
                    cash downpayment rule.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="tos-section">
            <div className="tos-section-badge">04</div>
            <h3 className="tos-section-title">
              Order Processing &amp; Turnaround
            </h3>
            <p>
              Standard orders are processed within 1–2 business days. Urgent
              requests may be accommodated based on availability and may incur
              additional rush fees. Jonayskie Prints is not liable for delays
              caused by incomplete file submissions, unclear instructions, or
              force majeure events.
            </p>
          </div>

          <div className="tos-section">
            <div className="tos-section-badge">05</div>
            <h3 className="tos-section-title">File Submission &amp; Quality</h3>
            <p>
              Customers are responsible for submitting print-ready files in
              accepted formats (PDF, JPG, PNG, DOCX). Jonayskie Prints will
              print files as submitted. We are not responsible for pixelation,
              incorrect margins, spelling errors, or layout issues present in
              the original file. A digital proof may be requested before final
              printing.
            </p>
          </div>

          <div className="tos-section">
            <div className="tos-section-badge">06</div>
            <h3 className="tos-section-title">Payments &amp; Pricing</h3>
            <p>
              All prices are in Philippine Peso (PHP). Final pricing is
              calculated based on paper size, color, quantity, and finishing
              options. Quoted prices are valid for 48 hours. Jonayskie Prints
              reserves the right to adjust pricing with reasonable notice.
              Accepted payment methods: <strong>(1) Cash on pickup</strong> for
              any order amount. <strong>(2) GCash</strong> — customers may pay
              the full amount online, or pay a 50% downpayment via GCash for
              cash orders exceeding ₱500.00 with the balance due on pickup.
              GCash is the <strong>only accepted online payment channel</strong>
              .
            </p>
          </div>

          <div className="tos-section">
            <div className="tos-section-badge">07</div>
            <h3 className="tos-section-title">Cancellations &amp; Refunds</h3>
            <p>
              Orders may be cancelled without charge prior to processing. Once
              production has commenced, cancellations are not accepted and
              downpayments are forfeited. In cases where Jonayskie Prints is
              unable to fulfill an order, a full refund will be issued within
              3–5 business days.
            </p>
          </div>

          <div className="tos-section">
            <div className="tos-section-badge">08</div>
            <h3 className="tos-section-title">Privacy &amp; Data Protection</h3>
            <p>
              Your personal information is collected solely for order processing
              and service delivery purposes. We do not sell, rent, or share your
              data with third parties. All submitted files are deleted from our
              systems within 30 days of order completion unless you request
              otherwise.
            </p>
          </div>

          <div className="tos-section">
            <div className="tos-section-badge">09</div>
            <h3 className="tos-section-title">Prohibited Content</h3>
            <p>
              Jonayskie Prints reserves the right to refuse printing of any
              content that is deemed illegal, defamatory, obscene, or in
              violation of intellectual property rights. Customers are solely
              responsible for ensuring their submitted content complies with
              applicable laws and does not infringe on third-party rights.
            </p>
          </div>

          <div className="tos-section">
            <div className="tos-section-badge">10</div>
            <h3 className="tos-section-title">Limitation of Liability</h3>
            <p>
              Jonayskie Prints' maximum liability for any claim arising from our
              services shall not exceed the amount paid for the specific order
              in question. We are not liable for indirect, incidental, or
              consequential damages including lost profits, business
              interruption, or data loss.
            </p>
          </div>

          <div className="tos-section">
            <div className="tos-section-badge">11</div>
            <h3 className="tos-section-title">Amendments</h3>
            <p>
              Jonayskie Prints reserves the right to update these Terms of
              Service at any time. Continued use of the platform after changes
              are published constitutes acceptance of the updated terms.
              Material changes will be communicated via email or platform
              notification.
            </p>
          </div>

          <div className="tos-contact-box">
            <strong>Questions?</strong> Contact us at{" "}
            <span>jonalynpascual2704@gmail.com</span> or call{" "}
            <span>+63 935 033 6938</span> — Mon–Sat, 8:00 AM – 6:00 PM.
          </div>
        </div>

        {/* Footer */}
        <div className="tos-footer">
          {!hasScrolled && (
            <p className="tos-scroll-hint">
              ↓ Scroll to read all terms before accepting
            </p>
          )}
          <div className="tos-footer-btns">
            <button className="tos-btn-decline" onClick={onClose}>
              Decline
            </button>
            <button
              className={`tos-btn-accept ${hasScrolled ? "ready" : ""}`}
              onClick={() => {
                if (hasScrolled) {
                  onAccept();
                  onClose();
                }
              }}
            >
              {hasScrolled ? "✓ I Accept These Terms" : "Read All Terms First"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── REGISTER PAGE ───────────────────────────────────────────────────
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
  const [showTos, setShowTos] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
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

  // Step 1: Validate form → send OTP
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpEmail(formData.email);
        setShowOtp(true);
      } else {
        showNotification(data.message || "Failed to send OTP", "error");
      }
    } catch {
      showNotification("An unexpected error occurred.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: OTP verified → create account
  const handleRegister = async () => {
    setShowOtp(false);
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap');
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
          width: clamp(200px, 40vw, 420px); height: clamp(200px, 40vw, 420px); border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%); pointer-events: none;
        }
        .page::after {
          content: ''; position: absolute; bottom: -8%; right: -8%;
          width: clamp(180px, 35vw, 380px); height: clamp(180px, 35vw, 380px); border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%); pointer-events: none;
        }

        .card {
          background: #fff; border-radius: clamp(14px, 3vw, 22px);
          padding: clamp(1.25rem, 3vw, 2rem) clamp(1.25rem, 5vw, 2.25rem) clamp(1.5rem, 5vw, 2.75rem);
          width: 100%; max-width: min(490px, 100%);
          box-shadow: 0 20px 60px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12);
          margin: auto 0; position: relative; z-index: 1;
        }

        .card-header { text-align: center; margin-bottom: clamp(0.75rem, 2vw, 1rem); }
        .brand-logo-wrap { width: 100px; height: 100px; overflow: visible; margin: 0 auto 0.25rem; display: flex; align-items: center; justify-content: center; }
        .brand-logo { width: 100px; height: 100px; object-fit: contain; display: block; }
        .card-title { font-size: clamp(1.25rem, 4.5vw, 1.6rem); font-weight: 700; color: #0f0e11; margin-bottom: 0.2rem; letter-spacing: -0.02em; }
        .card-subtitle { font-size: clamp(0.78rem, 2.3vw, 0.88rem); color: #6b7280; }

        .name-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(0.6rem, 2vw, 0.9rem); margin-bottom: clamp(0.75rem, 2.5vw, 1rem); }

        .form-group { margin-bottom: clamp(0.7rem, 2.5vw, 1rem); }
        .form-group label { display: block; font-size: clamp(0.75rem, 2vw, 0.85rem); font-weight: 600; color: #0f0e11; margin-bottom: 0.38rem; }

        .input-wrapper { position: relative; }
        .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; display: flex; align-items: center; }

        .form-input {
          width: 100%; padding: clamp(0.6rem, 2.5vw, 0.8rem) 1rem clamp(0.6rem, 2.5vw, 0.8rem) 2.45rem;
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

        .terms-row { display: flex; align-items: flex-start; gap: 0.55rem; margin-bottom: clamp(1rem, 3vw, 1.35rem); padding: 4px 0; }
        .custom-checkbox {
          width: clamp(16px, 3.5vw, 19px); height: clamp(16px, 3.5vw, 19px);
          border: 1.5px solid #d1d5db; border-radius: 4px; background: #fff;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s; flex-shrink: 0; margin-top: 2px; cursor: pointer;
        }
        .custom-checkbox.checked { background: #7c3aed; border-color: #7c3aed; }
        .custom-checkbox.err { border-color: #e63329; background: #fff8f8; }
        .terms-text { font-size: clamp(0.8rem, 2.3vw, 0.87rem); color: #374151; line-height: 1.5; user-select: none; }
        .terms-link {
          color: #7c3aed; font-weight: 600; text-decoration: underline;
          text-decoration-style: dotted; cursor: pointer;
          background: none; border: none; font-family: 'DM Sans', sans-serif;
          font-size: inherit; padding: 0; transition: opacity 0.2s; display: inline;
        }
        .terms-link:hover { opacity: 0.75; }

        .btn-primary {
          width: 100%; padding: clamp(0.75rem, 3vw, 0.9rem);
          background: linear-gradient(135deg, #5b6dee, #7c3aed); color: #fff;
          border: none; border-radius: 10px;
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

        .divider {
          display: flex; align-items: center; gap: 0.75rem;
          margin: 0.2rem 0 clamp(0.75rem, 2vw, 1rem);
          color: #9ca3af; font-size: clamp(0.72rem, 2vw, 0.82rem);
        }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

        .btn-outline {
          width: 100%; padding: clamp(0.72rem, 2.5vw, 0.875rem);
          background: transparent; color: #7c3aed; border: 1.5px solid #c4b5fd; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: clamp(0.84rem, 2.5vw, 0.92rem);
          font-weight: 600; cursor: pointer; text-align: center; text-decoration: none;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; -webkit-tap-highlight-color: transparent;
        }
        .btn-outline:hover { border-color: #7c3aed; background: #faf5ff; }

        .spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .notification {
          position: fixed; top: env(safe-area-inset-top, 1rem); left: 1rem; right: 1rem;
          padding: clamp(0.7rem, 2.5vw, 0.85rem) clamp(1rem, 3vw, 1.25rem);
          border-radius: 10px; color: #fff; font-weight: 600;
          font-size: clamp(0.78rem, 2.3vw, 0.88rem);
          z-index: 9999; transform: translateY(-10px); opacity: 0;
          transition: all 0.3s; pointer-events: none;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          display: flex; align-items: center; gap: 0.5rem; font-family: 'DM Sans', sans-serif;
        }
        .notification.visible { transform: translateY(0); opacity: 1; }
        .notification.success { background: #2d9b5a; }
        .notification.error { background: #e63329; }

        /* ── OTP MODAL ── */
        .otp-modal {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 400px;
          padding: 2rem 1.75rem 1.75rem;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          box-shadow: 0 32px 80px rgba(0,0,0,0.35);
          animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .otp-icon-wrap {
          width: 60px; height: 60px; border-radius: 16px;
          background: linear-gradient(135deg, #5b6dee, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1rem;
        }
        .otp-title { font-size: 1.3rem; font-weight: 700; color: #0f0e11; margin-bottom: 0.4rem; }
        .otp-subtitle { font-size: 0.875rem; color: #6b7280; line-height: 1.6; margin-bottom: 1.25rem; }
        .otp-input {
          width: 100%; padding: 0.85rem 1rem; text-align: center;
          font-size: 1.75rem; font-weight: 700; letter-spacing: 0.5rem;
          border: 1.5px solid #e5e7eb; border-radius: 12px; outline: none;
          font-family: 'DM Sans', sans-serif; color: #0f0e11;
          transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none;
        }
        .otp-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .otp-input.has-error { border-color: #e63329; background: #fff8f8; }
        .otp-error { font-size: 0.78rem; color: #e63329; font-weight: 500; margin-top: 0.4rem; }
        .otp-resend { font-size: 0.82rem; color: #9ca3af; margin-top: 1rem; }

        /* ── TERMS OF SERVICE MODAL ── */
        .tos-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(10, 8, 20, 0.65);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem; animation: backdropIn 0.25s ease;
        }
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }

        .tos-modal {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 580px; max-height: 88vh;
          display: flex; flex-direction: column;
          box-shadow: 0 32px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.15);
          animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); overflow: hidden;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.88) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .tos-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.4rem 1.6rem 1.1rem; border-bottom: 1.5px solid #f0eef9; flex-shrink: 0;
        }
        .tos-header-left { display: flex; align-items: center; gap: 0.85rem; }
        .tos-icon-wrap {
          width: 42px; height: 42px;
          background: linear-gradient(135deg, #5b6dee, #7c3aed);
          border-radius: 11px; display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
        }
        .tos-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: #0f0e11; letter-spacing: -0.02em; }
        .tos-subtitle { font-size: 0.72rem; color: #9ca3af; font-weight: 400; margin-top: 1px; }
        .tos-close-btn {
          width: 36px; height: 36px; border-radius: 8px;
          background: #f5f4f8; border: none; cursor: pointer; color: #6b7280;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.18s, color 0.18s; flex-shrink: 0;
        }
        .tos-close-btn:hover { background: #ede9fb; color: #7c3aed; }

        .tos-body {
          flex: 1; overflow-y: auto; padding: 1.4rem 1.6rem; scroll-behavior: smooth;
        }
        .tos-body::-webkit-scrollbar { width: 5px; }
        .tos-body::-webkit-scrollbar-track { background: #f5f4f8; border-radius: 99px; }
        .tos-body::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 99px; }

        .tos-intro {
          font-size: 0.87rem; color: #4b5563; line-height: 1.75;
          background: #faf9ff; border-left: 3px solid #7c3aed;
          padding: 0.9rem 1rem; border-radius: 0 8px 8px 0;
          margin-bottom: 1.5rem;
        }

        .tos-section { margin-bottom: 1.5rem; }
        .tos-section-badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 7px;
          background: #f0eef9; color: #7c3aed;
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.02em; margin-bottom: 0.6rem;
        }
        .tos-section-badge.accent { background: linear-gradient(135deg, #5b6dee, #7c3aed); color: #fff; }
        .tos-section-title {
          font-family: 'Playfair Display', serif; font-size: 1rem; color: #0f0e11;
          margin-bottom: 0.5rem; letter-spacing: -0.01em;
        }
        .tos-section p { font-size: 0.855rem; color: #4b5563; line-height: 1.75; font-weight: 400; }

        .highlight-section .tos-section-title { color: #1d4ed8; }
        .tos-highlight-box {
          background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
          border: 1.5px solid #c7d2fe; border-radius: 12px;
          padding: 1rem 1.1rem; display: flex; gap: 0.85rem; align-items: flex-start;
        }
        .highlight-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0; color: #fff; font-weight: 700;
          box-shadow: 0 3px 10px rgba(37,99,235,0.25);
        }
        .tos-list {
          list-style: none; margin: 0.6rem 0 0; padding: 0;
          display: flex; flex-direction: column; gap: 0.45rem;
        }
        .tos-list li {
          font-size: 0.845rem; color: #374151; line-height: 1.65;
          padding-left: 1.1rem; position: relative;
        }
        .tos-list li::before { content: '›'; position: absolute; left: 0; color: #7c3aed; font-weight: 700; }

        .tos-contact-box {
          background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 10px;
          padding: 1rem 1.1rem; font-size: 0.83rem; color: #4b5563; line-height: 1.6; margin-top: 0.5rem;
        }
        .tos-contact-box span { color: #7c3aed; font-weight: 600; }

        .tos-footer { padding: 1rem 1.6rem 1.3rem; border-top: 1.5px solid #f0eef9; flex-shrink: 0; }
        .tos-scroll-hint {
          text-align: center; font-size: 0.75rem; color: #9ca3af;
          margin-bottom: 0.75rem; animation: bounceHint 1.8s ease infinite;
        }
        @keyframes bounceHint { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
        .tos-footer-btns { display: flex; gap: 0.75rem; }
        .tos-btn-decline {
          flex: 1; padding: 0.72rem;
          background: transparent; color: #6b7280; border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .tos-btn-decline:hover { border-color: #d1d5db; background: #f9fafb; }
        .tos-btn-accept {
          flex: 2; padding: 0.72rem;
          background: #e5e7eb; color: #9ca3af; border: none; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 600;
          cursor: not-allowed; transition: all 0.3s;
        }
        .tos-btn-accept.ready {
          background: linear-gradient(135deg, #5b6dee, #7c3aed); color: #fff;
          cursor: pointer; box-shadow: 0 4px 14px rgba(124,58,237,0.35);
        }
        .tos-btn-accept.ready:hover { opacity: 0.9; transform: translateY(-1px); }

        @media (max-width: 359px) { .card { padding: 1.35rem 1rem; } .name-grid { grid-template-columns: 1fr; gap: 0; } }
        @media (min-width: 540px) { .notification { top: 1.5rem; right: 1.5rem; left: auto; max-width: 340px; } }
        @media (min-width: 768px) { .card { padding: 2rem 2.5rem 2.75rem; } .page { align-items: center; } }
        @media (max-width: 480px) { .tos-modal { max-height: 94vh; border-radius: 16px; } .tos-header { padding: 1.1rem 1.2rem 0.9rem; } .tos-body { padding: 1.1rem 1.2rem; } .tos-footer { padding: 0.9rem 1.2rem 1.1rem; } }
      `}</style>

      {showTos && (
        <TermsModal
          onClose={() => setShowTos(false)}
          onAccept={() => setField("terms", true)}
        />
      )}

      {showOtp && (
        <OtpModal
          email={otpEmail}
          onVerified={handleRegister}
          onClose={() => setShowOtp(false)}
        />
      )}

      <div className="page">
        <div className="card">
          <div className="card-header">
            <div className="brand-logo-wrap">
              <img
                src="/logo.png"
                alt="Jonayskie Prints"
                className="brand-logo"
              />
            </div>
            <h1 className="card-title">Create Account</h1>
            <p className="card-subtitle">
              Join our community — it&apos;s completely free!
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
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
                  placeholder="Password"
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

            <div className="terms-row">
              <div
                className={`custom-checkbox ${formData.terms ? "checked" : ""} ${errors.terms ? "err" : ""}`}
                onClick={() => setField("terms", !formData.terms)}
              >
                {formData.terms && <IconCheck />}
              </div>
              <span className="terms-text">
                I have read and agree to the{" "}
                <button
                  type="button"
                  className="terms-link"
                  onClick={() => setShowTos(true)}
                >
                  Terms of Service
                </button>
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

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner" /> Sending code…
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
