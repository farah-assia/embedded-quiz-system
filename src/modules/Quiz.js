import mysql from 'mysql2';
import pool from '../config/dbConfig.js';

class Quiz {
static async create(teacher_id , module_id , title , timed_by , duration ,visibility ) {
    
    try {
    
        const [result] = await pool.execute(
            `INSERT INTO quizzes (teacher_id , module_id , title , timed_by, duration , visibility) VALUES (?, ?, ?, ?, ?,?)`,
            [teacher_id,  module_id ,title , timed_by, duration, visibility ?? 0]
        );
        console.log('Insert result:', result);
        return result.insertId;
    } catch (error) {
        console.error(`Error creating quiz: ${error.message}`);
        throw new Error("Failed to create quiz. Please try again later.");
    }
}
    static async delete(quizId) {
        try {
            const [result] = await pool.execute(`DELETE FROM quizzes WHERE id = ?`, [quizId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error deleting quiz:", error);
            return false;
        }
    }
    static async findById(quizId) {
        try {
            const [quiz] = await pool.execute(`SELECT * FROM quizzes WHERE id = ?`, [quizId]);
           
            if (quiz.length === 0) {
                throw new Error(`Quiz with ID ${id} not found`);
            } 
            return quiz[0];  
        }
         catch (error) {
            console.error("Error finding quiz:", error);
            return null;
        }
    }
    static async findByTeacherId(teacherId) {
        try {
            const [quizzes] = await pool.execute(`SELECT * FROM quizzes WHERE teacher_id = ?`, [teacherId]);
            return quizzes;
        } catch (error) {
            console.error("Error finding quizzes for teacher:", error);
            return [];
        }
    }
    static async update_visibility(id, visibility) {
        const [results] = await pool.query(
            `UPDATE quizzes SET visibility = ? WHERE id = ?`,
            [visibility ? 1 : 0, id]
        );
        return results.affectedRows > 0;
    }
    static async update_Title( quizId ,title) {
        try {
            const [result] = await pool.execute(
                `UPDATE quizzes SET title = ? WHERE id = ?`,
                [title, quizId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error updating quiz:", error);
            return false;
        }
    }
    static async update_Module(quizId, moduleName) {
        try {
           
            const [moduleResult] = await pool.execute(
                `SELECT id FROM modules WHERE  moduleName  = ?`,
                [moduleName]
            );
            if (moduleResult.length === 0) {
                console.log("Module not found!");
                return false;
            }

            const moduleId = moduleResult[0].id;
            const [updateResult] = await pool.execute(
                `UPDATE quizzes SET module_id = ? WHERE id = ?`,
                [moduleId, quizId]
            );
    
            return updateResult.affectedRows > 0;
        } catch (error) {
            console.error("Error updating quiz:", error);
            return false;
        }
    }
    
    static async update_duration( quizId ,time) {
        try {
            const [result] = await pool.execute(
                `UPDATE quizzes SET duration = ? WHERE id = ?`,
                [time, quizId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error updating quiz:", error);
            return false;
        }
    }

    static async updateQuizDuration(quizId, time) {
        return this.update_duration(quizId, time);
    }
    
    static async update_timedby( quizId ,etat) {
        try {
            const [result] = await pool.execute(
                `UPDATE quizzes SET timed_by = ? WHERE id = ?`,
                [etat , quizId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error updating quiz:", error);
            return false;
        }
    }
    
    static async getRandomizedQuestions(quizId) {
        try {
            const [questions] = await pool.execute(
                `SELECT * FROM questions WHERE quiz_id = ?`,
                [quizId]
            );
    
            if (questions.length === 0) {
                return [];
            }
            const shuffledQuestions = questions.slice().sort(() => Math.random() - 0.5);
            return shuffledQuestions;
        } catch (error) {
            console.error("Error fetching randomized questions:", error);
            return [];
        }
    }

    static async  getQuizzesByType(teacherId, timedBy) {
        try {
            const [quizzes] = await pool.execute(
                `SELECT * FROM quizzes 
                 WHERE teacher_id = ? AND timed_by = ?`,
                [teacherId, timedBy]
            );
            return quizzes;
        } catch (error) {
            console.error("Error fetching quizzes by timed_by:", error);
            throw error; 
        }
    }
    static async getAllQuizzesByTeacher(teacherId) {
        try {
            const [quizzes] = await pool.execute(
                `SELECT q.title, q.id, q.status, q.created_at, m.moduleName 
                 FROM quizzes q
                 JOIN modules m ON q.module_id = m.id
                 WHERE q.teacher_id = ?`,
                [teacherId] 
            );

            const formattedQuizzes = quizzes.map(quiz => {
                const date = new Date(quiz.created_at);
                return {
                    ...quiz,
                    created_at: date.toLocaleString() 
                };
            });
    
            return formattedQuizzes;
        } catch (error) {
            console.error("Error fetching quizzes by teacher:", error);
            throw error;
        }
    }
    static async getDraftQuizzes(teacherId) {
        try {
            const [quizzes] = await pool.execute(
            `SELECT q.title, q.created_at, m.moduleName 
             FROM quizzes q
             JOIN modules m ON q.module_id = m.id
             WHERE q.teacher_id = ? AND q.status = 'Draft'`,
                [teacherId]
            );
            return quizzes;
        } catch (error) {
            console.error("Error fetching draft quizzes :", error);
            throw error; 
        }
    }
    static async getPastQuizzes(teacherId) {
        try {
            const [quizzes] = await pool.execute(
            `SELECT q.title, q.created_at, m.moduleName 
             FROM quizzes q
             JOIN modules m ON q.module_id = m.id
             WHERE q.teacher_id = ? AND q.status = 'Past'`,
                [ teacherId]
            );
            return quizzes;
        } catch (error) {
            console.error("Error fetching  Past quizzes:", error);
            throw error; 
        }
    }
    static async startQuizAttempt(studentId, quizId) {
        const [quizData] = await pool.execute(
            `SELECT created_at, duration FROM quizzes WHERE id = ?`,
            [quizId]
        );
    
        if (quizData.length === 0) {
            throw new Error("Quiz not found.");
        }
        const { created_at, duration } = quizData[0];
        const [hours, minutes, seconds] = duration.split(":").map(Number);
        const durationMs = ((hours * 3600) + (minutes * 60) + seconds) * 1000;
        const endTime = new Date(new Date(created_at).getTime() + durationMs);
        const now = new Date();
        if (now > endTime) {
            throw new Error("Quiz time is over.");
        }
        const [existing] = await pool.execute(
            `SELECT id FROM quiz_attempts WHERE student_id = ? AND quiz_id = ?`,
            [studentId, quizId]
        );
        if (existing.length > 0) {
            return existing[0].id; 
        }
        const [result] = await pool.execute(
            `INSERT INTO quiz_attempts (student_id, quiz_id, start_time, status)
             VALUES (?, ?, NOW(), 'inprogress')`,
            [studentId, quizId]
        );
    
        return result.insertId;
    }
   static async submitQuiz(studentId, quizId) {
    try {
        // Vérifie si l'étudiant a déjà soumis ce quiz
        const [existingSubmission] = await pool.query(`
            SELECT id, status FROM quiz_attempts
            WHERE student_id = ? AND quiz_id = ?
        `, [studentId, quizId]);
        const [responses] = await pool.query(`
            SELECT is_correct
            FROM student_responses
            WHERE student_id = ? AND quiz_id = ?
        `, [studentId, quizId]);

        const totalQuestions = responses.length;
        const correctAnswers = responses.filter(r => r.is_correct === 1).length;
        const score = totalQuestions > 0
            ? parseFloat(((correctAnswers / totalQuestions) * 20).toFixed(2))
            : 0;

        if (existingSubmission.length > 0) {
            if (existingSubmission[0].status === 'submitted') {
                return { message: 'Quiz déjà soumis.', score };
            }
            await pool.query(`
                UPDATE quiz_attempts
                SET status = 'submitted', end_time = NOW(), score = ?
                WHERE student_id = ? AND quiz_id = ?
            `, [score, studentId, quizId]);
        } else {
            await pool.query(`
                INSERT INTO quiz_attempts (student_id, quiz_id, start_time, end_time, status, score)
                VALUES (?, ?, NOW(), NOW(), 'submitted', ?)
            `, [studentId, quizId, score]);
        }

        return {
            message: 'Quiz soumis avec succès.',
            scoreSur10: score,
            totalQuestions,
            bonnesReponses: correctAnswers
        };
    } catch (error) {
        console.error('Erreur lors de la soumission du quiz:', error);
        throw new Error('Erreur lors de la soumission du quiz.');
    }
}
    static async calculateTotalDuration(quizId) {
        try {
            const [questions] = await pool.execute(
                `SELECT duration_minutes FROM questions WHERE quiz_id = ?`,
                [quizId]
            );

            const totalSeconds = questions.reduce(
                (total, question) => total + question.duration_minutes,
                0
            );
            const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');
    
            return `${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error("Error calculating total duration:", error);
            throw error;
        }
    }

    static async startQuizmob(studentId, quizId) {
        try {
            const [quizData] = await pool.execute(`
                SELECT created_at, duration, visibility, timed_by
                FROM quizzes
                WHERE id = ?
            `, [quizId]);
    
            if (quizData.length === 0) {
                throw new Error("Quiz introuvable.");
            }
    
            const { created_at, duration, visibility, timed_by } = quizData[0];
            const [hours, minutes, seconds] = duration.split(":").map(Number);
            const durationMs = ((hours * 3600) + (minutes * 60) + seconds) * 1000;
            const endTime = new Date(new Date(created_at).getTime() + durationMs);
            const now = new Date();
    
            if (now > endTime) {
                throw new Error("Temps du quiz écoulé.");
            }
           
    
            // Vérifie ou crée une tentative
            const [existing] = await pool.execute(`
                SELECT id FROM quiz_attempts
                WHERE student_id = ? AND quiz_id = ?
            `, [studentId, quizId]);
    
            let attemptId;
            if (existing.length > 0) {
                attemptId = existing[0].id;
            } else {
                const [result] = await pool.execute(`
                    INSERT INTO quiz_attempts (student_id, quiz_id, start_time, status)
                    VALUES (?, ?, NOW(), 'inprogress')
                `, [studentId, quizId]);
                attemptId = result.insertId;
            }
    
            return {
                attemptId,
                visibility,
                timed_by // 👈 Ajouté ici
            };
        } catch (error) {
            console.error("Erreur lors du démarrage du quiz:", error);
            throw new Error("Erreur lors du démarrage du quiz.");
        }
    }
    static async finalizeQuizSubmission(studentId, quizId) {
        const [responses] = await pool.execute(
            `SELECT question_id, answer_id, is_correct
             FROM student_responses
             WHERE student_id = ? AND quiz_id = ?`,
            [studentId, quizId]
        );
    
        const score = responses.filter((r) => r.is_correct).length;
    
        await pool.execute(
            `UPDATE quiz_attempts
             SET end_time = NOW(), status = 'submitted', score = ?
             WHERE student_id = ? AND quiz_id = ?`,
            [score, studentId, quizId]
        );
    }
    // get all quizzes by a teacher for one module 
    static async getDraftQuizzesbymodule(teacherId, module_name) {
        try {
            const [quizzes] = await pool.execute(
                `SELECT q.title,q.created_at , m.moduleName 
                 FROM quizzes q
                 JOIN modules m ON q.module_id = m.id
                 WHERE m.moduleName = ? AND q.teacher_id = ? AND q.status = 'Draft'` ,
                [module_name, teacherId]
            );
    
            return quizzes;
        } catch (error) {
            console.error("Error fetching draft quizzes :", error);
            throw error; 
        }
    }
    static async getQuizzesByModule(teacherId, module_name) {
        try {
            const [quizzes] = await pool.execute(
                `SELECT q.id ,q.title, q.status, q.created_at, m.moduleName 
                 FROM quizzes q
                 JOIN modules m ON q.module_id = m.id
                 WHERE m.moduleName = ? AND q.teacher_id = ?`,
                [module_name, teacherId]
            );
    
            const formattedQuizzes = quizzes.map(quiz => {
                const date = new Date(quiz.created_at);
                return {
                    ...quiz,
                    created_at: date.toLocaleString()
                };
            });
    
            return formattedQuizzes;
        } catch (error) {
            console.error("Error fetching quizzes by module name and teacher:", error);
            throw error;
        }
    }
    
    static async getPastQuizzesbymodule(teacherId, module_name) {
        try {
        
            const [quizzes] = await pool.execute(
                `SELECT q.title,q.created_at , m.moduleName 
                 FROM quizzes q
                 JOIN modules m ON q.module_id = m.id
                 WHERE m.moduleName = ? AND q.teacher_id = ? AND q.status = 'Past'` ,
                [module_name, teacherId]
            );
    
            return quizzes;
        } catch (error) {
            console.error("Error fetching  Past quizzes:", error);
            throw error; 
        }
    }
    
    static async getlevelbymodule(module_id) {
        try {
            const [rows] = await pool.execute(
                `SELECT level_id FROM level_module WHERE module_id = ?`,
                [module_id]
            );
    
            if (rows.length === 0) {
                throw new Error(`No level found for module_id ${module_id}`);
            }
    
            return rows[0].level_id; 
        } catch (error) {
            throw new Error(`Error in getlevelbymodule: ${error.message}`);
        }
    }
}
export default Quiz ;
