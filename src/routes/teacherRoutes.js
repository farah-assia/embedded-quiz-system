import express from 'express';
import teacherControllers from '../controllers/teacherController.js';
import { authTeacherMiddleware } from '../middlewares/authMiddleware.js';
import authController from '../controllers/authController.js';
import multer from 'multer';
const router = express.Router();
const upload = multer({dest : 'uploads/'});

router.post('/register',teacherControllers.registerTeacher);
router.post('/login',teacherControllers.loginTeacher);
router.get('/getFirstName',authTeacherMiddleware,teacherControllers.getFirstName);
router.get('/getLastName',authTeacherMiddleware,teacherControllers.getLastName);
router.get('/getEmail',authTeacherMiddleware,teacherControllers.getEmail);
router.patch('/modifyName',authTeacherMiddleware,teacherControllers.modifyName); // Update teacher first name 
router.patch('/modifySurName',authTeacherMiddleware,teacherControllers.modifySurName);
router.patch('/modifyPassword',authTeacherMiddleware,teacherControllers.modifyPassword);
router.post('/refresh',authController.refreshAccessToken);
router.post('/logout',authTeacherMiddleware,authController.logoutTeacher);
router.post('/addModule',authTeacherMiddleware,teacherControllers.addTeacherModule);
router.delete('/deleteModule',authTeacherMiddleware,teacherControllers.deleteTeacherModule);
router.patch('/updateModuleLevel',authTeacherMiddleware,teacherControllers.updateModuleLevel);
router.patch('/updateModuleName',authTeacherMiddleware,teacherControllers.updateModuleName);
router.post('/upload-students', authTeacherMiddleware, upload.single('file'), teacherControllers.uploadStudentFile);
router.delete('/deleteAccount',authTeacherMiddleware,teacherControllers.deleteAccount);
router.get('/getModules',authTeacherMiddleware,teacherControllers.getTeachermodules);
router.get('/classes', authTeacherMiddleware , teacherControllers.getTeacherClasses);
router.get('/getTeacherLevels', authTeacherMiddleware , teacherControllers.getTeacherLevels);
router.get('/getTeacherSections',authTeacherMiddleware ,teacherControllers.getTeacherSections);
router.get('/getTeacherGroups',authTeacherMiddleware ,teacherControllers.getTeacherGroups);

router.post('/getLevelGroups',authTeacherMiddleware,teacherControllers.getLevelGroups);
export default router;
