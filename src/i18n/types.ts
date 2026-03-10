import en from "../../messages/en.json";

// This type is derived from the English (source) translation file.
// When you add new keys to en.json, TypeScript will automatically
// enforce that all usages of useTranslations/getTranslations are valid.
type Messages = typeof en;

declare global {
  // next-intl uses this interface to type useTranslations/getTranslations
  interface IntlMessages extends Messages {}
}
