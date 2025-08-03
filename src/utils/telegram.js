import WebApp from "@twa-dev/sdk";

export const initTelegram = () => {
  WebApp.ready();
  return WebApp.initDataUnsafe.user;
};
