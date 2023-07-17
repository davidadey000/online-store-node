module.exports = {
  admin: function (req, res, next) {
    if (req.user.role !== 'admin') {
      return res.status(403).send('Access denied.');
    }
    next();
  },
  seller: function (req, res, next) {
    if (req.user.role !== 'seller') {
      return res.status(403).send('Access denied.');
    }
    next();
  },
  regular: function (req, res, next) {
    if (req.user.role !== 'customer') {
      return res.status(403).send('Access denied.');
    }
    next();
  }
};
