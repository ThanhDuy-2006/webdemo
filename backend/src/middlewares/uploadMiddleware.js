import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let originalName = file.originalname;
    
    // Normalize extension
    const extMatch = originalName.match(/\.([^.]+)$/);
    if (extMatch) {
         let ext = extMatch[1].toLowerCase();
         // Common misnomers
         if (ext === 'jpn') ext = 'jpg';
         if (ext === 'jpeg') ext = 'jpg';
         // Reconstruct filename with safe extension
         originalName = originalName.replace(/\.[^.]+$/, `.${ext}`);
    }

    cb(null, 'up-' + uniqueSuffix + '-' + originalName);
  }
});

const fileFilter = (req, file, cb) => {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|webp|gif|xlsx|xls/;
    // Check ext and mimetype
    const ext = file.originalname.toLowerCase().split('.').pop();
    const isImage = /jpeg|jpg|png|webp|gif/.test(ext);
    const isExcel = /xlsx|xls/.test(ext);
    
    // Mullter mimetype might be different for excel depending on browser
    const mimetype = file.mimetype;
    const isImageMime = /image/.test(mimetype);
    const isExcelMime = /excel|spreadsheetml|officedocument/.test(mimetype);

    if (isImage || isExcel) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Only images and Excel files are allowed!'));
    }
};

// Limit 10MB to accommodate Excel files with many rows
export const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});
