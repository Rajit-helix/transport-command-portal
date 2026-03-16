import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import "./styles.css";

if (import.meta.env.DEV && typeof window !== "undefined") {
  const { protocol, hostname, port, pathname, search, hash } = window.location;
  if (hostname === "localhost.com") {
    const targetPort = port ? `:${port}` : "";
    const targetUrl = `${protocol}//localhost${targetPort}${pathname}${search}${hash}`;
    window.location.replace(targetUrl);
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
