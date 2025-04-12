import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext"; // Import AuthProvider

import { TempoDevtools } from "tempo-devtools";
TempoDevtools.init();

const basename = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Wrap BrowserRouter with AuthProvider */}
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
);
