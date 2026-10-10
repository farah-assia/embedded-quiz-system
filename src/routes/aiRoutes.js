import express from 'express';
import { evaluateShortAnswer, clusterAnswers } from '../ai/semanticEvaluator.js';
import { generateQuizFromTopic, generateQuizFromNotes } from '../ai/quizGenerator.js';

const router = express.Router();

/**
 * POST /api/ai/evaluate
 * Offline semantic grading of a student short-answer response
 */
router.post('/evaluate', (req, res) => {
    try {
        const { studentAnswer, referenceAnswer, keyConcepts } = req.body;
        
        if (!referenceAnswer) {
            return res.status(400).json({ error: 'referenceAnswer is required for semantic evaluation.' });
        }
        
        const evaluation = evaluateShortAnswer(studentAnswer || '', referenceAnswer, keyConcepts || []);
        res.status(200).json({
            success: true,
            model: 'TF-IDF Vector Space Model & Cosine Similarity (Edge Offline)',
            evaluation
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ai/cluster
 * Cluster classroom student answers into semantic concept groups
 */
router.post('/cluster', (req, res) => {
    try {
        const { answers, referenceAnswer } = req.body;
        
        if (!Array.isArray(answers)) {
            return res.status(400).json({ error: 'answers must be an array of { studentName, text }.' });
        }
        
        const clusterResults = clusterAnswers(answers, referenceAnswer || '');
        res.status(200).json({
            success: true,
            model: 'K-Medoids Semantic Concept Clustering (Edge Offline)',
            ...clusterResults
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ai/generate-quiz
 * Generate a complete pedagogical classroom quiz using Edge AI
 * Mode 1: from Topic & parameters
 * Mode 2: from Lecture Notes / Course Text
 */
router.post('/generate-quiz', (req, res) => {
    try {
        const {
            mode = 'topic',
            topic,
            notesText,
            moduleName = 'POO',
            level = '1CP',
            questionCount = 5,
            difficulty = 'Intermediate',
            includeShortAnswer = true
        } = req.body;

        let generatedQuiz;

        if (mode === 'notes' || (notesText && notesText.trim().length > 20)) {
            generatedQuiz = generateQuizFromNotes({
                notesText: notesText || topic,
                moduleName,
                level,
                questionCount: Number(questionCount) || 5,
                difficulty,
                includeShortAnswer: Boolean(includeShortAnswer)
            });
        } else {
            generatedQuiz = generateQuizFromTopic({
                topic: topic || 'Object-Oriented Programming',
                moduleName,
                level,
                questionCount: Number(questionCount) || 5,
                difficulty,
                includeShortAnswer: Boolean(includeShortAnswer)
            });
        }

        res.status(200).json({
            success: true,
            quiz: generatedQuiz
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ai/demo-question
 * Returns standard computer science short-answer question and reference exemplar
 */
router.get('/demo-question', (req, res) => {
    res.status(200).json({
        id: 'ai-q1',
        type: 'short_answer',
        module: 'POO & Architecture',
        text: 'Explain what a pointer is in C/C++, and how it relates to physical memory.',
        referenceAnswer: 'A pointer is a variable that stores the memory address of another variable or object rather than holding a direct value.',
        keyConcepts: ['pointer', 'memory address', 'variable', 'reference', 'location'],
        sampleAnswers: [
            { studentName: 'Amine Benali', text: 'A pointer is a variable holding the memory address of another variable.' },
            { studentName: 'Yasmine Halag', text: 'It points to a memory location in RAM where the actual data resides.' },
            { studentName: 'Karim Ziani', text: 'It is a special variable that stores the integer value of an object.' },
            { studentName: 'Lina Bouzid', text: 'A pointer holds the address of a variable to pass by reference.' },
            { studentName: 'Mehdi Saadi', text: 'It is just a function name that runs in loop.' }
        ]
    });
});

export default router;
