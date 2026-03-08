"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Pass ?welcome=true so the dashboard knows to show the welcome toast
    router.replace("/user/dashboard?welcome=true");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "linear-gradient(135deg,#5b6dee 0%,#7c3aed 50%,#a855f7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
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
      <p
        style={{ color: "#fff", fontFamily: "sans-serif", fontSize: "0.9rem" }}
      >
        Signing you in...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
