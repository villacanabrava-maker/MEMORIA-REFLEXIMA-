// Only known app routes are valid login destinations. Never trust form/query URLs.
export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u0020\u007f]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://app.invalid");
    const allowed = url.pathname === "/" || /^\/biblioteca(?:\/novo|\/[0-9a-f-]{36}(?:\/editar)?)?$/i.test(url.pathname);
    return url.origin === "https://app.invalid" && allowed ? `${url.pathname}${url.search}` : "/";
  } catch {
    return "/";
  }
}
