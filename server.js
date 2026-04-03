/**
 * APARAITECH TEST PORTAL - Main Server Entry Point
 */

require('dotenv').config();
const express      = require('express');
const session      = require('express-session');
const flash        = require('connect-flash');
const path         = require('path');
const mongoose     = require('mongoose');

const authRoutes    = require('./routes/authRoutes');
const adminRoutes   = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ── MongoDB ───────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

// ── Session Store (Redis if available, else memory) ───
function buildSessionStore() {
  if (process.env.REDIS_URL) {
    try {
      const RedisStore = require('connect-redis').default;
      const Redis      = require('ioredis');
      const client     = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000
      });
      client.on('connect', () => console.log('✅ Redis session store connected'));
      client.on('error',   (e) => console.error('❌ Redis session error:', e.message));
      return new RedisStore({ client, prefix: 'sess:' });
    } catch (e) {
      console.warn('⚠️  Redis session store failed, falling back to memory:', e.message);
    }
  }
  console.warn('⚠️  Using MemoryStore for sessions (not recommended for production)');
  return undefined; // express-session default MemoryStore
}

// ── View Engine ───────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store:             buildSessionStore(),
  secret:            process.env.SESSION_SECRET || 'aparaitech_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   false,
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000
  }
}));

app.use(flash());

// ── Global locals ─────────────────────────────────────
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg   = req.flash('error_msg');
  res.locals.error       = req.flash('error');
  res.locals.user        = req.session.user || null;
  res.locals.companyName = process.env.COMPANY_NAME || 'APARAITECH';
  next();
});

// ── Routes ────────────────────────────────────────────
app.use('/',        authRoutes);
app.use('/admin',   adminRoutes);
app.use('/student', studentRoutes);

// ── 404 ───────────────────────────────────────────────
app.use((req, res) => res.status(404).render('404', { title: 'Page Not Found' }));

// ── Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// ── Start ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 APARAITECH running at http://localhost:${PORT}`);
  console.log(`📌 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
