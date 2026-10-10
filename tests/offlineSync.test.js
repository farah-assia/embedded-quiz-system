import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/app.js';
import { processSubmissionsBatch } from '../src/services/offlineSyncService.js';

describe('Amphitheater Fault-Tolerance & Offline Sync Queue Engine', () => {
    let server;
    let baseURL;

    before(async () => {
        await new Promise((resolve) => {
            server = http.createServer(app);
            server.listen(0, '127.0.0.1', () => {
                const port = server.address().port;
                baseURL = `http://127.0.0.1:${port}`;
                resolve();
            });
        });
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    // ── 1. Unit Tests: Offline Sync Service & Idempotency ──────────────────────
    it('processSubmissionsBatch() should correctly ingest valid offline queued submissions', () => {
        const activeSessions = new Map();
        const quizId = 101;
        const now = Date.now();

        const submissions = [
            {
                idempotencyKey: 'sub_101_q0_amina@univ.dz_1001',
                questionIndex: 0,
                optionIndex: 1,
                isCorrect: true,
                timestamp: now - 5000
            },
            {
                idempotencyKey: 'sub_101_q1_amina@univ.dz_1002',
                questionIndex: 1,
                optionIndex: 2,
                isCorrect: false,
                timestamp: now - 2000
            }
        ];

        const result = processSubmissionsBatch({
            quizId,
            studentEmail: 'amina@univ.dz',
            studentName: 'Amina Saidi',
            submissions,
            activeSessions
        });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.processed.length, 2);
        assert.strictEqual(result.duplicates.length, 0);
        assert.strictEqual(result.rejected.length, 0);

        const session = activeSessions.get(quizId);
        assert.ok(session);
        assert.ok(session.processedKeys.has('sub_101_q0_amina@univ.dz_1001'));
        assert.ok(session.processedKeys.has('sub_101_q1_amina@univ.dz_1002'));
        assert.strictEqual(session.submissions.get('q_0').tallies[1], 1);
    });

    it('processSubmissionsBatch() must enforce strict idempotency (zero duplicate tallies or double scores)', () => {
        const activeSessions = new Map();
        const quizId = 102;
        const now = Date.now();

        const item = {
            idempotencyKey: 'sub_102_q0_karim@univ.dz_9999',
            questionIndex: 0,
            optionIndex: 0,
            isCorrect: true,
            timestamp: now
        };

        // First ingestion
        const firstRun = processSubmissionsBatch({
            quizId,
            studentEmail: 'karim@univ.dz',
            studentName: 'Karim Benali',
            submissions: [item],
            activeSessions
        });
        assert.strictEqual(firstRun.processed.length, 1);
        assert.strictEqual(firstRun.duplicates.length, 0);

        const session = activeSessions.get(quizId);
        const tallyBefore = session.submissions.get('q_0').tallies[0];
        const scoreBefore = session.scores.get('karim@univ.dz').score;

        // Second duplicate ingestion (e.g. Wi-Fi reconnected twice)
        const secondRun = processSubmissionsBatch({
            quizId,
            studentEmail: 'karim@univ.dz',
            studentName: 'Karim Benali',
            submissions: [item],
            activeSessions
        });

        assert.strictEqual(secondRun.processed.length, 0);
        assert.strictEqual(secondRun.duplicates.length, 1);
        assert.strictEqual(secondRun.duplicates[0], 'sub_102_q0_karim@univ.dz_9999');

        // Verify tallies and scores did NOT increase
        assert.strictEqual(session.submissions.get('q_0').tallies[0], tallyBefore);
        assert.strictEqual(session.scores.get('karim@univ.dz').score, scoreBefore);
    });

    it('processSubmissionsBatch() should reject future timestamps beyond tolerance', () => {
        const activeSessions = new Map();
        const quizId = 103;
        const futureTimestamp = Date.now() + 60000; // 60s in the future

        const submissions = [
            {
                idempotencyKey: 'sub_103_q0_future@univ.dz_001',
                questionIndex: 0,
                optionIndex: 0,
                isCorrect: true,
                timestamp: futureTimestamp
            }
        ];

        const result = processSubmissionsBatch({
            quizId,
            studentEmail: 'future@univ.dz',
            studentName: 'Time Traveler',
            submissions,
            activeSessions
        });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.processed.length, 0);
        assert.strictEqual(result.rejected.length, 1);
        assert.strictEqual(result.rejected[0].reason, 'Future timestamp detected');
    });

    it('processSubmissionsBatch() should handle offline short-answer AI submissions in batches', () => {
        const activeSessions = new Map();
        const quizId = 104;

        const submissions = [
            {
                idempotencyKey: 'sub_104_q0_yasmine@univ.dz_short_1',
                type: 'short_answer',
                questionIndex: 0,
                answerText: 'A pointer is a variable that stores the physical memory address of another object.',
                referenceAnswer: 'A pointer is a variable that stores the memory address of another variable.',
                keyConcepts: ['pointer', 'memory address', 'variable'],
                timestamp: Date.now()
            }
        ];

        const result = processSubmissionsBatch({
            quizId,
            studentEmail: 'yasmine.halag@univ.dz',
            studentName: 'Yasmine Halag',
            submissions,
            activeSessions
        });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.processed.length, 1);
        const session = activeSessions.get(quizId);
        assert.ok(session.shortAnswers.has('q_0'));
        assert.strictEqual(session.shortAnswers.get('q_0').length, 1);
        assert.ok(session.scores.get('yasmine.halag@univ.dz').score >= 12);
    });

    // ── 2. Integration Tests: HTTP Batch Fallback Endpoint ─────────────────────
    it('POST /api/quiz/sync-batch should successfully process batch of submissions', async () => {
        const payload = {
            quizId: 201,
            studentEmail: 'student.batch@univ.dz',
            studentName: 'Batch Student',
            submissions: [
                {
                    idempotencyKey: 'sub_201_q0_batch_1',
                    questionIndex: 0,
                    optionIndex: 1,
                    isCorrect: true,
                    timestamp: Date.now() - 1000
                },
                {
                    idempotencyKey: 'sub_201_q1_batch_2',
                    questionIndex: 1,
                    optionIndex: 3,
                    isCorrect: false,
                    timestamp: Date.now() - 500
                }
            ]
        };

        const res = await fetch(`${baseURL}/api/quiz/sync-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.processed.length, 2);
        assert.strictEqual(data.duplicates.length, 0);
    });

    it('POST /api/quiz/sync-batch should gracefully ignore duplicate flushes', async () => {
        const payload = {
            quizId: 202,
            studentEmail: 'dup.batch@univ.dz',
            studentName: 'Dup Student',
            submissions: [
                {
                    idempotencyKey: 'sub_202_unique_token_xyz',
                    questionIndex: 0,
                    optionIndex: 2,
                    isCorrect: true,
                    timestamp: Date.now()
                }
            ]
        };

        // First call
        const res1 = await fetch(`${baseURL}/api/quiz/sync-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        assert.strictEqual(res1.status, 200);
        const data1 = await res1.json();
        assert.strictEqual(data1.processed.length, 1);

        // Second call with same payload
        const res2 = await fetch(`${baseURL}/api/quiz/sync-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        assert.strictEqual(res2.status, 200);
        const data2 = await res2.json();
        assert.strictEqual(data2.processed.length, 0);
        assert.strictEqual(data2.duplicates.length, 1);
        assert.strictEqual(data2.duplicates[0], 'sub_202_unique_token_xyz');
    });

    it('POST /api/quiz/sync-batch should reject invalid requests lacking quizId or submissions', async () => {
        const res = await fetch(`${baseURL}/api/quiz/sync-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentEmail: 'invalid@univ.dz' })
        });

        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.strictEqual(data.success, false);
    });
});
