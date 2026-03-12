import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru", "es", "fr"],
  defaultLocale: "en",
});
