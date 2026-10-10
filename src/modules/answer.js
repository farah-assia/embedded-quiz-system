//import pool from "mysql2";
import pool from '../config/dbConfig.js';

class Answer {
    // Ajouter une réponse
    static async createAnswer({ question_id, answer_text, is_correct }) {
        try {
            const [result] = await pool.query(
                "INSERT INTO answers (question_id, answer_text, is_correct) VALUES (?, ?, ?)",
                [question_id, answer_text, is_correct]
            );
            return { id: result.insertId, question_id, answer_text, is_correct };
        } catch (error) {
            return { error: error.message };
        }
    }

    // Récupérer une réponse par ID
    static async getAnswerById(id) {
        try {
            const [rows] = await pool.query("SELECT * FROM answers WHERE id = ?", [id]);
            if (rows.length === 0) return { error: "Réponse non trouvée" };
            return rows[0];
        } catch (error) {
            return { error: error.message };
        }
    }
    // Récupérer la réponse d'un étudiant pour une question spécifique
static async getStudentAnswerForQuestion({ student_id, quiz_id, question_id }) {
    try {
        const [rows] = await pool.query(
            `SELECT sr.*, a.answer_text, a.is_correct AS actual_correctness
             FROM student_responses sr
             JOIN answers a ON sr.answer_id = a.id
             WHERE sr.student_id = ? AND sr.quiz_id = ? AND sr.question_id = ?`,
            [student_id, quiz_id, question_id]
        );

        if (rows.length === 0) return { error: "Aucune réponse trouvée pour cet étudiant et cette question." };
        return rows[0];
    } catch (error) {
        return { error: error.message };
    }
}


    // Récupérer toutes les réponses d’une question
    static async getAnswersByQuestionId(question_id) {
        try {
            const [rows] = await pool.query("SELECT * FROM answers WHERE question_id = ?", [question_id]);
            return rows;
        } catch (error) {
            return { error: error.message };
        }
    }

    // Mettre à jour le texte d'une réponse
    static async updateAnswerText(id, { answer_text }) {
        try {
            const [result] = await pool.query(
                "UPDATE answers SET answer_text = ? WHERE id = ?",
                [answer_text, id]
            );
            if (result.affectedRows === 0) return { error: "Réponse non trouvée" };
            return { id, answer_text };
        } catch (error) {
            return { error: error.message };
        }
    }

    // Mettre à jour si une réponse est correcte ou non
    static async updateAnswerCorrectness(id, { is_correct }) {
        try {
            const [result] = await pool.query(
                "UPDATE answers SET is_correct = ? WHERE id = ?",
                [is_correct, id]
            );
            if (result.affectedRows === 0) return { error: "Réponse non trouvée" };
            return { id, is_correct };
        } catch (error) {
            return { error: error.message };
        }
    }

    // Supprimer une réponse
    static async deleteAnswer(id) {
        try {
            const [result] = await pool.query("DELETE FROM answers WHERE id = ?", [id]);
            if (result.affectedRows === 0) return { error: "Réponse non trouvée" };
            return { message: "Réponse supprimée" };
        } catch (error) {
            return { error: error.message };
        }
    }

//Imen: Get correct Answer for specific question
    static async getCorrectAnswerByQuestionId(question_id){
        try {
            const [answers] = await pool.query(
                `SELECT * FROM answers WHERE question_id = ? AND is_correct = ?`,
                [question_id, 1]
            );
    
            if (answers.length === 0) {
                return { error: "No correct answer found for this question" };
            }
    
            return answers[0]; // or return the whole array if multiple corrects are allowed
        } catch (error) {
            return { error: error.message };
        }
    }

 static async submitAnswer({ student_id, quiz_id, question_id, answer_id }) {
        try {
            // Vérifier si une réponse existe déjà
            const [existing] = await pool.query(
                `SELECT * FROM student_responses WHERE student_id = ? AND quiz_id = ? AND question_id = ?`,
                [student_id, quiz_id, question_id]
            );
    
            let is_correct = null;
    
            // Vérifie si la réponse est correcte
            if (answer_id !== null) {
                const [correctAnswer] = await pool.query(
                    `SELECT is_correct FROM answers WHERE id = ?`,
                    [answer_id]
                );
                if (correctAnswer.length > 0) {
                    is_correct = correctAnswer[0].is_correct;
                }
            }
    
            if (existing.length > 0) {
                await pool.query(
                    `UPDATE student_responses SET answer_id = ?, is_correct = ? WHERE student_id = ? AND quiz_id = ? AND question_id = ?`,
                    [answer_id, is_correct, student_id, quiz_id, question_id]
                );
                return { message: "Réponse mise à jour" };
            }
    
            const [result] = await pool.query(
                `INSERT INTO student_responses (student_id, quiz_id, question_id, answer_id, is_correct)
                 VALUES (?, ?, ?, ?, ?)`,
                [student_id, quiz_id, question_id, answer_id, is_correct]
            );
    
            return { message: "Réponse soumise", response_id: result.insertId, is_correct };
        } catch (error) {
            return { error: error.message };
        }
    }
}
export default Answer;
