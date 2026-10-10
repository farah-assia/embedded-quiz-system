import mysql from 'mysql2' ;
import pool from '../config/dbConfig.js';
class Organization {
    static async createModule(moduleName){
        try {
            const [rows] = await pool.execute(`INSERT INTO modules (moduleName) VALUES (?)`,[moduleName]); 
            return rows.insertId ;
        } catch (error) {
            throw new Error(`Error creating module: ${error.message}`);  
        }
    }
    static async getModuleID(moduleName){
        try {
            const [rows] = await pool.execute(`SELECT id FROM modules WHERE moduleName = ?`,[moduleName]);
            return rows.length > 0 ? rows[0].id : -1 ;
        } catch (error) {
            throw new Error(`Error finding module: ${error.message}`);  
        }
    }
    static async addLevelModule(level_id,module_id){
        try {
            const [searh] = await pool.execute(`SELECT * FROM level_module WHERE level_id = ? AND module_id = ?`,[level_id,module_id]);
            if(searh.length === 0){
                const [rows] = await pool.execute(`INSERT INTO level_module (level_id,module_id) VALUES (?,?)`,[level_id,module_id]);
                return rows.affectedRows ;
            }
            return -1;
        } catch (error) {
            throw new Error(`Error adding the level to the module : ${error.message}`); 
        }
    }
    static async getLevelID(levelName){
        try {
            const [rows] = await pool.execute(`SELECT id FROM levels WHERE level_name = ?`,[levelName]);
            return rows.length > 0 ? rows[0].id : -1 ;
        } catch (error) {
            throw new Error(`Error fetching the level id: ${error.message}`); 
        }
    }
    static async createLevel(levelName){
        try {
            const [rows] = await pool.execute(`INSERT INTO levels (level_name) VALUES (?)`,[levelName]);
            return rows.insertId ;
        } catch (error) {
            throw new Error(`Error creating a new level: ${error.message}`); 
        }
    }
    static async deleteLevel(level_id){
        try {
            const [rows] = await pool.execute(`DELETE FROM levels WHERE id = ?`,[level_id]);
            return rows.affectedRows;
        } catch (error) {
            throw new Error(`Error deleting the level: ${error.message}`); 
        }
    }
    static async updateLevelName(level_id,levelName){
        try {
            const [rows] = await pool.execute(`UPDATE levels SET level_name = ? WHERE id = ?`,[levelName,level_id]);
            return rows.affectedRows;
        } catch (error) {
            throw new Error(`Error updating the level name: ${error.message}`); 
        }
    }
    static async updateModuleName(module_id,moduleName){
        try {
            const [rows] = await pool.execute(`UPDATE modules SET moduleName = ? WHERE id = ?`,[moduleName,module_id]);
            return rows.affectedRows;
        } catch (error) {
            throw new Error(`Error updating the module name: ${error.message}`); 
        }        
    }
    static async updateModuleLevel(module_id,level_id){
        try {
            const [rows] = await pool.execute(`UPDATE level_module SET level_id = ? WHERE module_id = ?`,[level_id,module_id]);
            return rows.affectedRows;
        } catch (error) {
            throw new Error(`Error updating the level name: ${error.message}`); 
        }
    }
      


    static async processStudentData(records) {
        const seenEmails = new Set(); // Track processed emails
    
        for (const row of records) {
            const { level, section, group, email } = row;
    
            if (!level || !section || !group || !email) continue;
    
            // Normalize email just in case (optional)
            const normalizedEmail = email.trim().toLowerCase();
    
            // Skip if this email was already processed
            if (seenEmails.has(normalizedEmail)) continue;
    
            try {
                console.log('/********************/');
                console.log(row);
    
                // Insert level if not exists
                let [levels] = await pool.query(
                    `SELECT * FROM levels WHERE level_name = ?`,
                    [level]
                );
                let levelId;
                if (levels.length === 0) {
                    let [insertLevel] = await pool.query(
                        `INSERT INTO levels (level_name) VALUES (?)`,
                        [level]
                    );
                    levelId = insertLevel.insertId;
                } else {
                    levelId = levels[0].id;
                }
    
                // Insert section if not exists
                const [sectionIdRow] = await pool.query(
                    `SELECT id FROM sections WHERE section_name = ? AND level_id = ?`,
                    [section, levelId]
                );
                let sectionId;
                if (sectionIdRow.length === 0) {
                    let [insertSection] = await pool.query(
                        `INSERT INTO sections (level_id, section_name) VALUES (?, ?)`,
                        [levelId, section]
                    );
                    sectionId = insertSection.insertId;
                } else {
                    sectionId = sectionIdRow[0].id;
                }
    
                // Insert student group if not exists
                let [groups] = await pool.query(
                    `SELECT * FROM student_groups WHERE section_id = ? AND group_name = ?`,
                    [sectionId, group]
                );
                let group_id;
                if (groups.length === 0) {
                    const [insertGroup] = await pool.query(
                        `INSERT INTO student_groups (section_id, group_name) VALUES (?, ?)`,
                        [sectionId, group]
                    );
                    group_id = insertGroup.insertId;
                } else {
                    group_id = groups[0]?.id;
                }
    
                console.log('the id:', group_id);
    
                // Insert into student_group_csv (only once per email)
                const [count] = await pool.query(
                    `INSERT INTO student_group_csv (email, group_id) VALUES (?, ?)`,
                    [normalizedEmail, group_id]
                );
                console.log(count.affectedRows);
    
                // Mark this email as processed
                seenEmails.add(normalizedEmail);
    
            } catch (error) {
                console.error('Error processing record:', error);
                throw error;
            }
        }
    }
    

}
export default Organization ;
