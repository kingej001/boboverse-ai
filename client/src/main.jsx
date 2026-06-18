import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import SolanaProviders from "./lib/SolanaProviders.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SolanaProviders>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SolanaProviders>
  </React.StrictMode>
);
