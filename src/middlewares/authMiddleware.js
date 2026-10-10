import jwt from 'jsonwebtoken';
import envConfig from '../config/envConfig.js';

/**
 * Authenticate student requests and enforce student/teacher role claim
 */
export const authenticateStudent = (req, res, next) => {
    const authHeader = req.header("Authorization") || req.header("authorization");
    if (!authHeader) {
        return res.status(401).json({ message: "Access Denied. No token provided." });
    }
    const parts = authHeader.split(" ");
    const token = parts.length === 2 ? parts[1] : parts[0];
    if (!token) {
        return res.status(401).json({ message: "Access Denied. Invalid token format." });
    }
    try {
        const decoded = jwt.verify(token, envConfig.JWT_SECRET);
        if (decoded.role && decoded.role !== 'student' && decoded.role !== 'teacher') {
            return res.status(403).json({ message: "Access forbidden: Student role required." });
        }
        req.student = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
};

/**
 * Authenticate teacher requests and enforce strict teacher role claim
 */
export const authTeacherMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided or format incorrect." });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "No token attached." });
        }
        const decoded = jwt.verify(token, envConfig.JWT_SECRET);
        
        // Strict RBAC: Prevent student tokens from accessing teacher resources
        if (decoded.role && decoded.role !== 'teacher') {
            return res.status(403).json({ message: "Access forbidden: Teacher role required." });
        }

        req.teacher = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: "Token not authorized or expired." });
    }
};

export default {
    authTeacherMiddleware,
    authenticateStudent
};
