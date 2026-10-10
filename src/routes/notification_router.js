import express from 'express';
import notificationController from '../controllers/notificationController.js';

const router = express.Router();

router.post('/notify-new-quiz/:quizId', notificationController.notifyNewQuiz);

router.get('/check-new-quiz/:studentId', notificationController.checkNewQuiz);
export default router;
