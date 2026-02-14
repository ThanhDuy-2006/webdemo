import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

const BACKUP_DIR = path.resolve('backups');

export const runBackup = () => {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Assuming MySQL because of the connection logic used in the app
    const cmd = `mysqldump -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > "${filepath}"`;

    logger.info(`Starting database backup to ${filename}...`);

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            logger.error(`Backup failed: ${error.message}`);
            return;
        }
        if (stderr && !stderr.includes('column-statistics')) {
            logger.warn(`Backup warning: ${stderr}`);
        }
        logger.info(`✅ Backup successful: ${filename}`);
        
        // Clean up old backups (keep last 7 days)
        cleanOldBackups();
    });
};

const cleanOldBackups = () => {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    files.forEach(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > sevenDays) {
            fs.unlinkSync(filePath);
            logger.info(`Removed old backup: ${file}`);
        }
    });
};

// If run directly
if (import.meta.url === `file:///${path.resolve(process.argv[1]).replace(/\\/g, '/')}`) {
    runBackup();
}
