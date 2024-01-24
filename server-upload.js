import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import mongoose from 'mongoose';
import Image from './models/Image.js';

// Trebalo bi maknuti connection string iz koda i staviti u .env file
mongoose.connect(
    'mongodb+srv://admin:admin@clusternovi.oayb4ih.mongodb.net/walk_it',
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
);

const connection = mongoose.connection;
connection.on('error', console.log);

// Ureduje nacin na koji multer sprema fajlove
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const id = uuidv4();
        const filePath = `images/${id}${ext}`;
        Image.create({ filePath }).then(() => {
            cb(null, filePath); // unique id + originalno ime fajla
        });
    },
});
const upload = multer({ storage });

const app = express();
app.use(express.static('public'));
app.use(express.static('uploads'));

app.post('/upload', upload.array('avatar'), (req, res) => {
    return res.redirect('/');
});

// Zamijeni sa async/await
app.get('/images', (req, res) => {
    Image.find().then((images) => {
        return res.json({ status: 'OK', images });
    });
});

// Handle the root path and serve the 'index.html' file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => console.log('Server started'));
