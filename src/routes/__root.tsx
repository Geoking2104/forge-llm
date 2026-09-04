import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import i18n from "@/i18n";
import appCss from "../styles.css?url";

const APP_NAME = "Forge";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Compare workstations and local LLMs: VRAM, bandwidth, tokens per second. Quelle station pour votre modèle — quel modèle pour votre station.",
      },
      { name: "theme-color", content: "#f5f5f7" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="fr" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <TooltipProvider delayDuration={250}>
              <Outlet />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </I18nextProvider>
        <Scripts />
      </body>
    </html>
  ),
});
