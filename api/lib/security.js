/**
 * Security utility functions for myquicktag
 * Protects against common attacks and validates all input
 */

/**
 * Sanitize Airtable formula input to prevent formula injection
 * @param {string} input - User input to sanitize
 * @returns {string} - Safe escaped string
 */
export function sanitizeAirtableInput(input) {
  if (typeof input !== 'string') return '';
  
  // Remove dangerous characters for Airtable formulas
  return input
    .replace(/['"\\]/g, '') // Remove quotes and backslashes
    .trim()
    .toLowerCase()
    .substring(0, 100); // Limit length
}

/**
 * Escape string for use in Airtable filterByFormula
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for Airtable
 */
export function escapeAirtableFormula(str) {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/\\/g, '\\\\')     // Escape backslashes first
    .replace(/"/g, '\\"')       // Escape double quotes
    .replace(/'/g, "\\'")       // Escape single quotes
    .substring(0, 100);         // Limit to 100 chars
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} - True if valid
 */
export function isValidUsername(username) {
  if (typeof username !== 'string') return false;
  
  // Only alphanumeric, dash, underscore - 3 to 30 chars
  const regex = /^[a-z0-9_-]{3,30}$/i;
  return regex.test(username.trim());
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid
 */
export function isValidUrl(url) {
  if (typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rate limit key generator for Redis
 * @param {string} identifier - User identifier (IP, username, etc)
 * @param {string} endpoint - API endpoint name
 * @returns {string} - Redis key for rate limiting
 */
export function getRateLimitKey(identifier, endpoint) {
  return `ratelimit:${endpoint}:${identifier}`;
}

/**
 * Clean and validate request body to prevent malicious data
 * @param {object} body - Request body to validate
 * @param {array} allowedFields - List of allowed field names
 * @returns {object} - Cleaned body
 */
export function validateRequestBody(body, allowedFields) {
  if (typeof body !== 'object' || body === null) {
    return {};
  }

  const cleaned = {};
  
  for (const field of allowedFields) {
    if (body[field] !== undefined && body[field] !== null) {
      const value = body[field];
      
      if (typeof value === 'string') {
        // Trim and limit string length
        cleaned[field] = value.trim().substring(0, 5000);
      } else if (typeof value === 'number') {
        cleaned[field] = value;
      } else if (typeof value === 'boolean') {
        cleaned[field] = value;
      } else if (Array.isArray(value)) {
        cleaned[field] = value;
      } else if (typeof value === 'object') {
        cleaned[field] = value; // For JSON fields
      }
    }
  }
  
  return cleaned;
}

/**
 * Extract and validate JWT token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null if invalid
 */
export function extractToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}
