import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/app.js';
import {
    generateQuizFromTopic,
    generateQuizFromNotes,
    extractConceptsFromText
} from '../src/ai/quizGenerator.js';

describe('Offline Edge AI Quiz Generator Engine', () => {
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

    it('extractConceptsFromText() should detect definitions in lecture notes', () => {
        const lectureNotes = `
            Virtual memory is a memory management technique providing an idealized abstraction of storage resources.
            Paging refers to a storage mechanism used by the operating system to retrieve processes from secondary storage.
            Deadlock represents a state where a set of processes are blocked because each process is holding a resource.
        `;
        const concepts = extractConceptsFromText(lectureNotes);
        assert.ok(Array.isArray(concepts));
        assert.ok(concepts.length >= 2, `Expected at least 2 definitions, got ${concepts.length}`);
        
        const terms = concepts.map(c => c.term.toLowerCase());
        assert.ok(terms.some(t => t.includes('virtual memory') || t.includes('paging') || t.includes('deadlock')));
    });

    it('generateQuizFromTopic() should generate a complete quiz with MCQs and Short-Answer', () => {
        const quiz = generateQuizFromTopic({
            topic: 'Object-Oriented Programming: Inheritance',
            moduleName: 'POO',
            level: '1CP',
            questionCount: 4,
            includeShortAnswer: true
        });

        assert.ok(quiz);
        assert.ok(quiz.title.includes('POO'));
        assert.equal(quiz.questions.length, 4);

        // Verify MCQ structure
        const mcq = quiz.questions.find(q => q.type === 'multiple_choice');
        assert.ok(mcq, 'Expected at least one MCQ');
        assert.equal(mcq.options.length, 4, 'MCQ must have 4 options');
        assert.ok(mcq.correctIndex >= 0 && mcq.correctIndex < 4, 'Valid correctIndex');
        assert.ok(mcq.options.some(o => o.correct), 'At least one correct option');

        // Verify Short Answer structure
        const sa = quiz.questions.find(q => q.type === 'short_answer');
        assert.ok(sa, 'Expected at least one Short Answer question');
        assert.ok(sa.referenceAnswer && sa.referenceAnswer.length > 10);
        assert.ok(Array.isArray(sa.keyConcepts) && sa.keyConcepts.length > 0);
    });

    it('generateQuizFromNotes() should parse course text and generate structured quiz', () => {
        const notes = `
            Operating System Architecture:
            A Mutex is a locking mechanism used to synchronize access to a shared resource among concurrent threads.
            A Semaphore represents a signaling mechanism that allows multiple threads to access finite resources.
            Context switching refers to storing the state of a CPU process to resume it later without data loss.
        `;
        const quiz = generateQuizFromNotes({
            notesText: notes,
            moduleName: 'SYS 1',
            level: '2CP',
            questionCount: 3,
            includeShortAnswer: true
        });

        assert.ok(quiz);
        assert.ok(quiz.title.includes('SYS 1'));
        assert.equal(quiz.questions.length, 3);
        assert.ok(quiz.questions.some(q => q.type === 'short_answer'));
    });

    it('POST /api/ai/generate-quiz should return 200 with generated quiz payload for topic mode', async () => {
        const res = await fetch(`${baseURL}/api/ai/generate-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'topic',
                topic: 'Computer Architecture & CPU Pipelines',
                moduleName: 'ARCHI 1',
                level: '1CS',
                questionCount: 3,
                includeShortAnswer: true
            })
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(data.success);
        assert.ok(data.quiz);
        assert.equal(data.quiz.questions.length, 3);
        assert.equal(data.quiz.module, 'ARCHI 1');
    });

    it('POST /api/ai/generate-quiz should return 200 with generated quiz payload for lecture notes mode', async () => {
        const res = await fetch(`${baseURL}/api/ai/generate-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'notes',
                notesText: 'A Packet represents a formatted unit of data carried by a packet-switched network. A Router is a networking device that forwards data packets between computer networks.',
                moduleName: 'RESEAU',
                level: '2CP',
                questionCount: 2,
                includeShortAnswer: true
            })
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(data.success);
        assert.ok(data.quiz);
        assert.equal(data.quiz.questions.length, 2);
    });

    it('POST /api/ai/generate-quiz should reject empty or short notes with error 400', async () => {
        const res = await fetch(`${baseURL}/api/ai/generate-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'notes',
                notesText: 'Too short'
            })
        });

        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.strictEqual(data.success, false);
        assert.ok(data.error);
    });

});
