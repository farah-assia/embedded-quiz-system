import pool from '../config/dbConfig.js';

class Result {
    
    static async getQuizAttendance(quiz_id) {
        try {
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS attendance FROM quiz_attempts WHERE quiz_id = ?`,
                [quiz_id]
            );
            return rows[0].attendance;
        } catch (error) {
            throw new Error('Erreur lors de la récupération de la participation au quiz.');
        }
    }

    static async getStudentModules(studentId) {
        try {
            const [modules] = await pool.execute(`
                SELECT m.id, m.moduleName AS name
                FROM students s
                JOIN student_group_csv sgc ON s.email = sgc.email
                JOIN student_groups g ON sgc.group_id = g.id
                JOIN sections sec ON g.section_id = sec.id
                JOIN level_module lm ON sec.level_id = lm.level_id
                JOIN modules m ON lm.module_id = m.id
                WHERE s.id = ?
            `, [studentId]);
    
            return modules;
        } catch (error) {
            console.error('Error fetching student modules:', error);
            throw new Error('Failed to retrieve student modules');
        }
    }
    
    
    static async getCompletedQuizzesForStudentInModule(studentId, moduleName) {
        if (!studentId || !moduleName) {
            throw new Error('Student ID and Module Name are required');
        }
    
        try {
            const [quizzes] = await pool.execute(`
                SELECT 
                    q.id AS quiz_id,
                    q.title AS quiz_title,
                    qa.score AS student_score,
                    qa.status AS quiz_status
                FROM quizzes q
                JOIN quiz_attempts qa ON qa.quiz_id = q.id
                JOIN modules m ON q.module_id = m.id
                WHERE qa.student_id = ? 
                AND m.moduleName = ?  -- Utilisation du nom du module
                AND qa.status = 'submitted'  -- Only quizzes that are submitted
            `, [studentId, moduleName]);
    
            return quizzes;
        } catch (error) {
            console.error('Error fetching completed quizzes for student in module:', error);
            throw new Error('Failed to retrieve completed quizzes for student');
        }
    }
     static async getQuestionsWithAnswers(quizId) {
        try {
            const [quizInfo] = await pool.query(`
                SELECT title, duration
                FROM quizzes
                WHERE id = ?
            `, [quizId]);

            if (quizInfo.length === 0) {
                throw new Error('Quiz introuvable');
            }

            const [questions] = await pool.query(`
                SELECT id, question_text, duration_minutes
                FROM questions
                WHERE quiz_id = ?
            `, [quizId]);

            const questionsWithAnswers = await Promise.all(
                questions.map(async (question) => {
                    const [answers] = await pool.query(`
                        SELECT id, answer_text
                        FROM answers
                        WHERE question_id = ?
                    `, [question.id]);

                    return {

                        ...question,
                        answers
                    };
                })
            );

            return {
                title: quizInfo[0].title,
                duration: quizInfo[0].duration,
                questions: questionsWithAnswers
            };
        } catch (error) {
            console.error('Erreur lors de la récupération du quiz:', error);
            throw new Error('Échec de la récupération du quiz');
        }
    }
    static async saveStudentResponse(studentId, quizId, questionId, answerId) {
        try {
            // Vérifie si la réponse est correcte
            const [correctCheck] = await pool.query(`
                SELECT is_correct FROM answers WHERE id = ?
            `, [answerId]);
    
            const isCorrect = correctCheck.length > 0 ? correctCheck[0].is_correct : false;
    
            // Vérifie si une réponse existe déjà
            const [existing] = await pool.query(`
                SELECT id FROM student_responses
                WHERE student_id = ? AND question_id = ? AND quiz_id = ?
            `, [studentId, questionId, quizId]);
    
            if (existing.length > 0) {
                // Mise à jour si déjà répondu
                await pool.query(`
                    UPDATE student_responses
                    SET answer_id = ?, is_correct = ?
                    WHERE student_id = ? AND question_id = ? AND quiz_id = ?
                `, [answerId, isCorrect, studentId, questionId, quizId]);
            } else {
                // Sinon, insertion
                await pool.query(`
                    INSERT INTO student_responses (student_id, quiz_id, question_id, answer_id, is_correct)
                    VALUES (?, ?, ?, ?, ?)
                `, [studentId, quizId, questionId, answerId, isCorrect]);
            }
    
            return { message: 'Réponse enregistrée avec succès' };
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement de la réponse étudiant:', error);
            throw new Error('Erreur d\'enregistrement de réponse');
        }
    }
    

    static async getQuizCorrection(quizId, studentId) {
        if (!quizId || !studentId) {
          throw new Error('quizId and studentId are required');
        }
      
        const [rows] = await pool.query(`
          SELECT 
            q.id AS question_id,
            q.question_text,
            a.id AS answer_id,
            a.answer_text,
            a.is_correct,
            sr.answer_id AS student_answer_id
          FROM questions q
          JOIN answers a ON a.question_id = q.id
          LEFT JOIN student_responses sr 
            ON sr.question_id = q.id AND sr.student_id = ?
          WHERE q.quiz_id = ?
          ORDER BY q.id, a.id
        `, [studentId, quizId]);
      
        return rows;
      }
      
    
    
    static async  calculateScore(studentId, quizId) {
    try {
        // Récupérer toutes les réponses de l'étudiant pour ce quiz
        const [studentResponses] = await pool.query(`
            SELECT sr.question_id, sr.answer_id, a.is_correct
            FROM student_responses sr
            JOIN answers a ON sr.answer_id = a.id
            WHERE sr.student_id = ? AND sr.quiz_id = ?
        `, [studentId, quizId]);

        if (studentResponses.length === 0) {
            return 0; // Si l'étudiant n'a pas encore répondu aux questions du quiz
        }

        // Calculer le score de l'étudiant
        let score = 0;
        studentResponses.forEach(response => {
            if (response.is_correct) {
                score += 1; // Ajout d'un point pour chaque bonne réponse
            }
        });

        return score; // Retourner le score final
    } catch (error) {
        console.error('Error calculating score:', error);
        return 0;
    }
}
    static async getCompletedQuizzes(studentId) {
    try {
        const [rows] = await pool.execute(
            `SELECT q.*
             FROM quiz_participants qp
             JOIN quizzes q ON qp.quiz_id = q.id
             WHERE qp.student_id = ?`,
            [studentId]
        );
        return rows;
    } catch (error) {
        console.error("Error fetching completed quizzes for student:", error.message);
        throw new Error("Unable to retrieve quizzes completed by student");
    }
}

    // Fonction pour obtenir le tableau des étudiants avec leur score dans un quiz donné
 /*static async getQuizParticipantsTable(quizId) {
        try {
            // Récupérer les étudiants ayant participé au quiz
            const [participants] = await pool.query(`
                SELECT s.id, s.first_name, s.last_name
                FROM students s
                JOIN QuizParticipants qp ON qp.student_id = s.id
                WHERE qp.quiz_id = ?
            `, [quizId]);

            if (participants.length === 0) {
                return [];
            }

            // Calculer le score de chaque participant
            const results = [];

            for (const student of participants) {
                const score = await calculateScore(student.id, quizId);
                results.push({
                    first_name: student.first_name,
                    last_name: student.last_name,
                    
                    score
                });
            }

            return results;
        } catch (error) {
            console.error('Erreur dans le model Result.getQuizParticipantsWithScores:', error);
            throw error;
        }
    }*/
     /*   static async getQuizParticipantsTable(quizId) {
            try {
                // Récupérer les étudiants ayant participé au quiz
                const [participants] = await pool.query(`
                    SELECT s.id, s.first_name, s.last_name
                    FROM students s
                    JOIN quizparticipants qp ON qp.student_id = s.id
                    WHERE qp.quiz_id = ?
                `, [quizId]);
        
                if (participants.length === 0) {
                    return [];
                }
        
                const results = [];
        
                for (const student of participants) {
                    // Compter les réponses correctes de l'étudiant dans ce quiz
                    const [scoreResult] = await pool.query(`
                        SELECT COUNT(*) AS score
                        FROM student_responses sr
                        JOIN answers a ON sr.answer_id = a.id
                        JOIN questions q ON a.question_id = q.id
                        WHERE sr.student_id = ? AND q.quiz_id = ? AND a.is_correct = 1
                    `, [student.id, quizId]);
        
                    const score = scoreResult[0].score;
        
                    results.push({
                        first_name: student.first_name,
                        last_name: student.last_name,
                        score
                    });
                }
        
                return results;
            } catch (error) {
                console.error('Erreur dans le model Result.getQuizParticipantsTable:', error);
                throw error;
            }
        }*/
            static async getQuizParticipantsTable(quizId) {
                try {
                    // Étape 1 : récupérer les participants
                    const [participants] = await pool.query(`
                        SELECT s.id AS student_id, s.first_name, s.last_name
                        FROM students s
                        JOIN quiz_attempts qa ON qa.student_id = s.id
                        WHERE qa.quiz_id = ?
                    `, [quizId]);
            
                    if (participants.length === 0) return [];
            
                    const results = [];
            
                    for (const student of participants) {
                        // Étape 2 : récupérer les bonnes réponses avec leurs grades
                        const [correctAnswers] = await pool.query(`
                            SELECT q.grade
                            FROM student_responses sr
                            JOIN answers a ON sr.answer_id = a.id
                            JOIN questions q ON a.question_id = q.id
                            WHERE sr.student_id = ? AND sr.quiz_id = ? AND a.is_correct = 1
                        `, [student.student_id, quizId]);
            
                        // Calcul du score pondéré
                        const score = correctAnswers.reduce((sum, row) => sum + row.grade, 0);
            
                        // Mise à jour du score dans quiz_attempts
                        await pool.query(`
                            UPDATE quiz_attempts
                            SET score = ?
                            WHERE student_id = ? AND quiz_id = ?
                        `, [score, student.student_id, quizId]);
            
                        results.push({
                            first_name: student.first_name,
                            last_name: student.last_name,
                            score
                        });
                    }
            
                    return results;
                } catch (error) {
                    console.error('Erreur dans getQuizParticipantsTable:', error);
                    throw error;
                }
            }
            
        
    static async getStudentQuizzes(studentId) {
        //try {
            const [quizzes] = await pool.execute(`
                SELECT 
                    q.id,
                    q.title,
                    q.duration,
                
                    CASE 
                        WHEN qp.id IS NOT NULL THEN 'Done'
                        ELSE 'Absent'
                    END AS status
                FROM quizzes q
                LEFT JOIN quizparticipants qp 
                    ON qp.quiz_id = q.id AND qp.student_id = ?
                WHERE q.created_at < NOW()
            `, [studentId]);
    
            return quizzes;
        /*} catch (error) {
            console.error("Error fetching student quizzes:", error.message);
            throw new Error("Unable to retrieve student quizzes");
        }*/
    }
    



static async getMissedQuizzes(studentId) {
    const [quizzes] = await pool.execute(`
        SELECT q.*
        FROM quizzes q
        JOIN groups g ON q.group_id = g.id
        JOIN students s ON s.group_id = g.id
        WHERE s.id = ? AND q.date < NOW()
        AND q.id NOT IN (
            SELECT quiz_id FROM QuizParticipants WHERE student_id = ?
        )
    `, [studentId, studentId]);
    return quizzes;
}


    static async getAverageQuizGrade(quiz_id) {
        try {
            const [rows] = await pool.query(
                `SELECT AVG(score) AS average_grade FROM quiz_attempts WHERE quiz_id = ? AND status = 'submitted'`,
                [quiz_id]
            );
            return rows[0].average_grade || 0;
        } catch (error) {
            throw new Error('Erreur lors du calcul de la moyenne des notes.');
        }
    }

   
    static async getQuizSuccessRate(quiz_id) {
        try {
            // Récupérer les questions du quiz et calculer le score maximal
            const [questions] = await pool.query(
                `SELECT grade FROM questions WHERE quiz_id = ?`, 
                [quiz_id]
            );
    
            if (questions.length === 0) {
                throw new Error('Aucune question trouvée pour ce quiz');
            }
    
            // Calcul du score maximal (somme des scores des questions)
            const maxScore = questions.reduce((sum, question) => sum + question.grade, 0);
    
            // Définir le seuil de réussite (par exemple, 50% du score maximal)
            const successThreshold = maxScore * 0.5;
    
            // Récupérer le nombre total de tentatives complétées
            const [totalRows] = await pool.query(
                `SELECT COUNT(*) AS total FROM Quiz_attempts WHERE quiz_id = ? AND status = 'submitted'`, 
                [quiz_id]
            );
    
            // Récupérer le nombre de tentatives réussies
            const [successRows] = await pool.query(
                `SELECT COUNT(*) AS success FROM Quiz_attempts WHERE quiz_id = ? AND status = 'submitted' AND score >= ?`, 
                [quiz_id, successThreshold]
            );
    
            const total = totalRows[0].total;
            const success = successRows[0].success;
    
            if (total === 0) {
                return 0; // Pas de tentatives complétées
            }
    
            // Calcul du taux de réussite
            const successRate = (success / total) * 100;
            return successRate.toFixed(2); // Retourner avec deux décimales
        } catch (error) {
            throw new Error('Erreur lors du calcul du pourcentage de réussite: ' + error.message);
        }
    }
    

    
    static async numberOfchoices(question_id) {
        try {
            const [rows] = await pool.execute(
                `SELECT COUNT(*) AS count FROM answers WHERE question_id = ?`,
                [question_id]
            );
            return rows[0].count;
        } catch (error) {
            throw new Error(`Erreur lors du comptage des choix pour la question: ${error.message}`);
        }
    }

    static async choicePercentage(question_id, answer_id) {
        try {
            const numberOfchoices = await this.numberOfchoices(question_id);
            if (numberOfchoices) {
                const [rows] = await pool.execute(
                    `SELECT COUNT(*) AS count FROM student_responses WHERE answer_id = ?`,
                    [answer_id]
                );
                const choiceRepetition = rows[0].count;
                const percentage = (choiceRepetition / numberOfchoices) * 100;
                return percentage;
            }
            return -1; 
        } catch (error) {
            throw new Error(`Erreur lors du calcul du pourcentage des choix: ${error.message}`);
        }
    }

}
export default Result;


         
          
