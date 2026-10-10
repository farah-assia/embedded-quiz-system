import express from "express";
import AnswerController from "../controllers/answerController.js";
import { authTeacherMiddleware, authenticateStudent } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Protected Teacher Routes
router.post("/", authTeacherMiddleware, AnswerController.createAnswer);
router.get("/:id", AnswerController.getAnswerById);
router.get("/question/:question_id", AnswerController.getAnswersByQuestionId);
router.put("/:id/text", authTeacherMiddleware, AnswerController.updateAnswerText);
router.put("/:id/correctness", authTeacherMiddleware, AnswerController.updateAnswerCorrectness);
router.delete("/:id", authTeacherMiddleware, AnswerController.deleteAnswer);

// Student Answer Submission
router.post('/submit', authenticateStudent, AnswerController.submitAnswer); 
router.get("/student-answer/:student_id/:quiz_id/:question_id", authTeacherMiddleware, AnswerController.getStudentAnswerForQuestion);

export default router;
