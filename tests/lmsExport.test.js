import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/app.js';
import { exportToMoodleXml, exportToGift, generatePrintableExamHtml } from '../src/services/lmsExportService.js';

describe('LMS & Emergency Paper Exam Export Engine', () => {
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

    const mockQuiz = {
        id: 99,
        title: 'Microprocessor Architecture & Caches',
        module: 'ARCHI 1',
        duration: 45,
        questions: [
            {
                question: 'Which cache mapping policy avoids cache line conflict misses?',
                type: 'mcq',
                points: 2,
                options: [
                    { text: 'Fully Associative', is_correct: true, rationale: 'Any block can be placed in any line' },
                    { text: 'Direct Mapped', is_correct: false, rationale: 'Suffers high conflict misses' },
                    { text: '2-way Set Associative', is_correct: false, rationale: 'Reduces but does not eliminate conflict misses' },
                    { text: 'Virtual Memory Paging', is_correct: false, rationale: 'Not a CPU cache placement policy' }
                ]
            },
            {
                question: 'Define the principle of Temporal Locality.',
                type: 'short_answer',
                points: 4,
                referenceAnswer: 'Temporal locality means that memory locations accessed recently are likely to be accessed again in the near future.'
            }
        ]
    };

    it('exportToMoodleXml() should generate valid Moodle Question Bank XML', () => {
        const xml = exportToMoodleXml(mockQuiz);

        assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Must start with XML declaration');
        assert.ok(xml.includes('<quiz>'), 'Must contain <quiz> root');
        assert.ok(xml.includes('</quiz>'), 'Must terminate with </quiz>');
        assert.ok(xml.includes('<question type="category">'), 'Must define Moodle category');
        assert.ok(xml.includes('ARCHI 1'), 'Must include module category');
        assert.ok(xml.includes('<question type="multichoice">'), 'Must support multichoice items');
        assert.ok(xml.includes('<answer fraction="100" format="html">'), 'Must tag correct option with fraction="100"');
        assert.ok(xml.includes('<answer fraction="0" format="html">'), 'Must tag distractor option with fraction="0"');
        assert.ok(xml.includes('<question type="shortanswer">'), 'Must support shortanswer items');
        assert.ok(xml.includes('Temporal locality means'), 'Must include reference answer for grading');
    });

    it('exportToGift() should generate standard GIFT format syntax', () => {
        const gift = exportToGift(mockQuiz);

        assert.ok(gift.includes('$CATEGORY:'), 'Must include $CATEGORY definition');
        assert.ok(gift.includes('::Q1_'), 'Must include question identifier');
        assert.ok(gift.includes('=Fully Associative'), 'Must format correct answer with =');
        assert.ok(gift.includes('~Direct Mapped'), 'Must format wrong distractor with ~');
        assert.ok(gift.includes('=Temporal locality means'), 'Must format short answer with =');
    });

    it('generatePrintableExamHtml() should create print-ready A4 HTML examination sheet', () => {
        const html = generatePrintableExamHtml(mockQuiz, {
            universityName: 'École Supérieure en Informatique',
            durationMin: 45,
            includeKey: true
        });

        assert.ok(html.includes('<!DOCTYPE html>'), 'Must be valid standalone HTML');
        assert.ok(html.includes('Microprocessor Architecture &amp; Caches') || html.includes('Microprocessor Architecture'), 'Must display quiz title');
        assert.ok(html.includes('Nom &amp; Prénom:') || html.includes('Nom & Prénom:'), 'Must contain student identification header');
        assert.ok(html.includes('Matricule:'), 'Must include matricule / student ID blank');
        assert.ok(html.includes('bubble-checkbox'), 'Must include checkbox / bubble format');
        assert.ok(html.includes('ruled-lines'), 'Must provide lined writing area for short answer');
        assert.ok(html.includes('Grille de Correction'), 'Must include teacher answer key when enabled');
    });

    it('GET /api/quiz/export/:quizId?format=moodle should return 200 with XML content', async () => {
        const res = await fetch(`${baseURL}/api/quiz/export/1?format=moodle`);
        assert.strictEqual(res.status, 200);
        assert.ok(res.headers.get('content-type').includes('xml'));
        const text = await res.text();
        assert.ok(text.includes('<quiz>'));
        assert.ok(text.includes('</quiz>'));
    });

    it('GET /api/quiz/export/:quizId?format=gift should return 200 with text content', async () => {
        const res = await fetch(`${baseURL}/api/quiz/export/1?format=gift`);
        assert.strictEqual(res.status, 200);
        assert.ok(res.headers.get('content-type').includes('text/plain'));
        const text = await res.text();
        assert.ok(text.includes('$CATEGORY:'));
    });

    it('GET /api/quiz/export/:quizId?format=print should return 200 with printable HTML', async () => {
        const res = await fetch(`${baseURL}/api/quiz/export/1?format=print`);
        assert.strictEqual(res.status, 200);
        assert.ok(res.headers.get('content-type').includes('text/html'));
        const text = await res.text();
        assert.ok(text.includes('exam-header'));
    });
});
