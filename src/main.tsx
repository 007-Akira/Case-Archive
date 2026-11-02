import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, ProtectedRoute, AuthPage } from "./features/auth/Auth";
import { AppShell } from "./components/layout/AppShell";
const HomePage = lazy(() =>
  import("./features/cases/Home").then((module) => ({
    default: module.HomePage,
  })),
);
const ArchivePage = lazy(() =>
  import("./features/cases/Archive").then((module) => ({
    default: module.ArchivePage,
  })),
);
const EditorPage = lazy(() =>
  import("./features/cases/Editor").then((module) => ({
    default: module.EditorPage,
  })),
);
const ReaderPage = lazy(() =>
  import("./features/cases/Reader").then((module) => ({
    default: module.ReaderPage,
  })),
);
import { applyAppearance } from "./app/appearance";
const SettingsPage = lazy(() =>
  import("./features/settings/Settings").then((module) => ({
    default: module.SettingsPage,
  })),
);
import "@fontsource/geist/latin-400.css";
import "@fontsource/geist/latin-500.css";
import "@fontsource/geist/latin-600.css";
import "@fontsource/newsreader/latin-400.css";
import "@fontsource/newsreader/latin-500.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "./styles/index.css";
applyAppearance();
const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15000,
      refetchOnWindowFocus: false,
      gcTime: 0,
    },
    mutations: { retry: 0 },
  },
});
function Root() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    ),
    path: "/login",
  },
  {
    element: (
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    ),
    path: "/forgot-password",
  },
  {
    element: (
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    ),
    path: "/reset-password",
  },
  {
    element: <Root />,
    errorElement: (
      <div className="center">
        <h1>Unable to open this view.</h1>
        <p>Your unsaved notes may not have been persisted.</p>
        <Link to="/">Return home</Link>
      </div>
    ),
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "cases", element: <ArchivePage /> },
          { path: "cases/new", element: <EditorPage /> },
          { path: "cases/:id/edit", element: <EditorPage /> },
          { path: "cases/:id", element: <ReaderPage /> },
          { path: "settings", element: <SettingsPage /> },
          {
            path: "*",
            element: (
              <div>
                <h1>Page not found</h1>
                <Link to="/">Go home</Link>
              </div>
            ),
          },
        ],
      },
    ],
  },
]);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <Suspense
        fallback={
          <p className="center" role="status">
            Opening workspace…
          </p>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  </React.StrictMode>,
);
