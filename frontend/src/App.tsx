import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DesignSystem from "./pages/DesignSystem";
import ExplorePage from "./pages/ExplorePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PostPage from "./pages/PostPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/design-system" element={<DesignSystem />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/post" element={<PostPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
