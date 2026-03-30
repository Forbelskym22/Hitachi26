const bcrypt = require('bcryptjs');
const db      = require('../db/database');
const User    = require('../models/User');

const stmtFind = db.prepare(`SELECT username, password_hash, must_change_password FROM users WHERE username = ?`);
const stmtSave = db.prepare(`
  INSERT INTO users (username, password_hash, must_change_password)
  VALUES (?, ?, ?)
  ON CONFLICT(username) DO UPDATE SET
    password_hash        = excluded.password_hash,
    must_change_password = excluded.must_change_password
`);

// Seed admin jednou — pokud ještě neexistuje
const existing = stmtFind.get('admin');
if (!existing) {
  const hash = bcrypt.hashSync('admin', 10);
  stmtSave.run('admin', hash, 1);
}

class UserRepository {
  findByUsername(username) {
    const row = stmtFind.get(username);
    if (!row) return null;
    return new User({
      username:           row.username,
      passwordHash:       row.password_hash,
      mustChangePassword: Boolean(row.must_change_password),
    });
  }

  save(user) {
    stmtSave.run(user.username, user.passwordHash, user.mustChangePassword ? 1 : 0);
    return user;
  }
}

module.exports = new UserRepository();
