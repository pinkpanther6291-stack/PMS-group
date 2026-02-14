export function isEmailStrict(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  // local part must contain at least one alphabetic character
  if (!/[A-Za-z]/.test(local)) return false;
  // basic domain validation: contains a dot and valid chars
  if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(domain)) return false;
  return true;
}
