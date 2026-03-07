import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { Loader2, CheckCircle, XCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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

function validateName(name: string, t: (key: string) => string): string | null {
  if (name.length < 3) return t("settings.validMinChars");
  if (name.length > 30) return t("settings.validMaxChars");
  if (CONSECUTIVE_HYPHENS.test(name)) return t("settings.validNoHyphens");
  if (!NAME_REGEX.test(name)) return t("settings.validFormat");
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
  const { t } = useLanguage();
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

      const error = validateName(value, t);
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
      toast(t("settings.profileUpdated"), "success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNameStatus("taken");
        toast(t("settings.usernameTaken"), "error");
      } else {
        toast(t("settings.updateFailed"), "error");
      }
    } finally {
      setSaving(false);
    }
  }

  const canSave = nameStatus !== "taken" && nameStatus !== "invalid" && nameStatus !== "checking";

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{t("settings.profileTitle")}</h2>
      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-name">
            {t("settings.displayName")}
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
            <span className="settings-error">{t("settings.alreadyTaken")}</span>
          )}
          {nameStatus === "available" && (
            <span className="settings-success">{t("settings.available")}</span>
          )}
        </div>

        <div className="settings-field__row">
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="settings-first">
              {t("settings.firstName")}
            </label>
            <input
              id="settings-first"
              className="input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("settings.firstName")}
            />
          </div>
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="settings-last">
              {t("settings.lastName")}
            </label>
            <input
              id="settings-last"
              className="input"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("settings.lastName")}
            />
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-bio">
            {t("settings.bio")}
          </label>
          <textarea
            id="settings-bio"
            className="input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("settings.bioPlaceholder")}
            rows={3}
          />
        </div>

        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-website">
            {t("settings.website")}
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
            <span className="settings-toggle__label">{t("settings.publicProfile")}</span>
            <span className="settings-toggle__desc">{t("settings.publicProfileDesc")}</span>
          </div>
          <Toggle active={isPublic} onToggle={() => setIsPublic(!isPublic)} />
        </div>

        <div className="settings-form__footer">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !canSave}
          >
            {saving ? t("settings.saving") : t("settings.saveChanges")}
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
  const { t } = useLanguage();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPw.length < 8) {
      setError(t("settings.passwordTooShort"));
      return;
    }
    if (newPw !== confirmPw) {
      setError(t("settings.passwordsDontMatch"));
      return;
    }

    setSaving(true);
    try {
      const res = await changePassword(currentPw, newPw);
      setToken(res.access_token);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast(t("settings.passwordChanged"), "success");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError(t("settings.currentPwIncorrect"));
        } else if (err.status === 429) {
          setError(t("settings.tooManyAttempts"));
        } else {
          setError(err.message);
        }
      } else {
        setError(t("settings.somethingWrong"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{t("settings.changePassword")}</h2>
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-current-pw">
            {t("settings.currentPassword")}
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
            {t("settings.newPassword")}
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
          <span className="settings-field__hint">{t("settings.minChars")}</span>
        </div>

        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-confirm-pw">
            {t("settings.confirmNewPassword")}
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
            {saving ? t("settings.changingPassword") : t("settings.changePasswordBtn")}
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
  const { t } = useLanguage();
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
      toast(t("settings.notificationsFailed"), "error");
    }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{t("settings.notifications")}</h2>
      <div className="settings-form">
        <div className="settings-toggle">
          <div className="settings-toggle__info">
            <span className="settings-toggle__label">{t("settings.emailNotifications")}</span>
            <span className="settings-toggle__desc">{t("settings.emailNotificationsDesc")}</span>
          </div>
          <Toggle
            active={emailNotify}
            onToggle={() => handleToggle("notify_email", !emailNotify)}
          />
        </div>
        <div className="settings-toggle">
          <div className="settings-toggle__info">
            <span className="settings-toggle__label">{t("settings.pushNotifications")}</span>
            <span className="settings-toggle__desc">{t("settings.pushNotificationsDesc")}</span>
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
  const { t } = useLanguage();
  return (
    <section className="settings-section settings-section--danger">
      <h2 className="settings-section__title">{t("settings.account")}</h2>
      <div className="settings-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={logout}
        >
          <LogOut size={16} />
          {t("settings.logOut")}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled
          title={t("settings.comingSoon")}
        >
          {t("settings.deleteAccount")}
        </button>
      </div>
    </section>
  );
}
