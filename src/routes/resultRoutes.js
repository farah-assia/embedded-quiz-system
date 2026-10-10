import express from 'express';
import resultControllers from '../controllers/resultController.js';
import { authTeacherMiddleware, authenticateStudent } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Teacher Classroom Analytics & Attendance
router.get('/quizAttendance/:quiz_id', authTeacherMiddleware, resultControllers.getQuizAttendance);
router.get('/quizAverageGrade/:quiz_id', authTeacherMiddleware, resultControllers.getAverageQuizGrade);
router.get('/quizSuccessRate/:quiz_id', authTeacherMiddleware, resultControllers.getQuizSuccessRate);
router.get('/quiz/:quizId/student/:studentId/score', resultControllers.calculateScore);
router.get('/quiz/:quizId/participants', authTeacherMiddleware, resultControllers.getQuizParticipantsTable);
router.post('/quizQuestionChoicePercentage', authTeacherMiddleware, resultControllers.questionChoicePercentage);
router.post('/quizQuestionSuccessRate', authTeacherMiddleware, resultControllers.questionSuccessRate);

// Student History & Corrections (Authenticated)
router.get('/:studentId/completed', authenticateStudent, resultControllers.getStudentCompletedQuizzes);
router.get('/:studentId/modules', authenticateStudent, resultControllers.getStudentModules);
router.get('/:studentId/missed', authenticateStudent, resultControllers.getStudentMissedQuizzes);
router.get('/:studentId/quizzes', authenticateStudent, resultControllers.getStudentQuizzes);
router.get('/:studentId/module/:moduleId/completed-quizzes', authenticateStudent, resultControllers.getCompletedQuizzesForStudentInModule);
router.get('/quiz/:quizId/questions', authenticateStudent, resultControllers.getQuestionsWithAnswers);
router.get('/quiz-correction/:quizId/:studentId', authenticateStudent, resultControllers.getQuizCorrection);
router.post('/student/response', authenticateStudent, resultControllers.saveStudentResponse);

// Official Gradebook & Question Analytics CSV Exports (Teacher Protected)
router.get('/export/:quizId', authTeacherMiddleware, resultControllers.exportGradebookCsv);
router.get('/analytics/:quizId', authTeacherMiddleware, resultControllers.exportQuestionAnalyticsCsv);

export default router;
