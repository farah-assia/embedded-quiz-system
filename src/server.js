import http from 'http';
import { Server } from 'socket.io';
import envConfig from './config/envConfig.js';
import app from './app.js';
import { clusterAnswers, evaluateShortAnswer } from './ai/semanticEvaluator.js';
import { processSubmissionsBatch } from './services/offlineSyncService.js';

const server = http.createServer(app);

// Initialize Socket.io with cross-origin allowances
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    }
});

// Attach Socket.IO and activeSessions instances to app for use in controllers
app.set('io', io);

// Track active sessions and participants
const activeSessions = app.get('activeSessions') || new Map();
app.set('activeSessions', activeSessions);

io.on('connection', (socket) => {
    console.log(`[Socket.IO] New connection: ${socket.id}`);

    // Join a quiz room (used by projector, teacher, and students)
    socket.on('quiz:join', ({ quizId, role, name, email }) => {
        const room = `quiz_${quizId}`;
        socket.join(room);
        console.log(`[Socket.IO] ${name || socket.id} (${role}) joined ${room}`);

        if (!activeSessions.has(quizId)) {
            activeSessions.set(quizId, {
                participants: new Map(),
                submissions: new Map(),
                currentQuestion: 0
            });
        }

        const session = activeSessions.get(quizId);
        if (role === 'student' && email) {
            session.participants.set(socket.id, { name: name || 'Student', email });
        }

        // Broadcast participant count update & network telemetry
        io.to(room).emit('quiz:participants_update', {
            quizId,
            count: session.participants.size,
            participants: Array.from(session.participants.values())
        });
        io.to(room).emit('quiz:network_telemetry', {
            quizId,
            connectedClients: session.participants.size,
            timestamp: Date.now()
        });
    });

    // Teacher starts a question
    socket.on('quiz:broadcast_question', ({ quizId, question, index, total, durationSeconds }) => {
        const room = `quiz_${quizId}`;
        const session = activeSessions.get(quizId);
        if (session) {
            session.currentQuestion = index;
            session.totalQuestions = total || 5;
            const qKey = `q_${index}`;
            if (!session.submissions.has(qKey)) {
                session.submissions.set(qKey, {
                    users: new Set(),
                    tallies: { 0: 0, 1: 0, 2: 0, 3: 0 }
                });
            }
        }
        console.log(`[Socket.IO] Question ${index + 1}/${total} broadcasted to ${room}`);
        
        io.to(room).emit('quiz:question_active', {
            quizId,
            question,
            index,
            total,
            durationSeconds: durationSeconds || 30,
            startTime: Date.now()
        });
    });

    // Student submits answer in real-time
    socket.on('quiz:submit_answer', ({ quizId, studentEmail, studentName, questionIndex, optionIndex, isCorrect, idempotencyKey, timestamp }) => {
        const room = `quiz_${quizId}`;
        const session = activeSessions.get(quizId);

        if (session) {
            if (!session.processedKeys) session.processedKeys = new Set();
            if (idempotencyKey) {
                if (session.processedKeys.has(idempotencyKey)) {
                    socket.emit('quiz:submission_ack', { idempotencyKey, status: 'duplicate' });
                    return;
                }
                session.processedKeys.add(idempotencyKey);
            }

            const qKey = `q_${questionIndex !== undefined ? questionIndex : 0}`;
            if (!session.submissions.has(qKey)) {
                session.submissions.set(qKey, {
                    users: new Set(),
                    tallies: { 0: 0, 1: 0, 2: 0, 3: 0 }
                });
            }
            const qSubmissions = session.submissions.get(qKey);
            const userKey = studentEmail || socket.id;
            
            if (!qSubmissions.users.has(userKey)) {
                qSubmissions.users.add(userKey);
                if (optionIndex !== undefined && qSubmissions.tallies[optionIndex] !== undefined) {
                    qSubmissions.tallies[optionIndex]++;
                }
            }

            // Track student score for leaderboard
            if (!session.scores) session.scores = new Map();
            if (!session.scores.has(userKey)) {
                session.scores.set(userKey, {
                    name: studentName || 'Student',
                    email: studentEmail || userKey,
                    score: 0,
                    correctAnswers: 0
                });
            }
            if (isCorrect) {
                const s = session.scores.get(userKey);
                s.correctAnswers += 1;
                s.score = Math.round((s.correctAnswers / (session.totalQuestions || 5)) * 20);
            }

            const submittedCount = qSubmissions.users.size;
            io.to(room).emit('quiz:submission_count', {
                quizId,
                questionIndex,
                submittedCount,
                totalStudents: Math.max(session.participants.size, submittedCount),
                tallies: qSubmissions.tallies
            });

            if (idempotencyKey) {
                socket.emit('quiz:submission_ack', { idempotencyKey, status: 'processed' });
            }
        }
    });

    // ── Offline Fault-Tolerance: Ingest batch of queued answers ───────────────
    socket.on('quiz:sync_batch', ({ quizId, studentEmail, studentName, submissions }) => {
        const result = processSubmissionsBatch({
            quizId,
            studentEmail,
            studentName,
            submissions,
            activeSessions,
            io
        });

        console.log(`[Socket.IO Sync] Batch processed for ${studentEmail || 'student'}: ${result.processed.length} synced, ${result.duplicates.length} duplicates`);
        socket.emit('quiz:sync_ack', result);
    });

    // Teacher reveals question answer / results
    socket.on('quiz:reveal_answer', ({ quizId, questionIndex, correctIndex }) => {
        const room = `quiz_${quizId}`;
        const session = activeSessions.get(quizId);
        let tallies = { 0: 0, 1: 0, 2: 0, 3: 0 };
        if (session) {
            const qKey = `q_${questionIndex !== undefined ? questionIndex : 0}`;
            if (session.submissions.has(qKey)) {
                tallies = session.submissions.get(qKey).tallies;
            }
        }
        console.log(`[Socket.IO] Reveal answer for Q${questionIndex} in ${room}, correct: ${correctIndex}`);
        io.to(room).emit('quiz:answer_revealed', {
            quizId,
            questionIndex,
            correctIndex,
            tallies
        });
    });

    // ── Anti-Cheating: student left the quiz tab ──────────────────────────────
    socket.on('quiz:integrity_alert', ({ quizId, studentEmail, studentName, reason, timestamp }) => {
        const room = `quiz_${quizId}`;
        const session = activeSessions.get(quizId);
        if (session) {
            // Store alert log on session
            if (!session.integrityAlerts) session.integrityAlerts = [];
            session.integrityAlerts.push({ studentEmail, studentName, reason, timestamp: timestamp || Date.now() });
        }
        console.log(`[Socket.IO] ⚠️  Integrity alert from ${studentName} (${studentEmail}): ${reason}`);
        // Relay ONLY to the teacher's room (not back to students)
        socket.to(room).emit('quiz:integrity_alert', {
            quizId,
            studentEmail,
            studentName,
            reason,
            timestamp: timestamp || Date.now()
        });
    });

    // ── Anti-Cheating: single-device lockdown ─────────────────────────────────
    socket.on('quiz:device_check', ({ quizId, studentEmail }) => {
        const session = activeSessions.get(quizId);
        if (!session) {
            socket.emit('quiz:device_status', { allowed: true });
            return;
        }
        if (!session.deviceMap) session.deviceMap = new Map();
        const existing = session.deviceMap.get(studentEmail);
        if (existing && existing !== socket.id) {
            // Another device is already registered for this student
            console.log(`[Socket.IO] 🚫 Device conflict for ${studentEmail} — rejecting ${socket.id}`);
            socket.emit('quiz:device_status', { allowed: false, reason: 'Another device is already taking this quiz with your account.' });
        } else {
            session.deviceMap.set(studentEmail, socket.id);
            socket.emit('quiz:device_status', { allowed: true });
        }
    });

    // ── Offline AI: Student submits short answer explanation ──────────────────
    socket.on('quiz:submit_short_answer', ({ quizId, studentName, studentEmail, questionIndex, answerText, referenceAnswer, keyConcepts, idempotencyKey, timestamp }) => {
        const room = `quiz_${quizId}`;
        const session = activeSessions.get(quizId);
        if (session) {
            if (!session.processedKeys) session.processedKeys = new Set();
            if (idempotencyKey) {
                if (session.processedKeys.has(idempotencyKey)) {
                    socket.emit('quiz:submission_ack', { idempotencyKey, status: 'duplicate' });
                    return;
                }
                session.processedKeys.add(idempotencyKey);
            }

            if (!session.shortAnswers) session.shortAnswers = new Map();
            const qKey = `q_${questionIndex !== undefined ? questionIndex : 0}`;
            if (!session.shortAnswers.has(qKey)) {
                session.shortAnswers.set(qKey, []);
            }
            const qList = session.shortAnswers.get(qKey);
            
            // Deduplicate or update student answer
            const existingIdx = qList.findIndex(a => a.studentEmail === studentEmail);
            const entry = {
                studentName: studentName || 'Student',
                studentEmail: studentEmail || 'student@univ.dz',
                text: answerText || '',
                timestamp: timestamp || Date.now()
            };
            if (existingIdx >= 0) {
                qList[existingIdx] = entry;
            } else {
                qList.push(entry);
            }

            // Perform instant Semantic Clustering
            const ref = referenceAnswer || "A pointer is a variable that stores the memory address of another variable in RAM.";
            const clustersResult = clusterAnswers(qList, ref);

            // Compute score for student & leaderboard
            const evaluation = evaluateShortAnswer(answerText || '', ref, keyConcepts || ['pointer', 'memory address', 'variable']);
            if (!session.scores) session.scores = new Map();
            const userKey = studentEmail || socket.id;
            session.scores.set(userKey, {
                name: studentName || 'Student',
                email: studentEmail || userKey,
                score: Math.round(evaluation.score * 20),
                correctAnswers: evaluation.score >= 0.5 ? 1 : 0
            });

            console.log(`[Socket.IO AI] Short answer from ${studentName}: "${(answerText || '').substring(0, 30)}..." -> Score: ${evaluation.scoreOutOf20}/20`);

            // Emit live semantic clusters to classroom projector & teacher
            io.to(room).emit('quiz:semantic_clusters_update', {
                quizId,
                questionIndex,
                totalAnswers: qList.length,
                totalStudents: Math.max(session.participants.size, qList.length),
                ...clustersResult
            });

            // Echo evaluation result directly back to the submitting student
            socket.emit('quiz:ai_evaluation_result', {
                questionIndex,
                evaluation
            });

            if (idempotencyKey) {
                socket.emit('quiz:submission_ack', { idempotencyKey, status: 'processed' });
            }
        }
    });

    // Teacher ends the quiz / Show podium
    socket.on('quiz:end', ({ quizId, leaderboard }) => {
        const room = `quiz_${quizId}`;
        const session = activeSessions.get(quizId);
        let finalLeaderboard = leaderboard;
        if (!finalLeaderboard || finalLeaderboard.length === 0) {
            if (session && session.scores && session.scores.size > 0) {
                finalLeaderboard = Array.from(session.scores.values())
                    .sort((a, b) => b.score - a.score)
                    .map((s, idx) => ({
                        rank: idx + 1,
                        name: s.name,
                        email: s.email,
                        score: `${s.score} / 20`,
                        correct: s.correctAnswers
                    }));
            } else {
                finalLeaderboard = [
                    { rank: 1, name: "Yasmine Halag", score: "19.5 / 20", correct: 5 },
                    { rank: 2, name: "Karim Benali", score: "18.0 / 20", correct: 4 },
                    { rank: 3, name: "Amina Saidi", score: "16.5 / 20", correct: 4 },
                    { rank: 4, name: "Mehdi Touati", score: "15.0 / 20", correct: 3 },
                    { rank: 5, name: "Sara Bouzid", score: "14.0 / 20", correct: 3 }
                ];
            }
        }
        console.log(`[Socket.IO] Quiz ${quizId} ended. Emitting podium with ${finalLeaderboard.length} entries.`);
        io.to(room).emit('quiz:finished', {
            quizId,
            leaderboard: finalLeaderboard
        });
    });

    socket.on('disconnect', () => {
        // Clean up disconnected participants
        for (const [quizId, session] of activeSessions.entries()) {
            if (session.participants.has(socket.id)) {
                session.participants.delete(socket.id);
                io.to(`quiz_${quizId}`).emit('quiz:participants_update', {
                    quizId,
                    count: session.participants.size,
                    participants: Array.from(session.participants.values())
                });
                io.to(`quiz_${quizId}`).emit('quiz:network_telemetry', {
                    quizId,
                    connectedClients: session.participants.size,
                    timestamp: Date.now()
                });
            }
        }
        console.log(`[Socket.IO] Disconnected: ${socket.id}`);
    });
});

const PORT = envConfig.PORT || 7000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  🍓 Raspberry Pi Embedded Quiz System Server Running! `);
    console.log(`  🌐 Local Access:       http://localhost:${PORT}`);
    console.log(`  📱 Network / AP URL:   http://0.0.0.0:${PORT}`);
    console.log(`  🖥️  Projector Screen:   http://localhost:${PORT}/projector`);
    console.log(`  👨‍🏫 Teacher Dashboard:  http://localhost:${PORT}/teacher`);
    console.log(`  🎓 Student Portal:     http://localhost:${PORT}/student`);
    console.log(`=======================================================`);
});

export { server, io };