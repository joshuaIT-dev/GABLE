function renderStudentSubjects(subjects) {
  const host = document.getElementById('student-subjects-list');
  if (!host) return;
  host.replaceChildren();
  if (!subjects.length) {
    const empty = document.createElement('p');
    empty.className = 'metric-caption';
    empty.textContent = 'No subjects assigned to your section yet.';
    host.append(empty);
    return;
  }
  const grouped = new Map();
  for (const item of subjects) {
    if (!grouped.has(item.subject)) grouped.set(item.subject, new Set());
    grouped.get(item.subject).add(item.instructor);
  }
  for (const [subject, instructors] of grouped) {
    const row = document.createElement('div'); row.className = 'student-subject-row';
    const title = document.createElement('strong'); title.textContent = subject;
    const teacher = document.createElement('span'); teacher.textContent = `Instructor: ${[...instructors].join(', ')}`;
    row.append(title, teacher); host.append(row);
  }
}
