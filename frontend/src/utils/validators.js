export const PASSWORD_MIN_LENGTH = 8
const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 50
const MAX_EMAIL_LENGTH = 254 // même limite que le serveur
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value.trim())
}

export function validateRegisterForm({ username, email, password, confirmPassword, associate }) {
  const errors = {}
  const trimmedUsername = username.trim()

  if (!trimmedUsername) {
    errors.username = "Le nom d'utilisateur est obligatoire."
  } else if (trimmedUsername.length < USERNAME_MIN_LENGTH) {
    errors.username = `Le nom d'utilisateur doit contenir au moins ${USERNAME_MIN_LENGTH} caractères.`
  } else if (trimmedUsername.length > USERNAME_MAX_LENGTH) {
    errors.username = `Le nom d'utilisateur ne doit pas dépasser ${USERNAME_MAX_LENGTH} caractères.`
  }

  if (!email.trim()) {
    errors.email = "L'adresse email est obligatoire."
  } else if (!isValidEmail(email)) {
    errors.email = "Veuillez saisir une adresse email valide."
  }

  if (!password) {
    errors.password = 'Le mot de passe est obligatoire.'
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Veuillez confirmer votre mot de passe.'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Les mots de passe ne correspondent pas.'
  }

  if (!associate) {
    errors.associate = 'Veuillez choisir votre nom.'
  }

  return errors
}

export function validateLoginForm({ email, password }) {
  const errors = {}
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    errors.email = "L'adresse email est obligatoire."
  } else if (trimmedEmail.length > MAX_EMAIL_LENGTH || !isValidEmail(trimmedEmail)) {
    errors.email = 'Veuillez saisir une adresse email valide.'
  }

  if (!password) {
    errors.password = 'Le mot de passe est obligatoire.'
  }

  return errors
}
