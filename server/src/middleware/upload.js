const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const getBaseUploadPath = () => process.env.UPLOAD_PATH || './uploads';
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024;

const createStorage = (defaultEntityType = 'general') => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const entityType = req.body?.entityType || req.params?.entityType || defaultEntityType;
      const dateStr = new Date().toISOString().split('T')[0];
      const targetDir = path.join(path.resolve(getBaseUploadPath()), entityType, dateStr);

      try {
        fs.mkdirSync(targetDir, { recursive: true });
        cb(null, targetDir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    }
  });
};

const receiptAndPhotoFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPEG, PNG, GIF, WEBP and PDF files are allowed.'), false);
  }
};

const csvFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = [
    'text/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'application/csv'
  ];

  if (ext === '.csv' || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only CSV files are allowed.'), false);
  }
};

const uploadReceiptMulter = multer({
  storage: createStorage('expense'),
  limits: { fileSize: maxFileSize },
  fileFilter: receiptAndPhotoFilter
});

const uploadPhotoMulter = multer({
  storage: createStorage('photos'),
  limits: { fileSize: maxFileSize },
  fileFilter: receiptAndPhotoFilter
});

const uploadCSVMulter = multer({
  storage: createStorage('csv'),
  limits: { fileSize: maxFileSize },
  fileFilter: csvFilter
});

module.exports = {
  uploadReceipt: uploadReceiptMulter.single('file'),
  uploadPhoto: uploadPhotoMulter.single('photo'),
  uploadCSV: uploadCSVMulter.single('csv')
};
