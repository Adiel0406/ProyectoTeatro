import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { InfoPage } from "./InfoPage.tsx";
import { INFO_PAGES } from "./infoPages.ts";
import { MAIN_PAGES } from "./mainPages.ts";
import "../css/variables.css";
import "../css/styles.css";
import "../css/components.css";
import "./application.css";
import "./info-pages.css";

const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
const currentInfoPage = INFO_PAGES.find((page) => page.path === currentPath)?.slug;
const currentMainPage = MAIN_PAGES.find((page) => page.path === currentPath)?.slug ?? "home";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {currentInfoPage ? <InfoPage page={currentInfoPage} /> : <App page={currentMainPage} />}
  </React.StrictMode>,
);
