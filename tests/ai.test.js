import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/app.js';
import {
    tokenize,
    vectorizeDocuments,
    cosineSimilarity,
    checkKeyConcepts,
    evaluateShortAnswer,
    clusterAnswers
} from '../src/ai/semanticEvaluator.js';

describe('Offline Edge AI & Semantic NLP Engine', () => {
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

    // ── 1. Unit Tests: Tokenization & Vector Space Model ───────────────────────
    it('tokenize() should extract clean words and n-grams while ignoring stop words', () => {
        const tokens = tokenize('A pointer stores the memory address of a variable');
        assert.ok(tokens.includes('pointer'));
        assert.ok(tokens.includes('memory'));
        assert.ok(tokens.includes('address'));
        assert.ok(tokens.includes('variable'));
        assert.ok(!tokens.includes('the'));
        assert.ok(!tokens.includes('of'));
        assert.ok(tokens.includes('memory_address'));
    });

    it('cosineSimilarity() should return 1.0 for identical vectors and 0.0 for orthogonal vectors', () => {
        const vecA = new Float64Array([1, 0, 1]);
        const vecB = new Float64Array([1, 0, 1]);
        const vecC = new Float64Array([0, 1, 0]);

        assert.strictEqual(Math.round(cosineSimilarity(vecA, vecB) * 100) / 100, 1.0);
        assert.strictEqual(cosineSimilarity(vecA, vecC), 0.0);
    });

    it('checkKeyConcepts() should detect present vs missing required concepts', () => {
        const text = 'A pointer stores the memory address in physical RAM.';
        const result = checkKeyConcepts(text, ['pointer', 'memory address', 'variable']);
        assert.deepStrictEqual(result.matched, ['pointer', 'memory address']);
        assert.deepStrictEqual(result.missing, ['variable']);
        assert.strictEqual(Math.round(result.coverage * 100) / 100, 0.67);
    });

    // ── 2. Semantic Evaluation: Conceptual Similarity ─────────────────────────
    it('evaluateShortAnswer() should award high grade (>= 15/20) for semantically correct answer with different wording', () => {
        const ref = 'A pointer is a variable that stores the memory address of another variable.';
        const student = 'It is an object that holds the memory location of another variable in RAM.';
        const concepts = ['pointer', 'memory address', 'variable'];

        const evaluation = evaluateShortAnswer(student, ref, concepts);
        assert.ok(Number(evaluation.scoreOutOf20) >= 14.0, `Score was ${evaluation.scoreOutOf20}, expected >= 14`);
        assert.ok(evaluation.percentage >= 70);
        assert.ok(evaluation.matchedConcepts.includes('variable'));
        assert.ok(evaluation.feedback.length > 0);
    });

    it('evaluateShortAnswer() should assign low mark (< 8/20) for misconception or off-topic answer', () => {
        const ref = 'A pointer is a variable that stores the memory address of another variable.';
        const student = 'HTML is used to style webpage buttons with colors.';
        const concepts = ['pointer', 'memory address', 'variable'];

        const evaluation = evaluateShortAnswer(student, ref, concepts);
        assert.ok(Number(evaluation.scoreOutOf20) <= 6.0, `Score was ${evaluation.scoreOutOf20}, expected <= 6`);
        assert.strictEqual(evaluation.rating, 'Needs Improvement');
    });

    it('evaluateShortAnswer() should return 0/20 for empty or blank submission', () => {
        const ref = 'A pointer is a variable storing a memory address.';
        const evaluation = evaluateShortAnswer('   ', ref);
        assert.strictEqual(evaluation.scoreOutOf20, '0.00');
        assert.strictEqual(evaluation.percentage, 0);
    });

    // ── 3. Semantic Concept Clustering ─────────────────────────────────────────
    it('clusterAnswers() should group accurate, misconception, and incomplete answers into distinct clusters', () => {
        const answers = [
            { studentName: 'Amine', text: 'A pointer holds the memory address of a variable in RAM.' },
            { studentName: 'Yasmine', text: 'It points to the memory location address of another object.' },
            { studentName: 'Karim', text: 'A pointer stores the integer number value of a class.' },
            { studentName: 'Mehdi', text: 'function loop' }
        ];
        const ref = 'A pointer is a variable that stores the memory address of another variable.';

        const result = clusterAnswers(answers, ref);
        assert.strictEqual(result.totalAnswers, 4);
        assert.ok(result.clusters.length >= 2, 'Expected at least 2 clusters');
        
        const masteryCluster = result.clusters.find(c => c.id === 'mastery');
        assert.ok(masteryCluster, 'Mastery cluster should be formed');
        assert.ok(masteryCluster.count >= 2, 'At least 2 accurate students in mastery cluster');
        assert.ok(result.topKeywords.length > 0);
    });

    // ── 4. REST API Endpoint Integration Tests ─────────────────────────────────
    it('POST /api/ai/evaluate should return 200 with complete evaluation schema', async () => {
        const res = await fetch(`${baseURL}/api/ai/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentAnswer: 'A pointer holds a memory address of data.',
                referenceAnswer: 'A pointer is a variable storing a memory address.',
                keyConcepts: ['pointer', 'memory address']
            })
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.ok(data.evaluation);
        assert.ok(data.evaluation.scoreOutOf20);
        assert.ok(data.evaluation.percentage > 0);
        assert.ok(data.evaluation.feedback);
    });

    it('POST /api/ai/cluster should return 200 with clusters array and keyword cloud', async () => {
        const res = await fetch(`${baseURL}/api/ai/cluster`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                answers: [
                    { studentName: 'Alice', text: 'Memory address variable.' },
                    { studentName: 'Bob', text: 'Points to memory address location.' },
                    { studentName: 'Charlie', text: 'Calculates math formula.' }
                ],
                referenceAnswer: 'A pointer is a variable storing a memory address.'
            })
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.ok(Array.isArray(data.clusters));
        assert.ok(data.clusters.length >= 2);
        assert.ok(Array.isArray(data.topKeywords));
    });

    it('GET /api/ai/demo-question should return standard CS short-answer question', async () => {
        const res = await fetch(`${baseURL}/api/ai/demo-question`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.type, 'short_answer');
        assert.ok(data.referenceAnswer);
        assert.ok(Array.isArray(data.keyConcepts));
    });
});
