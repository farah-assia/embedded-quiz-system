import mysql from 'mysql2/promise' ;
import dotenv from 'dotenv' ;
import envConfig from './envConfig.js';
dotenv.config();
const dbConfig = {
    host: envConfig.DB_HOST ,
    user: envConfig.DB_USER ,
    password: envConfig.DB_PASSWORD  ,
    database: envConfig.DB_NAME ,
    waitForConnections: true,                
    connectionLimit: 10,                 
    queueLimit: 0,  
};
const pool = mysql.createPool(dbConfig);

async function createTeachersTable() {
    try {
        const [results] = await pool.query(`
            CREATE TABLE IF NOT EXISTS teachers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(20) NOT NULL,
                surname VARCHAR(20) NOT NULL ,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                refresh_token VARCHAR(255) DEFAULT NULL
            );
        `);
       // console.log('Teachers table created successfully:', results);
    } catch (error) {
        console.error('Error creating teachers table:', error);
    }
}

async function createStudentsTable() {
    try {
        const [result] = await pool.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT PRIMARY KEY AUTO_INCREMENT,
                last_name VARCHAR(100) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                refresh_token VARCHAR(255) DEFAULT NULL
            );
        `);
    } catch (error) {
        console.error('Error creating table:', error);
    }
}
async function createQuizzesTable() {
    try {
        const [result] = await pool.query(`
                CREATE TABLE IF NOT EXISTS quizzes (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    teacher_id INT,
                    module_id INT,
                    title VARCHAR(255) NOT NULL,
                    status ENUM('Draft','Ongoing', 'Past') NOT NULL DEFAULT 'Draft' ,
                    timed_by ENUM('quiz','question') NOT NULL,
                    duration TIME,
                    visibility Boolean DEFAULT 1 ,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
                    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE 
                );
            `);
    } catch (error) {
        console.error(error);
    }

}
async function createQuestionsTable() {
    try {
        const [result] = await pool.query(`
                CREATE TABLE IF NOT EXISTS questions (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    quiz_id INT,
                    question_text TEXT NOT NULL,
                    duration_minutes INT,
                    grade INT NOT NULL DEFAULT 1,
                    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
                );
            `);
    } catch (error) {
        console.error(error);
    }
    
}
async function createAnswersTable() {
    try {
        const [result] = await pool.query(`
                CREATE TABLE IF NOT EXISTS answers (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    question_id INT,
                    answer_text VARCHAR(255) NOT NULL,
                    is_correct TINYINT(1) NOT NULL DEFAULT 0,
                    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
                );
            `);
    } catch (error) {
        console.error(error);
    }
}

async function createLevelsTable() {
    try {
        const [results] = await pool.query(`
            CREATE TABLE IF NOT EXISTS  levels (
                id INT PRIMARY KEY AUTO_INCREMENT,
                level_name VARCHAR(50) NOT NULL
            );
        `);
    } catch (error) {
        console.error('Error creating the table:', error);
    }
}

async function createSectionsTable() {
    try {
        const [results] = await pool.query(`
            CREATE TABLE IF NOT EXISTS sections (
                id INT PRIMARY KEY AUTO_INCREMENT,
                level_id INT,
                section_name VARCHAR(10),
                FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE SET NULL
            );
        `);
    } catch (error) {
        console.error('Error creating the table:', error);
    }
    
}

async function createStudentGroupsTable() {
    try {
        const [results] = await pool.query(`
            CREATE TABLE IF NOT EXISTS student_groups (
                id INT PRIMARY KEY AUTO_INCREMENT,
                section_id INT,
                group_name VARCHAR(10),
                FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
            );
        `);
    } catch (error) {
        console.error('Error creating the table:', error);
    }
    
}

async function  createQuizParticipants() {
    try {
        const [result] = await pool.query(`
                CREATE TABLE IF NOT EXISTS QuizParticipants (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    quiz_id INT,
                    student_id INT,
                    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
                );
            `);
    } catch (error) {
        console.error(error);
    }
}

async function createQuizAttempts() {
    try {
        const [result] = await pool.query(`
                CREATE TABLE IF NOT EXISTS Quiz_attempts (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    student_id INT,
                    quiz_id INT,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME,
                    status ENUM('inprogress', 'submitted') NOT NULL,
                    score FLOAT,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
                    UNIQUE(student_id, quiz_id)
                );
            `);
    } catch (error) {
        console.error(error);
    }
}

async function createStudentResponses() {
    try {
        const [result] = await pool.query(`
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
            `);
    } catch (error) {
        console.error(error);
    }
}
async function createModulesTable() {
    try {
        const [result] = await pool.execute(`
                CREATE TABLE IF NOT EXISTS modules (
                    id INT PRIMARY KEY AUTO_INCREMENT ,
                    moduleName VARCHAR(10)
                );
            `);
    } catch (error) {
        console.error(error);
    }
}
async function createTeachModule() {
    try {
        const [result] = await pool.execute(`
                CREATE TABLE IF NOT EXISTS teach_module (
                    teacher_id INT,
                    module_id INT,
                    PRIMARY KEY (teacher_id , module_id),
                    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
                    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
                )
            `);
    } catch (error) {
        console.error(error);
    }
}
async function createLevelModule() {
    try {
        const [result] = await pool.execute(`
                CREATE TABLE IF NOT EXISTS level_module(
                    level_id INT,
                    module_id INT,
                    PRIMARY KEY (level_id,module_id),
                    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE,
                    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
                )
            `);
    } catch (error) {
        console.error(error);
    }
}
async function createStudentGroupCsvTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS student_group_csv (
                id INT PRIMARY KEY AUTO_INCREMENT,
                email VARCHAR(255) NOT NULL,
                group_id INT NOT NULL,
                UNIQUE (email, group_id),
                FOREIGN KEY (group_id) REFERENCES student_groups(id) ON DELETE CASCADE
            );
        `);
    } catch (error) {
        console.error('Error creating student_group_csv table:', error);
    }
}

async function createQuizNotificationsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quiz_notifications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT NOT NULL,
                quiz_id INT NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                notified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
            );
        `);
    } catch (error) {
        console.error('Error creating quiz_notifications table:', error.message);
    }
}

async function checkConnection() {
    try {
        const conn = await pool.getConnection();
        conn.release();
        return true;
    } catch {
        return false;
    }
}

async function createTables() {
    const isOnline = await checkConnection();
    if (!isOnline) {
        console.log('[Database] ⏳ MySQL connection pending or offline. Ready to connect when database becomes available.');
        return;
    }

    try {
        await createLevelsTable();
        await createSectionsTable();
        await createStudentGroupsTable();
        await createModulesTable();
        await createLevelModule();
        await createTeachModule();
        await createTeachersTable();
        await createStudentsTable();
        await createQuizzesTable();
        await createQuestionsTable();
        await createAnswersTable();
        await createQuizParticipants();
        await createQuizAttempts();
        await createStudentResponses();
        await createStudentGroupCsvTable();
        await createQuizNotificationsTable();
        console.log('[Database] ✅ Tables verified & initialized successfully.');
    } catch (error) {
        console.warn('[Database] Initialization error:', error.message);
    }
}

createTables().catch(err => {
    console.warn('[Database] Initial connection notice:', err.message);
});

export default pool;
