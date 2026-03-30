class User {
  constructor({ username, passwordHash, mustChangePassword = false }) {
    this.username = username;
    this.passwordHash = passwordHash;
    this.mustChangePassword = mustChangePassword;
  }
}

module.exports = User;
