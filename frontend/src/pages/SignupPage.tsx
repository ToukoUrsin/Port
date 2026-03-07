import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import "./LoginPage.css";

export default function SignupPage() {
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
          <div className="auth-header">
            <p className="auth-subtitle">Create your account</p>
          </div>

        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              className="input"
              type="text"
              placeholder="Jane Doe"
            />
          </div>

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
              placeholder="Create a password"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              id="confirm-password"
              className="input"
              type="password"
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
            Create account
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
    </>
  );
}
