import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import appConfig from './config/appConfig.js';
import teacherRoutes from './routes/teacherRoutes.js';
import question_router from './routes/question_router.js';
import answer_router from './routes/answer_router.js';
import studentRoutes from './routes/studentRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import notification_router from './routes/notification_router.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import errorHandler from './middlewares/errorHandler.js';

import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('activeSessions', new Map());

// Base configurations (JSON parsing, CORS, Morgan)
appConfig(app);
app.use(cookieParser());

// Serve static assets from public/ directory
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// System Health Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        system: 'Embedded Quiz System (Raspberry Pi Edition)',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Dynamic Offline SVG QR Code Endpoint
app.get('/api/qr', async (req, res) => {
    try {
        const text = req.query.text || `http://${req.headers.host || 'localhost:7000'}/student`;
        const svg = await QRCode.toString(text, {
            type: 'svg',
            width: parseInt(req.query.width) || 240,
            margin: 1,
            color: {
                dark: '#163b50',
                light: '#ffffff'
            }
        });
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
    } catch (err) {
        res.status(500).send('<svg></svg>');
    }
});

// Friendly Web Interface Routes
app.get('/projector', (req, res) => {
    res.sendFile(path.join(publicDir, 'projector/index.html'));
});

app.get('/teacher', (req, res) => {
    res.sendFile(path.join(publicDir, 'teacher/index.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(publicDir, 'student/index.html'));
});

// REST API Routes
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/result', resultRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/notifications', notification_router);
app.use('/api/answers', answer_router);
app.use('/api/questions', question_router);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);

// Centralized error handling
app.use(errorHandler);

export default app;
