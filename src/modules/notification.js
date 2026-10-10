import pool from '../config/dbConfig.js';


class notification {
 static  async  notifyNewQuiz(quizId) {
  try {
    const [students] = await pool.query(`
      SELECT student_id FROM QuizParticipants WHERE quiz_id = ?
    `, [quizId]);

    const insertPromises = students.map(({ student_id }) => {
      return pool.query(`
        INSERT INTO quiz_notifications (student_id, quiz_id)
        VALUES (?, ?)
      `, [student_id, quizId]);
    });

    await Promise.all(insertPromises);
  } catch (error) {
    console.error('Erreur lors de la notification de nouveau quiz :', error);
    throw error;
  }
}


static  async  checkNewQuiz(studentId) {
  try {
    const [rows] = await pool.query(`
      SELECT quiz_notifications.quiz_id, quizzes.title, quiz_notifications.notified_at
      FROM quiz_notifications
      JOIN quizzes ON quizzes.id = quiz_notifications.quiz_id
      WHERE quiz_notifications.student_id = ? AND quiz_notifications.is_read = FALSE
    `, [studentId]);

    if (rows.length > 0) {
      await pool.query(`
        UPDATE quiz_notifications
        SET is_read = TRUE
        WHERE student_id = ? AND is_read = FALSE
      `, [studentId]);

      return { newQuiz: true, quizzes: rows };
    }

    return { newQuiz: false };
  } catch (error) {
    console.error('Erreur lors de la vérification des notifications :', error);
    throw error;
  }
}
}
export default notification ;


