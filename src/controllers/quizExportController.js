/**
 * κουίζυ (Quizy) — Quiz Export Controller
 * 
 * Supports multi-format exports for Moodle XML, GIFT syntax,
 * and high-fidelity A4 Printable Emergency Examinations.
 */

import pool from '../config/dbConfig.js';
import { exportToMoodleXml, exportToGift, generatePrintableExamHtml } from '../services/lmsExportService.js';

/**
 * Build fallback sample quiz data when database is pending or edge mode
 */
function getFallbackQuizData(quizId) {
    return {
        id: quizId,
        title: "Architecture des Ordinateurs & Systèmes d'Exploitation",
        module: "Système & Architecture",
        duration: 30,
        questions: [
            {
                question: "Which CPU component performs arithmetic and logical operations?",
                type: "mcq",
                points: 2,
                options: [
                    { text: "ALU (Arithmetic Logic Unit)", is_correct: true, rationale: "Correct core processing unit" },
                    { text: "Control Unit", is_correct: false, rationale: "Manages control signals, does not compute" },
                    { text: "Program Counter", is_correct: false, rationale: "Holds the next instruction address" },
                    { text: "Memory Address Register", is_correct: false, rationale: "Holds target memory bus address" }
                ]
            },
            {
                question: "In virtual memory systems, what specifically triggers a Page Fault exception?",
                type: "mcq",
                points: 2,
                options: [
                    { text: "The requested virtual page is not mapped into physical RAM", is_correct: true, rationale: "Requires OS swap paging" },
                    { text: "A physical RAM hardware failure detected on the bus", is_correct: false, rationale: "Hardware parity check error" },
                    { text: "A stack pointer overflow into heap segment", is_correct: false, rationale: "Stack overflow exception" },
                    { text: "An instruction cache line invalidation event", is_correct: false, rationale: "Cache miss, not page fault" }
                ]
            },
            {
                question: "Explain the difference between a Process and a Thread in modern UNIX architectures.",
                type: "short_answer",
                points: 4,
                referenceAnswer: "A process has its own isolated virtual address space and file descriptors, whereas threads within the same process share the virtual address space, heap, and open handles but maintain private stacks and registers."
            },
            {
                question: "Which statement regarding POSIX semaphore primitives is correct?",
                type: "mcq",
                points: 2,
                options: [
                    { text: "sem_post() atomically increments the semaphore value and unblocks waiting threads", is_correct: true },
                    { text: "sem_wait() immediately returns -1 if the counter is zero", is_correct: false },
                    { text: "Named semaphores cannot be shared between separate UNIX processes", is_correct: false },
                    { text: "sem_init() creates an anonymous thread-private mutex lock", is_correct: false }
                ]
            },
            {
                question: "What is the primary objective of Instruction Pipelining in RISC architectures?",
                type: "mcq",
                points: 2,
                options: [
                    { text: "Increase instruction throughput by overlapping execution stages", is_correct: true },
                    { text: "Reduce individual instruction latency to zero nanoseconds", is_correct: false },
                    { text: "Eliminate branch prediction requirements completely", is_correct: false },
                    { text: "Double the total physical memory capacity of the cache", is_correct: false }
                ]
            }
        ]
    };
}

/**
 * Retrieve quiz details and questions
 */
async function fetchQuizWithQuestions(quizId, activeSession) {
    // 1. If active session contains questions in memory
    if (activeSession && activeSession.questions && activeSession.questions.length > 0) {
        return {
            id: quizId,
            title: activeSession.title || `Quiz ${quizId}`,
            module: activeSession.module || 'Active Module',
            duration: activeSession.duration || 30,
            questions: activeSession.questions
        };
    }

    // 2. Try Database query
    try {
        const [quizRows] = await pool.query(
            'SELECT q.id, q.title, q.duration_minutes AS duration, m.name AS module ' +
            'FROM quizzes q LEFT JOIN modules m ON q.module_id = m.id WHERE q.id = ?',
            [quizId]
        );

        if (quizRows && quizRows.length > 0) {
            const quizInfo = quizRows[0];
            const [qRows] = await pool.query(
                'SELECT q.id AS q_id, q.question_text, q.question_type, q.points, ' +
                'a.id AS a_id, a.answer_text, a.is_correct ' +
                'FROM questions q LEFT JOIN answers a ON q.id = a.question_id ' +
                'WHERE q.quiz_id = ? ORDER BY q.id, a.id',
                [quizId]
            );

            const questionsMap = new Map();
            qRows.forEach(row => {
                if (!questionsMap.has(row.q_id)) {
                    questionsMap.set(row.q_id, {
                        question: row.question_text,
                        type: row.question_type || 'mcq',
                        points: row.points || 2,
                        options: []
                    });
                }
                if (row.a_id) {
                    questionsMap.get(row.q_id).options.push({
                        text: row.answer_text,
                        is_correct: row.is_correct === 1 || row.is_correct === true
                    });
                }
            });

            return {
                id: quizInfo.id,
                title: quizInfo.title || `Quiz ${quizId}`,
                module: quizInfo.module || 'Computer Science',
                duration: quizInfo.duration || 30,
                questions: Array.from(questionsMap.values())
            };
        }
    } catch (err) {
        console.warn(`[QuizExportController] Database query fallback for quiz ${quizId}:`, err.message);
    }

    // 3. Fallback to resilient demonstration data
    return getFallbackQuizData(quizId);
}

/**
 * GET /api/quiz/export/:quizId?format=moodle|gift|print|json
 */
export async function exportQuiz(req, res) {
    try {
        const quizId = parseInt(req.params.quizId, 10) || 1;
        const format = (req.query.format || req.query.type || 'moodle').toLowerCase();
        const activeSessions = req.app.get('activeSessions');
        const activeSession = activeSessions ? activeSessions.get(quizId) : null;

        const quizData = await fetchQuizWithQuestions(quizId, activeSession);

        if (format === 'moodle' || format === 'xml') {
            const xml = exportToMoodleXml(quizData);
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="quiz_${quizId}_moodle.xml"`);
            return res.status(200).send(xml);
        }

        if (format === 'gift' || format === 'txt') {
            const gift = exportToGift(quizData);
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="quiz_${quizId}.gift"`);
            return res.status(200).send(gift);
        }

        if (format === 'print' || format === 'html' || format === 'pdf') {
            const includeKey = req.query.includeKey !== 'false';
            const html = generatePrintableExamHtml(quizData, {
                includeKey,
                durationMin: quizData.duration
            });
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(200).send(html);
        }

        // Default JSON
        return res.status(200).json({
            success: true,
            quizId,
            quiz: quizData
        });
    } catch (err) {
        console.error('[QuizExportController Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to export quiz.',
            error: err.message
        });
    }
}

export default {
    exportQuiz
};
