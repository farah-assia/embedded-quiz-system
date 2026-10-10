/**
 * Analytics Controller — Psychometric IRT Diagnostics & Collusion Radar
 */

import { generateQuizPsychometricsReport } from '../services/psychometricsService.js';
import { detectCollusionAnomalies } from '../services/collusionService.js';

export async function getIrtDiagnostics(req, res) {
    try {
        const quizId = parseInt(req.params.quizId, 10) || 1;
        const activeSessions = req.app.get('activeSessions');
        const activeSession = activeSessions ? activeSessions.get(quizId) : null;

        const report = generateQuizPsychometricsReport({
            quizId,
            activeSession
        });

        return res.status(200).json({
            success: true,
            ...report
        });
    } catch (err) {
        console.error('[AnalyticsController IRT Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate psychometric IRT diagnostics.',
            error: err.message
        });
    }
}

export async function getCollusionRadar(req, res) {
    try {
        const quizId = parseInt(req.params.quizId, 10) || 1;
        const activeSessions = req.app.get('activeSessions');
        const activeSession = activeSessions ? activeSessions.get(quizId) : null;

        const report = detectCollusionAnomalies({
            quizId,
            activeSession
        });

        return res.status(200).json({
            success: true,
            ...report
        });
    } catch (err) {
        console.error('[AnalyticsController Collusion Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to compute collusion radar report.',
            error: err.message
        });
    }
}

export default {
    getIrtDiagnostics,
    getCollusionRadar
};
