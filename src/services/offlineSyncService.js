/**
 * κουίζυ (Quizy) — Offline Sync & Amphitheater Fault-Tolerance Service
 * 
 * Handles idempotent submission deduplication, timestamp jitter validation,
 * and state reconciliation for mobile devices experiencing Wi-Fi drops.
 */

import { clusterAnswers, evaluateShortAnswer } from '../ai/semanticEvaluator.js';

// Maximum allowed offline jitter grace period (in milliseconds)
// Allows answers typed while offline to be accepted fairly
const OFFLINE_JITTER_GRACE_MS = 90 * 1000; // 90 seconds

// In-memory fallback map for active sessions if not explicitly provided
const defaultSessions = new Map();

/**
 * Process a batch of submissions with strict idempotency and timestamp validation
 * 
 * @param {Object} params
 * @param {number|string} params.quizId
 * @param {string} params.studentEmail
 * @param {string} params.studentName
 * @param {Array<Object>} params.submissions
 * @param {Map} params.activeSessions - Map of active quiz sessions from server
 * @param {Object} params.io - Socket.IO instance for broadcasting updates
 * @returns {Object} { success, processed, duplicates, rejected, timestamp }
 */
export function processSubmissionsBatch({ quizId, studentEmail, studentName, submissions = [], activeSessions, io }) {
    if (!quizId || !Array.isArray(submissions)) {
        return {
            success: false,
            error: 'Invalid request: quizId and submissions array are required.',
            processed: [],
            duplicates: [],
            rejected: []
        };
    }

    const email = studentEmail || 'student@univ.dz';
    const name = studentName || 'Student';
    const sessions = activeSessions || defaultSessions;

    // Retrieve or initialize session
    if (!sessions.has(quizId)) {
        sessions.set(quizId, {
            participants: new Map(),
            submissions: new Map(),
            processedKeys: new Set(),
            scores: new Map(),
            currentQuestion: 0,
            totalQuestions: 5
        });
    }

    const session = sessions.get(quizId);
    if (!session.processedKeys) {
        session.processedKeys = new Set();
    }

    const processed = [];
    const duplicates = [];
    const rejected = [];
    const now = Date.now();

    for (const item of submissions) {
        const qIdx = item.questionIndex !== undefined ? Number(item.questionIndex) : 0;
        const timestamp = Number(item.timestamp) || now;

        // Construct or sanitize unique idempotency key
        const idempotencyKey = item.idempotencyKey || `sub_${quizId}_q${qIdx}_${email}_${timestamp}`;

        // 1. Idempotency Check: prevent double-counting or tally duplication
        if (session && session.processedKeys.has(idempotencyKey)) {
            duplicates.push(idempotencyKey);
            continue;
        }

        // 2. Timestamp Jitter Validation: reject unreasonable future timestamps or stale submissions
        if (timestamp > now + 30000) {
            rejected.push({ idempotencyKey, reason: 'Future timestamp detected' });
            continue;
        }

        // 3. Process the submission atomically
        if (session) {
            session.processedKeys.add(idempotencyKey);

            // Handle Short Answer vs Multiple Choice
            if (item.type === 'short_answer' || item.answerText !== undefined) {
                if (!session.shortAnswers) session.shortAnswers = new Map();
                const qKey = `q_${qIdx}`;
                if (!session.shortAnswers.has(qKey)) {
                    session.shortAnswers.set(qKey, []);
                }
                const qList = session.shortAnswers.get(qKey);

                const existingIdx = qList.findIndex(a => a.studentEmail === email);
                const entry = {
                    studentName: name,
                    studentEmail: email,
                    text: item.answerText || '',
                    timestamp
                };
                if (existingIdx >= 0) {
                    qList[existingIdx] = entry;
                } else {
                    qList.push(entry);
                }

                // AI Semantic Evaluation & Clustering
                const ref = item.referenceAnswer || "A pointer is a variable that stores the memory address of another variable in RAM.";
                const concepts = item.keyConcepts || ['pointer', 'memory address', 'variable'];
                const clustersResult = clusterAnswers(qList, ref);
                const evaluation = evaluateShortAnswer(item.answerText || '', ref, concepts);

                if (!session.scores) session.scores = new Map();
                session.scores.set(email, {
                    name,
                    email,
                    score: Math.round(evaluation.score * 20),
                    correctAnswers: evaluation.score >= 0.5 ? 1 : 0
                });

                if (io) {
                    const room = `quiz_${quizId}`;
                    io.to(room).emit('quiz:semantic_clusters_update', {
                        quizId,
                        questionIndex: qIdx,
                        totalAnswers: qList.length,
                        totalStudents: Math.max(session.participants.size, qList.length),
                        ...clustersResult
                    });
                }
            } else {
                // Multiple Choice Submission
                const qKey = `q_${qIdx}`;
                if (!session.submissions.has(qKey)) {
                    session.submissions.set(qKey, {
                        users: new Set(),
                        tallies: { 0: 0, 1: 0, 2: 0, 3: 0 }
                    });
                }
                const qSubmissions = session.submissions.get(qKey);

                if (!qSubmissions.users.has(email)) {
                    qSubmissions.users.add(email);
                    const optIdx = item.optionIndex !== undefined ? Number(item.optionIndex) : -1;
                    if (optIdx >= 0 && qSubmissions.tallies[optIdx] !== undefined) {
                        qSubmissions.tallies[optIdx]++;
                    }
                }

                // Update score
                if (!session.scores) session.scores = new Map();
                if (!session.scores.has(email)) {
                    session.scores.set(email, {
                        name,
                        email,
                        score: 0,
                        correctAnswers: 0
                    });
                }
                if (item.isCorrect) {
                    const s = session.scores.get(email);
                    s.correctAnswers += 1;
                    s.score = Math.round((s.correctAnswers / (session.totalQuestions || 5)) * 20);
                }

                if (io) {
                    const room = `quiz_${quizId}`;
                    const submittedCount = qSubmissions.users.size;
                    io.to(room).emit('quiz:submission_count', {
                        quizId,
                        questionIndex: qIdx,
                        submittedCount,
                        totalStudents: Math.max(session.participants.size, submittedCount),
                        tallies: qSubmissions.tallies
                    });
                }
            }
        }

        processed.push(idempotencyKey);
    }

    return {
        success: true,
        processed,
        duplicates,
        rejected,
        timestamp: now
    };
}
