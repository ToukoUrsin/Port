import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { Loader2, CheckCircle, XCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import {
  updateProfile,
  changePassword,
  checkProfileName,
  setToken,
  ApiError,
} from "@/lib/api";
import type { ApiProfile, ProfileMeta } from "@/lib/types";
import "./AccountSettings.css";

const NAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const CONSECUTIVE_HYPHENS = /--/;

type NameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "current";

function validateName(name: string): string | null {
  if (name.length < 3) return "Must be at least 3 characters";
  if (name.length > 30) return "Must be 30 characters or fewer";
  if (CONSECUTIVE_HYPHENS.test(name)) return "No consecutive hyphens";
  if (!NAME_REGEX.test(name))
    return "Only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.";
  return null;
}

function Toggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`toggle-switch ${active ? "toggle-switch--active" : ""}`}
      onClick={onToggle}
      role="switch"
      aria-checked={active}
    >
      <span className="toggle-switch__knob" />
    </button>
  );
}

export default function AccountSettings() {
  const { user, logout, updateUser, refreshUser } = useAuth();
  const { toast } = useToast();

  if (!user) return null;

  return (
    <div className="settings-sections">
      <ProfileSettings user={user} updateUser={updateUser} refreshUser={refreshUser} toast={toast} />
      {user.has_password && <PasswordSettings toast={toast} />}
      <NotificationSettings user={user} updateUser={updateUser} toast={toast} />
      <AccountActions logout={logout} />
    </div>
  );
}

// --- Profile Settings ---

function ProfileSettings({
  user,
  updateUser: _updateUser,
  refreshUser,
  toast,
}: {
  user: ApiProfile;
  updateUser: (u: Partial<ApiProfile>) => void;
  refreshUser: () => Promise<void>;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [profileName, setProfileName] = useState(user.profile_name);
  const [nameStatus, setNameStatus] = useState<NameStatus>("current");
  const [nameError, setNameError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user.meta?.first_name ?? "");
  const [lastName, setLastName] = useState(user.meta?.last_name ?? "");
  const [bio, setBio] = useState(user.meta?.bio ?? "");
  const [website, setWebsite] = useState(user.meta?.website ?? "");
  const [isPublic, setIsPublic] = useState(user.public);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const checkName = useCallback(
    (value: string) => {
      clearTimeout(debounceRef.current);

      if (value === user.profile_name) {
        setNameStatus("current");
        setNameError(null);
        return;
      }

      const error = validateName(value);
      if (error) {
        setNameStatus("invalid");
        setNameError(error);
        return;
      }

      setNameError(null);
      setNameStatus("checking");
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await checkProfileName(value);
          setNameStatus(res.available ? "available" : "taken");
        } catch {
          setNameStatus("idle");
        }
      }, 400);
    },
    [user.profile_name],
  );

  function handleNameChange(value: string) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setProfileName(normalized);
    if (normalized.length === 0) {
      setNameStatus("idle");
      setNameError(null);
      return;
    }
    checkName(normalized);
  }

  const nameIcon =
    nameStatus === "checking" ? (
      <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
    ) : nameStatus === "available" ? (
      <CheckCircle size={20} style={{ color: "var(--color-success, #16a34a)" }} />
    ) : nameStatus === "taken" ? (
      <XCircle size={20} style={{ color: "var(--color-error)" }} />
    ) : null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (nameStatus === "taken" || nameStatus === "invalid" || nameStatus === "checking") return;

    setSaving(true);
    try {
      const meta: ProfileMeta = {
        ...user.meta,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        bio: bio || undefined,
        website: website || undefined,
      };

      const updates: Record<string, unknown> = { meta };
      if (profileName !== user.profile_name) {
        updates.profile_name = profileName;
      }
      updates.public = isPublic;

      await updateProfile(user.id, updates as Partial<ApiProfile>);
      await refreshUser();
      toast("Profile updated", "success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNameStatus("taken");
        toast("Username already taken", "error");
      } else {
        toast("Failed to update profile", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  const canSave = nameStatus !== "taken" && nameStatus !== "invalid" && nameStatus !== "checking";

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">Profile Settings</h2>
      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-name">
            Display name
          </label>
          <div className="settings-name-wrapper">
            <input
              id="settings-name"
              className="input"
              type="text"
              value={profileName}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={30}
              autoComplete="off"
            />
            <span className="settings-name-icon">{nameIcon}</span>
          </div>
          {nameError && (
            <span className="settings-error">{nameError}</span>
          )}
          {nameStatus === "taken" && !nameError && (
            <span className="settings-error">Already taken</span>
          )}
          {nameStatus === "available" && (
            <span className="settings-success">Available</span>
          )}
        </div>

        <div className="settings-field__row">
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="settings-first">
              First name
            </label>
            <input
              id="settings-first"
              className="input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="settings-last">
              Last name
            </label>
            <input
              id="settings-last"
              className="input"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-bio">
            Bio
          </label>
          <textarea
            id="settings-bio"
            className="input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself"
            rows={3}
          />
        </div>

        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-website">
            Website
          </label>
          <input
            id="settings-website"
            className="input"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <div className="settings-toggle">
          <div className="settings-toggle__info">
            <span className="settings-toggle__label">Public profile</span>
            <span className="settings-toggle__desc">Allow others to see your profile</span>
          </div>
          <Toggle active={isPublic} onToggle={() => setIsPublic(!isPublic)} />
        </div>

        <div className="settings-form__footer">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !canSave}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

// --- Password Settings ---

function PasswordSettings({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPw.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPw !== confirmPw) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const res = await changePassword(currentPw, newPw);
      setToken(res.access_token);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast("Password changed successfully", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Current password is incorrect");
        } else if (err.status === 429) {
          setError("Too many attempts. Please try again later.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">Change Password</h2>
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-current-pw">
            Current password
          </label>
          <input
            id="settings-current-pw"
            className="input"
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-new-pw">
            New password
          </label>
          <input
            id="settings-new-pw"
            className="input"
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <span className="settings-field__hint">Minimum 8 characters</span>
        </div>

        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-confirm-pw">
            Confirm new password
          </label>
          <input
            id="settings-confirm-pw"
            className="input"
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {error && <p className="settings-error">{error}</p>}

        <div className="settings-form__footer">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !currentPw || !newPw || !confirmPw}
          >
            {saving ? "Changing..." : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}

// --- Notification Settings ---

function NotificationSettings({
  user,
  updateUser,
  toast,
}: {
  user: ApiProfile;
  updateUser: (u: Partial<ApiProfile>) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [emailNotify, setEmailNotify] = useState(user.meta?.notify_email ?? false);
  const [pushNotify, setPushNotify] = useState(user.meta?.notify_push ?? false);

  async function handleToggle(field: "notify_email" | "notify_push", value: boolean) {
    const setter = field === "notify_email" ? setEmailNotify : setPushNotify;
    setter(value);

    const meta: ProfileMeta = {
      ...user.meta,
      [field]: value,
    };

    try {
      await updateProfile(user.id, { meta } as Partial<ApiProfile>);
      updateUser({ meta: { ...user.meta, [field]: value } });
    } catch {
      setter(!value);
      toast("Failed to update notification settings", "error");
    }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">Notifications</h2>
      <div className="settings-form">
        <div className="settings-toggle">
          <div className="settings-toggle__info">
            <span className="settings-toggle__label">Email notifications</span>
            <span className="settings-toggle__desc">Receive updates via email</span>
          </div>
          <Toggle
            active={emailNotify}
            onToggle={() => handleToggle("notify_email", !emailNotify)}
          />
        </div>
        <div className="settings-toggle">
          <div className="settings-toggle__info">
            <span className="settings-toggle__label">Push notifications</span>
            <span className="settings-toggle__desc">Receive browser push notifications</span>
          </div>
          <Toggle
            active={pushNotify}
            onToggle={() => handleToggle("notify_push", !pushNotify)}
          />
        </div>
      </div>
    </section>
  );
}

// --- Account Actions ---

function AccountActions({ logout }: { logout: () => Promise<void> }) {
  return (
    <section className="settings-section settings-section--danger">
      <h2 className="settings-section__title">Account</h2>
      <div className="settings-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={logout}
        >
          <LogOut size={16} />
          Log out
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled
          title="Coming soon"
        >
          Delete account
        </button>
      </div>
    </section>
  );
}
