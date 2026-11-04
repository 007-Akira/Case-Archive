export function recoveryLinkError(search: string, hash: string) {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  if (
    query.has("error") ||
    query.has("error_code") ||
    fragment.has("error") ||
    fragment.has("error_code")
  ) {
    return "This recovery link has expired or has already been used. Request a new link and open the latest email.";
  }
  return "";
}
