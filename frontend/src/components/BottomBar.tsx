import { NavLink } from "react-router-dom";
import { Home, Compass, PenSquare } from "lucide-react";
import "./BottomBar.css";

export default function BottomBar() {
  return (
    <nav className="bottom-bar">
      <NavLink to="/" className="bottom-bar__item" end>
        <Home size={22} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/explore" className="bottom-bar__item">
        <Compass size={22} />
        <span>Explore</span>
      </NavLink>
      <NavLink to="/post" className="bottom-bar__item">
        <PenSquare size={22} />
        <span>Post</span>
      </NavLink>
    </nav>
  );
}
