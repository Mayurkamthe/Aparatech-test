/**
 * PDF Service
 * ===========
 * Generates professional PDF result reports using PDFKit.
 * Includes APARAITECH branding header, result summary, and answer details.
 */

const PDFDocument = require('pdfkit');

const COMPANY = {
  name:    process.env.COMPANY_NAME    || 'APARAITECH',
  email:   process.env.COMPANY_EMAIL   || 'info@aparaitechsoftware.org',
  reg:     process.env.COMPANY_REG     || '2431000320445474',
  address: process.env.COMPANY_ADDRESS || 'Baramati, Maharashtra 413102'
};

// Brand colors
const COLORS = {
  primary:   '#0d47a1',
  accent:    '#1565c0',
  lightBlue: '#e3f2fd',
  success:   '#2e7d32',
  danger:    '#c62828',
  warning:   '#f57f17',
  gray:      '#757575',
  lightGray: '#f5f5f5',
  border:    '#e0e0e0',
  text:      '#212121'
};

/**
 * Generate a PDF result report and pipe it to the response
 * @param {Object} result - Full result document (from MongoDB, populated)
 * @param {Object} res - Express response object (to stream PDF directly)
 */
async function generateResultPDF(result, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Test Report - ${result.testTitle}`,
      Author: COMPANY.name,
      Subject: `Result Report for ${result.studentName}`,
      Creator: `${COMPANY.name} Test Portal`
    }
  });

  // Pipe PDF to response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Result_${result.studentEmail}_${Date.now()}.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width - 100; // accounting for margins

  // ── PAGE 1: HEADER + SUMMARY ───────────────────────────────────────────────

  // Company Header Banner
  doc.rect(50, 50, pageWidth, 80).fill(COLORS.primary);

  // Company Name
  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(26)
     .text(COMPANY.name, 70, 68);

  doc.fillColor('#90caf9')
     .font('Helvetica')
     .fontSize(11)
     .text('Online Test Portal — Result Report', 70, 102);

  // Reset position after header
  doc.y = 150;

  // Report Title
  doc.fillColor(COLORS.primary)
     .font('Helvetica-Bold')
     .fontSize(18)
     .text('TEST RESULT REPORT', 50, doc.y, { align: 'center', width: pageWidth });

  doc.y += 8;
  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(COLORS.primary).lineWidth(2).stroke();
  doc.y += 16;

  // ── Student & Test Details Table ──────────────────────────────────────────
  const details = [
    ['Student Name', result.studentName || 'N/A'],
    ['Email',        result.studentEmail],
    ['Test Title',   result.testTitle],
    ['Domain',       result.testDomain],
    ['Submitted',    new Date(result.submittedAt).toLocaleString('en-IN')],
    ['Time Taken',   formatTime(result.timeTaken || 0)]
  ];

  const colW = pageWidth / 2 - 10;
  let row = 0;
  details.forEach(([label, value]) => {
    const x = 50;
    const y = doc.y;
    const rowH = 26;
    const bg = row % 2 === 0 ? '#f8f9fa' : '#ffffff';

    doc.rect(x, y, pageWidth, rowH).fill(bg);
    doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(10).text(label + ':', x + 8, y + 8, { width: 120 });
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(10).text(String(value), x + 135, y + 8, { width: pageWidth - 140 });

    doc.y += rowH;
    row++;
  });

  doc.y += 20;

  // ── Score Summary Box ─────────────────────────────────────────────────────
  const isPassed = result.isPassed;
  const boxColor = isPassed ? '#e8f5e9' : '#ffebee';
  const scoreColor = isPassed ? COLORS.success : COLORS.danger;
  const boxY = doc.y;

  doc.rect(50, boxY, pageWidth, 90).fill(boxColor).stroke(scoreColor);
  doc.strokeColor(scoreColor).lineWidth(2).rect(50, boxY, pageWidth, 90).stroke();

  // Score
  doc.fillColor(scoreColor)
     .font('Helvetica-Bold')
     .fontSize(40)
     .text(`${result.score} / ${result.totalMarks}`, 50, boxY + 10, { align: 'center', width: pageWidth });

  doc.fontSize(14)
     .text(`${result.percentage.toFixed(1)}%  —  ${isPassed ? 'PASSED ✓' : 'FAILED ✗'}`, 50, boxY + 58, { align: 'center', width: pageWidth });

  doc.y = boxY + 105;

  // ── Stats Row ─────────────────────────────────────────────────────────────
  const statBoxW = (pageWidth - 20) / 3;
  const statsY = doc.y;

  const stats = [
    { label: 'Correct', value: result.correctCount,   color: COLORS.success, bg: '#e8f5e9' },
    { label: 'Incorrect', value: result.incorrectCount, color: COLORS.danger, bg: '#ffebee' },
    { label: 'Skipped', value: result.unattempted,    color: COLORS.warning, bg: '#fff8e1' }
  ];

  stats.forEach((s, i) => {
    const sx = 50 + i * (statBoxW + 10);
    doc.rect(sx, statsY, statBoxW, 55).fill(s.bg);
    doc.fillColor(s.color).font('Helvetica-Bold').fontSize(28)
       .text(String(s.value), sx, statsY + 6, { width: statBoxW, align: 'center' });
    doc.fontSize(10).font('Helvetica')
       .text(s.label, sx, statsY + 38, { width: statBoxW, align: 'center' });
  });

  doc.y = statsY + 70;

  // ── PAGE 2+: DETAILED ANSWERS ─────────────────────────────────────────────
  if (result.answers && result.answers.length > 0) {
    doc.addPage();

    // Mini header on page 2
    doc.rect(50, 50, pageWidth, 40).fill(COLORS.primary);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(14)
       .text(`${COMPANY.name}  |  Detailed Answer Report`, 70, 63);
    doc.y = 110;

    result.answers.forEach((ans, idx) => {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage();
        doc.rect(50, 50, pageWidth, 40).fill(COLORS.primary);
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(14)
           .text(`${COMPANY.name}  |  Detailed Answer Report (cont.)`, 70, 63);
        doc.y = 110;
      }

      const qColor = ans.isCorrect ? COLORS.success : (ans.selectedOption === -1 ? COLORS.warning : COLORS.danger);
      const qBg    = ans.isCorrect ? '#e8f5e9' : (ans.selectedOption === -1 ? '#fff8e1' : '#ffebee');

      // Question block
      doc.rect(50, doc.y, pageWidth, 22).fill(COLORS.primary);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10)
         .text(`Q${idx + 1}.  ${ans.questionText}`, 58, doc.y + 6, { width: pageWidth - 20 });
      doc.y += 28;

      // Options
      const optionLabels = ['A', 'B', 'C', 'D'];
      if (ans.options && ans.options.length) {
        ans.options.forEach((opt, oIdx) => {
          const isSelected = oIdx === ans.selectedOption;
          const isCorrect  = oIdx === ans.correctOption;
          let optBg = '#ffffff';
          let optColor = COLORS.text;
          let marker = '  ';

          if (isCorrect)  { optBg = '#e8f5e9'; optColor = COLORS.success; marker = '✓ '; }
          if (isSelected && !isCorrect) { optBg = '#ffebee'; optColor = COLORS.danger; marker = '✗ '; }

          doc.rect(58, doc.y, pageWidth - 16, 18).fill(optBg);
          doc.fillColor(optColor).font(isSelected || isCorrect ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
             .text(`${marker}${optionLabels[oIdx]}) ${opt}`, 66, doc.y + 5, { width: pageWidth - 30 });
          doc.y += 19;
        });
      }

      // Result indicator
      const resultLabel = ans.isCorrect
        ? `✓ Correct  (+${ans.marksAwarded} mark)`
        : (ans.selectedOption === -1 ? '⬜ Not Attempted' : `✗ Incorrect  (0 marks)`);

      doc.fillColor(qColor).font('Helvetica-Bold').fontSize(9)
         .text(resultLabel, 58, doc.y + 2);
      doc.y += 16;

      // Explanation if available
      if (ans.explanation) {
        doc.fillColor(COLORS.gray).font('Helvetica-Oblique').fontSize(8)
           .text(`💡 ${ans.explanation}`, 58, doc.y, { width: pageWidth - 20 });
        doc.y += 14;
      }

      doc.y += 6; // spacing between questions
    });
  }

  // ── FINAL FOOTER on last page ─────────────────────────────────────────────
  doc.y += 10;
  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.y += 8;

  doc.fillColor(COLORS.gray).font('Helvetica').fontSize(9)
     .text(`${COMPANY.name}  |  Reg No: ${COMPANY.reg}`, 50, doc.y, { align: 'center', width: pageWidth });
  doc.y += 12;
  doc.text(`${COMPANY.address}  |  ${COMPANY.email}`, 50, doc.y, { align: 'center', width: pageWidth });

  // Finalize the PDF
  doc.end();
}

// Helper: format seconds to MM:SS
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

module.exports = { generateResultPDF };
