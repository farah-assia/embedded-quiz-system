/**
 * κουίζυ (Quizy) — LMS & Emergency Exam Export Service
 * 
 * Generates standards-compliant exports for:
 * 1. Moodle XML Question Bank
 * 2. GIFT Format (Moodle, Canvas, Blackboard)
 * 3. A4 Printable Emergency Examination & Answer Key
 */

/**
 * Escape XML special characters
 */
function escapeXml(unsafe = '') {
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Escape GIFT special characters: ~ = # { } :
 */
function escapeGift(text = '') {
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/~/g, '\\~')
        .replace(/=/g, '\\=')
        .replace(/#/g, '\\#')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/:/g, '\\:');
}

/**
 * Generate Moodle XML format
 * 
 * @param {Object} quiz - Quiz object with title, module, and questions array
 * @returns {string} XML formatted string
 */
export function exportToMoodleXml(quiz = {}) {
    const title = quiz.title || 'Untitled Quiz';
    const moduleName = quiz.module || quiz.moduleName || 'General';
    const questions = quiz.questions || [];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n`;

    // Category Question
    xml += `  <question type="category">\n`;
    xml += `    <category>\n`;
    xml += `      <text>$course$/κουίζυ/${escapeXml(moduleName)}/${escapeXml(title)}</text>\n`;
    xml += `    </category>\n`;
    xml += `  </question>\n\n`;

    questions.forEach((q, idx) => {
        const qNum = idx + 1;
        const qText = q.question || q.question_text || `Question ${qNum}`;
        const qType = q.type === 'short_answer' || q.type === 'shortAnswer' ? 'shortanswer' : 'multichoice';

        if (qType === 'shortanswer') {
            const refAnswer = q.referenceAnswer || q.reference_answer || (q.options && q.options[0] ? q.options[0].text : 'Correct');
            xml += `  <question type="shortanswer">\n`;
            xml += `    <name><text>${escapeXml(`Q${qNum}: ${title}`)}</text></name>\n`;
            xml += `    <questiontext format="html">\n`;
            xml += `      <text><![CDATA[<p>${qText}</p>]]></text>\n`;
            xml += `    </questiontext>\n`;
            xml += `    <generalfeedback format="html"><text></text></generalfeedback>\n`;
            xml += `    <defaultgrade>${q.points || 1.0}</defaultgrade>\n`;
            xml += `    <penalty>0.1000000</penalty>\n`;
            xml += `    <usecase>0</usecase>\n`;
            xml += `    <answer fraction="100" format="moodle_auto_format">\n`;
            xml += `      <text>${escapeXml(refAnswer)}</text>\n`;
            xml += `      <feedback format="html"><text><![CDATA[<p>Correct conceptual answer.</p>]]></text></feedback>\n`;
            xml += `    </answer>\n`;
            xml += `  </question>\n\n`;
        } else {
            // Multichoice
            xml += `  <question type="multichoice">\n`;
            xml += `    <name><text>${escapeXml(`Q${qNum}: ${title}`)}</text></name>\n`;
            xml += `    <questiontext format="html">\n`;
            xml += `      <text><![CDATA[<p>${qText}</p>]]></text>\n`;
            xml += `    </questiontext>\n`;
            xml += `    <generalfeedback format="html"><text></text></generalfeedback>\n`;
            xml += `    <defaultgrade>${q.points || 1.0}</defaultgrade>\n`;
            xml += `    <penalty>0.3333333</penalty>\n`;
            xml += `    <single>true</single>\n`;
            xml += `    <shuffleanswers>true</shuffleanswers>\n`;
            xml += `    <answernumbering>abc</answernumbering>\n`;

            const options = q.options || [];
            options.forEach((opt, optIdx) => {
                const optText = typeof opt === 'string' ? opt : (opt.text || opt.answer_text || `Option ${optIdx + 1}`);
                const isCorrect = typeof opt === 'object' ? (opt.correct === true || opt.is_correct === 1 || opt.is_correct === true) : (optIdx === q.correct);
                const fraction = isCorrect ? '100' : '0';
                const feedbackText = isCorrect ? 'Correct!' : (opt.rationale || 'Incorrect distractor.');

                xml += `    <answer fraction="${fraction}" format="html">\n`;
                xml += `      <text><![CDATA[<p>${optText}</p>]]></text>\n`;
                xml += `      <feedback format="html"><text><![CDATA[<p>${feedbackText}</p>]]></text></feedback>\n`;
                xml += `    </answer>\n`;
            });

            xml += `  </question>\n\n`;
        }
    });

    xml += `</quiz>\n`;
    return xml;
}

/**
 * Generate GIFT format
 * 
 * @param {Object} quiz - Quiz object
 * @returns {string} Plain text in GIFT format
 */
export function exportToGift(quiz = {}) {
    const title = quiz.title || 'Untitled Quiz';
    const moduleName = quiz.module || quiz.moduleName || 'General';
    const questions = quiz.questions || [];

    let gift = `// ==========================================\n`;
    gift += `// κουίζυ (Quizy) GIFT Export\n`;
    gift += `// Quiz: ${title}\n`;
    gift += `// Module: ${moduleName}\n`;
    gift += `// ==========================================\n\n`;
    gift += `$CATEGORY: $course$/κουίζυ/${escapeGift(moduleName)}\n\n`;

    questions.forEach((q, idx) => {
        const qNum = idx + 1;
        const qText = q.question || q.question_text || `Question ${qNum}`;
        const qType = q.type === 'short_answer' || q.type === 'shortAnswer' ? 'shortanswer' : 'multichoice';

        gift += `// Question ${qNum}\n`;
        gift += `::Q${qNum}_${escapeGift(title.replace(/\\s+/g, '_'))}:: ${escapeGift(qText)} {\n`;

        if (qType === 'shortanswer') {
            const refAnswer = q.referenceAnswer || q.reference_answer || (q.options && q.options[0] ? q.options[0].text : 'Correct');
            gift += `  =${escapeGift(refAnswer)}\n`;
        } else {
            const options = q.options || [];
            options.forEach((opt, optIdx) => {
                const optText = typeof opt === 'string' ? opt : (opt.text || opt.answer_text || `Option ${optIdx + 1}`);
                const isCorrect = typeof opt === 'object' ? (opt.correct === true || opt.is_correct === 1 || opt.is_correct === true) : (optIdx === q.correct);
                const prefix = isCorrect ? '=' : '~';
                gift += `  ${prefix}${escapeGift(optText)}\n`;
            });
        }

        gift += `}\n\n`;
    });

    return gift;
}

/**
 * Generate High-Fidelity Printable Emergency Paper Exam HTML
 * 
 * @param {Object} quiz - Quiz object
 * @param {Object} options - { includeKey: boolean, universityName: string, durationMin: number }
 * @returns {string} Complete standalone HTML document for printing
 */
export function generatePrintableExamHtml(quiz = {}, options = {}) {
    const title = quiz.title || 'Continuous Assessment Examination';
    const moduleName = quiz.module || quiz.moduleName || 'Computer Science Module';
    const questions = quiz.questions || [];
    const universityName = options.universityName || 'Université des Sciences et de la Technologie';
    const duration = options.durationMin || quiz.duration || 30;
    const includeKey = options.includeKey !== false;

    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    let questionsHtml = '';
    let answerKeyRows = '';

    questions.forEach((q, idx) => {
        const qNum = idx + 1;
        const qText = q.question || q.question_text || `Question ${qNum}`;
        const isShortAnswer = q.type === 'short_answer' || q.type === 'shortAnswer';
        const points = q.points || (isShortAnswer ? 4 : 2);

        questionsHtml += `
            <div class="exam-question-item">
                <div class="question-header">
                    <span class="q-badge">Question ${qNum}</span>
                    <span class="q-points">(${points} Points)</span>
                </div>
                <div class="q-prompt">${escapeXml(qText)}</div>
        `;

        if (isShortAnswer) {
            questionsHtml += `
                <div class="short-answer-box">
                    <div class="sa-instruction">Write a clear, concise technical response (keywords will be evaluated):</div>
                    <div class="ruled-lines">
                        <div class="ruled-line"></div>
                        <div class="ruled-line"></div>
                        <div class="ruled-line"></div>
                        <div class="ruled-line"></div>
                    </div>
                </div>
            `;
            const refAns = q.referenceAnswer || q.reference_answer || 'Expected conceptual formulation';
            answerKeyRows += `
                <tr>
                    <td style="font-weight: bold; width: 60px;">Q${qNum}</td>
                    <td style="font-weight: bold; color: #4338ca;">[Written Response]</td>
                    <td>${escapeXml(refAns)}</td>
                    <td style="width: 80px;">${points} pts</td>
                </tr>
            `;
        } else {
            const options = q.options || [];
            let correctLetter = 'A';

            questionsHtml += `<div class="options-grid">`;
            options.forEach((opt, optIdx) => {
                const optLetter = letters[optIdx] || String(optIdx + 1);
                const optText = typeof opt === 'string' ? opt : (opt.text || opt.answer_text || `Option ${optIdx + 1}`);
                const isCorrect = typeof opt === 'object' ? (opt.correct === true || opt.is_correct === 1 || opt.is_correct === true) : (optIdx === q.correct);
                if (isCorrect) correctLetter = optLetter;

                questionsHtml += `
                    <div class="option-row">
                        <div class="bubble-checkbox">[ &nbsp; ]</div>
                        <span class="opt-letter">(${optLetter})</span>
                        <span class="opt-text">${escapeXml(optText)}</span>
                    </div>
                `;
            });
            questionsHtml += `</div>`;

            answerKeyRows += `
                <tr>
                    <td style="font-weight: bold; width: 60px;">Q${qNum}</td>
                    <td style="font-weight: 800; color: #15803d; font-size: 1.1em;">(${correctLetter})</td>
                    <td>${escapeXml(q.options && q.options[letters.indexOf(correctLetter)] ? (q.options[letters.indexOf(correctLetter)].text || q.options[letters.indexOf(correctLetter)]) : '')}</td>
                    <td style="width: 80px;">${points} pts</td>
                </tr>
            `;
        }

        questionsHtml += `</div>`;
    });

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>${escapeXml(title)} — Official Examination Sheet</title>
    <style>
        @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
        }
        * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
        }
        body {
            margin: 0;
            padding: 20px;
            background: #ffffff;
            font-size: 10.5pt;
            line-height: 1.45;
        }
        .exam-header {
            border: 2px solid #111827;
            padding: 12px 16px;
            margin-bottom: 18px;
            border-radius: 4px;
        }
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #9ca3af;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        .univ-name {
            font-size: 10pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .exam-type {
            font-size: 12pt;
            font-weight: 900;
            text-align: center;
            letter-spacing: 0.05em;
        }
        .header-meta {
            display: flex;
            justify-content: space-between;
            font-size: 9.5pt;
            margin-bottom: 10px;
        }
        .student-box {
            border-top: 1px dashed #6b7280;
            padding-top: 10px;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 12px;
            font-size: 9pt;
        }
        .blank-line {
            border-bottom: 1px solid #111827;
            display: inline-block;
            height: 14px;
            width: 100%;
        }
        .instructions-box {
            background: #f3f4f6;
            border-left: 3px solid #111827;
            padding: 6px 12px;
            font-size: 8.5pt;
            margin-bottom: 18px;
            font-weight: 500;
        }
        .exam-question-item {
            margin-bottom: 16px;
            page-break-inside: avoid;
            border-bottom: 1px dotted #d1d5db;
            padding-bottom: 12px;
        }
        .question-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }
        .q-badge {
            font-weight: 800;
            font-size: 10pt;
        }
        .q-points {
            font-size: 9pt;
            font-weight: 600;
            color: #4b5563;
        }
        .q-prompt {
            font-size: 10.5pt;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .options-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 16px;
            margin-left: 10px;
        }
        .option-row {
            display: flex;
            align-items: baseline;
            gap: 6px;
            font-size: 9.5pt;
        }
        .bubble-checkbox {
            font-family: monospace;
            font-size: 11pt;
            font-weight: bold;
        }
        .opt-letter {
            font-weight: 700;
        }
        .short-answer-box {
            margin-left: 10px;
            margin-top: 6px;
        }
        .sa-instruction {
            font-size: 8.5pt;
            font-style: italic;
            color: #4b5563;
            margin-bottom: 6px;
        }
        .ruled-line {
            border-bottom: 1px solid #9ca3af;
            height: 22px;
        }
        .page-break {
            page-break-before: always;
        }
        .answer-key-section {
            margin-top: 25px;
            padding-top: 15px;
            border-top: 2px solid #111827;
            page-break-before: always;
        }
        .key-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
            margin-top: 10px;
        }
        .key-table th, .key-table td {
            border: 1px solid #d1d5db;
            padding: 6px 10px;
            text-align: left;
        }
        .key-table th {
            background: #f3f4f6;
            font-weight: 800;
        }
        .no-print {
            position: fixed;
            top: 15px;
            right: 15px;
            display: flex;
            gap: 10px;
            z-index: 9999;
        }
        .btn-print {
            background: #111827;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
        @media print {
            .no-print {
                display: none !important;
            }
            body {
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Print Exam / Save PDF</button>
        <button class="btn-print" style="background:#4b5563;" onclick="window.close()">Close Window</button>
    </div>

    <div class="exam-header">
        <div class="header-top">
            <span class="univ-name">${escapeXml(universityName)}</span>
            <span style="font-weight: 700; font-size: 9.5pt;">Module: ${escapeXml(moduleName)}</span>
        </div>
        <div class="exam-type">${escapeXml(title)}</div>
        <div class="header-meta">
            <span><strong>Durée:</strong> ${duration} Minutes</span>
            <span><strong>Année Universitaire:</strong> 2026 / 2027</span>
            <span><strong>Session:</strong> Évaluation Périodique</span>
        </div>
        <div class="student-box">
            <div><strong>Nom & Prénom:</strong> <div class="blank-line"></div></div>
            <div><strong>Matricule:</strong> <div class="blank-line"></div></div>
            <div><strong>Groupe / Section:</strong> <div class="blank-line"></div></div>
            <div><strong>Place / Rangée:</strong> <div class="blank-line"></div></div>
        </div>
    </div>

    <div class="instructions-box">
        <strong>Directives aux candidats:</strong> Cochez lisiblement une seule case par question à choix multiple. Les calculatrices et téléphones portables sont strictement interdits. Aucun document autorisé. Les réponses incomplètes ou ambiguës ne recevront aucun point.
    </div>

    <div class="questions-list">
        ${questionsHtml}
    </div>

    ${includeKey ? `
    <div class="answer-key-section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size: 12pt; text-transform:uppercase; margin:0;">📋 Grille de Correction & Corrigé Type (Réservé à l'Enseignant)</h2>
            <span style="font-size: 9pt; color:#6b7280; font-weight:700;">Barème officiel κουίζυ</span>
        </div>
        <table class="key-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Bonne Réponse</th>
                    <th>Intitulé / Rationale Pédagogique</th>
                    <th>Points</th>
                </tr>
            </thead>
            <tbody>
                ${answerKeyRows}
            </tbody>
        </table>
    </div>
    ` : ''}
</body>
</html>`;
}

export default {
    exportToMoodleXml,
    exportToGift,
    generatePrintableExamHtml
};
