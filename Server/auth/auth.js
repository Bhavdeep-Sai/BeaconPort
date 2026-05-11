const jwt = require('jsonwebtoken');

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    // Check for Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    // Extract token - handle both "Bearer token" and just "token" formats
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else {
      token = authHeader;
    }

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded) {
        req.user = decoded;
        
        // Check role authorization if roles are specified
        if (roles.length > 0 && !roles.includes(decoded.role)) {
          return res.status(403).json({ 
            message: "Access Denied", 
            requiredRoles: roles, 
            userRole: decoded.role 
          });
        }
        
        next();
      }
    } catch (error) {
      console.log("JWT Error:", error.message);
      
      // Provide specific error messages
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: "Token has expired" });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: "Invalid token" });
      } else {
        return res.status(500).json({ message: "Token verification failed" });
      }
    }
  }
}

module.exports = authMiddleware;