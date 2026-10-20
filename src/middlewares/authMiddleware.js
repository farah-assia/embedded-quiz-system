import jwt from 'jsonwebtoken';
import envConfig from '../config/envConfig.js';

/**
 * Universal authentication & RBAC middleware.
 * - Missing, invalid, or expired tokens return 401 Unauthorized.
 * - Valid tokens with insufficient role claims return 403 Forbidden.
 *
 * @param {string[]|string} roles - Array or single string of permitted roles (e.g. ['teacher'], ['student', 'teacher'])
 */
export const requireAuth = (roles = []) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return (req, res, next) => {
        const authHeader = req.header("Authorization") || req.header("authorization") || req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ message: "Access Denied. No token provided." });
        }

        const parts = authHeader.trim().split(" ");
        const token = parts.length === 2 ? parts[1] : parts[0];
        if (!token) {
            return res.status(401).json({ message: "Access Denied. Invalid token format." });
        }

        try {
            const decoded = jwt.verify(token, envConfig.JWT_SECRET);

            if (allowedRoles.length > 0 && (!decoded.role || !allowedRoles.includes(decoded.role))) {
                return res.status(403).json({
                    message: `Access forbidden: ${allowedRoles.join(' or ')} role required.`
                });
            }

            req.user = decoded;
            if (decoded.role === 'teacher') req.teacher = decoded;
            if (decoded.role === 'student') req.student = decoded;

            next();
        } catch (error) {
            return res.status(401).json({ message: "Invalid or expired token." });
        }
    };
};

/**
 * Strict teacher authentication middleware (rejects students and others with 403)
 */
export const authTeacherMiddleware = requireAuth(['teacher']);

/**
 * Student-permitted authentication middleware (allows student or teacher)
 */
export const authenticateStudent = requireAuth(['student', 'teacher']);

/**
 * Any authenticated user
 */
export const authenticateAny = requireAuth(['teacher', 'student', 'projector']);

export default {
    requireAuth,
    authTeacherMiddleware,
    authenticateStudent,
    authenticateAny
};

