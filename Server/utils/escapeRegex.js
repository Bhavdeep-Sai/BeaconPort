/**
 * Escapes special regex characters in a user-supplied string to prevent ReDoS attacks.
 * Also caps the string length to prevent oversized regex compilation.
 * 
 * @param {string} text - The input search string
 * @param {number} [maxLength=50] - The maximum permitted string length
 * @returns {string} - Escaped and length-capped string safe for new RegExp or $regex
 */
function escapeRegex(text, maxLength = 50) {
  if (typeof text !== 'string') return '';
  const truncated = text.slice(0, maxLength);
  return truncated.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

escapeRegex.escapeRegex = escapeRegex;
module.exports = escapeRegex;

