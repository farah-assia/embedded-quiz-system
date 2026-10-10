import jwt from "jsonwebtoken";
import envConfig from "../config/envConfig.js";
import Quiz from "../modules/Quiz.js";
import pool from "../config/dbConfig.js";
import fs from "fs";
import csv from "csv-parser";
import multer from "multer";
import Question from '../modules/Question.js';
import Answer from '../modules/answer.js';
import { Parser } from 'json2csv';
import path from 'path';
const dirname = path.dirname(new URL(import.meta.url).pathname);
const createQuiz = async (req, res) => {
    try {
        const teacher_id = req.teacher.id;
        const { title, module, timed_by, duration,questionVisibility } = req.body;
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9]):([0-5]?[0-9])$/;
        
        if (timed_by === 'quiz' && !timeRegex.test(duration)) {
            return res.status(401).json({ message: "Invalid duration format. Use 'HH:MM:SS'." });
        }
        const [moduleRows] = await pool.execute(
            `SELECT id FROM modules WHERE moduleName = ?`,
            [module]
        );
        if (moduleRows.length === 0) {
            return res.status(404).json({ message: "Module not found." });
        }

        const module_id = moduleRows[0].id;
        

        const [teachRows] = await pool.execute(
            `SELECT * FROM teach_module WHERE teacher_id = ? AND module_id = ?`,
            [teacher_id, module_id]
        );
        if (teachRows.length === 0) {
            return res.status(403).json({ message: "Unauthorized. You can only create quizzes for modules you teach." });
        } 

        let quizDuration;

        if (timed_by === 'quiz') {
            quizDuration = duration;  
        } else if (timed_by === 'question') {
            quizDuration = "00:00:00"; 
        } else {
            return res.status(400).json({ message: "Invalid timed_by value. Must be 'quiz' or 'question'." });
        }
        const quizId = await Quiz.create(teacher_id, module_id, title, timed_by, quizDuration, questionVisibility);
        const quiz = await Quiz.findById(quizId);
        return res.status(201).json({ quiz });

    } catch (error) {
        console.error("Error creating quiz:", error);
        return res.status(500).json({ message: "Failed to create quiz. Please try again later." });
    }
};


const deleteQuiz = async (req, res) => {
    try {
        const teacherId = req.teacher.id; 
        const { id } = req.params;
        const quiz = await Quiz.findById(id);
        if (!quiz || quiz.teacher_id !== teacherId) {
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer ce quiz." });
        }
        await Quiz.delete(id);
        res.status(200).json({ message: "Quiz supprimé avec succès." });

    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la suppression du quiz." });
    }
};
const Quizzes_Type  = async (req, res) => {
    try {
        const teacherId = req.teacher.id; 
        const { timed_by } = req.query; 
        const quizzes = await Quiz.getQuizzesByType(teacherId, timed_by);
        return res.status(200).json({ quizzes });
    } catch (error) {
        console.error("Error in getQuizzesByType:", error);
        return res.status(500).json({ message: "Failed to fetch quizzes by timed_by." });
    }
};

// get allquizzes for a teacher 

const ALLQuizzes2 = async (req, res) => {
    try {
        const teacherId = req.teacher.id;  
        const quizzes = await Quiz.getAllQuizzesByTeacher(teacherId);

        return res.status(200).json({ quizzes });
    } catch (error) {
        console.error("Error in getAllQuizzesByTeacher:", error);
        return res.status(500).json({ message: "Failed to fetch quizzes." });
    }
};


const Draft_Quizzes = async (req, res) => {
    try {
        const teacherId = req.teacher.id; 
        console.log("Teacher ID:", teacherId);
      

        if (!teacherId ) {
            return res.status(400).json({ message: "Missing teacherId " });
        }
        const draft = await Quiz.getDraftQuizzes(teacherId);
        return res.status(200).json({draft });
    } catch (error) {
        console.error("Error in getDraftQuizzes:", error);
        return res.status(500).json({ message: "Failed to fetch draft quizzes." });
    }
};


const Past_Quizzes = async (req, res) => {
    try {
        const teacherId = req.teacher.id; 
        
        const Past = await Quiz.getPastQuizzes(teacherId);
        return res.status(200).json({ Past });
    } catch (error) {
        console.error("Error in getPastQuizzes:", error);
        return res.status(500).json({ message: "Failed to fetch Past quizzes ." });
    }
};

const update_title = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const teacherId = req.teacher.id; 

        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found." });
        }

        if (quiz.teacher_id !== teacherId) {
            return res.status(403).json({ message: "Unauthorized. You can only update your own quizzes." });
        }

        const isUpdated = await Quiz.update_Title(id, title);
        if (isUpdated) {
            const updatedQuiz = await Quiz.findById(id);
            return res.status(200).json({ message: "Quiz updated successfully.", quiz: updatedQuiz });
        }

        return res.status(400).json({ message: "Quiz update failed." });
    } catch (error) {
        console.error("Error updating quiz:", error);
        return res.status(500).json({ message: "Failed to update quiz. Please try again later." });
    }
};
const getModuleNameById = async (req, res) => {
    try {
        const { module_id } = req.body;

        const [rows] = await pool.query(`SELECT moduleName FROM modules WHERE id = ?`, [module_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Module not found" });
        }

        res.status(200).json({ moduleName: rows[0].moduleName });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const update_duration = async (req, res) => {
    try {
        const { id } = req.params;
        const { duration } = req.body;
        const teacherId = req.teacher.id; 
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found." });
        }
        if (quiz.teacher_id !== teacherId) {
            return res.status(403).json({ message: "Unauthorized. You can only update your own quizzes." });
        }
        const isUpdated = await Quiz.update_duration(id, duration);
        if (isUpdated) {
            const updatedQuiz = await Quiz.findById(id);
            return res.status(200).json({ message: "Quiz updated successfully.", quiz: updatedQuiz });
        }
        return res.status(400).json({ message: "Quiz update failed." });
    } catch (error) {
        console.error("Error updating quiz:", error);
        return res.status(500).json({ message: "Failed to update quiz. Please try again later." });
    }
};

const update_timedby = async (req, res) => {
    try {
        const { id } = req.params;
        const { timedby } = req.body;
        const teacherId = req.teacher.id; 

        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found." });
        }

        if (quiz.teacher_id !== teacherId) {
            return res.status(403).json({ message: "Unauthorized. You can only update your own quizzes." });
        }

        const isUpdated = await Quiz.update_timedby(id, timedby);
        if (isUpdated) {
            const updatedQuiz = await Quiz.findById(id);
            return res.status(200).json({ message: "Quiz updated successfully.", quiz: updatedQuiz });
        }

        return res.status(400).json({ message: "Quiz update failed." });
    } catch (error) {
        console.error("Error updating quiz:", error);
        return res.status(500).json({ message: "Failed to update quiz. Please try again later." });
    }
}; 
const update_visibility = async (req, res) => {
    try {
        const { id } = req.params;
        const { visibility } = req.body;
        const teacherId = req.teacher.id; 

        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found." });
        }

        if (quiz.teacher_id !== teacherId) {
            return res.status(403).json({ message: "Unauthorized. You can only update your own quizzes." });
        }

        const isUpdated = await Quiz.update_visibility(id, visibility);
        if (isUpdated) {
            const updatedQuiz = await Quiz.findById(id);
            return res.status(200).json({ message: "Visibility updated successfully.", quiz: updatedQuiz });
        }

        return res.status(400).json({ message: "Visibility update failed." });
    } catch (error) {
        console.error("Error updating quiz visibility:", error);
        return res.status(500).json({ message: "Failed to update visibility. Please try again later." });
    }
};
const update_Module = async (req, res) => {
    try {
        const { id } = req.params;
        const { module } = req.body;
        const teacherId = req.teacher.id; 

        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found." });
        }

        if (quiz.teacher_id !== teacherId) {
            return res.status(403).json({ message: "Unauthorized. You can only update your own quizzes." });
        }

        const isUpdated = await Quiz.update_Module(id, module);
        if (isUpdated) {
            const updatedQuiz = await Quiz.findById(id);
            return res.status(200).json({ message: "Quiz updated successfully.", quiz: updatedQuiz });
        }
        return res.status(400).json({ message: "Quiz update failed." });
    } catch (error) {
        console.error("Error updating quiz:", error);
        return res.status(500).json({ message: "Failed to update quiz. Please try again later." });
    }
};
const randomazation = async (req, res) => {
    try {
        const { quizId } = req.params;
        
        const questions = await Quiz.getRandomizedQuestions(quizId);

        if (questions.length === 0) {
            return res.status(404).json({ message: "No questions found for this quiz." });
        }

        return res.status(200).json({ questions });

    } catch (error) {
        console.error("Error fetching quiz questions:", error);
        return res.status(500).json({ message: "Failed to fetch quiz questions. Please try again later." });
    }
};
// submission 
// ki student ydir start quiz manuellement
export const submitQuiz = async (req, res) => {
    const studentId = req.body.studentId || req.body.student_id || req.student?.id;
    const quizId = req.body.quizId || req.body.quiz_id;

    if (!studentId || !quizId) {
        return res.status(400).json({ message: 'studentId and quizId are required.' });
    }

    try {
        const result = await Quiz.submitQuiz(Number(studentId), Number(quizId));
        res.status(200).json(result);
    } catch (error) {
        console.error('Erreur lors de la soumission du quiz :', error);
        res.status(500).json({ message: 'Erreur serveur lors de la soumission du quiz.' });
    }
};

export const startQuizmob = async (req, res) => {
    try {
        const student_id = req.body.student_id || req.body.studentId || req.params.student_id || req.student?.id;
        const quiz_id = req.body.quiz_id || req.body.quizId || req.params.quiz_id;

        if (!student_id || !quiz_id) {
            return res.status(400).json({ error: "student_id et quiz_id sont requis." });
        }

        const result = await Quiz.startQuizmob(Number(student_id), Number(quiz_id));
        res.json(result);
    } catch (error) {
        console.error("Erreur dans startQuiz controller:", error);
        res.status(500).json({ error: error.message });
    }
};
const addquizparticipants = async (req, res) => {
    try {
        const teacherId = req.teacher.id;
        const { quizId, levelName, sectionNames, groupNames, studentEmails } = req.body;

        const [quiz] = await pool.query(
            `SELECT id, status FROM quizzes WHERE id = ? AND teacher_id = ?`,
            [quizId, teacherId]
        );
        if (quiz.length === 0) {
            return res.status(404).json({ message: "Quiz not found " });
        }
        if (!teacherId) {
            return res.status(403).json({ message: "teacher unothorized not found " });
        }

        if (quiz[0].status !== "Draft") {
            return res.status(400).json({ message: "Quiz is not in draft mode." });
        }

        let studentIds = new Set();

if (levelName && (!sectionNames || sectionNames.length === 0) && (!groupNames || groupNames.length === 0) && (!studentEmails || studentEmails.length === 0)) {
    // Only level
    const [students] = await pool.query(`
        SELECT s.id FROM students s
        JOIN student_group_csv sgc ON s.email = sgc.email
        JOIN student_groups g ON sgc.group_id = g.id
        JOIN sections sec ON g.section_id = sec.id
        JOIN levels l ON sec.level_id = l.id
        WHERE l.level_name = ?`,
        [levelName]
    );
    students.forEach(s => studentIds.add(s.id));
}
else if (levelName && sectionNames && sectionNames.length > 0 && (!groupNames || groupNames.length === 0)) {
   
    const placeholders = sectionNames.map(() => '?').join(',');
    const [students] = await pool.query(`
        SELECT s.id FROM students s
        JOIN student_group_csv sgc ON s.email = sgc.email
        JOIN student_groups g ON sgc.group_id = g.id
        JOIN sections sec ON g.section_id = sec.id
        JOIN levels l ON sec.level_id = l.id
        WHERE l.level_name = ? AND sec.section_name IN (${placeholders})`,
        [levelName, ...sectionNames]
    );
    students.forEach(s => studentIds.add(s.id));
}
else if (levelName && sectionNames && sectionNames.length > 0 && groupNames && groupNames.length > 0) {
   
    const sectionPlaceholders = sectionNames.map(() => '?').join(',');
    const groupPlaceholders = groupNames.map(() => '?').join(',');
    const [students] = await pool.query(`
        SELECT s.id FROM students s
        JOIN student_group_csv sgc ON s.email = sgc.email
        JOIN student_groups g ON sgc.group_id = g.id
        JOIN sections sec ON g.section_id = sec.id
        JOIN levels l ON sec.level_id = l.id
        WHERE l.level_name = ? 
        AND sec.section_name IN (${sectionPlaceholders})
        AND g.group_name IN (${groupPlaceholders})`,
        [levelName, ...sectionNames, ...groupNames]
    );
    students.forEach(s => studentIds.add(s.id));
}

if (studentEmails && studentEmails.length > 0) {
    const emailPlaceholders = studentEmails.map(() => '?').join(',');
    const [students] = await pool.query(
        `SELECT id FROM students WHERE email IN (${emailPlaceholders})`,
        [...studentEmails]
    );
    students.forEach(s => studentIds.add(s.id));
}

// No students found
if (studentIds.size === 0) {
    return res.status(400).json({ message: "No students found for the selected criteria." });
}


const values = [...studentIds].map(id => [quizId, id]);
await pool.query(`INSERT INTO QuizParticipants (quiz_id, student_id) VALUES ?`, [values]);

return res.status(200).json({ message: "Quiz started successfully.", studentIds: [...studentIds] });

        
    } catch (error) {
        console.error("Error in addquizparticipants:", error);
        return res.status(500).json({ message: "Failed to start quiz." });
    }
};
// import quiz
// CSV format question , correct(le numéro de la reponse correct ) , options kol wahda fi ligne 
// Configure multer for file upload
const importQuiz = async (req, res) => {
    if (!req.teacher || !req.teacher.id) {
        return res.status(403).json({ message: "Accès interdit." });
    }

    const teacherId = req.teacher.id;
    const { quiz_id } = req.body;
    console.log(req.body);
    if (!quiz_id || isNaN(quiz_id)) {
        return res.status(400).json({ error: "Le quiz_id est requis et doit être un nombre valide." });
    }

    if (!req.file) {
        return res.status(400).json({ error: "Aucun fichier téléversé." });
    }

    const questions = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
            const { question, correct } = row;

            const options = Object.keys(row)
                .filter(key => key.startsWith('option'))  
                .map(key => row[key].trim());           

            if (!question || !correct) {
                console.warn("Ligne ignorée : 'question' ou 'correct' manquant.");
                return;
            }

          
            const correctIndex = parseInt(correct) - 1; 
            if (correctIndex < 0 || correctIndex >= options.length) {
                console.warn(`Ligne ignorée : L'index de la réponse correcte est invalide. Index : ${correct}`);
                return;
            }

            questions.push({
                question_text: question.trim(),
                options,
                correct: options[correctIndex],
            });
        })
        .on('end', async () => {
            if (questions.length === 0) {
                return res.status(400).json({ error: 'Le fichier CSV est vide ou invalide.' });
            }

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                for (const q of questions) {
                   
                    const [questionResult] = await connection.query(
                        "INSERT INTO questions (quiz_id, question_text) VALUES (?, ?)",
                        [quiz_id, q.question_text]
                    );

                    const questionId = questionResult.insertId;

                    
                    const answers = q.options.map((option, index) => [
                        questionId, option, q.correct === option ? 1 : 0
                    ]);

                    if (answers.length > 0) {
                        await connection.query(
                            "INSERT INTO answers (question_id, answer_text, is_correct) VALUES ?",
                            [answers]
                        );
                    }
                }

                await connection.commit();
                fs.unlinkSync(req.file.path);  
                res.json({ message: 'Quiz importé avec succès.' });
            } catch (error) {
                await connection.rollback();
                console.error("Erreur lors de l'importation du quiz :", error);
                res.status(500).json({ error: "Une erreur s'est produite lors de l'importation du quiz." });
            } finally {
                connection.release();
            }
        })
        .on('error', (error) => {
            console.error("Erreur lors de la lecture du fichier CSV :", error);
            res.status(500).json({ error: "Une erreur s'est produite lors de la lecture du fichier CSV." });
        });
};
const exportQuizToCSV = async (req, res) => {
    try {
        const { quiz_id } = req.body;
        const teacherId = req.teacher.id;
        const query = `
            SELECT 
                q.id AS question_id,
                q.question_text,
                a.answer_text,
                a.is_correct
            FROM 
                questions q
            JOIN answers a ON q.id = a.question_id
            WHERE q.quiz_id = ?
            ORDER BY q.id, a.id
        `;

        const [rows] = await pool.query(query, [quiz_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Quiz not found or has no questions" });
        }
        const grouped = {};

        rows.forEach(row => {
            if (!grouped[row.question_id]) {
                grouped[row.question_id] = {
                    question: row.question_text,
                    options: [],
                    correct: 0
                };
            }
            const optionIndex = grouped[row.question_id].options.length;
            grouped[row.question_id].options.push(row.answer_text);

            if (row.is_correct === 1) {
                grouped[row.question_id].correct = optionIndex + 1; // 1-based index
            }
        });
        const questionsData = Object.values(grouped).map(q => {

            while (q.options.length < 6) {
                q.options.push('');
            }

            return {
                question: q.question,
                option1: q.options[0],
                option2: q.options[1],
                option3: q.options[2],
                option4: q.options[3],
                option5: q.options[4],
                option6: q.options[5],
                correct: q.correct
            };
        });

       
        const fields = ['question', 'option1', 'option2', 'option3', 'option4', 'option5', 'option6', 'correct'];
        const parser = new Parser({ fields });
        const csvData = parser.parse(questionsData);

        const filePath = path.resolve('exports', `quiz_${quiz_id}_export.csv`);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, csvData, 'utf8');
        res.download(filePath, (err) => {
            if (err) {
                console.error("Download error:", err);
                return res.status(500).json({ error: "Error during file download." });
            }

            // if (fs.existsSync(filePath)) {
            //     fs.unlinkSync(filePath);
            // }
        });

    } catch (error) {
        console.error("CSV export error:", error);
        res.status(500).json({ error: "Erreur lors de l'export CSV." });
    }
};
const getQuizDuration = async (req , res) => {
    try {
        const {quizId }= req.params ;
      const [duration] = await pool.execute(
        "SELECT duration FROM quizzes WHERE id = ? AND timed_by = ?",
        [quizId, 'question']
      );
      if (duration.length > 0) {
        res.status(200).json({ duration: duration[0].duration });
      } else {
        res.status(404).json({ message: "Quiz not found or not timed by question" });
      }
    
    }catch(error){
        return res.status(500).json({ message: "Server error", error: error.message });
    }
  };

const ALLQuizzesbymodule= async (req, res) => {
    try {
        const teacherId = req.teacher.id;
        const { module_name } = req.body;
    

        if (!module_name) {
            return res.status(400).json({ message: "Module name is required" });
        }
        const quizzes = await Quiz.getQuizzesByModule(teacherId, module_name);

        return res.status(200).json({ quizzes });
    } catch (error) {
        console.error("Error in getQuizzesByModule:", error);
        return res.status(500).json({ message: "Failed to fetch quizzes by module." });
    }
};
const Getlevel= async (req, res) => {
    try {
        const teacherId = req.teacher.id;
        const { module_id } = req.body;
        if (!module_id) {
            return res.status(400).json({ message: "Module name is required" });
        }
        const level = await Quiz.getlevelbymodule(module_id);

        return res.status(200).json({"level_id" :level });
    } catch (error) {
        console.error("Error in getlevelByModule:", error);
        return res.status(500).json({ message: "Failed to fetch quizzes by module." });
    }
};

const Draft_Quizzesbymodule = async (req, res) => {
    try {
        const teacherId = req.teacher.id; 
        const { module_name} = req.body; 
        

        if (!teacherId ) {
            return res.status(400).json({ message: "Missing teacherId or moduleId" });
        }
        const draft = await Quiz.getDraftQuizzesbymodule(teacherId, module_name);
        return res.status(200).json({ draft });
    } catch (error) {
        console.error("Error in getDraftQuizzes:", error);
        return res.status(500).json({ message: "Failed to fetch draft quizzes." });
    }
};


const Past_Quizzesbymodule = async (req, res) => {
    try {
        const teacherId = req.teacher.id; 
        const { module_name } = req.body; 
        const past = await Quiz.getPastQuizzesbymodule(teacherId, module_name);
        return res.status(200).json({ past });
    } catch (error) {
        console.error("Error in getPastQuizzes:", error);
        return res.status(500).json({ message: "Failed to fetch Past quizzes ." });
    }
};

const getLastQuiz = async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT id FROM quizzes ORDER BY created_at DESC LIMIT 1
      `);
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Aucun quiz trouvé' });
      }
  
      res.json({ quizId: rows[0].id });
    } catch (err) {
      console.error('Erreur getLastQuiz:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  };

const startQuizbyteach = async (req, res) => {
    try {
        const teacher_id = req.teacher.id;
        const { quizId, message } = req.body;

        const [quiz] = await pool.query(
            `SELECT id, status, title FROM quizzes WHERE id = ? AND teacher_id = ?`,
            [quizId, teacher_id]
        );

        if (quiz.length === 0) {
            return res.status(404).json({ message: "Quiz not found or you don't have permission." });
        }

        if (quiz[0].status !== "Draft") {
            return res.status(400).json({ message: "Quiz is already active or ended." });
        }

        await pool.query(
            `UPDATE quizzes SET status = 'Ongoing', created_at = NOW() WHERE id = ? AND teacher_id = ?`,
            [quizId, teacher_id]
        );
        
        // Emit socket notification
        const io = req.app.get('io');
        if (io) {
            io.emit('new-notification', { message: message || 'New quiz available!', quizId, title: quiz[0].title });
            io.emit('quiz:started', { quizId, title: quiz[0].title });
        }

        return res.status(200).json({ message: "Quiz started successfully.", quizId });

    } catch (error) {
        console.error("Error starting quiz:", error);
        return res.status(500).json({ message: "Failed to start quiz." });
    }
};
const checkQuizStatus = async () => {
    try {
        const currentTime = new Date();
        const [quizzes] = await pool.query(
            `SELECT id, status, created_at, duration FROM quizzes WHERE status = 'Ongoing'`
        );

        quizzes.forEach(async (quiz) => {
            const [hours, minutes] = quiz.duration.split(":").map(Number);
            const durationInMinutes = hours * 60 + minutes;

            const quizStartTime = new Date(quiz.created_at);
            const quizEndTime = new Date(quizStartTime.getTime() + durationInMinutes * 60000);

            if (currentTime >= quizEndTime) {
                
                await pool.query(
                    `UPDATE quizzes SET status = 'Past' WHERE id = ?`,
                    [quiz.id]
                );
                console.log(`Quiz ${quiz.id} status updated to Past.`);
            }
        });
    } catch (error) {
        console.error("Error checking quiz statuses:", error);
    }
};
const SeeDraftQuiz = async (req ,res )=>{
    try {

        const {quiz_id} = req.body ;
        const quiz = await Quiz.findById(quiz_id);
        let questions = await Question.getQuizQuestions(quiz_id);
        let questionNanswers = await Promise.all(
            questions.map(async (question) => {
                let answers = await Answer.getAnswersByQuestionId(question.id);
                return { question, answers };
            })
        );
        return res.status(200).json({message:'successfully returned the draft quiz info',draft: {
            quiz, questionNanswers
        }});
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch the darfted quiz."});
    }
}; 
const getQuizById = async (req, res) => {
    const  {quizId}= req.body;

    try {
        const quiz = await Quiz.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ message: `Quiz with ID ${quizId} not found` });
        }

        res.status(200).json(quiz);
    } catch (error) {
        console.error("Controller error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export default {
    createQuiz,
    deleteQuiz,
    Quizzes_Type ,
    ALLQuizzesbymodule,
    Draft_Quizzesbymodule,
    Past_Quizzesbymodule,
    ALLQuizzes2,
    Past_Quizzes ,
    Draft_Quizzes,
    update_title ,
    update_duration ,
    update_timedby ,
    addquizparticipants,
    randomazation ,
    startQuizmob,
    submitQuiz,
    importQuiz ,
    exportQuizToCSV ,
    startQuizbyteach ,
    SeeDraftQuiz ,
    update_Module ,
    getQuizDuration ,
    Getlevel , 
    getModuleNameById,
    update_visibility,
    checkQuizStatus ,
    getQuizById ,
    getLastQuiz
} ; 
