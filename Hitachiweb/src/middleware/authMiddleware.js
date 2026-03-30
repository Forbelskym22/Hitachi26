function requireAuth(req, res, next) {
  if (!req.session?.username) {
    return res.status(401).json({ error: 'Nejste přihlášen' });
  }
  next();
}

module.exports = { requireAuth };
