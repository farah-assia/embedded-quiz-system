const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('public/teacher/index.html');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Add CSS for export option cards
const cssMarker = '.dash-segmented-control {';
const exportCardCss = `
        .export-option-card:hover {
            border-color: #4f46e5 !important;
            background: #f8fafc !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.08);
        }
`;

if (!content.includes('.export-option-card:hover') && content.includes(cssMarker)) {
    content = content.replace(cssMarker, exportCardCss + '\n        ' + cssMarker);
    console.log('✓ Added CSS for export option cards');
}

// 2. Add Export Modal HTML
const exportModalHtml = `
    <!-- ================= QUIZ MULTI-FORMAT EXPORT MODAL ================= -->
    <div id="modal-quiz-export" class="modal-overlay">
        <div class="modal-card" style="max-width: 580px; border-top: 6px solid #4f46e5; padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; border-bottom: 1px dashed var(--border-color); padding-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 44px; height: 44px; border-radius: 12px; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                        📦
                    </div>
                    <div>
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--navy-primary); margin: 0;">Export & Emergency Assessment</h3>
                        <span style="font-size: 0.78rem; color: var(--text-muted);" id="export-quiz-subtitle">Quiz: Continuous Evaluation</span>
                    </div>
                </div>
                <button type="button" class="modal-close-btn" onclick="closeExportModal()">&times;</button>
            </div>

            <p style="font-size: 0.86rem; color: #475569; margin-bottom: 1.5rem; line-height: 1.45;">
                Select your desired format. κουίζυ generates offline-ready exports for university LMS platforms as well as printable A4 emergency paper examinations for amphitheaters.
            </p>

            <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.75rem;">
                <!-- Option 1: Printable Paper Exam -->
                <div class="export-option-card" onclick="triggerPrintableExam()" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: #ffffff;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="font-size: 1.8rem;">🖨️</span>
                        <div>
                            <strong style="display: block; font-size: 0.95rem; color: var(--navy-primary);">Printable Paper Exam Sheet (A4 PDF)</strong>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Formatted with candidate blanks, checkboxes, and teacher answer key</span>
                        </div>
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 700; color: #4f46e5; background: #eef2ff; padding: 0.35rem 0.75rem; border-radius: 6px;">Open A4 &rarr;</span>
                </div>

                <!-- Option 2: Moodle XML -->
                <div class="export-option-card" onclick="downloadMoodleXml()" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: #ffffff;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="font-size: 1.8rem;">🎓</span>
                        <div>
                            <strong style="display: block; font-size: 0.95rem; color: var(--navy-primary);">Moodle XML Question Bank (.xml)</strong>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Standard Moodle 2.0+ format with fractions, shuffle, and feedback</span>
                        </div>
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 0.35rem 0.75rem; border-radius: 6px;">Download .xml</span>
                </div>

                <!-- Option 3: GIFT Format -->
                <div class="export-option-card" onclick="downloadGiftFormat()" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: #ffffff;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="font-size: 1.8rem;">📝</span>
                        <div>
                            <strong style="display: block; font-size: 0.95rem; color: var(--navy-primary);">GIFT Format Plain Text (.gift)</strong>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Supported by Canvas, Blackboard, and Moodle LMS</span>
                        </div>
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 700; color: #16a34a; background: #dcfce7; padding: 0.35rem 0.75rem; border-radius: 6px;">Download .gift</span>
                </div>

                <!-- Option 4: Gradebook CSV -->
                <div class="export-option-card" onclick="downloadGradebookCsvFromExport()" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: #ffffff;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="font-size: 1.8rem;">📊</span>
                        <div>
                            <strong style="display: block; font-size: 0.95rem; color: var(--navy-primary);">Student Gradebook Results (.csv)</strong>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Official student marks, percentage, status, and integrity flags</span>
                        </div>
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 700; color: #854d0e; background: #fef9c3; padding: 0.35rem 0.75rem; border-radius: 6px;">Download .csv</span>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end;">
                <button type="button" class="btn-table-action" style="padding: 0.6rem 1.25rem; font-weight: 700;" onclick="closeExportModal()">Close</button>
            </div>
        </div>
    </div>
`;

if (!content.includes('id="modal-quiz-export"')) {
    const modalMarker = '<!-- ================= PAIRWISE CONCORDANCE INSPECTOR MODAL ================= -->';
    if (content.includes(modalMarker)) {
        content = content.replace(modalMarker, exportModalHtml + '\n    ' + modalMarker);
        console.log('✓ Added Quiz Multi-Format Export Modal markup');
    }
}

// 3. Update exportQuiz JavaScript handler and add download functions
const oldExportJs = `function exportQuiz(quizId) {
            exportGradebookCsv(quizId);
        }`;

const newExportJs = `let currentExportQuizId = 1;

        function exportQuiz(quizId) {
            currentExportQuizId = quizId || (teacherQuizzes[0] ? teacherQuizzes[0].id : 1);
            const q = teacherQuizzes.find(x => x.id === currentExportQuizId);
            const sub = document.getElementById('export-quiz-subtitle');
            if (sub) sub.textContent = q ? \`Quiz: \${q.title} (\${q.module || 'Module'})\` : \`Quiz #\${currentExportQuizId}\`;
            document.getElementById('modal-quiz-export').classList.add('active');
        }

        function closeExportModal() {
            document.getElementById('modal-quiz-export').classList.remove('active');
        }

        function triggerPrintableExam() {
            window.open(\`/api/quiz/export/\${currentExportQuizId}?format=print\`, '_blank');
        }

        function downloadMoodleXml() {
            window.location.href = \`/api/quiz/export/\${currentExportQuizId}?format=moodle\`;
            showTeacherToast('🎓 Moodle XML file downloaded!', 'success');
        }

        function downloadGiftFormat() {
            window.location.href = \`/api/quiz/export/\${currentExportQuizId}?format=gift\`;
            showTeacherToast('📝 GIFT format file downloaded!', 'success');
        }

        function downloadGradebookCsvFromExport() {
            exportGradebookCsv(currentExportQuizId);
        }`;

if (content.includes(oldExportJs)) {
    content = content.replace(oldExportJs, newExportJs);
    console.log('✓ Successfully replaced exportQuiz with multi-format exporter');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Updated ' + targetPath);
