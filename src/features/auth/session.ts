export type ArchiveSessionStatus = {
  approved: boolean;
  expires_at: string | null;
};
export function sessionExpired(expiresAt: string | null, now = Date.now()) {
  return (
    !expiresAt ||
    !Number.isFinite(Date.parse(expiresAt)) ||
    Date.parse(expiresAt) <= now
  );
}
