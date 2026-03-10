import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except those starting with:
    // - api, _next, _vercel, monitoring
    // - files with extensions (e.g. favicon.ico)
    "/((?!api|_next|_vercel|monitoring|.*\\..*).*)",
  ],
};
