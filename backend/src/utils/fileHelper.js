import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const deleteLocalFile = (fileUrl) => {
    if (!fileUrl) return;

    try {
        // Expected URL format: http://localhost:3000/uploads/filename.jpg
        // or just local path /uploads/filename.jpg
        
        let filename;
        if (fileUrl.startsWith('http')) {
            const urlParts = fileUrl.split('/uploads/');
            if (urlParts.length > 1) {
                filename = urlParts[1];
            }
        } else if (fileUrl.includes('/uploads/')) {
            const parts = fileUrl.split('/uploads/');
            filename = parts[1];
        }

        if (filename) {
            // Go up from src/utils to root then into uploads
            // src/utils -> src -> backend -> uploads ?? 
            // Current structure: backend/src/utils/fileHelper.js
            // Uploads: backend/uploads
            
            const uploadDir = path.join(__dirname, '../../..', 'uploads');
            const filePath = path.join(uploadDir, filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted file: ${filePath}`);
            }
        }
    } catch (error) {
        console.error(`Failed to delete file ${fileUrl}:`, error);
    }
};
