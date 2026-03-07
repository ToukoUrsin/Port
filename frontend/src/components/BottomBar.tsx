import { NavLink } from "react-router-dom";
import { Home, Compass, PenSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import "./BottomBar.css";

export default function BottomBar() {
  const { t } = useLanguage();
  return (
    <nav className="bottom-bar">
      <NavLink to="/" className="bottom-bar__item" end>
        <Home size={22} />
        <span>{t("bottomBar.home")}</span>
      </NavLink>
      <NavLink to="/explore" className="bottom-bar__item">
        <Compass size={22} />
        <span>{t("bottomBar.explore")}</span>
      </NavLink>
      <NavLink to="/post" className="bottom-bar__item">
        <PenSquare size={22} />
        <span>{t("bottomBar.post")}</span>
      </NavLink>
    </nav>
  );
}
