import express from 'express';
import quizController from '../controllers/quizController.js';
import { authenticateStudent, authTeacherMiddleware } from '../middlewares/authMiddleware.js';
import multer from 'multer';
import fs from 'fs';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

import offlineSyncController from '../controllers/offlineSyncController.js';
import quizExportController from '../controllers/quizExportController.js';

const upload = multer({ storage });
const router = express.Router();

// Multi-Format LMS & Emergency Paper Exam Export
router.get('/export/:quizId', quizExportController.exportQuiz);

// Offline Fault-Tolerance: Idempotent Batch Synchronization
router.post('/sync-batch', offlineSyncController.syncBatchSubmissions);

router.post("/create", authTeacherMiddleware, quizController.createQuiz);
router.delete('/:id', authTeacherMiddleware, quizController.deleteQuiz);
router.patch('/:id/title', authTeacherMiddleware, quizController.update_title);
router.patch('/:id/duration', authTeacherMiddleware, quizController.update_duration);
router.patch('/:id/timedby', authTeacherMiddleware, quizController.update_timedby);
router.patch('/:id/Module', authTeacherMiddleware, quizController.update_Module);
router.post('/ALLQuizzesbymodule', authTeacherMiddleware, quizController.ALLQuizzesbymodule );
router.post('/Draft_Quizzesbymodule', authTeacherMiddleware, quizController.Draft_Quizzesbymodule);
router.post('/Past_Quizzesbymodule', authTeacherMiddleware, quizController.Past_Quizzesbymodule);
router.get('/AllQuizzes2', authTeacherMiddleware, quizController.ALLQuizzes2);
router.get('/draftQuizzes', authTeacherMiddleware, quizController.Draft_Quizzes);
router.get('/PastQuizzes', authTeacherMiddleware, quizController.Past_Quizzes);
router.post("/start_student",authenticateStudent , quizController.startQuizmob);
router.post("/submitQuiz", authenticateStudent, quizController.submitQuiz);
router.post("/addquizparticipants", authTeacherMiddleware, quizController.addquizparticipants);
router.post("/importQuiz", authTeacherMiddleware, upload.single('file'), quizController.importQuiz);
router.post("/ExportQuiz", authTeacherMiddleware, quizController.exportQuizToCSV);
router.post('/check-status', quizController.checkQuizStatus);
router.post("/start_teach",authTeacherMiddleware, quizController.startQuizbyteach);
router.post("/seeDraftquiz",quizController.SeeDraftQuiz);
router.get("/randomize/:quizId", quizController.randomazation);
router.get("/getQuizDuration/:quizId", quizController.getQuizDuration);
router.get("/getlevel",authTeacherMiddleware, quizController.Getlevel);
router.get("/getModuleNameById",quizController.getModuleNameById);
router.patch('/:id/visibility', authTeacherMiddleware, quizController.update_visibility);
router.post("/getQuizById", authTeacherMiddleware ,quizController.getQuizById);
router.get("/getLastQuiz",authTeacherMiddleware  ,quizController.getLastQuiz);
export default router;


