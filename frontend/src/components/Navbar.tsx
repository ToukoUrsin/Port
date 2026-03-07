import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { User } from "lucide-react";

interface NavbarProps {
  left?: ReactNode;
}

export default function Navbar({ left }: NavbarProps) {
  return (
    <nav className="home-nav">
      <div className="home-nav__left">
        {left}
      </div>

      <NavLink to="/" className="home-nav__brand" end>
        Local News
      </NavLink>

      <div className="home-nav__right">
        <NavLink to="/profile" className="home-nav__icon-btn" title="Profile">
          <User size={18} />
        </NavLink>
      </div>
    </nav>
  );
}
