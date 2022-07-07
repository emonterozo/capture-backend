const jwt = require("jsonwebtoken");
const CONFIG = require("../config/config");

const secretKey = process.env.SECRET_KEY || CONFIG.SECRET_KEY;

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);

    req.user = user;
    next();
  });
};

module.exports = {
  verifyToken,
};
