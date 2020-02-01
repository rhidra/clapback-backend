import multer from 'multer';
import crypto from 'crypto';
import * as path from 'path';

const diskStorage = multer.diskStorage(
    {
        destination: 'public/images/',
        filename: (req, file, cb) => {
            crypto.pseudoRandomBytes(16, (err, raw) => {
                if (err) { return cb(err, null); }
                cb(null, raw.toString('hex') + path.extname(file.originalname));
            });
        }
    }
);

const upload = multer({
    storage: diskStorage,
    limits: {
        fileSize: 4 * 1024 * 1024,
    }
});

export = upload;
