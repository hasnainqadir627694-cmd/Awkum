import express from 'express';
import { createServer as createViteServer } from 'vite';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Secure Cloudinary Configuration with user credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ehc1fewm',
  api_key: process.env.CLOUDINARY_API_KEY || '222139937659655',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'CUidagGOF8eVgV00bq2cTPOvbu8',
  secure: true,
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // CORS Middleware: Ensures iframe and cross-origin fetch requests succeed without restriction
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // JSON and URL-encoded parser with 100mb limit for high-res photos and documents
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Secure Server-Side Cloudinary Upload Endpoint
  app.post('/api/upload', async (req, res) => {
    try {
      const { fileData, fileName, folder = 'awkum_classhub/submissions' } = req.body;

      if (!fileData) {
        return res.status(400).json({ error: 'No file data received for upload.' });
      }

      console.log(`[Cloudinary Upload] Uploading ${fileName || 'file'} to folder: ${folder}...`);

      const uploadResult = await cloudinary.uploader.upload(fileData, {
        folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      });

      console.log(`[Cloudinary Upload] Success: ${uploadResult.secure_url}`);

      return res.json({
        success: true,
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        format: uploadResult.format || (fileName ? fileName.split('.').pop() : 'file'),
        bytes: uploadResult.bytes,
        originalFilename: fileName || uploadResult.original_filename,
      });
    } catch (error: any) {
      console.error('[Cloudinary Upload Error]:', error);
      return res.status(500).json({
        error: error?.message || 'Cloudinary upload operation failed.',
      });
    }
  });

  // Diagnostics and Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'AWKUM ClassHub Full-Stack API',
      cloudinary: {
        cloud_name: 'ehc1fewm',
        status: 'connected',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Development: Vite middleware mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AWKUM ClassHub Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
