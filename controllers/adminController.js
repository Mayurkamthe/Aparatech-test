/**
 * Admin Controller
 * ================
 * All admin operations: dashboard, create tests, add questions, view results.
 */

const Test     = require('../models/Test');
const Question = require('../models/Question');
const Result   = require('../models/Result');
const User     = require('../models/User');
const { generateTestCode } = require('../utils/codeGenerator');

// ── GET /admin/dashboard ──────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [testCount, studentCount, resultCount, recentResults] = await Promise.all([
      Test.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'student' }),
      Result.countDocuments({}),
      Result.find({}).sort({ submittedAt: -1 }).limit(5)
            .populate('studentId', 'email name')
            .populate('testId', 'title domain')
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard — APARAITECH',
      stats: { testCount, studentCount, resultCount },
      recentResults
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    req.flash('error_msg', 'Failed to load dashboard.');
    res.redirect('/login');
  }
};

// ── GET /admin/tests ──────────────────────────────────
exports.getTests = async (req, res) => {
  try {
    const tests = await Test.find({}).sort({ createdAt: -1 });

    // Get question counts for each test
    const testsWithCounts = await Promise.all(tests.map(async (test) => {
      const qCount = await Question.countDocuments({ testId: test._id });
      const rCount = await Result.countDocuments({ testId: test._id });
      return { ...test.toObject(), questionCount: qCount, resultCount: rCount };
    }));

    res.render('admin/tests', {
      title: 'Manage Tests — APARAITECH Admin',
      tests: testsWithCounts
    });
  } catch (err) {
    console.error('Get tests error:', err.message);
    req.flash('error_msg', 'Failed to load tests.');
    res.redirect('/admin/dashboard');
  }
};

// ── GET /admin/tests/create ───────────────────────────
exports.getCreateTest = (req, res) => {
  res.render('admin/create-test', {
    title: 'Create Test — APARAITECH Admin'
  });
};

// ── POST /admin/tests/create ──────────────────────────
exports.postCreateTest = async (req, res) => {
  try {
    const { title, domain, duration, totalMarks, passingMarks, questionLimit, instructions } = req.body;

    // Validation
    if (!title || !domain || !duration || !totalMarks) {
      req.flash('error_msg', 'Please fill all required fields.');
      return res.redirect('/admin/tests/create');
    }

    // Generate unique test code (retry if collision)
    let code, exists;
    do {
      code   = generateTestCode();
      exists = await Test.findOne({ code });
    } while (exists);

    const test = await Test.create({
      title: title.trim(),
      domain,
      duration: parseInt(duration),
      totalMarks: parseInt(totalMarks),
      passingMarks: parseInt(passingMarks) || 0,
      questionLimit: parseInt(questionLimit) || 0,
      instructions: instructions?.trim() || '',
      code,
      createdBy: req.session.user._id
    });

    req.flash('success_msg', `Test created! Code: <strong>${code}</strong>. Now add questions.`);
    res.redirect(`/admin/tests/${test._id}/questions`);

  } catch (err) {
    console.error('Create test error:', err.message);
    req.flash('error_msg', 'Failed to create test. Please try again.');
    res.redirect('/admin/tests/create');
  }
};

// ── GET /admin/tests/:id/questions ───────────────────
exports.getAddQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      req.flash('error_msg', 'Test not found.');
      return res.redirect('/admin/tests');
    }

    const questions = await Question.find({ testId: test._id }).sort({ createdAt: 1 });

    res.render('admin/add-questions', {
      title: `Add Questions — ${test.title}`,
      test,
      questions
    });
  } catch (err) {
    console.error('Get questions error:', err.message);
    req.flash('error_msg', 'Failed to load questions page.');
    res.redirect('/admin/tests');
  }
};

// ── POST /admin/tests/:id/questions ──────────────────
exports.postAddQuestion = async (req, res) => {
  try {
    const { question, optA, optB, optC, optD, correctAnswer, marks, explanation } = req.body;

    if (!question || !optA || !optB || !optC || !optD || correctAnswer === undefined) {
      req.flash('error_msg', 'All question fields are required.');
      return res.redirect(`/admin/tests/${req.params.id}/questions`);
    }

    await Question.create({
      testId:        req.params.id,
      question:      question.trim(),
      options:       [optA.trim(), optB.trim(), optC.trim(), optD.trim()],
      correctAnswer: parseInt(correctAnswer), // 0-3 index
      marks:         parseInt(marks) || 1,
      explanation:   explanation?.trim() || ''
    });

    req.flash('success_msg', 'Question added successfully!');
    res.redirect(`/admin/tests/${req.params.id}/questions`);

  } catch (err) {
    console.error('Add question error:', err.message);
    req.flash('error_msg', 'Failed to add question.');
    res.redirect(`/admin/tests/${req.params.id}/questions`);
  }
};

// ── DELETE /admin/questions/:id ───────────────────────
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Question deleted.');
    res.redirect(`/admin/tests/${question.testId}/questions`);
  } catch (err) {
    req.flash('error_msg', 'Failed to delete question.');
    res.redirect('/admin/tests');
  }
};

// ── GET /admin/tests/:id/toggle ───────────────────────
exports.toggleTestStatus = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    test.isActive = !test.isActive;
    await test.save();
    req.flash('success_msg', `Test ${test.isActive ? 'activated' : 'deactivated'}.`);
    res.redirect('/admin/tests');
  } catch (err) {
    req.flash('error_msg', 'Failed to update test status.');
    res.redirect('/admin/tests');
  }
};

// ── GET /admin/results ────────────────────────────────
exports.getAllResults = async (req, res) => {
  try {
    const { testId, search } = req.query;
    const filter = {};
    if (testId) filter.testId = testId;
    if (search) filter.studentEmail = { $regex: search, $options: 'i' };

    const [results, tests] = await Promise.all([
      Result.find(filter).sort({ submittedAt: -1 })
            .populate('testId', 'title domain code'),
      Test.find({}, 'title _id')
    ]);

    res.render('admin/results', {
      title: 'All Results — APARAITECH Admin',
      results,
      tests,
      selectedTest: testId || '',
      search: search || ''
    });
  } catch (err) {
    console.error('Get results error:', err.message);
    req.flash('error_msg', 'Failed to load results.');
    res.redirect('/admin/dashboard');
  }
};

// ── GET /admin/results/:id ────────────────────────────
exports.getResultDetail = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) {
      req.flash('error_msg', 'Result not found.');
      return res.redirect('/admin/results');
    }

    res.render('admin/result-detail', {
      title: `Result Detail — ${result.studentEmail}`,
      result
    });
  } catch (err) {
    console.error('Result detail error:', err.message);
    req.flash('error_msg', 'Failed to load result details.');
    res.redirect('/admin/results');
  }
};

// ── DELETE /admin/tests/:id ───────────────────────────
exports.deleteTest = async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    await Question.deleteMany({ testId: req.params.id });
    await Result.deleteMany({ testId: req.params.id });
    req.flash('success_msg', 'Test and all related data deleted.');
    res.redirect('/admin/tests');
  } catch (err) {
    req.flash('error_msg', 'Failed to delete test.');
    res.redirect('/admin/tests');
  }
};

// ── GET /admin/users ──────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { role: 'student' };
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { collegeName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    // Get result count per user
    const usersWithStats = await Promise.all(users.map(async (u) => {
      const attempts = await Result.countDocuments({ studentEmail: u.email });
      return { ...u.toObject(), attempts };
    }));

    res.render('admin/users', {
      title: 'Manage Users — APARAITECH Admin',
      users: usersWithStats,
      search: search || ''
    });
  } catch (err) {
    console.error('Get users error:', err.message);
    req.flash('error_msg', 'Failed to load users.');
    res.redirect('/admin/dashboard');
  }
};

// ── POST /admin/users/:id/delete ──────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') {
      req.flash('error_msg', 'User not found or cannot delete admin.');
      return res.redirect('/admin/users');
    }
    await User.findByIdAndDelete(req.params.id);
    await Result.deleteMany({ studentEmail: user.email });
    req.flash('success_msg', `User ${user.email} and their results deleted.`);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Delete user error:', err.message);
    req.flash('error_msg', 'Failed to delete user.');
    res.redirect('/admin/users');
  }
};
