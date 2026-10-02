const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        const reason = err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Token is not valid';
        console.warn(`Auth failed [${err.name}: ${err.message}] ${req.method} ${req.originalUrl} (token prefix: ${String(token).slice(0, 12)}...)`);
        res.status(401).json({ error: reason });
    }
};