import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import envConfig from '../src/config/envConfig.js';
import app from '../src/app.js';

describe('Express Application & System Endpoints', () => {
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

    it('GET /health should return 200 OK with system status and uptime', async () => {
        const res = await fetch(`${baseURL}/health`);
        assert.strictEqual(res.status, 200);

        const data = await res.json();
        assert.strictEqual(data.status, 'UP');
        assert.strictEqual(typeof data.uptimeSeconds, 'number');
        assert.ok(data.timestamp);
    });

    it('GET / should serve the main landing hub HTML page', async () => {
        const res = await fetch(`${baseURL}/`);
        assert.strictEqual(res.status, 200);
        const html = await res.text();
        assert.ok(html.includes('Teacher Web Platform'));
        assert.ok(html.includes('Student Application'));
    });

    it('GET /projector should serve the classroom projector display HTML', async () => {
        const res = await fetch(`${baseURL}/projector`);
        assert.strictEqual(res.status, 200);
        const html = await res.text();
        assert.ok(html.includes('Classroom Projector Screen'));
    });

    it('GET /teacher should serve the teacher dashboard HTML', async () => {
        const res = await fetch(`${baseURL}/teacher`);
        assert.strictEqual(res.status, 200);
        const html = await res.text();
        assert.ok(html.includes('Teacher Portal'));
        assert.ok(html.includes('Dashboard'));
    });

    it('GET /student should serve the mobile student portal HTML', async () => {
        const res = await fetch(`${baseURL}/student`);
        assert.strictEqual(res.status, 200);
        const html = await res.text();
        assert.ok(html.includes('Student Quiz Application'));
        assert.ok(html.includes('ClassQuiz'));
    });

    it('POST /api/teachers/register without body should return 404 or 400 validation error', async () => {
        const res = await fetch(`${baseURL}/api/teachers/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        assert.ok([400, 404].includes(res.status));
    });

    it('GET /api/qr should return valid SVG QR code', async () => {
        const res = await fetch(`${baseURL}/api/qr`);
        assert.strictEqual(res.status, 200);
        assert.ok(res.headers.get('content-type').includes('image/svg+xml'));
        const svg = await res.text();
        assert.ok(svg.includes('<svg'));
        assert.ok(svg.includes('</svg>'));
    });

    it('GET /student/manifest.json should return valid PWA Web App Manifest', async () => {
        const res = await fetch(`${baseURL}/student/manifest.json`);
        assert.strictEqual(res.status, 200);
        const manifest = await res.json();
        assert.strictEqual(manifest.short_name, 'κουίζυ');
        assert.strictEqual(manifest.display, 'standalone');
        assert.ok(manifest.icons && manifest.icons.length >= 2);
    });

    it('GET /student/sw.js should serve the PWA Service Worker', async () => {
        const res = await fetch(`${baseURL}/student/sw.js`);
        assert.strictEqual(res.status, 200);
        const script = await res.text();
        assert.ok(script.includes('quizy-student-v1'));
        assert.ok(script.includes('self.addEventListener(\'fetch\''));
    });

    it('GET /student/offline.html should serve the offline fallback page', async () => {
        const res = await fetch(`${baseURL}/student/offline.html`);
        assert.strictEqual(res.status, 200);
        const html = await res.text();
        assert.ok(html.includes('Connection Lost'));
        assert.ok(html.includes('ClassQuiz-Offline'));
    });

    it('GET /api/result/export/:quizId should return official CSV Gradebook with student results', async () => {
        const res = await fetch(`${baseURL}/api/result/export/1`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.headers.get('content-type').includes('text/csv'));
        assert.ok(res.headers.get('content-disposition').includes('gradebook_quiz_1.csv'));
        const csv = await res.text();
        assert.ok(csv.includes('Rank,First Name,Last Name,Email'));
        assert.ok(csv.includes('Score (/20)'));
        assert.ok(csv.includes('Integrity Violations'));
    });

    it('GET /api/result/analytics/:quizId should return Question Analytics CSV', async () => {
        const res = await fetch(`${baseURL}/api/result/analytics/1`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.headers.get('content-type').includes('text/csv'));
        assert.ok(res.headers.get('content-disposition').includes('question_analytics_quiz_1.csv'));
        const csv = await res.text();
        assert.ok(csv.includes('Question #,Question Text'));
        assert.ok(csv.includes('Difficulty Rating'));
    });
});
