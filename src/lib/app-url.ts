export function getAppBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://sp-cybersoft.com";

  return baseUrl.replace(/\/+$/, "");
}

export function buildAppUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getAppBaseUrl()}${normalizedPath}`;
}
