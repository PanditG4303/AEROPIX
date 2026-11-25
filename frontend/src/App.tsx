import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout, MarketingLayout } from "./components/layout/Layouts";
import { GuestOnlyRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { PageLoader } from "./components/ui/Feedback";

const LandingPage = lazy(() => import("./pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const GalleryPage = lazy(() => import("./pages/GalleryPage").then((module) => ({ default: module.GalleryPage })));
const UploadPage = lazy(() => import("./pages/UploadPage").then((module) => ({ default: module.UploadPage })));
const AlbumsPage = lazy(() => import("./pages/AlbumsPage").then((module) => ({ default: module.AlbumsPage })));
const AlbumDetailPage = lazy(() => import("./pages/AlbumDetailPage").then((module) => ({ default: module.AlbumDetailPage })));
const ImageDetailPage = lazy(() => import("./pages/ImageDetailPage").then((module) => ({ default: module.ImageDetailPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function RouteFallback() {
  return (
    <div className="route-fallback">
      <PageLoader label="Loading AEROPIX" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route index element={<LandingPage />} />
          </Route>

          <Route
            path="/login"
            element={
              <GuestOnlyRoute>
                <LoginPage />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestOnlyRoute>
                <RegisterPage />
              </GuestOnlyRoute>
            }
          />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="albums" element={<AlbumsPage />} />
            <Route path="albums/:albumId" element={<AlbumDetailPage />} />
            <Route path="images/:imageId" element={<ImageDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="/gallery" element={<Navigate to="/app/gallery" replace />} />
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/albums" element={<Navigate to="/app/albums" replace />} />
          <Route path="/upload" element={<Navigate to="/app/upload" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
