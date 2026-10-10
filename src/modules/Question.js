import mysql from 'mysql2';
import pool from '../config/dbConfig.js';
class Question {
    static async createQuestion({ quiz_id, question_text, duration_seconds, grade }) {
        try {
            const [result] = await pool.execute(
                'INSERT INTO questions (quiz_id, question_text, duration_minutes, grade) VALUES (?, ?, ?, ?)',
                [quiz_id, question_text, duration_seconds || null, grade || 1]
            );
            return { id: result.insertId, message: "Question added successfully" };
        } catch (error) {
            throw new Error(`Error while adding a question: ${error.message}`);
        }
    }

    // syrine: Cette méthode récupère une question par son ID.
    static async getQuestionById(id) {
        try {
            const [question] = await pool.execute(
                'SELECT * FROM questions WHERE id = ?',
                [id]
            );
            if (question.length === 0) return { error: "Question not found" };
            return question[0]; // syrine: Retourne la première (et unique) question trouvée.
        } catch (error) {
            throw new Error(`Error while retrieving the question: ${error.message}`);
        }
    }

    // syrine: Cette méthode met à jour le texte d'une question spécifique.
    static async updateQuestionText(id, { question_text }) {
        try {
            const [result] = await pool.execute(
                'UPDATE questions SET question_text = ? WHERE id = ?',
                [question_text, id]
            );
            if (result.affectedRows === 0) return { error: "Question not found" };
            return { message: "Question text updated successfully" };
        } catch (error) {
            throw new Error(`Error while updating the question: ${error.message}`);
        }
    }

    // syrine: Cette méthode met à jour la durée d'une question.
    static async updateQuestionDuration(id, { duration_seconds }) {
        try {
            const [result] = await pool.execute(
                'UPDATE questions SET duration_seconds = ? WHERE id = ?',
                [duration_seconds, id]
            );
            if (result.affectedRows === 0) return { error: 'Question not found' };
            return { message: "Question duration updated successfully" };
        } catch (error) {
            throw new Error(`Error while updating the question: ${error.message}`);
        }
    }

    // syrine: Cette méthode met à jour la note d'une question.
    static async updateQuestionGrade(id, { grade }) {
        try {
            const [result] = await pool.execute(
                'UPDATE questions SET grade = ? WHERE id = ?',
                [grade, id]
            );
            if (result.affectedRows === 0) return { error: "Question not found" };
            return { message: "Question grade updated successfully" };
        } catch (error) {
            throw new Error(`Error while updating the question grade: ${error.message}`);
        }
    }

    // syrine: Cette méthode supprime une question de la base de données.
    static async deleteQuestion(id) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM questions WHERE id = ?',
                [id]
            );
            if (result.affectedRows === 0) return { error: "Question not found" };
            return { message: "Question deleted successfully" };
        } catch (error) {
            throw new Error(`Error while deleting the question: ${error.message}`);
        }
    }

    // syrine: Cette méthode récupère toutes les questions associées à un quiz spécifique.
    static async getQuizQuestions(quiz_id) {
        try {
            const [questions] = await pool.execute(
                'SELECT * FROM questions WHERE quiz_id = ?',
                [quiz_id]
            );
            return questions;
        } catch (error) {
            throw new Error(`Error while getting quiz questions: ${error.message}`);
        }
    }

   
}

export default Question;

