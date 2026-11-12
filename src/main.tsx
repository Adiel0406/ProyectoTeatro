import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "../css/variables.css";
import "../css/styles.css";
import "../css/components.css";
import "./application.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
