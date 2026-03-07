import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DesignSystem from "./pages/DesignSystem";
import ExplorePage from "./pages/ExplorePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PostPage from "./pages/PostPage";
import ProfilePage from "./pages/ProfilePage";
import ArticlePage from "./pages/ArticlePage";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/article/:id" element={<ArticlePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/design-system" element={<DesignSystem />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/post" element={<PostPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:slug" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
