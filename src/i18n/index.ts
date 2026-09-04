import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

export type Locale = "fr" | "en";

void i18n.use(initReactI18next).init({
  resources,
  lng: "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;

export function localeTag(lng = i18n.language): string {
  return lng?.startsWith("en") ? "en-US" : "fr-FR";
}
