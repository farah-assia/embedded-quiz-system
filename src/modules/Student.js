import mysql from 'mysql2';
import pool from '../config/dbConfig.js';
import bcryptjs from 'bcryptjs';

class Student {
    static async create(first_name, last_name, email, password_hash) {
        try {
            const [row] = await pool.execute(
                `INSERT INTO students (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)`,
                [first_name, last_name, email, password_hash]
            );
            console.log("Insert result:", row);
            return row.insertId;
        } catch (error) {
            console.error(`Error creating student: ${error.message}`);
            throw new Error("Failed to create student");
        }
    }

    static async update_Password(studentId , password) {
        try {
           const password_hash = await bcryptjs.hash(password, 8);
            const [result] = await pool.execute(`UPDATE students SET password_hash = ? WHERE id = ?`, [password_hash, studentId ]);
            return result.affectedRows;
        } catch (error) {
            console.log(error);
        }
    }

    static async update_LastName( studentId, last_name) {
        try {
            const [result] = await pool.execute(`UPDATE students SET Last_name = ? WHERE id = ?`, [last_name, studentId ]);
            return result.affectedRows;
        } catch (error) {
            console.log(error);
        }
    }

    static async update_FirstName(id, first_name) {
        try {
            const [result] = await pool.execute(`UPDATE students SET First_name = ? WHERE id = ?`, [first_name, id]);
            return result.affectedRows;
        } catch (error) {
            console.log(error);
        }
    }

    static async update_groupid(id, group_id) {
        try {
            const [result] = await pool.execute(`UPDATE student_group_csv SET group_id = ? WHERE id = ?`, [group_id, id]);
            return result.affectedRows;
        } catch (error) {
            console.log(error);
        }
    }

    static async getById(id) {
        try {
            const [students] = await pool.execute(
                "SELECT * FROM students WHERE id = ?",
                [id]
            );

            if (students.length === 0) {
                throw new Error(`Student with ID ${id} not found`);
            }

            return students[0];
        } catch (error) {
            console.error(`Error fetching student by ID: ${error.message}`);
            throw new Error("Failed to fetch student");
        }
    }

    static async searchByEmail(email) {
        try {
            const [result] = await pool.execute(
                `SELECT * FROM students WHERE email = ?`,
                [email]
            );

            if (result.length > 0) {
                return result[0];
            }
            return null;
        } catch (error) {
            console.error(`Error searching student by email: ${error.message}`);
            throw new Error("Failed to search student by email");
        }
    }
// getters
static async getfirst_name(id){
    try {
        const [student] = await pool.execute(`SELECT first_name FROM students WHERE id = ?`,[id]);
        if(student.length === 0){
            return null ;
        }else{
            const studentFound = student[0] ;
            return studentFound.first_name;
        }
    } catch (error) {
        throw new Error(`Error fetching student first_name: ${error.message}`);
    }
}
static async getlast_name(id){
    try {
        const [student] = await pool.execute(`SELECT last_name FROM students WHERE id = ? ;`,[id]);
        if(student.length === 0){
            return null ;
        }else{
            const studentFound = student[0] ;
            return studentFound.last_name;
        }
    } catch (error) {
        throw new Error(`Error fetching student last_name : ${error.message}`);
    }
}

static async getCreatedAt(id){
    try {
        const [student] = await pool.execute(`SELECT created_at FROM students WHERE id = ?`,[id]);
        if(student.length > 0){
            const studentFound = student[0];
            return studentFound.created_at ;
        }else {
            return null ;
        }
    } catch (error) {
        throw new Error(`Error fetching student created at: ${error.message}`);            
    }
}
static async updateRefreshToken(id,refreshToken){
    try {
        const [rows] = await pool.execute(`UPDATE students SET refresh_token = ? WHERE id = ?`,[refreshToken,id]);
        return rows.affectedRows ;
    } catch (error) {
        throw new Error(`Error updating the refreshToken: ${error.message}`);
    }
}
static async getRefreshToken(id){
    try {
        const [student] = await pool.execute(`SELECT refresh_token FROM students WHERE id = ? `,[id]);
        if(student.length > 0){
            const studentFound = student[0] ;
            return studentFound.refresh_token;
        }else {
            return null ;
        }
    } catch (error) {
        throw new Error(`Error fetching student refreshToken: ${error.message}`);
    }
}
static async delete(id){
    try {
        const [rows] = await pool.execute(`DELETE FROM students WHERE id = ?`,[id]);
    } catch (error) {
        throw new Error(`Error deleting student by ID: ${error.message}`);
    }
}

}
export default Student;

