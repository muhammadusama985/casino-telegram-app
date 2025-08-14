import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import TonProvider from "./ton/TonProvider.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TonProvider>
      <App />
    </TonProvider>
  </React.StrictMode>
);
