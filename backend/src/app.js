const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const globalErrorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/appError');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const fineRoutes = require('./routes/fineRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

app.set('trust proxy', 1); // Critical for Render/Vercel behind proxies
app.enable('trust proxy'); // Enable trust proxy globally

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
);
app.use(compression());

// ============================================================
// ✅ CORS Configuration (Fixed - No Duplicates)
// ============================================================

// Helper to parse comma-separated URLs from .env
const parseOrigins = (val) => {
  if (!val) return [];
  return val.split(',').map((s) => s.trim()).filter(Boolean);
};

// Build allowed origins list from multiple sources (no duplicates)
const rawOrigins = [
  // Environment variables (Render/Vercel)
  ...parseOrigins(process.env.CLIENT_URL),
  ...parseOrigins(process.env.ADMIN_URL),
  ...parseOrigins(process.env.FRONTEND_URL), // Support for FRONTEND_URL
  
  // Local development
  'http://localhost:5173',   // Vite default
  'http://localhost:4200',   // Angular default  
  'http://localhost:3000',   // React default
  'http://localhost:5000',
];

// Remove duplicates and filter empty values
const allowedOrigins = [...new Set(rawOrigins.filter(Boolean))];

console.log('[CORS] Allowed Origins:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // 1. Allow requests with no origin (Postman, mobile apps, curl)
      if (!origin) {
        return callback(null, true);
      }
      
      // 2. Check explicitly allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // 3. Wildcard: allow all vercel.app & render.com subdomains
      if (
        origin.match(/https:\/\/.*\.vercel\.app$/) || 
        origin.match(/https:\/\/.*\.onrender\.com$/)
      ) {
        return callback(null, true);
      }
      
      // 4. Development mode: allow everything
      if (process.env.NODE_ENV !== 'production') {
        console.log('[CORS] Dev mode: Allowing origin:', origin);
        return callback(null, true);
      }
      
      // 5. Block in production
      console.error('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true, // Required for cookies/auth tokens
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization']
  })
);

// Handle preflight requests explicitly
app.options('*', cors());

// Global API Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { status: 'error', message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', limiter);

// Strict Rate Limiting for Authentication Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { status: 'error', message: 'Too many authentication attempts from this IP, please try again after 15 minutes' }
});
app.use('/api/v1/auth', authLimiter);
app.use('/api/auth', authLimiter);
app.use('/auth', authLimiter);

// Payment order creation rate limit
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: 'error', message: 'Too many payment attempts, please try again later' }
});
app.use('/api/v1/payments/create-order', paymentLimiter);
app.use('/api/payments/create-order', paymentLimiter);
app.use('/payments/create-order', paymentLimiter);

// Request Parsing & Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
const registerRoutes = (prefix) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/books`, bookRoutes);
  app.use(`${prefix}/transactions`, transactionRoutes);
  app.use(`${prefix}/fines`, fineRoutes);
  app.use(`${prefix}/reservations`, reservationRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/payments`, paymentRoutes);
};

registerRoutes('/api/v1');
registerRoutes('/api');
registerRoutes('');

// Health Check Endpoints
app.get(['/api/health', '/api/v1/health', '/health', '/api', '/api/v1'], (req, res) => {
  res.status(200).json({
    status: 'success',
    system: 'Smart Library Management System (SLMS) Backend API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    corsAllowed: allowedOrigins
  });
});

// Static path resolver
function resolveStaticPath(relativeSubPath) {
  try {
    const candidatePaths = [
      path.join(process.cwd(), relativeSubPath),
      path.join(__dirname, '../../', relativeSubPath),
      path.join(__dirname, '../', relativeSubPath),
      path.join(__dirname, relativeSubPath)
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
  } catch (e) {}
  return null;
}

// Serve Angular Admin Console (/admin)
app.use('/admin', (req, res, next) => {
  const angularDistPath = resolveStaticPath('frontend-react/dist/admin/browser') || 
                          resolveStaticPath('frontend-react/dist/admin') || 
                          resolveStaticPath('admin-angular/dist/admin-angular/browser') || 
                          resolveStaticPath('admin-angular/dist/slms-admin-angular/browser');
  if (angularDistPath) {
    express.static(angularDistPath)(req, res, next);
  } else {
    next();
  }
});

app.get(['/admin', '/admin/*'], (req, res, next) => {
  const angularDistPath = resolveStaticPath('frontend-react/dist/admin/browser') || 
                          resolveStaticPath('frontend-react/dist/admin') || 
                          resolveStaticPath('admin-angular/dist/admin-angular/browser') || 
                          resolveStaticPath('admin-angular/dist/slms-admin-angular/browser');
  if (angularDistPath && fs.existsSync(path.join(angularDistPath, 'index.html'))) {
    return res.sendFile(path.join(angularDistPath, 'index.html'));
  }
  next(new AppError('Admin console build files not found', 404));
});

// Serve React Student Portal (/)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/admin')) return next();
  const reactDistPath = resolveStaticPath('frontend-react/dist');
  if (reactDistPath) {
    express.static(reactDistPath)(req, res, next);
  } else {
    next();
  }
});

// Catch-all route
app.get('*', (req, res, next) => {
  const url = req.originalUrl || req.url || '';
  if (url.startsWith('/api') || url.startsWith('/auth') || url.startsWith('/users') || 
      url.startsWith('/books') || url.startsWith('/transactions') || url.startsWith('/fines') || 
      url.startsWith('/reservations') || url.startsWith('/notifications') || 
      url.startsWith('/analytics') || url.startsWith('/payments')) {
    return next(new AppError(`Can't find ${url} on this server!`, 404));
  }
  const reactDistPath = resolveStaticPath('frontend-react/dist');
  if (reactDistPath && fs.existsSync(path.join(reactDistPath, 'index.html'))) {
    return res.sendFile(path.join(reactDistPath, 'index.html'));
  }
  next(new AppError(`Can't find ${url} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;