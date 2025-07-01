const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Buat folder uploads jika belum ada
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Storage untuk multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Simpan galeri di file JSON
const galleryFile = path.join(__dirname, 'gallery.json');
let gallery = [];
let idCounter = 1;

function loadGallery() {
  if (fs.existsSync(galleryFile)) {
    gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf-8'));
    if (gallery.length > 0) {
      idCounter = Math.max(...gallery.map(i => i.id)) + 1;
    }
  }
}
loadGallery();
function saveGallery() {
  fs.writeFileSync(galleryFile, JSON.stringify(gallery, null, 2));
}


function syncUploadsToGallery() {
  const filesInUploads = fs.readdirSync(uploadDir);
  const existingPaths = new Set(gallery.map(item => item.img));

  filesInUploads.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      const imgPath = `/uploads/${file}`;
      if (!existingPaths.has(imgPath)) {
        gallery.push({
          id: idCounter++,
          title: path.parse(file).name,
          img: imgPath
        });
      }
    }
  });

  saveGallery();
  console.log('Sinkronisasi dari folder uploads ke gallery.json selesai.');
}


syncUploadsToGallery();
// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Default: redirect ke admin
// Default: tampilkan galeri publik
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rute admin manual
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'indexadmin.html'));
});





// API GET semua galeri
app.get('/api/gallery', (req, res) => {
  res.json(gallery);
});

// API POST upload gambar
app.post('/api/gallery', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const newItem = {
    id: idCounter++,
    title: req.body.title,
    img: `/uploads/${req.file.filename}`
  };
  gallery.push(newItem);
  saveGallery();
  res.status(201).json(newItem);
});

// API PUT update judul
app.put('/api/gallery/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = gallery.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  item.title = req.body.title;
  saveGallery();
  res.json(item);
});

// API DELETE hapus gambar
app.delete('/api/gallery/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = gallery.findIndex(i => i.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  // Hapus file fisik
  const filepath = path.join(__dirname, gallery[index].img);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

  gallery.splice(index, 1);
  saveGallery();
  res.status(204).end();
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}/index.html`);
});
