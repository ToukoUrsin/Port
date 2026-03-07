import type { ActiveUserInfo } from "@/lib/adminStats";
import "./ActiveUsersList.css";

interface ActiveUsersListProps {
  users: ActiveUserInfo[] | null;
}

export default function ActiveUsersList({ users }: ActiveUsersListProps) {
  const list = users ?? [];

  return (
    <div className="active-users">
      <h3 className="active-users__title">Active Users</h3>
      {list.length === 0 ? (
        <p className="active-users__empty">No active users</p>
      ) : (
        <ul className="active-users__list">
          {list.map((user) => (
            <li key={user.profile_id} className="active-users__item">
              <span className="active-users__dot" />
              <span className="active-users__name">
                {user.display_name || user.profile_id.slice(0, 8)}
              </span>
              <span className="active-users__ago">{user.last_seen_ago}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
