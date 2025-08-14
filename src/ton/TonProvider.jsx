// src/ton/TonProvider.jsx
import { TonConnectUIProvider } from "@tonconnect/ui-react";

export default function TonProvider({ children }) {
  return (
    <TonConnectUIProvider
      manifestUrl={`${location.origin}/tonconnect-manifest.json`}
      uiPreferences={{ theme: "DARK" }}
      actionsConfiguration={{
        // If you’re running inside a Telegram Web App, set this to your bot link:
        // Example: 'https://t.me/<your_bot>?startapp'
        twaReturnUrl: undefined
      }}
    >
      {children}
    </TonConnectUIProvider>
  );
}
