import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext.tsx";
import { AuthProvider } from "@/contexts/AuthContext.tsx";
import { ToastProvider } from "@/components/Toast.tsx";
import { ConfirmProvider } from "@/components/ConfirmDialog.tsx";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute.tsx";
import HomePage from "./pages/HomePage";
import DesignSystem from "./pages/DesignSystem";
import ExplorePage from "./pages/ExplorePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PostPage from "./pages/PostPage";
import ProfilePage from "./pages/ProfilePage";
import ArticlePage from "./pages/ArticlePage";
import SearchPage from "./pages/SearchPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import OnboardingPage from "./pages/OnboardingPage";

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:id" element={<ArticlePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/design-system" element={<DesignSystem />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
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
            {/* <Route path="/pitch" element={<PitchDeck />} /> */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/profile/:slug" element={<ProfilePage />} />
          </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
