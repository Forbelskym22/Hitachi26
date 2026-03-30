const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/UserRepository');
const User = require('../models/User');

class AuthService {
  async login(username, password) {
    const user = userRepo.findByUsername(username);
    if (!user) throw new Error('Neplatné přihlašovací údaje');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new Error('Neplatné přihlašovací údaje');

    return user;
  }

  async changePassword(username, newPassword) {
    const user = userRepo.findByUsername(username);
    if (!user) throw new Error('Uživatel nenalezen');

    const hash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hash;
    user.mustChangePassword = false;
    userRepo.save(user);

    return user;
  }
}

module.exports = new AuthService();
