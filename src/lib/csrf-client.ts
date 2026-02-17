/**
 * Reads the CSRF token from the __csrf cookie on the client side.
 * Returns the token string or an empty string if not found.
 */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("__csrf="));

  return match ? match.split("=")[1] : "";
}
