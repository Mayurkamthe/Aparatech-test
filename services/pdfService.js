/**
 * PDF Service
 * ===========
 * Generates professional black & white PDF result reports using PDFKit.
 */

const PDFDocument = require('pdfkit');

const COMPANY = {
  name:    process.env.COMPANY_NAME    || 'APARAITECH',
  email:   process.env.COMPANY_EMAIL   || 'info@aparaitechsoftware.org',
  reg:     process.env.COMPANY_REG     || '2431000320445474',
  address: process.env.COMPANY_ADDRESS || 'Baramati, Maharashtra 413102'
};

const C = {
  black:     '#000000',
  darkGray:  '#1a1a1a',
  midGray:   '#555555',
  lightGray: '#aaaaaa',
  rule:      '#cccccc',
  rowAlt:    '#f5f5f5',
  white:     '#ffffff',
  pageBg:    '#ffffff'
};

const MARGIN  = 56;
const PAGE_W  = 595.28; // A4 points
const CONTENT = PAGE_W - MARGIN * 2;

// ─────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────

function drawPageHeader(doc, pageLabel) {
  // Top rule
  doc.rect(MARGIN, MARGIN, CONTENT, 1).fill(C.black);

  // Company name (left) + report label (right) on same baseline
  const y = MARGIN + 10;
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(13)
     .text(COMPANY.name, MARGIN, y, { continued: false });

  doc.fillColor(C.midGray).font('Helvetica').fontSize(9)
     .text(pageLabel, MARGIN, y + 1, { align: 'right', width: CONTENT });

  doc.y = y + 22;
  doc.rect(MARGIN, doc.y, CONTENT, 0.5).fill(C.rule);
  doc.y += 12;
}

function drawPageFooter(doc) {
  const footerY = doc.page.height - MARGIN;
  doc.rect(MARGIN, footerY - 10, CONTENT, 0.5).fill(C.rule);

  doc.fillColor(C.lightGray).font('Helvetica').fontSize(8)
     .text(
       `${COMPANY.name}  ·  Reg. No. ${COMPANY.reg}  ·  ${COMPANY.address}  ·  ${COMPANY.email}`,
       MARGIN, footerY - 2, { align: 'center', width: CONTENT }
     );
}

function sectionTitle(doc, title) {
  doc.y += 14;
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(9)
     .text(title.toUpperCase(), MARGIN, doc.y);
  doc.y += 4;
  doc.rect(MARGIN, doc.y, CONTENT, 1).fill(C.black);
  doc.y += 10;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} min ${s} sec`;
}

function checkNewPage(doc, neededHeight) {
  if (doc.y + neededHeight > doc.page.height - MARGIN - 30) {
    doc.addPage();
    drawPageHeader(doc, 'Answer Detail Report (continued)');
  }
}

// ─────────────────────────────────────────────────────────
// generateResultPDF  — streams directly to Express response
// ─────────────────────────────────────────────────────────

async function generateResultPDF(result, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: {
      Title:   `Result Report — ${result.testTitle}`,
      Author:  COMPANY.name,
      Subject: `Assessment Result for ${result.studentName || result.studentEmail}`,
      Creator: `${COMPANY.name} Test Portal`
    }
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Result_${result.studentEmail}_${Date.now()}.pdf"`
  );
  doc.pipe(res);

  buildDocument(doc, result);

  doc.end();
}

// ─────────────────────────────────────────────────────────
// generateResultPDFBuffer  — returns a Buffer (email attach)
// ─────────────────────────────────────────────────────────

async function generateResultPDFBuffer(result) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: {
        Title:   `Result Report — ${result.testTitle}`,
        Author:  COMPANY.name,
        Subject: `Assessment Result for ${result.studentName || result.studentEmail}`,
        Creator: `${COMPANY.name} Test Portal`
      }
    });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    buildDocument(doc, result);
    doc.end();
  });
}

// ─────────────────────────────────────────────────────────
// buildDocument  — all rendering logic in one place
// ─────────────────────────────────────────────────────────

function buildDocument(doc, result) {

  // ── PAGE 1 ──────────────────────────────────────────

  drawPageHeader(doc, 'Assessment Result Report');

  // ── Document title block ────────────────────────────
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(20)
     .text('RESULT REPORT', MARGIN, doc.y, { align: 'center', width: CONTENT });
  doc.y += 4;

  doc.fillColor(C.midGray).font('Helvetica').fontSize(10)
     .text(result.testTitle, MARGIN, doc.y, { align: 'center', width: CONTENT });
  doc.y += 16;

  doc.rect(MARGIN, doc.y, CONTENT, 0.5).fill(C.rule);
  doc.y += 18;

  // ── Candidate & Assessment details (two columns) ────
  sectionTitle(doc, 'Candidate & Assessment Details');

  const leftCol  = MARGIN;
  const rightCol = MARGIN + CONTENT / 2 + 10;
  const colW     = CONTENT / 2 - 10;

  const leftDetails = [
    ['Candidate Name', result.studentName  || 'N/A'],
    ['Email Address',  result.studentEmail || 'N/A'],
    ['College',        result.collegeName  || 'N/A'],
  ];
  const rightDetails = [
    ['Test Domain',    result.testDomain   || 'N/A'],
    ['Date Submitted', new Date(result.submittedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })],
    ['Time Taken',     formatTime(result.timeTaken || 0)],
  ];

  const detailRowH = 20;
  const startY = doc.y;

  leftDetails.forEach(([label, value], i) => {
    const ry = startY + i * detailRowH;
    if (i % 2 === 0) doc.rect(leftCol, ry, colW, detailRowH).fill(C.rowAlt);
    doc.fillColor(C.midGray).font('Helvetica-Bold').fontSize(8.5)
       .text(label, leftCol + 6, ry + 6, { width: 90 });
    doc.fillColor(C.darkGray).font('Helvetica').fontSize(8.5)
       .text(value, leftCol + 100, ry + 6, { width: colW - 104 });
  });

  rightDetails.forEach(([label, value], i) => {
    const ry = startY + i * detailRowH;
    if (i % 2 === 0) doc.rect(rightCol, ry, colW, detailRowH).fill(C.rowAlt);
    doc.fillColor(C.midGray).font('Helvetica-Bold').fontSize(8.5)
       .text(label, rightCol + 6, ry + 6, { width: 90 });
    doc.fillColor(C.darkGray).font('Helvetica').fontSize(8.5)
       .text(value, rightCol + 100, ry + 6, { width: colW - 104 });
  });

  doc.y = startY + Math.max(leftDetails.length, rightDetails.length) * detailRowH + 6;
  doc.rect(MARGIN, doc.y, CONTENT, 0.5).fill(C.rule);

  // ── Score summary ───────────────────────────────────
  sectionTitle(doc, 'Score Summary');

  // Large score display
  const scoreBoxY = doc.y;
  const scoreBoxH = 80;

  doc.rect(MARGIN, scoreBoxY, CONTENT, scoreBoxH).stroke(C.black).lineWidth(1);

  // Score fraction (left third)
  const col3 = CONTENT / 3;
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(34)
     .text(`${result.score} / ${result.totalMarks}`, MARGIN, scoreBoxY + 18,
           { width: col3, align: 'center' });
  doc.fillColor(C.midGray).font('Helvetica').fontSize(8)
     .text('SCORE', MARGIN, scoreBoxY + 58, { width: col3, align: 'center' });

  // Percentage (centre third)
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(34)
     .text(`${result.percentage.toFixed(1)}%`, MARGIN + col3, scoreBoxY + 18,
           { width: col3, align: 'center' });
  doc.fillColor(C.midGray).font('Helvetica').fontSize(8)
     .text('PERCENTAGE', MARGIN + col3, scoreBoxY + 58, { width: col3, align: 'center' });

  // Pass / Fail (right third) — inverted block for status
  const statusLabel = result.isPassed ? 'PASS' : 'FAIL';
  const statusX = MARGIN + col3 * 2 + 8;
  const statusW = col3 - 16;
  doc.rect(statusX, scoreBoxY + 14, statusW, 46).fill(C.black);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(22)
     .text(statusLabel, statusX, scoreBoxY + 26, { width: statusW, align: 'center' });

  doc.y = scoreBoxY + scoreBoxH + 18;

  // ── Performance breakdown ───────────────────────────
  sectionTitle(doc, 'Performance Breakdown');

  const cols = [
    { label: 'Correct Answers',   value: result.correctCount,   note: `+${result.score} marks` },
    { label: 'Incorrect Answers', value: result.incorrectCount, note: '0 marks' },
    { label: 'Unattempted',       value: result.unattempted,    note: '—' },
    { label: 'Total Questions',   value: result.correctCount + result.incorrectCount + result.unattempted, note: `${result.totalMarks} marks total` },
  ];

  const brkW   = (CONTENT - 12) / 4;
  const brkY   = doc.y;
  const brkH   = 52;

  cols.forEach((col, i) => {
    const bx = MARGIN + i * (brkW + 4);
    doc.rect(bx, brkY, brkW, brkH).stroke(C.rule).lineWidth(0.5);
    doc.fillColor(C.black).font('Helvetica-Bold').fontSize(24)
       .text(String(col.value), bx, brkY + 8, { width: brkW, align: 'center' });
    doc.fillColor(C.midGray).font('Helvetica').fontSize(7.5)
       .text(col.label.toUpperCase(), bx, brkY + 36, { width: brkW, align: 'center' });
  });

  doc.y = brkY + brkH + 16;

  // Horizontal score bar
  const barY   = doc.y;
  const barH   = 12;
  const totalQ = result.correctCount + result.incorrectCount + result.unattempted || 1;

  // Background track
  doc.rect(MARGIN, barY, CONTENT, barH).fill(C.rowAlt).stroke(C.rule).lineWidth(0.5);

  // Correct segment (solid black)
  const correctW = (result.correctCount / totalQ) * CONTENT;
  if (correctW > 0) doc.rect(MARGIN, barY, correctW, barH).fill(C.darkGray);

  // Incorrect segment (hatched via mid-gray)
  const incorrectW = (result.incorrectCount / totalQ) * CONTENT;
  if (incorrectW > 0) doc.rect(MARGIN + correctW, barY, incorrectW, barH).fill(C.midGray);

  // Legend
  doc.y = barY + barH + 6;
  [
    [C.darkGray, 'Correct'],
    [C.midGray,  'Incorrect'],
    [C.rowAlt,   'Unattempted'],
  ].forEach(([color, label], i) => {
    const lx = MARGIN + i * 120;
    doc.rect(lx, doc.y, 10, 8).fill(color).stroke(C.rule).lineWidth(0.5);
    doc.fillColor(C.midGray).font('Helvetica').fontSize(8)
       .text(label, lx + 14, doc.y, { width: 100 });
  });

  doc.y += 20;

  drawPageFooter(doc);

  // ── PAGE 2: ANSWER DETAIL ───────────────────────────

  if (!result.answers || result.answers.length === 0) return;

  doc.addPage();
  drawPageHeader(doc, 'Answer Detail Report');

  result.answers.forEach((ans, idx) => {

    // Estimate height needed: header + 4 options + result line + explanation
    const optCount  = ans.options ? ans.options.length : 4;
    const needH     = 22 + optCount * 17 + 16 + (ans.explanation ? 14 : 0) + 10;
    checkNewPage(doc, needH);

    // Question header row
    const qY = doc.y;
    doc.rect(MARGIN, qY, CONTENT, 20).fill(idx % 2 === 0 ? C.darkGray : C.black);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8.5)
       .text(`Q${idx + 1}`, MARGIN + 6, qY + 6, { width: 24 });
    doc.font('Helvetica').fontSize(8.5)
       .text(ans.questionText, MARGIN + 32, qY + 6, { width: CONTENT - 80 });

    // Status tag (right-aligned in header)
    const tagLabel = ans.isCorrect ? 'CORRECT' : (ans.selectedOption === -1 ? 'SKIPPED' : 'INCORRECT');
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
       .text(tagLabel, MARGIN + CONTENT - 58, qY + 7, { width: 54, align: 'right' });

    doc.y = qY + 22;

    // Options
    if (ans.options && ans.options.length) {
      ans.options.forEach((opt, oIdx) => {
        const isSelected = oIdx === ans.selectedOption;
        const isCorrect  = oIdx === ans.correctOption;
        const oY = doc.y;

        let rowBg = C.white;
        if (isCorrect)              rowBg = C.rowAlt;
        if (isSelected && !isCorrect) rowBg = '#e8e8e8';

        doc.rect(MARGIN, oY, CONTENT, 16).fill(rowBg);
        doc.rect(MARGIN, oY, CONTENT, 16).stroke(C.rule).lineWidth(0.3);

        // Option letter
        doc.fillColor(C.midGray).font('Helvetica-Bold').fontSize(8)
           .text('ABCD'[oIdx], MARGIN + 8, oY + 4, { width: 14 });

        // Option text
        const optColor = (isCorrect || (isSelected && !isCorrect)) ? C.black : C.darkGray;
        const optFont  = (isCorrect || isSelected) ? 'Helvetica-Bold' : 'Helvetica';
        doc.fillColor(optColor).font(optFont).fontSize(8)
           .text(opt, MARGIN + 26, oY + 4, { width: CONTENT - 60 });

        // Marker on the right
        if (isCorrect) {
          doc.fillColor(C.black).font('Helvetica-Bold').fontSize(8)
             .text('Correct', MARGIN + CONTENT - 44, oY + 4, { width: 40, align: 'right' });
        } else if (isSelected && !isCorrect) {
          doc.fillColor(C.midGray).font('Helvetica').fontSize(8)
             .text('Your answer', MARGIN + CONTENT - 56, oY + 4, { width: 52, align: 'right' });
        }

        doc.y = oY + 17;
      });
    }

    // Result line
    const marks = ans.isCorrect
      ? `Marks awarded: ${ans.marksAwarded}`
      : ans.selectedOption === -1
        ? 'Not attempted'
        : 'Marks awarded: 0';

    doc.fillColor(C.midGray).font('Helvetica').fontSize(8)
       .text(marks, MARGIN + 6, doc.y + 2);
    doc.y += 14;

    // Explanation
    if (ans.explanation) {
      doc.fillColor(C.midGray).font('Helvetica-Oblique').fontSize(8)
         .text(`Explanation: ${ans.explanation}`, MARGIN + 6, doc.y, { width: CONTENT - 12 });
      doc.y += doc.heightOfString(ans.explanation, { width: CONTENT - 12, fontSize: 8 }) + 6;
    }

    doc.y += 8;
  });

  drawPageFooter(doc);
}

// ─────────────────────────────────────────────────────────
// Payment Receipt PDF
// ─────────────────────────────────────────────────────────

function generateReceiptPDF(res, { enrollment, workshop, student }) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="receipt-${enrollment.paymentId || enrollment._id}.pdf"`);
  doc.pipe(res);

  _buildReceipt(doc, { enrollment, workshop, student });

  doc.end();
}

async function generateReceiptPDFBuffer({ enrollment, workshop, student }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    _buildReceipt(doc, { enrollment, workshop, student });
    doc.end();
  });
}

function _buildReceipt(doc, { enrollment, workshop, student }) {
  const BRAND   = '#1a237e';   // deep indigo
  const BRAND2  = '#283593';   // indigo mid
  const GOLD    = '#f9a825';   // amber gold
  const GREEN   = '#2e7d32';   // success green
  const TEAL    = '#00695c';   // teal accent
  const LGRAY   = '#f3f4f8';   // light bg
  const MGRAY   = '#546e7a';   // mid gray text
  const WHITE   = '#ffffff';
  const BLACK   = '#1a1a2e';

  const W = doc.page.width;
  const H = doc.page.height;

  // ── HEADER BANNER ──────────────────────────────────────────
  // Deep indigo top band
  doc.rect(0, 0, W, 110).fill(BRAND);

  // Gold accent stripe
  doc.rect(0, 107, W, 5).fill(GOLD);

  // Company name
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(22)
     .text(COMPANY.name, MARGIN, 28);

  // Tagline
  doc.fillColor('#9fa8da').font('Helvetica').fontSize(10)
     .text('Official Workshop Enrollment Receipt', MARGIN, 56);

  // RECEIPT label top-right
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(28)
     .text('RECEIPT', 0, 30, { align: 'right', width: W - MARGIN });

  // Receipt number + date top-right
  const receiptNo = `RCP-${(enrollment.paymentId || enrollment._id.toString().slice(-8)).toUpperCase()}`;
  const paidDate  = new Date(enrollment.enrolledAt || Date.now())
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  doc.fillColor('#c5cae9').font('Helvetica').fontSize(9)
     .text(`No: ${receiptNo}`, 0, 64, { align: 'right', width: W - MARGIN });
  doc.fillColor('#c5cae9').font('Helvetica').fontSize(9)
     .text(`Date: ${paidDate}`, 0, 78, { align: 'right', width: W - MARGIN });

  // ── BILLED TO + WORKSHOP INFO (two columns) ────────────────
  const colL  = MARGIN;
  const colR  = MARGIN + CONTENT / 2 + 10;
  const colW2 = CONTENT / 2 - 10;
  let   rowY  = 130;

  // Left column header
  doc.rect(colL, rowY, colW2, 22).fill(BRAND2);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9)
     .text('BILLED TO', colL + 10, rowY + 7);
  rowY += 22;

  // Left column body
  doc.rect(colL, rowY, colW2, 80).fill(LGRAY);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11)
     .text(student.name || 'Student', colL + 10, rowY + 10, { width: colW2 - 20 });
  doc.fillColor(MGRAY).font('Helvetica').fontSize(9)
     .text(student.email, colL + 10, rowY + 28, { width: colW2 - 20 });
  if (student.collegeName) {
    doc.fillColor(MGRAY).font('Helvetica').fontSize(9)
       .text(student.collegeName, colL + 10, rowY + 44, { width: colW2 - 20 });
  }
  if (student.mobile) {
    doc.fillColor(MGRAY).font('Helvetica').fontSize(9)
       .text(`Mobile: ${student.mobile}`, colL + 10, rowY + 60, { width: colW2 - 20 });
  }
  rowY += 80;

  // Right column header
  const rY0 = 130;
  doc.rect(colR, rY0, colW2, 22).fill(TEAL);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9)
     .text('WORKSHOP DETAILS', colR + 10, rY0 + 7);

  // Right column body
  doc.rect(colR, rY0 + 22, colW2, 80).fill(LGRAY);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10)
     .text(workshop.title, colR + 10, rY0 + 32, { width: colW2 - 20 });

  const wStart = new Date(workshop.startDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  const wEnd   = new Date(workshop.endDate).toLocaleDateString('en-IN',   { day:'2-digit', month:'short', year:'numeric' });

  doc.fillColor(MGRAY).font('Helvetica').fontSize(9)
     .text(`${wStart}  —  ${wEnd}`, colR + 10, rY0 + 52, { width: colW2 - 20 });
  doc.fillColor(MGRAY).font('Helvetica').fontSize(9)
     .text(`Venue: ${workshop.venue || 'Online / TBD'}`, colR + 10, rY0 + 66, { width: colW2 - 20 });
  doc.fillColor(MGRAY).font('Helvetica').fontSize(9)
     .text(`Instructor: ${workshop.instructor || COMPANY.name}`, colR + 10, rY0 + 80, { width: colW2 - 20 });

  // ── PAYMENT TABLE ──────────────────────────────────────────
  rowY = Math.max(rowY, rY0 + 102) + 20;

  // Section label
  doc.rect(MARGIN, rowY, CONTENT, 2).fill(GOLD);
  rowY += 8;
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(10)
     .text('PAYMENT SUMMARY', MARGIN, rowY);
  rowY += 20;

  // Table header
  const c1 = MARGIN, c2 = MARGIN + 300, c3 = MARGIN + 400;
  doc.rect(MARGIN, rowY, CONTENT, 24).fill(BRAND);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9)
     .text('Description',  c1 + 10, rowY + 8)
     .text('Qty',          c2,      rowY + 8, { width: 80, align: 'center' })
     .text('Amount',       c3,      rowY + 8, { width: CONTENT - (c3 - MARGIN) - 10, align: 'right' });
  rowY += 24;

  // Item row
  doc.rect(MARGIN, rowY, CONTENT, 26).fill(LGRAY);
  const amtText = enrollment.fee > 0 ? `Rs. ${enrollment.fee.toLocaleString('en-IN')}` : 'FREE';
  doc.fillColor(BLACK).font('Helvetica').fontSize(10)
     .text(`${workshop.title} — Enrollment`, c1 + 10, rowY + 8, { width: c2 - c1 - 20 });
  doc.fillColor(BLACK).font('Helvetica').fontSize(10)
     .text('1', c2, rowY + 8, { width: 80, align: 'center' });
  doc.fillColor(BLACK).font('Helvetica').fontSize(10)
     .text(amtText, c3, rowY + 8, { width: CONTENT - (c3 - MARGIN) - 10, align: 'right' });
  rowY += 26;

  // Divider
  doc.rect(MARGIN, rowY, CONTENT, 1).fill('#ddd'); rowY += 1;

  // Total row — gold background
  doc.rect(MARGIN, rowY, CONTENT, 32).fill(GOLD);
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(12)
     .text('TOTAL PAID', c1 + 10, rowY + 10);
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(14)
     .text(amtText, c3, rowY + 9, { width: CONTENT - (c3 - MARGIN) - 10, align: 'right' });
  rowY += 32;

  // ── PAYMENT META ───────────────────────────────────────────
  rowY += 16;
  if (enrollment.paymentId) {
    doc.fillColor(MGRAY).font('Helvetica').fontSize(9)
       .text(`Payment Method: Razorpay Online Payment     Transaction ID: ${enrollment.paymentId}`,
             MARGIN, rowY, { width: CONTENT });
  } else {
    doc.fillColor(MGRAY).font('Helvetica').fontSize(9)
       .text('Enrollment Type: Free — No payment required', MARGIN, rowY);
  }
  rowY += 20;

  // ── STATUS STAMP ───────────────────────────────────────────
  const isPaid   = enrollment.paymentStatus === 'paid' || enrollment.paymentStatus === 'free';
  const stampClr = isPaid ? GREEN : '#e65100';
  const stampTxt = isPaid ? 'PAID' : 'PENDING';

  // Stamp circle
  const stampX = MARGIN + CONTENT - 90;
  const stampY = rowY - 60;
  doc.circle(stampX, stampY, 38).lineWidth(3).stroke(stampClr);
  doc.circle(stampX, stampY, 34).lineWidth(1).stroke(stampClr).opacity(0.3);
  doc.opacity(1);
  doc.fillColor(stampClr).font('Helvetica-Bold').fontSize(14)
     .text(stampTxt, stampX - 30, stampY - 8, { width: 60, align: 'center' });
  rowY += 10;

  // ── BOTTOM FOOTER BAND ─────────────────────────────────────
  const footY = H - 56;
  doc.rect(0, footY, W, 56).fill(BRAND);
  doc.rect(0, footY, W, 3).fill(GOLD);

  doc.fillColor('#9fa8da').font('Helvetica').fontSize(8)
     .text(
       `${COMPANY.name}  ·  Reg. No. ${COMPANY.reg}  ·  ${COMPANY.address}  ·  ${COMPANY.email}`,
       MARGIN, footY + 14, { align: 'center', width: CONTENT }
     );
  doc.fillColor('#c5cae9').font('Helvetica-Oblique').fontSize(7.5)
     .text(
       'This is a computer-generated receipt and does not require a physical signature.',
       MARGIN, footY + 32, { align: 'center', width: CONTENT }
     );
}

module.exports = { generateResultPDF, generateResultPDFBuffer, generateReceiptPDF, generateReceiptPDFBuffer };
