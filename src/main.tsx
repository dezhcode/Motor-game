import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/game.css";
import "./ui/bitmap-ui.css";
import "./styles/fonts.css";
import "./ui/garage.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
