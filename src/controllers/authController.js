import envConfig from '../config/envConfig.js';
import jwt from 'jsonwebtoken';
import Teacher from '../modules/Teacher.js';
import Student from '../modules/Student.js';

const generateTokensTeacher = (teacher) => {
    const accessToken = jwt.sign(
        { id: teacher.id, email: teacher.email, role: 'teacher' },
        envConfig.JWT_SECRET,
        { expiresIn: '90h' }
    );
    const refreshToken = jwt.sign(
        { id: teacher.id, email: teacher.email, role: 'teacher' },
        envConfig.REFRESH_TOKEN_SECRET,
        { expiresIn: '90d' }
    );
    return { accessToken, refreshToken };
};

const refreshAccessToken = (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        jwt.verify(refreshToken, envConfig.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: "Invalid refresh token" });
            }
            const { id, email, role } = decoded;
            const token = jwt.sign(
                { id, email, role: role || 'teacher' },
                envConfig.JWT_SECRET,
                { expiresIn: '90h' }
            );
            return res.status(200).json({ "message": "access token refreshed successfully!", token });
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error });
    }
};
const logoutTeacher = async (req, res) => {
    try {
        const {refreshToken} = req.cookies ;
        if(!refreshToken){
            return res.status(401).json({ message: "Unauthorized" });
        }
        const {id} = req.body;
        await Teacher.updateRefreshToken(id,null);
        res.clearCookie("refreshToken",{httpOnly: true, secure: true, sameSite: "Strict"});
        return res.status(200).json({ message: "Logged out successfully!" });
    } catch (error) {
        return res.status(500).json({ message: "Error Logging out!" });
    }
}
const generateTokenStudent = (student) => {
    const accessToken = jwt.sign(
        { id: student.id, email: student.email, role: 'student' },
        envConfig.JWT_SECRET,
        { expiresIn: '90h' }
    );
    const refreshToken = jwt.sign(
        { id: student.id, email: student.email, role: 'student' },
        envConfig.REFRESH_TOKEN_SECRET,
        { expiresIn: '90d' }
    );
    return { accessToken, refreshToken };
};
    
    const logoutStudent = async (req, res) => {
        try {
            const {refreshToken} = req.cookies ;
            if(!refreshToken){
                return res.status(401).json({ message: "Unauthorized" });
            }
            const {id} = req.body;
            await Student.updateRefreshToken(id,null);
            res.clearCookie("refreshToken",{httpOnly: true, secure: true, sameSite: "Strict"});
            return res.status(200).json({ message: "Logged out successfully!" });
        } catch (error) {
            return res.status(500).json({ message: "Error Logging out!" });
        }
    }
export default {
    logoutTeacher,
    refreshAccessToken,
    generateTokensTeacher , 
    logoutStudent,
    generateTokenStudent 

}
