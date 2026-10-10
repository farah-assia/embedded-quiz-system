-- ==============================================================================
-- Embedded Quiz System — Database Schema & Initial Seed Data
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS quiz_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quiz_app;

-- 1. Levels
CREATE TABLE IF NOT EXISTS levels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    level_name VARCHAR(50) NOT NULL
);

-- 2. Sections
CREATE TABLE IF NOT EXISTS sections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    level_id INT,
    section_name VARCHAR(20) NOT NULL,
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE SET NULL
);

-- 3. Student Groups
CREATE TABLE IF NOT EXISTS student_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    section_id INT,
    group_name VARCHAR(20) NOT NULL,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
);

-- 4. Modules (Courses)
CREATE TABLE IF NOT EXISTS modules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    moduleName VARCHAR(100) NOT NULL
);

-- 5. Level Module Mapping
CREATE TABLE IF NOT EXISTS level_module (
    level_id INT,
    module_id INT,
    PRIMARY KEY (level_id, module_id),
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

-- 6. Teachers
CREATE TABLE IF NOT EXISTS teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    surname VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refresh_token VARCHAR(255) DEFAULT NULL
);

-- 7. Teacher Module Mapping
CREATE TABLE IF NOT EXISTS teach_module (
    teacher_id INT,
    module_id INT,
    PRIMARY KEY (teacher_id, module_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

-- 8. Students
CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refresh_token VARCHAR(255) DEFAULT NULL
);

-- 9. Student Group CSV Roster
CREATE TABLE IF NOT EXISTS student_group_csv (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    group_id INT NOT NULL,
    UNIQUE (email, group_id),
    FOREIGN KEY (group_id) REFERENCES student_groups(id) ON DELETE CASCADE
);

-- 10. Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT,
    module_id INT,
    title VARCHAR(255) NOT NULL,
    status ENUM('Draft', 'Ongoing', 'Past') NOT NULL DEFAULT 'Draft',
    timed_by ENUM('quiz', 'question') NOT NULL DEFAULT 'question',
    duration TIME DEFAULT '00:15:00',
    visibility BOOLEAN DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

-- 11. Questions
CREATE TABLE IF NOT EXISTS questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quiz_id INT,
    question_text TEXT NOT NULL,
    duration_minutes INT DEFAULT 1,
    duration_seconds INT DEFAULT 30,
    grade INT NOT NULL DEFAULT 1,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- 12. Answers
CREATE TABLE IF NOT EXISTS answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT,
    answer_text VARCHAR(255) NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- 13. Quiz Participants
CREATE TABLE IF NOT EXISTS QuizParticipants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quiz_id INT,
    student_id INT,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 14. Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    quiz_id INT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    status ENUM('inprogress', 'submitted') NOT NULL DEFAULT 'inprogress',
    score FLOAT DEFAULT 0,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    UNIQUE(student_id, quiz_id)
);

-- 15. Student Responses
CREATE TABLE IF NOT EXISTS student_responses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    quiz_id INT,
    question_id INT,
    answer_id INT,
    is_correct BOOLEAN,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE
);

-- 16. Quiz Notifications
CREATE TABLE IF NOT EXISTS quiz_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    quiz_id INT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    notified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- ==============================================================================
-- SEED DATA (For instant development & presentation demo)
-- ==============================================================================

-- Seed Academic Structure
INSERT IGNORE INTO levels (id, level_name) VALUES (1, 'L3 Computer Science');
INSERT IGNORE INTO sections (id, level_id, section_name) VALUES (1, 1, 'Section A');
INSERT IGNORE INTO student_groups (id, section_id, group_name) VALUES (1, 1, 'Group 1');
INSERT IGNORE INTO modules (id, moduleName) VALUES (1, 'Operating Systems');
INSERT IGNORE INTO level_module (level_id, module_id) VALUES (1, 1);

-- Seed Teacher (Password: "teacher123", bcrypt hash)
INSERT IGNORE INTO teachers (id, name, surname, email, password_hash)
VALUES (1, 'Alan', 'Turing', 'turing@uni.edu', '$2a$10$wN9P31XfL86f7vU09p6Q3.4bWj5vT.JqfIovq5Q.8h1Xy7lK9W2pW');

INSERT IGNORE INTO teach_module (teacher_id, module_id) VALUES (1, 1);

-- Seed Student (Password: "student123", bcrypt hash)
INSERT IGNORE INTO students (id, first_name, last_name, email, password_hash)
VALUES (1, 'Ada', 'Lovelace', 'ada@uni.edu', '$2a$10$wN9P31XfL86f7vU09p6Q3.4bWj5vT.JqfIovq5Q.8h1Xy7lK9W2pW');

INSERT IGNORE INTO student_group_csv (id, email, group_id) VALUES (1, 'ada@uni.edu', 1);

-- Seed Demo Quiz
INSERT IGNORE INTO quizzes (id, teacher_id, module_id, title, status, timed_by, duration)
VALUES (1, 1, 1, 'Operating Systems & Concurrency Quiz', 'Draft', 'question', '00:15:00');

-- Seed Demo Questions & Answers
INSERT IGNORE INTO questions (id, quiz_id, question_text, duration_seconds, grade)
VALUES 
(1, 1, 'What is the main role of the CPU scheduler in an operating system?', 30, 1),
(2, 1, 'Which of the following conditions is NOT required for a Deadlock to occur?', 30, 1),
(3, 1, 'What is a Race Condition in concurrent programming?', 30, 1);

INSERT IGNORE INTO answers (id, question_id, answer_text, is_correct)
VALUES 
(1, 1, 'Select a ready process from memory and allocate the CPU to it', 1),
(2, 1, 'Allocate memory addresses to files on disk', 0),
(3, 1, 'Manage physical network packets between interfaces', 0),
(4, 1, 'Convert analog input signals into binary digital data', 0),

(5, 2, 'Mutual Exclusion', 0),
(6, 2, 'Hold and Wait', 0),
(7, 2, 'Preemption Allowed', 1),
(8, 2, 'Circular Wait', 0),

(9, 3, 'When execution outcome depends on sequence/timing of uncontrollable events', 1),
(10, 3, 'When CPU clock frequency exceeds its maximum rated threshold', 0),
(11, 3, 'When a thread terminates without releasing allocated heap memory', 0),
(12, 3, 'When two threads compute independent arithmetic loops in parallel', 0);
