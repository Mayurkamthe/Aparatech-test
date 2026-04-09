require('dotenv').config();
const express      = require('express');
const session      = require('express-session');
const flash        = require('connect-flash');
const path         = require('path');
const mongoose     = require('mongoose');

const authRoutes     = require('./routes/authRoutes');
const workshopRoutes = require('./routes/workshopRoutes');
const adminRoutes   = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'omvsab_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000
  }
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg   = req.flash('error_msg');
  res.locals.error       = req.flash('error');
  res.locals.user        = req.session.user || null;
  res.locals.companyName     = process.env.COMPANY_NAME     || 'OMVSAB';
  res.locals.companyFullName = process.env.COMPANY_FULLNAME  || 'OMVSAB IT SOLUTION';
  res.locals.companyTagline  = process.env.COMPANY_TAGLINE   || 'We code your Requirements';
  res.locals.companyEmail    = process.env.COMPANY_EMAIL     || 'hr@omvsabitsolution.in';
  res.locals.companyWebsite  = process.env.COMPANY_WEBSITE   || 'www.omvsabitsolution.in';
  res.locals.companyPhone    = process.env.COMPANY_PHONE     || '+91-20-6522-2520';
  res.locals.companyAddress  = process.env.COMPANY_ADDRESS   || 'Sr. No. 19/1/8, Karve Nagar, Pune - 411052, Maharashtra, India';
  next();
});

app.use('/',        authRoutes);
app.use('/',        workshopRoutes);
app.use('/admin',   adminRoutes);
app.use('/student', studentRoutes);

app.use((req, res) => res.status(404).render('404', { title: 'Page Not Found' }));

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 OMVSAB running at http://localhost:${PORT}`);
  console.log(`📌 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
