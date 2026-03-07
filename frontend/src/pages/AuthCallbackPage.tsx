import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";

export default function AuthCallbackPage() {
  const { handleOAuthCallback } = useAuth();
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const isNew = params.get("is_new") === "true";

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    handleOAuthCallback(token)
      .then(() => navigate(isNew ? "/onboarding" : "/", { replace: true }))
      .catch(() => navigate("/login", { replace: true }));
  }, [handleOAuthCallback, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p>Signing you in...</p>
    </div>
  );
}
