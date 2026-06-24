// Next.js 16: "middleware" artık "proxy" olarak adlandırılır.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // api, _next ve uzantılı dosyalar hariç tüm yollar
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
