import express from 'express';
import analyticsController from '../controllers/analyticsController.js';
import { authTeacherMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Psychometric Item Response Theory (IRT) Diagnostics (Protected for Teachers)
router.get('/irt/:quizId', authTeacherMiddleware, analyticsController.getIrtDiagnostics);

// Statistical Collusion & Mirroring Detection Radar (Protected for Teachers)
router.get('/collusion/:quizId', authTeacherMiddleware, analyticsController.getCollusionRadar);

export default router;
