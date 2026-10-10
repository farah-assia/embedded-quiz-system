import mysql from 'mysql2';
import pool from '../config/dbConfig.js';
//| id | name     |surname         | email               | password_hash | created_at  
// IMEN : export async function create.. 
class Teacher {
    static async create(name,surname,email,password_hash) {
        try {
            const [row] = await pool.execute(`INSERT INTO teachers (name , surname , email , password_hash) VALUES (?,?,?,?)`,[name , surname , email ,password_hash]);
            return row.insertId ;// Imen: After inserting we get the id of the teacher
        }catch(error) {
            throw new Error(`Error creating teacher by ID: ${error.message}`);
        }
    }
    static async updateName(id,name){
        try {
            const [result] = await pool.execute(`UPDATE teachers SET name = ? WHERE id = ?`,[name , id]);
            return result.affectedRows ;
            //Imen: this shows how many rows where affected by my query
            //Imen: We can do also result.changedRows 
        }catch (error){
            throw new Error(`Error fetching teacher by ID: ${error.message}`);
        }
    }
    static async updatePassword(id,password){
        try {
            const [result] = await pool.execute(`UPDATE teachers SET password_hash = ? WHERE id = ?`,[password,id]);
            return result.affectedRows ;
        } catch (error) {
            throw new Error(`Error fetching teacher by ID: ${error.message}`);
        }
    }
    static async updateSurname(id,surname){
        try {
            const [result] = await pool.execute(`UPDATE teachers SET surname = ? WHERE id = ?`,[surname,id]);
            return result.affectedRows ;
        } catch (error) {
            throw new Error(`Error fetching teacher by ID: ${error.message}`);
        }
    }
    static async updateRefreshToken(id,refreshToken){
        try {
            const [rows] = await pool.execute(`UPDATE teachers SET refresh_token = ? WHERE id = ?`,[refreshToken,id]);
            return rows.affectedRows ;
        } catch (error) {
            throw new Error(`Error updating the refreshToken: ${error.message}`);
        }
    }
    static async searchByemail(email){
        try{
            const [result] = await pool.execute(`SELECT * FROM teachers WHERE email = ?`,[email]);
            if(result.length > 0){
                return result[0];
            }
            return null ;
        }catch(error){
            throw new Error(`Error fetching teacher by ID: ${error.message}`);
        }
    }
    static async getById(id){
        try {
            const [teachers] = await pool.execute('SELECT * from teachers WHERE id = ?',[id]);
            if(teachers.length > 0 ){
                return teachers[0] ;
            }else {
                return null ;
            }
        } catch (error) {
            throw new Error(`Error fetching teacher by ID: ${error.message}`);
            return null;
        }
    }
    static async getName(id){
        try {
            const [teacher] = await pool.execute(`SELECT name FROM teachers WHERE id = ?`,[id]);
            if(teacher.length === 0){
                return null ;
            }else{
                const teacherFound = teacher[0] ;
                return teacherFound.name;
            }
        } catch (error) {
            throw new Error(`Error fetching teacher name: ${error.message}`);
        }
    }
    static async getEmail(id){
        try {
            const [teacher] = await pool.execute(`SELECT email FROM teachers WHERE id = ?`,[id]);
            if(teacher.length === 0){
                return null ;
            }else{
                const teacherFound = teacher[0] ;
                return teacherFound.email;
            }
        } catch (error) {
            throw new Error(`Error fetching teacher name: ${error.message}`);
        }
    }
    static async getSurName(id){
        try {
            const [teacher] = await pool.execute(`SELECT surname FROM teachers WHERE id = ? ;`,[id]);
            if(teacher.length === 0){
                return null ;
            }else{
                const teacherFound = teacher[0] ;
                return teacherFound.surname;
            }
        } catch (error) {
            throw new Error(`Error fetching teacher surname: ${error.message}`);
        }
    }
    static async getRefreshToken(id){
        try {
            const [teacher] = await pool.execute(`SELECT refresh_token FROM teachers WHERE id = ? `,[id]);
            if(teacher.length > 0){
                const teacherFound = teacher[0] ;
                return teacherFound.refresh_token;
            }else {
                return null ;
            }
        } catch (error) {
            throw new Error(`Error fetching teacher refreshToken: ${error.message}`);
        }
    }
    static async getCreatedAt(id){
        try {
            const [teacher] = await pool.execute(`SELECT created_at FROM teachers WHERE id = ?`,[id]);
            if(teacher.length > 0){
                const teacherFound = teacher[0];
                return teacherFound.created_at ;
            }else {
                return null ;
            }
        } catch (error) {
            throw new Error(`Error fetching teacher created at: ${error.message}`);            
        }
    }
    static async getTeacherModules(id){
        try {
            const [result] = await pool.execute(`SELECT m.id, m.moduleName FROM teach_module tm JOIN modules m ON tm.module_id = m.id WHERE tm.teacher_id = ?`,[id]);
            return result.length > 0 ? result : null ;
        } catch (error) {
            throw new Error(`Error fetching teacher module: ${error.message}`);            
        }
    }
    static async addTeacherModule(teacher_id,module_id){
        try {
            const [check] = await pool.execute(`SELECT * FROM teach_module WHERE teacher_id = ? AND module_id = ?`,[teacher_id,module_id]);
            if(check.length === 0){
                const [rows] = await pool.execute(`INSERT INTO teach_module (teacher_id ,module_id) VALUES (?,?)`,[teacher_id,module_id]);
                return rows.affectedRows ;
            }
            return -567;
        } catch (error) {
            throw new Error(`Error adding a module to teacher: ${error.message}`);              
        }
    }
    static async deleteTeacherModule(teacher_id,module_id){
        try {
            const [rows] = await pool.execute(`DELETE FROM teach_module WHERE teacher_id = ? AND module_id = ?`,[teacher_id,module_id]);
            return rows.affectedRows ;
        } catch (error) {
            throw new Error(`Error deleting module from teacher: ${error.message}`);  
        }
    }
    static async delete(id){
        try {
            const [rows] = await pool.execute(`DELETE FROM teachers WHERE id = ?`,[id]);
        } catch (error) {
            throw new Error(`Error creating teacher by ID: ${error.message}`);
        }
    }
}

export default Teacher ;
