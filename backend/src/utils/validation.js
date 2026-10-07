function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function isValidEmail(value) {
  const email = normalizeEmail(value)

  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/.test(email)
}

module.exports = {
  normalizeEmail,
  isValidEmail,
}