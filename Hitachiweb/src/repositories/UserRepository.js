const bcrypt = require('bcryptjs');
const User = require('../models/User');

// In-memory store — nahradit DB vrstvou dle potřeby
const users = new Map();

// Seed: výchozí admin účet s heslem "admin" (mustChangePassword = true)
(async () => {
  const hash = await bcrypt.hash('admin', 10);
  users.set('admin', new User({ username: 'admin', passwordHash: hash, mustChangePassword: true }));
})();

class UserRepository {
  findByUsername(username) {
    return users.get(username) ?? null;
  }

  save(user) {
    users.set(user.username, user);
    return user;
  }
}

module.exports = new UserRepository();
