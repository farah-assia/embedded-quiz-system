import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import envConfig from '../src/config/envConfig.js';
import app from '../src/app.js';
import {
    computeItemDifficulty,
    computePointBiserialDiscrimination,
    analyzeDistractorEfficiency,
    generateQuizPsychometricsReport
} from '../src/services/psychometricsService.js';
import {
    calculatePairwiseErrorConcordance,
    computeCollusionRiskScore,
    detectCollusionAnomalies
} from '../src/services/collusionService.js';

describe('Psychometrics (Item Response Theory) & Collusion Radar Engine', () => {
    let server;
    let baseURL;
    const teacherToken = jwt.sign({ id: 1, email: 'prof@univ.dz', role: 'teacher' }, envConfig.JWT_SECRET);

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

    // ── 1. Unit Tests: Item Difficulty Index (p-value) ─────────────────────────
    it('computeItemDifficulty() should accurately compute p-value and optimal classifications', () => {
        const easy = computeItemDifficulty(16, 20);
        assert.strictEqual(easy.pValue, 0.8);
        assert.strictEqual(easy.percentage, 80);
        assert.strictEqual(easy.difficultyLevel, 'Easy');
        assert.strictEqual(easy.isOptimal, true);

        const hard = computeItemDifficulty(3, 20);
        assert.strictEqual(hard.pValue, 0.15);
        assert.strictEqual(hard.percentage, 15);
        assert.strictEqual(hard.difficultyLevel, 'Very Hard');
        assert.strictEqual(hard.isOptimal, false);

        const empty = computeItemDifficulty(0, 0);
        assert.strictEqual(empty.pValue, 0);
        assert.strictEqual(empty.difficultyLevel, 'No Data');
    });

    // ── 2. Unit Tests: Point-Biserial Discrimination (r_pbis) ───────────────────
    it('computePointBiserialDiscrimination() should award high r_pbis when high scorers answer correctly', () => {
        const studentRecords = [
            { studentKey: 's1', totalScore: 19, isCorrect: true },
            { studentKey: 's2', totalScore: 18, isCorrect: true },
            { studentKey: 's3', totalScore: 17, isCorrect: true },
            { studentKey: 's4', totalScore: 10, isCorrect: false },
            { studentKey: 's5', totalScore: 8, isCorrect: false },
            { studentKey: 's6', totalScore: 6, isCorrect: false }
        ];

        const disc = computePointBiserialDiscrimination(studentRecords);
        assert.ok(disc.rPbis > 0.40, `Expected r_pbis > 0.40, got ${disc.rPbis}`);
        assert.strictEqual(disc.discriminationRating, 'Excellent');
        assert.strictEqual(disc.isDefective, false);
    });

    it('computePointBiserialDiscrimination() must flag DEFECTIVE questions with negative discrimination', () => {
        // High scorers fail this item, while weak students guess it right
        const studentRecords = [
            { studentKey: 'top1', totalScore: 19, isCorrect: false },
            { studentKey: 'top2', totalScore: 18, isCorrect: false },
            { studentKey: 'top3', totalScore: 17, isCorrect: false },
            { studentKey: 'bot1', totalScore: 9, isCorrect: true },
            { studentKey: 'bot2', totalScore: 7, isCorrect: true },
            { studentKey: 'bot3', totalScore: 5, isCorrect: true }
        ];

        const disc = computePointBiserialDiscrimination(studentRecords);
        assert.ok(disc.rPbis < 0, `Expected negative r_pbis, got ${disc.rPbis}`);
        assert.strictEqual(disc.isDefective, true);
        assert.strictEqual(disc.discriminationRating, 'Defective (Negative Discrimination)');
        assert.ok(disc.recommendation.includes('ALERT'));
    });

    // ── 3. Unit Tests: Distractor Efficiency ───────────────────────────────────
    it('analyzeDistractorEfficiency() should identify non-functioning and strong misconception distractors', () => {
        const tallies = { 0: 12, 1: 0, 2: 7, 3: 1 };
        const correctIndex = 0;
        const options = ['Correct Option', 'Unused Distractor', 'Plausible Trap', 'Weak Distractor'];

        const diagnostics = analyzeDistractorEfficiency(tallies, correctIndex, options);
        assert.strictEqual(diagnostics.length, 4);

        // Correct answer key
        assert.strictEqual(diagnostics[0].isCorrect, true);
        assert.strictEqual(diagnostics[0].status, 'Correct Answer Key');

        // Unused distractor (0%)
        assert.strictEqual(diagnostics[1].isCorrect, false);
        assert.strictEqual(diagnostics[1].count, 0);
        assert.strictEqual(diagnostics[1].status, 'Non-Functioning (0% picks)');

        // Strong misconception distractor (35%)
        assert.strictEqual(diagnostics[2].isCorrect, false);
        assert.ok(diagnostics[2].percentage >= 35);
        assert.strictEqual(diagnostics[2].status, 'Strong Misconception Distractor');
    });

    // ── 4. Unit Tests: Pairwise Error Concordance & Collusion ─────────────────
    it('calculatePairwiseErrorConcordance() should calculate 100% error concordance for identical wrong answers', () => {
        const answersA = [
            { questionIndex: 0, optionIndex: 1, isCorrect: true, timestamp: 1000 },
            { questionIndex: 1, optionIndex: 2, isCorrect: false, timestamp: 2000 },
            { questionIndex: 2, optionIndex: 3, isCorrect: false, timestamp: 3000 }
        ];
        const answersB = [
            { questionIndex: 0, optionIndex: 1, isCorrect: true, timestamp: 1400 },
            { questionIndex: 1, optionIndex: 2, isCorrect: false, timestamp: 2450 },
            { questionIndex: 2, optionIndex: 3, isCorrect: false, timestamp: 3500 }
        ];

        const metrics = calculatePairwiseErrorConcordance(answersA, answersB);
        assert.strictEqual(metrics.commonQuestions, 3);
        assert.strictEqual(metrics.identicalAnswers, 3);
        assert.strictEqual(metrics.sharedErrors, 2);
        assert.strictEqual(metrics.errorConcordance, 100);
        assert.ok(metrics.medianLatencyDeltaMs <= 500, `Expected sub-second delta, got ${metrics.medianLatencyDeltaMs}`);
    });

    it('computeCollusionRiskScore() should assign High Suspicion for high distractor concordance and sub-second latency', () => {
        const highRisk = computeCollusionRiskScore(100, 90, 420);
        assert.ok(highRisk.riskScore >= 75);
        assert.strictEqual(highRisk.riskLevel, 'High Suspicion');

        const lowRisk = computeCollusionRiskScore(0, 40, 6500);
        assert.ok(lowRisk.riskScore < 50);
        assert.strictEqual(lowRisk.riskLevel, 'Low Risk');
    });

    // ── 5. Integration Tests: Analytics Endpoints ──────────────────────────────
    it('GET /api/analytics/irt/:quizId should return 200 with full psychometric diagnostics', async () => {
        const res = await fetch(`${baseURL}/api/analytics/irt/1`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        assert.strictEqual(res.status, 200);

        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.ok(data.summary);
        assert.ok(Array.isArray(data.items));
        assert.ok(data.items.length > 0);
        assert.ok(data.items[0].difficulty);
        assert.ok(data.items[0].discrimination);
        assert.ok(Array.isArray(data.items[0].distractors));
    });

    it('GET /api/analytics/collusion/:quizId should return 200 with flagged pairs report', async () => {
        const res = await fetch(`${baseURL}/api/analytics/collusion/1`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        assert.strictEqual(res.status, 200);

        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.ok(data.totalStudentsAnalyzed >= 0);
        assert.ok(Array.isArray(data.flaggedPairs));
        if (data.flaggedPairs.length > 0) {
            assert.ok(data.flaggedPairs[0].studentA);
            assert.ok(data.flaggedPairs[0].studentB);
            assert.ok(data.flaggedPairs[0].riskLevel);
        }
    });
});
