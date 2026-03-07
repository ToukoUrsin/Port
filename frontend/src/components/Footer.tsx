import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import "./Footer.css";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div>
            <div className="site-footer__brand">Local News</div>
            <p className="site-footer__desc">{t("footer.desc")}</p>
          </div>

          <div>
            <div className="site-footer__nav-title">{t("footer.navigate")}</div>
            <ul className="site-footer__nav-list">
              <li><Link to="/">{t("bottomBar.home")}</Link></li>
              <li><Link to="/explore">{t("bottomBar.explore")}</Link></li>
              <li><Link to="/post">{t("navbar.post")}</Link></li>
              <li><Link to="/search">{t("search.title")}</Link></li>
            </ul>
          </div>

          <div>
            <div className="site-footer__nav-title">{t("footer.about")}</div>
            <ul className="site-footer__nav-list">
              <li><a href="mailto:hello@localnews.fi">{t("footer.contact")}</a></li>
              <li><Link to="/">{t("footer.terms")}</Link></li>
              <li><Link to="/">{t("footer.privacy")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>&copy; {new Date().getFullYear()} Local News</span>
          <span>{t("footer.madeWith")}</span>
        </div>
      </div>
    </footer>
  );
}
