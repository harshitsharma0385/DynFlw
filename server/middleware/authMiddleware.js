
const jwt = require('jsonwebtoken');

function protectManager(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication required. Please log in.'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'manager') {
            return res.status(403).json({
                message: 'Access denied.'
            });
        }

        req.manager = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired token. Please log in again.'
        });
    }
}

module.exports = protectManager;
