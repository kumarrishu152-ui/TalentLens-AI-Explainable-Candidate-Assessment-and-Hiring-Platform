const User = require('../models/User');

module.exports = (...roles) => async (req, res, next) => {
    try {
        const user = await User.findById(req.user?.id).select('role');
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ error: 'You do not have access to this action.' });
        }
        req.accountRole = user.role;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Could not verify account permissions.' });
    }
};
