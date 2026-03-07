import { Link } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-masthead">The Local Herald</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

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
  );
}
