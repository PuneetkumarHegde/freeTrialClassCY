/**
 * Normalizes PostgreSQL connection URLs, ensuring special characters in the password
 * are URL-encoded so that standard connection parsers (Prisma, pg) parse host and port accurately.
 */
export function normalizeDatabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  try {
    const protocolIdx = rawUrl.indexOf('://');
    if (protocolIdx === -1) return rawUrl;
    const protocol = rawUrl.substring(0, protocolIdx + 3);
    const rest = rawUrl.substring(protocolIdx + 3);
    const atIdx = rest.lastIndexOf('@');
    if (atIdx === -1) return rawUrl;
    const userPass = rest.substring(0, atIdx);
    const hostRest = rest.substring(atIdx + 1);
    const colonIdx = userPass.indexOf(':');
    if (colonIdx === -1) return rawUrl;
    const user = userPass.substring(0, colonIdx);
    const pass = userPass.substring(colonIdx + 1);

    // Decode first to prevent double-encoding, then safely encode
    const decodedUser = decodeURIComponent(user);
    const decodedPass = decodeURIComponent(pass);
    return `${protocol}${encodeURIComponent(decodedUser)}:${encodeURIComponent(decodedPass)}@${hostRest}`;
  } catch {
    return rawUrl;
  }
}
