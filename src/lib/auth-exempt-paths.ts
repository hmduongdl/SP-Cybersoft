/** Paths that bypass login middleware / NextAuth authorized checks. */
export function isAuthExemptPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/login/" ||
    pathname === "/maintenance" ||
    pathname.startsWith("/api/payment/webhook") ||
    pathname.startsWith("/api/build-pc/analyze-compatibility") ||
    pathname.startsWith("/api/cron/")
  );
}
