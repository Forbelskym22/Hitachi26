const authService = require('../services/AuthService');

class AuthController {
  async login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vyplňte uživatelské jméno a heslo' });
    }

    try {
      const user = await authService.login(username, password);
      req.session.username = user.username;
      req.session.mustChangePassword = user.mustChangePassword;

      return res.json({
        username: user.username,
        mustChangePassword: user.mustChangePassword,
      });
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }
  }

  async changePassword(req, res) {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Heslo musí mít alespoň 6 znaků' });
    }

    try {
      const user = await authService.changePassword(req.session.username, newPassword);
      req.session.mustChangePassword = false;
      return res.json({ username: user.username, mustChangePassword: false });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  logout(req, res) {
    req.session.destroy(() => res.json({ ok: true }));
  }

  me(req, res) {
    return res.json({
      username: req.session.username,
      mustChangePassword: req.session.mustChangePassword,
    });
  }
}

module.exports = new AuthController();
