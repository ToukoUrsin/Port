import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import "./LoginPage.css";

export default function LoginPage() {
  return (
    <>
      <Navbar
        left={
          <Link to="/" className="home-nav__icon-btn" title="Back">
            <ArrowLeft size={18} />
          </Link>
        }
      />
      <div className="auth-page">
        <div className="auth-card">
        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
            Sign in
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
    </>
  );
}
