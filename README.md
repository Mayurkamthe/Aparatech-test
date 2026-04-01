# APARAITECH Test Portal

**Production-ready online MCQ test platform** built with Node.js, Express, EJS, Bootstrap 5, MongoDB, and NodeMailer.

---

## 🏢 Company Details

| Field | Value |
|-------|-------|
| **Company** | APARAITECH |
| **Email** | info@aparaitechsoftware.org |
| **Reg No** | 2431000320445474 |
| **Address** | 5H4J+RGQ, Anand Nagar Colony, Baramati, Maharashtra 413102 |

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js ≥ 18 |
| Framework | Express.js 4 |
| Templating | EJS (server-side) |
| UI | Bootstrap 5.3 |
| Database | MongoDB (Mongoose) |
| Auth | OTP via NodeMailer + express-session |
| Email | NodeMailer (SMTP / Gmail) |
| PDF | PDFKit |
| Security | Helmet, JWT-ready sessions |

---

## 📁 Project Structure

```
aparaitech-test-portal/
│
├── server.js                  # Express app entry point
├── .env                       # Environment variables (copy from .env.example)
├── .env.example               # Template for environment variables
├── package.json
│
├── controllers/
│   ├── authController.js      # Login, OTP send/verify, admin login, logout
│   ├── adminController.js     # Dashboard, create tests, questions, view results
│   └── studentController.js   # Dashboard, enter code, start/submit test, results, PDF
│
├── models/
│   ├── User.js                # Student & Admin accounts
│   ├── OtpStore.js            # Temporary OTP storage with TTL
│   ├── Test.js                # Test configuration
│   ├── Question.js            # MCQ questions linked to tests
│   └── Result.js              # Student submissions with detailed answers
│
├── routes/
│   ├── authRoutes.js          # /login, /logout, OTP endpoints
│   ├── adminRoutes.js         # /admin/* (protected)
│   └── studentRoutes.js       # /student/* (protected)
│
├── middleware/
│   └── authMiddleware.js      # requireLogin, requireAdmin, requireStudent
│
├── services/
│   ├── emailService.js        # sendOTPEmail, sendResultEmail
│   └── pdfService.js          # generateResultPDF using PDFKit
│
├── utils/
│   ├── shuffle.js             # Fisher-Yates shuffle for questions & options
│   └── codeGenerator.js       # generateTestCode(), generateOTP()
│
├── views/
│   ├── partials/
│   │   ├── header.ejs         # Navbar with APARAITECH branding
│   │   ├── footer.ejs         # Company footer
│   │   └── flash.ejs          # Flash message alerts
│   ├── login.ejs              # Student OTP + Admin password tabs
│   ├── verify-otp.ejs         # OTP digit input page
│   ├── 404.ejs
│   ├── error.ejs
│   ├── admin/
│   │   ├── dashboard.ejs      # Stats + recent submissions
│   │   ├── tests.ejs          # All tests with action buttons
│   │   ├── create-test.ejs    # New test form
│   │   ├── add-questions.ejs  # Add/view MCQ questions
│   │   ├── results.ejs        # All student results with filters
│   │   └── result-detail.ejs  # Full answer breakdown
│   └── student/
│       ├── dashboard.ejs      # Stats + test history
│       ├── enter-code.ejs     # 6-char code input
│       ├── instructions.ejs   # Pre-test rules page
│       ├── test.ejs           # Live test with anti-cheat
│       ├── result.ejs         # Score ring + answer review
│       └── profile.ejs        # Update display name
│
└── public/
    ├── css/main.css           # Full design system
    └── js/
        ├── app.js             # General UI helpers
        └── anti-cheat.js      # Extra anti-cheat measures
```

---

## ⚙️ Setup & Installation

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** (local) OR MongoDB Atlas free cluster
- **Gmail account** with App Password enabled (for OTP emails)

### Step 1 — Clone & Install

```bash
git clone <your-repo-url>
cd aparaitech-test-portal
npm install
```

### Step 2 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
MONGO_URI=mongodb://localhost:27017/aparaitech_test_portal

ADMIN_EMAIL=admin@aparaitechsoftware.org
ADMIN_PASSWORD=Admin@APARAI2024

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
```

### Step 3 — Gmail App Password Setup

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification → Enable
3. Security → App Passwords → Create one for "Mail"
4. Use that 16-character password as `SMTP_PASS`

### Step 4 — Start the Server

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

Visit: **http://localhost:3000**

---

## 🔐 Authentication Flow

### Student Login (OTP)
1. Student enters email on `/login`
2. Server generates 6-digit OTP → stores in MongoDB with 10-min TTL
3. Email sent via NodeMailer with branded HTML template
4. Student enters OTP on verify page
5. On success → session created → redirect to dashboard

### Admin Login (Password)
- Email + Password checked against `.env` values (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- No OTP required for admin
- Session created → redirect to admin dashboard

---

## 🧑‍💼 Admin Workflow

1. **Login** at `/login` → Admin tab
2. **Create Test**: `/admin/tests/create`
   - Set title, domain, duration, marks, question limit
   - System auto-generates unique 6-char code (e.g. `FX93KQ`)
3. **Add Questions**: Add MCQs with 4 options, mark correct answer
4. **Share Code** with students
5. **View Results**: Filter by test or search by email
6. **Download PDF** for any student result

---

## 🎓 Student Workflow

1. **Login** via OTP at `/login`
2. **Enter Test Code** at `/student/enter-code`
3. **Read Instructions** → tick agreement checkbox
4. **Take Test**:
   - Questions & options are shuffled (Fisher-Yates)
   - Countdown timer visible at all times
   - Anti-cheat active throughout
5. **Submit** manually OR auto-submit on timer end
6. **View Result** instantly with animated score ring
7. **Download PDF** report

---

## 🛡️ Anti-Cheat Features

| Feature | Implementation |
|---------|---------------|
| Fullscreen enforcement | `requestFullscreen()` on start, re-triggers on exit |
| Tab switch detection | `visibilitychange` + `window.blur` events |
| 3 warnings → auto-submit | Counter tracked in JS state |
| Right-click disabled | `contextmenu` event blocked |
| Copy/paste disabled | `copy`, `cut`, `paste` events blocked |
| Keyboard shortcuts blocked | F12, Ctrl+U, Ctrl+Shift+I etc. |
| Drag disabled | `dragstart` event blocked |
| Page unload → auto-submit | `beforeunload` event |
| Tab switch count stored | Saved with result in MongoDB |

---

## 📊 Database Collections

### `users`
```js
{ email, name, role: 'admin'|'student', isActive, timestamps }
```

### `otp_stores`
```js
{ email, otp, expiry (TTL), attempts }
```

### `tests`
```js
{ title, domain, duration, totalMarks, passingMarks, questionLimit, code, isActive, instructions }
```

### `questions`
```js
{ testId, question, options[4], correctAnswer(0-3), marks, explanation }
```

### `results`
```js
{ studentId, testId, score, totalMarks, percentage, isPassed,
  correctCount, incorrectCount, unattempted,
  answers[{ questionText, options, selectedOption, correctOption, isCorrect }],
  timeTaken, tabSwitchCount, submittedAt }
```

---

## 🔀 Randomization (Fisher-Yates)

Located in `utils/shuffle.js`:
- **Questions** shuffled before serving each student
- **Options** within each question also shuffled
- Correct answer index updated to match new option positions
- Optional `questionLimit` to serve only N of M questions

---

## 📧 Email Templates

Both emails use inline HTML with APARAITECH branding:
- **OTP Email**: Branded header, large OTP code box, expiry warning
- **Result Email**: Score breakdown, pass/fail badge, stats grid

---

## 📄 PDF Report

Generated by PDFKit (`services/pdfService.js`):
- **Page 1**: Company header, student & test details, score box, pass/fail, stats
- **Page 2+**: Full answer breakdown (correct = green, wrong = red, skipped = yellow)
- Company footer on every page with registration details

---

## 🔒 Security Notes

- Session secret & JWT secret in `.env` — **never commit `.env` to Git**
- Admin credentials are environment-only (no DB password storage)
- OTPs auto-expire via MongoDB TTL index
- Route-level middleware prevents unauthorized access
- Input validation on all form submissions

---

## 🌐 Deployment (Production Tips)

```bash
# Set in .env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/aparaitech

# Use PM2 for process management
npm install -g pm2
pm2 start server.js --name aparaitech-portal
pm2 save
pm2 startup
```

---

## 📞 Support

**APARAITECH Software**  
📧 info@aparaitechsoftware.org  
📍 5H4J+RGQ, Anand Nagar Colony, Baramati, Maharashtra 413102  
🏛️ Reg No: 2431000320445474
