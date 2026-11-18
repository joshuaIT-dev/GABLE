/* GABLE End-of-Semester Report Generator
 * Builds a Word report from the live database API. No API keys are exposed in browser code.
 * Note: the current schema does not tag records by academic term, so this is a database snapshot
 * labeled with the requested academic period, not a verified term-filtered extract.
 */
(function loadDocx() {
  if (window.docx) return;

  const cdnUrls = [
    'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
    'https://unpkg.com/docx@8.5.0/build/index.umd.js'
  ];

  let currentIndex = 0;

  function tryLoadNext() {
    if (window.docx) return;

    if (currentIndex >= cdnUrls.length) {
      console.error('GABLE: Unable to load the Word document library from either CDN.');
      return;
    }

    const s = document.createElement('script');
    s.src = cdnUrls[currentIndex++];
    s.async = true;

    s.onload = () => {
      if (!window.docx) {
        s.remove();
        tryLoadNext();
      }
    };

    s.onerror = () => {
      s.remove();
      tryLoadNext();
    };

    document.head.appendChild(s);
  }

  tryLoadNext();
})();
const SEMREPORT_API = '../assets/php/get_admin_semester_report.php';
const SEMREPORT_PERIOD = 'Current XP semester';
let semReportData = null;

document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('panel-reports');
  if (!panel || document.getElementById('semreport-card')) return;
  const card = document.createElement('div');
  card.className = 'a-card fade-up-3';
  card.id = 'semreport-card';
  card.style.marginTop = '1.5rem';
  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:.75rem">
      <div><div class="a-card-title" style="margin:0 0 .2rem">🏆 End-of-Semester Report Generator</div>
      <div style="font-size:.75rem;color:rgba(255,255,255,.55)">Live database snapshot • ${semPeriodHtml()} • Word document (.docx)</div></div>
      <button class="semrep-generate-btn" id="semrep-main-btn" onclick="openReportModal()">📄 Generate Report</button>
    </div>
    <div class="semrep-sections-preview">
      <div class="semrep-section-chip">📊 System Overview</div><div class="semrep-section-chip">🏫 College Breakdown</div>
      <div class="semrep-section-chip">🏆 Top Students</div><div class="semrep-section-chip">🎓 Instructor Grades</div>
      <div class="semrep-section-chip">⚠️ Flagged Questions</div><div class="semrep-section-chip">📝 Data-based Narrative</div>
    </div>
    <p style="font-size:.75rem;color:rgba(255,255,255,.48);margin:.9rem 0 0">XP reflects the current semester; academic activity is historical. For university and college top 10 archives before resetting XP, use Settings ? Export semester results.</p>`;
  panel.appendChild(card);
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay" id="modal-semreport"><div class="modal" style="max-width:620px"><button class="modal-close" onclick="closeModal('modal-semreport')">✕</button><h2>🏆 Generate Semester Report</h2><div id="semreport-modal-body"></div></div></div>`);
});
function semPeriodHtml(){ const span=document.createElement('span'); span.textContent=SEMPERIOD_SAFE(); return span.innerHTML; }
function SEMPERIOD_SAFE(){ return semReportData?.meta?.academic_period || SEMREPORT_PERIOD; }

async function loadSemesterReportData() {
  const res = await fetch(SEMPREPORT_API_SAFE(), { cache: 'no-store', credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || 'Could not load report data.');
  return data;
}
function SEMPREPORT_API_SAFE(){ return SEMREPORT_API; }

async function openReportModal() {
  const body = document.getElementById('semreport-modal-body');
  body.innerHTML = `<div class="semrep-config"><div class="semrep-config-title">Report Configuration</div><div class="semrep-config-row"><div class="semrep-config-label">Academic period label</div><div class="semrep-config-val">${semPeriodHtml()}</div></div><p style="font-size:.78rem;color:rgba(255,255,255,.65)">The report will use live counts, college aggregates, student rankings, stored instructor grades, and recorded question flags. It will disclose that the data is a current snapshot rather than a term-filtered extract.</p><div id="semrep-data-status" style="font-size:.8rem;margin-top:.75rem">Loading current database summary…</div><div id="semrep-progress" style="display:none"><div class="semrep-progress-label" id="semrep-progress-label">Preparing report…</div><div class="semrep-progress-track"><div class="semrep-progress-fill" id="semrep-progress-fill" style="width:0%"></div></div><div class="semrep-progress-steps" id="semrep-progress-steps"></div></div></div><div class="modal-footer"><button class="btn-secondary" onclick="closeModal('modal-semreport')">Close</button><button class="btn-primary" id="semrep-go-btn" disabled onclick="generateSemesterReport()">📄 Generate & Download</button></div>`;
  openModal('modal-semreport');
  try {
    semReportData = await loadSemesterReportData();
    const m = semReportData.metrics || {};
    document.getElementById('semrep-data-status').textContent = `Loaded: ${m.active_students ?? 0} active students, ${m.active_instructors ?? 0} active instructors, ${m.active_quizzes ?? 0} active quizzes, ${m.completed_submissions ?? 0} submitted/graded attempts.`;
    document.getElementById('semrep-go-btn').disabled = false;
  } catch (e) {
    document.getElementById('semrep-data-status').textContent = `Could not load live data: ${e.message}`;
  }
}
function semProgress(pct, label, step) {
  const fill = document.getElementById('semrep-progress-fill'); const lbl = document.getElementById('semrep-progress-label'); const steps = document.getElementById('semrep-progress-steps');
  if (fill) fill.style.width = `${pct}%`; if (lbl) lbl.textContent = label;
  if (steps && step) { const div = document.createElement('div'); div.className = 'semrep-step'; div.textContent = `✓ ${step}`; steps.appendChild(div); }
}
async function generateSemesterReport() {
  const btn = document.getElementById('semrep-go-btn');
  btn.disabled = true; btn.textContent = '⏳ Generating…';
  document.getElementById('semrep-progress').style.display = 'block';
  try {
    if (!semReportData) semReportData = await loadSemesterReportData();
    semProgress(20, 'Preparing live database data…', 'Database data loaded');
    if (!window.docx) await new Promise((resolve, reject) => { let n=0; const timer=setInterval(()=>{ n++; if(window.docx){clearInterval(timer);resolve();} else if(n>40){clearInterval(timer);reject(new Error('Word document library did not load. Check internet access and try again.'));}},250); });
    semProgress(45, 'Building report tables and narratives…', 'Metrics and rankings prepared');
    const buffer = await buildSemesterWordDoc(semReportData);
    semProgress(85, 'Preparing Word download…', 'Document built');
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `GABLE_Semester_Report_${new Date().toISOString().slice(0,10)}.docx`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    semProgress(100, 'Report downloaded.', 'Download ready');
    if (typeof showToast === 'function') showToast('✅','Semester report downloaded.');
  } catch (e) {
    console.error('Semester report generation error:', e);
    const status = document.getElementById('semrep-data-status'); if(status) status.textContent = `Report generation failed: ${e.message}`;
    if (typeof showToast === 'function') showToast('⚠️', e.message || 'Could not generate report.');
    btn.disabled = false; btn.textContent = '📄 Generate & Download';
  }
}

async function buildSemesterWordDoc(data) {
  const d = window.docx;
  const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,AlignmentType,HeadingLevel,WidthType,ShadingType,PageNumber}=d;
  const para=(text,opts={})=>new Paragraph({spacing:{before:80,after:80},...opts,children:[new TextRun({text:String(text??'—'),font:'Times New Roman',size:24,...(opts.run||{})})]});
  const heading=(text)=>new Paragraph({heading:HeadingLevel.HEADING_1,spacing:{before:300,after:120},children:[new TextRun({text,bold:true,font:'Arial',size:28,color:'000000'})]});
  const sub=(text)=>new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:220,after:90},children:[new TextRun({text,bold:true,font:'Arial',size:23,color:'000000'})]});
  const table=(headers,rows)=>window.GableDocs.table(headers,rows,true);
  const m=data.metrics||{}; const colleges=data.colleges||[]; const students=data.top_students||[]; const instructors=data.instructors||[]; const flags=data.flags||[];
  const num=(v)=>Number(v||0).toLocaleString('en-US'); const pct=(v)=>v===null||v===undefined?'N/A':`${Number(v).toFixed(2)}%`;
  const narratives=[];
  narratives.push(para(`This report summarizes the current GABLE database snapshot for ${SEMPERIOD_SAFE()}. It records ${num(m.active_students)} active students, ${num(m.active_instructors)} active instructors, and ${num(m.active_quizzes)} active quizzes. There are ${num(m.completed_submissions)} submitted or graded quiz attempts, with an average recorded score of ${pct(m.average_score)} and ${num(m.total_xp)} XP recorded.`));
  narratives.push(para(`Data limitation: ${data.meta?.data_scope || 'Academic-term metadata is not available in the database.'} The period shown is a requested report label and is not proof that every included record belongs to that term.`));
  const collegeNarratives=colleges.map(c=>{ const score=c.average_score==null?'no recorded score average':`an average recorded score of ${pct(c.average_score)}`; return para(`${c.college||'Unspecified college'}: ${num(c.students)} active students, ${num(c.submissions)} submitted/graded attempts, ${score}, and ${num(c.total_xp)} XP recorded.`); });
  const studentRows=students.map((s,i)=>[i+1,s.name,s.college,s.program,`${s.year_level??''}${s.block??''}`,num(s.xp),pct(s.average_score),num(s.submissions)]);
  const instructorRows=instructors.map(i=>[i.name,i.college,i.program,i.grade, num(i.teaching_exp),num(i.quizzes_created),num(i.submissions),pct(i.average_score)]);
  const flagRows=flags.map(f=>[f.flag_id,f.quiz_title||`Quiz #${f.quiz_id}`,f.student_name||`Student #${f.student_id}`,Number(f.question_index)+1,f.reason,f.status,f.created_at||'']);
  const metricRows=[['Active students',num(m.active_students)],['Active instructors',num(m.active_instructors)],['Active quizzes',num(m.active_quizzes)],['Submitted/graded attempts',num(m.completed_submissions)],['Scored attempts',num(m.scored_submissions)],['Average recorded score',pct(m.average_score)],['Total XP recorded',num(m.total_xp)],['Pending question flags',num(m.pending_flags)],['Resolved question flags',num(m.resolved_flags)],['Latest recorded activity',data.meta?.latest_activity||'Not available']];
  const doc=window.GableDocs.create([
    new Paragraph({text:'Semester Academic Report',heading:HeadingLevel.TITLE}),
    para(SEMPERIOD_SAFE()),
    para('Generated ' + window.GableDocs.timestamp()),
    heading('1 Executive Summary'),...narratives,
    heading('2 System Overview'),table(['Metric','Value'],metricRows),
    heading('3 College Breakdown'),table(['College','Students','Attempts','Average score','XP recorded'],colleges.map(c=>[c.college,num(c.students),num(c.submissions),pct(c.average_score),num(c.total_xp)])),sub('College observations'),...(collegeNarratives.length?collegeNarratives:[para('No college records were available in the returned dataset.')]),
    heading('4 Top Students'),table(['Rank','Student','College','Program','Year/Block','XP','Avg score','Attempts'],studentRows.length?studentRows:[[ '—','No student data','','','','','','' ]]),
    heading('5 Instructor Records and Grades'),para('Instructor grades below are the values stored in the instructor.grade field. Quiz counts, submissions, and average scores are shown as separate activity indicators; they are not used to infer or change the stored grade.'),table(['Instructor','College','Program','Stored grade','Teaching EXP','Quizzes','Attempts','Avg score'],instructorRows.length?instructorRows:[['No instructor data','','','','','','','']]),
    heading('6 Flagged Quiz Questions'),para(`Recorded flags: ${flags.length}; pending: ${num(m.pending_flags)}; resolved: ${num(m.resolved_flags)}.`),table(['Flag ID','Quiz','Reported by','Question #','Reason','Status','Created'],flagRows.length?flagRows:[['—','No flag records','','','','','']]),
    heading('7 Narrative and Recommendations'),para('The following observations are generated from the returned database values and are descriptive, not AI-generated.'),
    ...((colleges.filter(c=>c.average_score!==null&&c.average_score!==undefined).length)?colleges.filter(c=>c.average_score!==null&&c.average_score!==undefined).map(c=>para(Number(c.average_score)<80?`Review recommended: ${c.college} has an average recorded score of ${pct(c.average_score)}. Consider reviewing quiz clarity and student support before drawing conclusions.`:`Monitoring note: ${c.college} has an average recorded score of ${pct(c.average_score)}; compare with course-level goals and participation before assessing performance.`)):[para('There are not enough scored attempts by college to generate score-based observations.')]),
    para('Recommended data improvement: add an academic-year/semester field to quiz and submission records so future reports can be filtered to the selected term rather than using the current database snapshot.'),
    heading('8 Methodology and Limitations'),para(data.meta?.data_scope||'The schema does not identify the academic term associated with each record.'),para(data.meta?.instructor_grade_source||'Instructor grades are read from stored records.'),para('Average scores are calculated from submitted/graded attempts with non-null scores. XP is summed from submitted/graded attempts. Flagged-question details come from the flags table. No grade-boost redemption table is available in this schema, so redemptions are not reported.'),
    new Paragraph({spacing:{before:300},children:[new TextRun({text:'GABLE • Administrative report • Generated from live database records',font:'Arial',size:16,color:'777777'})]})
  ], 'Semester Academic Report', true);
  return Packer.toBlob(doc);
}
