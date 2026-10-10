/**
 * Controller for Offline Sync & Fault-Tolerance Batch Endpoints
 */

import { processSubmissionsBatch } from '../services/offlineSyncService.js';

export async function syncBatchSubmissions(req, res) {
    try {
        const { quizId, studentEmail, studentName, submissions } = req.body;

        if (!quizId || !Array.isArray(submissions)) {
            return res.status(400).json({
                success: false,
                message: 'quizId and submissions array are required.'
            });
        }

        const activeSessions = req.app.get('activeSessions');
        const io = req.app.get('io');

        const result = processSubmissionsBatch({
            quizId,
            studentEmail,
            studentName,
            submissions,
            activeSessions,
            io
        });

        return res.status(200).json({
            success: true,
            message: `Batch sync completed: ${result.processed.length} processed, ${result.duplicates.length} duplicates.`,
            ...result
        });
    } catch (err) {
        console.error('[OfflineSyncController Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to process offline batch submission.',
            error: err.message
        });
    }
}

export default {
    syncBatchSubmissions
};
