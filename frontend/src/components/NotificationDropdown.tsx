import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThumbsUp, ThumbsDown, MessageSquare, Newspaper, UserPlus } from "lucide-react";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import { NotifType, NotifTargetType } from "@/lib/types";
import type { ApiNotification } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import "./NotificationDropdown.css";

interface NotificationDropdownProps {
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

function timeAgo(dateStr: string, t: (key: string) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return t("time.minutesAgo").replace("{n}", String(diffMin));
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("time.hoursAgo").replace("{n}", String(diffH));
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return t("time.daysAgo").replace("{n}", String(diffD));
  return t("time.weeksAgo").replace("{n}", String(Math.floor(diffD / 7)));
}

function getNotifIcon(notif: ApiNotification) {
  switch (notif.type) {
    case NotifType.Like:
      return {
        icon: <ThumbsUp size={16} />,
        className: "notif-dropdown__icon--like",
      };
    case NotifType.Dislike:
      return {
        icon: <ThumbsDown size={16} />,
        className: "notif-dropdown__icon--dislike",
      };
    case NotifType.Reply:
      return {
        icon: <MessageSquare size={16} />,
        className: "notif-dropdown__icon--reply",
      };
    case NotifType.NewArticle:
      return {
        icon: <Newspaper size={16} />,
        className: "notif-dropdown__icon--article",
      };
    case NotifType.NewFollower:
      return {
        icon: <UserPlus size={16} />,
        className: "notif-dropdown__icon--follow",
      };
    default:
      return {
        icon: <ThumbsUp size={16} />,
        className: "notif-dropdown__icon--like",
      };
  }
}

function getNotifText(notif: ApiNotification, t: (key: string) => string): string {
  switch (notif.type) {
    case NotifType.Like:
      return notif.target_type === NotifTargetType.Reply
        ? t("notifications.likedReply")
        : t("notifications.likedArticle");
    case NotifType.Dislike:
      return notif.target_type === NotifTargetType.Reply
        ? t("notifications.dislikedReply")
        : t("notifications.dislikedArticle");
    case NotifType.Reply:
      return t("notifications.repliedToComment");
    case NotifType.NewArticle:
      return t("notifications.publishedArticle");
    case NotifType.NewFollower:
      return t("notifications.followedYou");
    default:
      return "";
  }
}

function getNotifLink(notif: ApiNotification): string {
  if (notif.type === NotifType.NewFollower) {
    return `/profile/${notif.actor_id}`;
  }
  if (notif.article_id) {
    return `/article/${notif.article_id}`;
  }
  return "/profile";
}

export default function NotificationDropdown({ onClose, onCountChange }: NotificationDropdownProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications({ limit: 20 })
      .then((res) => {
        setNotifications(res.notifications || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleMarkAllRead = useCallback(() => {
    markAllNotificationsRead().then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onCountChange?.(0);
    }).catch(() => {});
  }, [onCountChange]);

  const handleClick = useCallback((notif: ApiNotification) => {
    if (!notif.read) {
      markNotificationRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
      );
      onCountChange?.(-1);
    }
    onClose();
    navigate(getNotifLink(notif));
  }, [navigate, onClose, onCountChange]);

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <>
      <div className="notif-dropdown__overlay" onClick={onClose} />
      <div className="notif-dropdown">
        <div className="notif-dropdown__header">
          <h3 className="notif-dropdown__title">{t("notifications.title")}</h3>
          {hasUnread && (
            <button className="notif-dropdown__mark-read" onClick={handleMarkAllRead}>
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>

        <ul className="notif-dropdown__list">
          {loading ? (
            <li className="notif-dropdown__empty">...</li>
          ) : notifications.length === 0 ? (
            <li className="notif-dropdown__empty">{t("notifications.empty")}</li>
          ) : (
            notifications.map((notif) => {
              const { icon, className } = getNotifIcon(notif);
              return (
                <li key={notif.id}>
                  <div
                    className={`notif-dropdown__item ${!notif.read ? "notif-dropdown__item--unread" : ""}`}
                    onClick={() => handleClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleClick(notif)}
                  >
                    <div className={`notif-dropdown__icon ${className}`}>{icon}</div>
                    <div className="notif-dropdown__content">
                      <p className="notif-dropdown__text">
                        <span className="notif-dropdown__actor">{notif.actor_name}</span>{" "}
                        {getNotifText(notif, t)}
                        {notif.article_title && (
                          <>
                            {" "}
                            <span className="notif-dropdown__article-title">
                              {notif.article_title}
                            </span>
                          </>
                        )}
                      </p>
                      <div className="notif-dropdown__time">
                        {timeAgo(notif.created_at, t)}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <div className="notif-dropdown__footer">
          <Link to="/profile" onClick={onClose}>
            {t("notifications.seeAll")}
          </Link>
        </div>
      </div>
    </>
  );
}
