export function getAppBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const isLocalhost =
    nextAuthUrl?.includes("localhost") ||
    nextAuthUrl?.includes("127.0.0.1") ||
    nextAuthUrl?.includes("0.0.0.0");
  const baseUrl = nextAuthUrl && !isLocalhost ? nextAuthUrl : "https://sp-cybersoft.com";

  return baseUrl.replace(/\/+$/, "");
}

export function buildAppUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getAppBaseUrl()}${normalizedPath}`;
}
