import express from 'express';
import questionControllers from '../controllers/questionController.js';
import { authTeacherMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protected Teacher Routes
router.post('/create', authTeacherMiddleware, questionControllers.createQuestion);
router.patch('/updateText/:id', authTeacherMiddleware, questionControllers.updateQuestionText);
router.patch('/updateDuration/:id', authTeacherMiddleware, questionControllers.updateQuestionDuration);
router.patch('/updateGrade/:id', authTeacherMiddleware, questionControllers.updateQuestionGrade);
router.delete('/delete/:id', authTeacherMiddleware, questionControllers.deleteQuestion);

// Read Question metadata
router.get('/quiz/:quiz_id', questionControllers.getQuizQuestions);
router.get('/:id', questionControllers.getQuestionById);

export default router;
