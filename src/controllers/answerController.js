import Answer from '../modules/answer.js';


// Ajouter une réponse
 const createAnswer = async (req, res) => {
    try {
        const { question_id, answer_text, is_correct } = req.body;
        const newAnswer = await Answer.createAnswer({ question_id, answer_text, is_correct });
        if (newAnswer.error) return res.status(400).json({ error: newAnswer.error });
        res.status(201).json(newAnswer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Récupérer une réponse par ID
 const getAnswerById = async (req, res) => {
    try {
        const { id } = req.params;
        const answer = await Answer.getAnswerById(id);
        if (answer.error) return res.status(404).json({ error: answer.error });
        res.json(answer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
 const getStudentAnswerForQuestion = async (req, res) => {
    const { student_id, quiz_id, question_id } = req.params;

    const result = await Answer.getStudentAnswerForQuestion({
        student_id,
        quiz_id,
        question_id,
    });

    if (result.error) {
        return res.status(404).json({ error: result.error });
    }

    res.json(result);
};
// Récupérer toutes les réponses d'une question
 const getAnswersByQuestionId = async (req, res) => {
    try {
        const { question_id } = req.params;
        const answers = await Answer.getAnswersByQuestionId(question_id);
        res.json(answers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mettre à jour le texte d'une réponse
 const updateAnswerText = async (req, res) => {
    try {
        const { id } = req.params;
        const { answer_text } = req.body;
        const updatedAnswer = await Answer.updateAnswerText(id, { answer_text });
        if (updatedAnswer.error) return res.status(404).json({ error: updatedAnswer.error });
        res.json(updatedAnswer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mettre à jour si une réponse est correcte ou non
 const updateAnswerCorrectness = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_correct } = req.body;
        const updatedAnswer = await Answer.updateAnswerCorrectness(id, { is_correct });
        if (updatedAnswer.error) return res.status(404).json({ error: updatedAnswer.error });
        res.json(updatedAnswer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


 const deleteAnswer = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedAnswer = await Answer.deleteAnswer(id);
        if (deletedAnswer.error) return res.status(404).json({ error: deletedAnswer.error });
        res.json(deletedAnswer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const submitAnswer = async (req, res) => {
    try {
        const { student_id, quiz_id, question_id, answer_id } = req.body;

        if (!student_id || !quiz_id || !question_id) {
            return res.status(400).json({ error: "Champs requis manquants" });
        }

        const result = await Answer.submitAnswer({ student_id, quiz_id, question_id, answer_id });

        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default {
    createAnswer,
    getAnswerById,
    getAnswersByQuestionId,
    updateAnswerText,
    updateAnswerCorrectness,
    deleteAnswer,
    submitAnswer,
 getStudentAnswerForQuestion
    
};
