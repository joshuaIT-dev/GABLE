let studentSemesterCsrf = '';
let studentSemesterExport = null;

document.addEventListener('DOMContentLoaded', () => {
  const host = document.getElementById('settings-controls');
  if (!host) return;
  const card = document.createElement('article');
  card.className = 'configuration-card semester-control';
  card.innerHTML = `<header><span class="admin-eyebrow">STUDENT XP · SIX-MONTH SEMESTERS</span><h3>Close a semester and restart student XP</h3></header>
    <p id="student-semester-current" role="status">Loading current semester…</p>
    <p>Each semester has its own XP, levels, frames, unused power-ups and streaks. Closing it restarts these for <strong>all students</strong>. Quiz scores, historical awards and instructor XP stay unchanged. The scheduled end is a reminder; resets never run automatically.</p>
    <div class="semester-steps"><section><h4>1. Export and save the results</h4><p>Download a formatted report with the university top 10, top 10 per college and every student’s XP balance. Open the HTML file in a browser to read it offline or print to PDF.</p><button type="button" class="btn-secondary" id="student-semester-export">Export semester results</button></section>
    <section><h4>2. Start the next semester</h4><p>Only continue after saving the export. If balances change, a fresh export is required. Active quiz attempts must finish first.</p>
    <label for="student-semester-label">Next semester name</label><input id="student-semester-label" maxlength="100" placeholder="e.g. AY 2026–2027 · Second semester" autocomplete="off">
    <label class="semester-check"><input id="student-semester-saved" type="checkbox"> I saved the exported report and understand all student progression will restart.</label>
    <label for="student-semester-confirm">Type RESET STUDENT XP</label><input id="student-semester-confirm" autocomplete="off" spellcheck="false">
    <button type="button" class="btn-primary" id="student-semester-reset" disabled>Reset students &amp; start next semester</button></section></div>
    <p id="student-semester-status" role="status" aria-live="polite"></p>
    <details><summary>Saved semester exports</summary><div id="student-semester-history"></div></details>`;
  host.append(card);
  document.getElementById('student-semester-export').onclick = studentSemesterDownload;
  document.getElementById('student-semester-reset').onclick = studentSemesterReset;
  for (const id of ['student-semester-label','student-semester-saved','student-semester-confirm']) document.getElementById(id).addEventListener('input', studentSemesterReady);
  studentSemesterLoad().catch(error => studentSemesterStatus(error.message));
});

function studentSemesterStatus(text) { document.getElementById('student-semester-status').textContent = text; }
function studentSemesterReady() {
  document.getElementById('student-semester-reset').disabled = !studentSemesterExport || !document.getElementById('student-semester-label').value.trim() || !document.getElementById('student-semester-saved').checked || document.getElementById('student-semester-confirm').value !== 'RESET STUDENT XP';
}
async function studentSemesterApi(body) {
  const response = await fetch('../assets/php/admin_student_semester.php', {
    credentials: 'same-origin', cache: 'no-store',
    ...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,csrf:studentSemesterCsrf})} : {})
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Semester action failed.');
  return data;
}
async function studentSemesterLoad() {
  const data = await studentSemesterApi();
  studentSemesterCsrf = data.csrf;
  document.getElementById('student-semester-current').textContent = `${data.semester.label} · Started ${data.semester.started_at} · Scheduled end ${data.semester.scheduled_end}`;
  const history = document.getElementById('student-semester-history'); history.replaceChildren();
  for (const item of data.exports) {
    const link = document.createElement('a');
    link.href = `../assets/php/admin_student_semester.php?download=${Number(item.export_id)}`;
    link.textContent = `Export #${item.export_id} · ${item.created_at}${item.used_at ? ' · Semester closed' : ' · Snapshot'}`;
    history.append(link);
  }
  if (!data.exports.length) history.textContent = 'No exports yet.';
}
async function studentSemesterDownload() {
  const button = document.getElementById('student-semester-export'); button.disabled = true;
  studentSemesterExport = null; studentSemesterReady();
  studentSemesterStatus('Archiving student XP and preparing the report…');
  try {
    const data = await studentSemesterApi({action:'export'});
    const response = await fetch(`../assets/php/admin_student_semester.php?download=${data.export_id}`, {credentials:'same-origin',cache:'no-store'});
    if (!response.ok) throw new Error('Download failed. Please try exporting again.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a'); link.href = url; link.download = `GABLE_Semester_XP_${data.export_id}.html`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),30000);
    studentSemesterExport = data.export_id;
    document.getElementById('student-semester-saved').checked = false;
    studentSemesterStatus('Report prepared and download requested. Open your saved file and verify it before confirming the reset.');
    await studentSemesterLoad();
  } catch (error) { studentSemesterStatus(error.message); }
  finally { button.disabled = false; studentSemesterReady(); }
}
async function studentSemesterReset() {
  const button = document.getElementById('student-semester-reset'); button.disabled = true;
  document.getElementById('student-semester-export').disabled = true;
  try {
    await studentSemesterApi({action:'reset',export_id:studentSemesterExport,label:document.getElementById('student-semester-label').value.trim(),confirmation:document.getElementById('student-semester-confirm').value,saved_export:document.getElementById('student-semester-saved').checked});
    studentSemesterExport = null;
    document.getElementById('student-semester-confirm').value = '';
    document.getElementById('student-semester-saved').checked = false;
    studentSemesterStatus('New semester started. All student XP, levels, frames, power-ups and streaks restarted. Previous results are archived. Refresh other open tabs to see the new balances.');
    await studentSemesterLoad();
  } catch (error) { studentSemesterExport = null; studentSemesterStatus(error.message + ' Export again before retrying.'); }
  finally { document.getElementById('student-semester-export').disabled = false; studentSemesterReady(); }
}
