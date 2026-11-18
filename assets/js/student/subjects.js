function renderStudentSubjects(subjects) {
  const host = document.getElementById('student-subjects-list');
  if (!host) return;
  host.replaceChildren();
  const valid = Array.isArray(subjects) ? subjects.filter(item => item && item.subject) : [];
  if (!valid.length) {
    const empty = document.createElement('div');
    empty.className = 'student-subjects-empty';
    empty.innerHTML = '<i data-lucide="book-open" aria-hidden="true"></i><strong>No subjects assigned yet</strong><span>Your enrolled subjects will appear here once your section is set up.</span>';
    host.append(empty);
  } else {
    const grouped = new Map();
    for (const item of valid) {
      if (!grouped.has(item.subject)) grouped.set(item.subject, new Set());
      if (item.instructor) grouped.get(item.subject).add(item.instructor);
    }
    const grid = document.createElement('div'); grid.className = 'student-subject-grid';
    for (const [subject, instructors] of grouped) {
      const card = document.createElement('article'); card.className = 'student-subject-item';
      const head = document.createElement('div'); head.className = 'student-subject-item-head';
      const icon = document.createElement('span'); icon.className = 'student-subject-icon';
      icon.innerHTML = '<i data-lucide="book-open" aria-hidden="true"></i>';
      const title = document.createElement('h4'); title.textContent = subject;
      const badge = document.createElement('span'); badge.className = 'student-subject-enrolled'; badge.textContent = 'Enrolled';
      head.append(icon, title, badge);
      const teacherLabel = document.createElement('span'); teacherLabel.className = 'student-subject-label'; teacherLabel.textContent = 'INSTRUCTOR';
      const teacherList = document.createElement('div'); teacherList.className = 'student-subject-teachers';
      const names = [...instructors];
      if (names.length) for (const name of names) { const teacher = document.createElement('span'); teacher.className = 'student-subject-teacher'; teacher.textContent = name; teacherList.append(teacher); }
      else { const teacher = document.createElement('span'); teacher.className = 'student-subject-unassigned'; teacher.textContent = 'Instructor not assigned'; teacherList.append(teacher); }
      card.append(head, teacherLabel, teacherList); grid.append(card);
    }
    host.append(grid);
  }
  if (window.lucide) window.lucide.createIcons({attrs:{'stroke-width':1.8}});
}
