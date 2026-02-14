// Small validation helpers used by auth controllers
function validateName(name) {
  if (!name) return false;
  // allow letters and spaces only (ASCII); adjust if you need unicode support
  const re = /^[A-Za-z\s]+$/;
  return re.test(String(name).trim());
}

function validatePassword(password) {
  if (!password) return false;
  // min 8 chars, at least one letter, one digit and one special character
  const re = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return re.test(String(password));
}

module.exports = { validateName, validatePassword };
