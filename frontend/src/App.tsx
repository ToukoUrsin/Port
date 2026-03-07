import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import DesignSystem from "./pages/DesignSystem";

function App() {
  return (
    <BrowserRouter>
      <nav
        style={{
          display: "flex",
          gap: "var(--space-4)",
          padding: "var(--space-3) var(--space-6)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <NavLink to="/design-system" style={{ color: "var(--color-text-link)" }}>
          Design System
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<DesignSystem />} />
        <Route path="/design-system" element={<DesignSystem />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
