const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

const BLOCKED_EMAIL_DOMAINS = new Set([
  'gail.com',
  'gmial.com',
]);

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);

  if (!email || !EMAIL_REGEX.test(email)) {
    return false;
  }

  const parts = email.split('@');

  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;

  if (!localPart || !domain) {
    return false;
  }

  if (BLOCKED_EMAIL_DOMAINS.has(domain)) {
    return false;
  }

  const domainParts = domain.split('.');

  if (domainParts.length < 2) {
    return false;
  }

  if (domainParts.some((part) => !part)) {
    return false;
  }

  const extension = domainParts[domainParts.length - 1];

  if (!/^[A-Za-z]{2,63}$/.test(extension)) {
    return false;
  }

  return true;
}