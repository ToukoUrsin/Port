import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext.tsx";
import { ToastProvider } from "@/components/Toast.tsx";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute.tsx";
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
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:id" element={<ArticlePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/design-system" element={<DesignSystem />} />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <SignupPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/post"
              element={
                <ProtectedRoute>
                  <PostPage />
                </ProtectedRoute>
              }
            />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:slug" element={<ProfilePage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
