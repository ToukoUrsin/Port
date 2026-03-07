import { useState, useCallback, useRef, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { checkProfileName, updateProfile, ApiError } from "@/lib/api.ts";
import Navbar from "@/components/Navbar.tsx";
import "./OnboardingPage.css";
import "./LoginPage.css";

const NAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const CONSECUTIVE_HYPHENS = /--/;

type NameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

function validateName(name: string): string | null {
  if (name.length < 3) return "Must be at least 3 characters";
  if (name.length > 30) return "Must be 30 characters or fewer";
  if (CONSECUTIVE_HYPHENS.test(name)) return "No consecutive hyphens";
  if (!NAME_REGEX.test(name))
    return "Only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.";
  return null;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState<NameStatus>("idle");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const checkAvailability = useCallback((value: string) => {
    clearTimeout(debounceRef.current);
    const error = validateName(value);
    if (error) {
      setNameStatus("invalid");
      setValidationError(error);
      return;
    }
    setValidationError(null);
    setNameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await checkProfileName(value);
        setNameStatus(res.available ? "available" : "taken");
      } catch {
        setNameStatus("idle");
      }
    }, 400);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  function handleChange(value: string) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setName(normalized);
    setSubmitError(null);
    if (normalized.length === 0) {
      setNameStatus("idle");
      setValidationError(null);
      return;
    }
    checkAvailability(normalized);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || nameStatus !== "available") return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateProfile(user.id, { profile_name: name });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNameStatus("taken");
        setSubmitError("That username was just taken. Try another.");
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const statusIcon =
    nameStatus === "checking" ? (
      <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
    ) : nameStatus === "available" ? (
      <CheckCircle size={20} style={{ color: "var(--color-success, #16a34a)" }} />
    ) : nameStatus === "taken" ? (
      <XCircle size={20} style={{ color: "var(--color-error)" }} />
    ) : null;

  return (
    <>
      <Navbar />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-masthead">Welcome!</h1>
            <p className="auth-subtitle">Choose your username</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="profile-name">
                Username
              </label>
              <div className="onboarding-input-wrapper">
                <input
                  id="profile-name"
                  className="input"
                  type="text"
                  value={name}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder="your-username"
                  autoFocus
                  autoComplete="off"
                  maxLength={30}
                />
                <span className="onboarding-input-icon">{statusIcon}</span>
              </div>
              {validationError && (
                <p className="onboarding-hint" style={{ color: "var(--color-error)" }}>
                  {validationError}
                </p>
              )}
              {nameStatus === "taken" && !validationError && (
                <p className="onboarding-hint" style={{ color: "var(--color-error)" }}>
                  Already taken
                </p>
              )}
              {nameStatus === "available" && (
                <p className="onboarding-hint" style={{ color: "var(--color-success, #16a34a)" }}>
                  Available
                </p>
              )}
              {nameStatus === "idle" && name.length === 0 && (
                <p className="onboarding-hint">
                  3-30 characters. Lowercase letters, numbers, and hyphens.
                </p>
              )}
            </div>

            {submitError && <p className="auth-error">{submitError}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || nameStatus !== "available"}
            >
              {submitting ? "Saving..." : "Continue"}
            </button>
          </form>

          <button
            type="button"
            className="onboarding-skip"
            onClick={() => navigate("/", { replace: true })}
          >
            Skip for now
          </button>
        </div>
      </div>
    </>
  );
}
