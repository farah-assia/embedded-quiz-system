import Question from '../modules/Question.js';
import Quiz from '../modules/Quiz.js';

// Ajouter une question
 const createQuestion = async (req, res) => {
    try {
        const { quiz_id, question_text, duration_seconds, grade } = req.body;
        if (!quiz_id || !question_text) return res.status(400).json({ error: "Missing required fields" });

        const newQuestion = await Question.createQuestion({ quiz_id, question_text, duration_seconds, grade });
     
       const quiz = await Quiz.findById(quiz_id);
        if (quiz && quiz.timed_by === 'question') {
            const totalDuration = await Quiz.calculateTotalDuration(quiz_id);
            await Quiz.updateQuizDuration(quiz_id, totalDuration);
        }
        res.status(201).json(newQuestion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Récupérer une question par ID
 const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;
        const question = await Question.getQuestionById(id);
        if (question.error) return res.status(404).json({ error: question.error });
        res.json(question);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mettre à jour le texte d'une question
 const updateQuestionText = async (req, res) => {
    try {
        const { id } = req.params;
        const { question_text } = req.body;
        const updatedQuestion = await Question.updateQuestionText(id, { question_text });
        if (updatedQuestion.error) return res.status(404).json({ error: updatedQuestion.error });
        res.json(updatedQuestion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mettre à jour la durée d'une question
 const updateQuestionDuration = async (req, res) => {
    try {
        const { id } = req.params;
        const { duration_seconds } = req.body;
        const updatedQuestion = await Question.updateQuestionDuration(id, { duration_seconds });
        if (updatedQuestion.error) return res.status(404).json({ error: updatedQuestion.error });
        res.json(updatedQuestion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mettre à jour la note d'une question
 const updateQuestionGrade = async (req, res) => {
    try {
        const { id } = req.params;
        const { grade } = req.body;
        const updatedQuestion = await Question.updateQuestionGrade(id, { grade });
        if (updatedQuestion.error) return res.status(404).json({ error: updatedQuestion.error });
        res.json(updatedQuestion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Supprimer une question
 const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedQuestion = await Question.deleteQuestion(id);
        if (deletedQuestion.error) return res.status(404).json({ error: deletedQuestion.error });
        res.json(deletedQuestion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Récupérer toutes les questions d'un quiz
 const getQuizQuestions = async (req, res) => {
    try {
        const { quiz_id } = req.params;
        const questions = await Question.getQuizQuestions(quiz_id);
        res.json(questions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default {
    createQuestion,
    updateQuestionText,
    updateQuestionDuration,
    updateQuestionGrade,
    deleteQuestion,
    getQuizQuestions,
    getQuestionById
};


