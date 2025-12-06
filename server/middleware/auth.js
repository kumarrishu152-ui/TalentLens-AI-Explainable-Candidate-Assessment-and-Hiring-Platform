const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // 1. Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // 2. Check if no token
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // 3. Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Attach user info to request
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};