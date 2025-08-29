const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');

class JWTUtils {
  /**
   * Generate JWT token with encryption
   * @param {Object} payload - The payload to encode
   * @returns {String} Encrypted JWT token
   */
  static generateToken(payload) {
    try {
      // Create JWT token
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'nalanda-library',
        audience: 'nalanda-users'
      });

      // Encrypt the JWT token
      const encryptedToken = CryptoJS.AES.encrypt(token, process.env.ENCRYPTION_KEY).toString();
      
      return encryptedToken;
    } catch (error) {
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify and decrypt JWT token
   * @param {String} encryptedToken - The encrypted JWT token
   * @returns {Object} Decoded payload
   */
  static verifyToken(encryptedToken) {
    try {
      // Decrypt the token
      const bytes = CryptoJS.AES.decrypt(encryptedToken, process.env.ENCRYPTION_KEY);
      const decryptedToken = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedToken) {
        throw new Error('Invalid token format');
      }

      // Verify JWT token
      const decoded = jwt.verify(decryptedToken, process.env.JWT_SECRET, {
        issuer: 'nalanda-library',
        audience: 'nalanda-users'
      });

      return decoded;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Generate refresh token
   * @param {Object} payload - The payload to encode
   * @returns {String} Encrypted refresh token
   */
  static generateRefreshToken(payload) {
    try {
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '30d',
        issuer: 'nalanda-library',
        audience: 'nalanda-users'
      });

      const encryptedToken = CryptoJS.AES.encrypt(token, process.env.ENCRYPTION_KEY).toString();
      return encryptedToken;
    } catch (error) {
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Decode token without verification (for debugging)
   * @param {String} encryptedToken - The encrypted JWT token
   * @returns {Object} Decoded payload
   */
  static decodeToken(encryptedToken) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedToken, process.env.ENCRYPTION_KEY);
      const decryptedToken = bytes.toString(CryptoJS.enc.Utf8);
      
      return jwt.decode(decryptedToken);
    } catch (error) {
      return null;
    }
  }
}

module.exports = JWTUtils;
