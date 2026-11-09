/** Default ops inbox when OWNER_EMAIL is not set in env. */
export const DEFAULT_OWNER_EMAIL = "truekinspection@gmail.com";

/** Owner / ops inbox from env, falling back to the TrueK Gmail inbox. */
export function getOwnerEmail(): string {
  const raw = process.env.OWNER_EMAIL?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_OWNER_EMAIL;
}

export function shouldSendOwnerCopy(customerEmail: string): boolean {
  const owner = getOwnerEmail();
  if (!owner) return false;
  return owner.toLowerCase() !== customerEmail.trim().toLowerCase();
}
