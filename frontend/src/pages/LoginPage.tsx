import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { useToast } from "@/components/Toast.tsx";
import { useLanguage } from "@/contexts/LanguageContext";
import { ApiError, getAuthConfig } from "@/lib/api.ts";
import Navbar from "@/components/Navbar";
import "./LoginPage.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    getAuthConfig().then((cfg) => setGoogleEnabled(cfg.google_enabled)).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError(t("login.errorRequired"));
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast(t("login.successToast"), "success");
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? t("login.errorInvalid") : err.message);
      } else {
        setError(t("login.errorGeneric"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <p className="auth-subtitle">{t("login.subtitle")}</p>
          </div>

        {googleEnabled && (
          <>
            <a href={`${API_BASE}/api/auth/google`} className="btn btn-google">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {t("login.googleSignIn")}
            </a>
            <div className="auth-divider">{t("login.or")}</div>
          </>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <p className="auth-error">{error}</p>}

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">
              {t("login.email")}
            </label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              {t("login.password")}
            </label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder={t("login.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: "100%" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>

        <div className="auth-divider">{t("login.or")}</div>

        <button
          type="button"
          className="btn btn-lg"
          style={{ width: "100%", background: "var(--neutral-100)", color: "var(--neutral-700)", border: "1px solid var(--neutral-300)" }}
          disabled={isSubmitting}
          onClick={async () => {
            setError("");
            setIsSubmitting(true);
            try {
              await login("antti@localnews.dev", "editor123");
              toast(t("login.guestSuccess"), "success");
              navigate("/");
            } catch {
              setError(t("login.guestFailed"));
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {t("login.guestSignIn")}
        </button>

        <div className="auth-footer">
          {t("login.noAccount")} <Link to="/signup">{t("login.signUp")}</Link>
        </div>
      </div>
    </div>
    </>
  );
}
