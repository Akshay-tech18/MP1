const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

if (!ACCESS_SECRET) {
  throw new Error("FATAL ERROR: JWT_ACCESS_SECRET must be defined in environment variables.");
}

/**
 * Sign an access token (expires in 24h)
 * @param {object} payload - { id, email, role }
 * @returns {string} token
 */
const signAccessToken = (payload) => {
  const tokenPayload = {
    id: payload.id,
    email: payload.email,
    role: payload.role
  };
  return jwt.sign(tokenPayload, ACCESS_SECRET, { expiresIn: "24h" });
};

/**
 * Verify access token
 * @param {string} token
 * @returns {object} payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
