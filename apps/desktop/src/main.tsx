import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { WorkspaceProvider } from "./workspace";
import "./styles.css";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    console.error("The workspace could not render. Reload to recover.");
  }
  render() {
    return this.state.error ? (
      <main>
        <h1>AutoPrint needs to reload</h1>
        <button onClick={() => location.reload()}>Reload workspace</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
