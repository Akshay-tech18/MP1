const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "default_access_secret_very_long_and_secure_64_bytes_value_here";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default_refresh_secret_very_long_and_secure_64_bytes_value_here";

/**
 * Sign an access token (expires in 15m)
 * @param {object} payload - { id, email, role }
 * @returns {string} token
 */
const signAccessToken = (payload) => {
  const tokenPayload = {
    id: payload.id,
    email: payload.email,
    role: payload.role
  };
  return jwt.sign(tokenPayload, ACCESS_SECRET, { expiresIn: "15m" });
};

/**
 * Sign a refresh token (expires in 7d)
 * @param {object} payload - { id, email, role }
 * @returns {string} token
 */
const signRefreshToken = (payload) => {
  const tokenPayload = {
    id: payload.id,
    email: payload.email,
    role: payload.role
  };
  return jwt.sign(tokenPayload, REFRESH_SECRET, { expiresIn: "7d" });
};

/**
 * Verify access token
 * @param {string} token
 * @returns {object} payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

/**
 * Verify refresh token
 * @param {string} token
 * @returns {object} payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
