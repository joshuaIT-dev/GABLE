const COLLEGE_SHORT_NAMES = {
  'College of Accountancy': 'CA',
  'College of Arts and Sciences': 'CAS',
  'College of Business Administration': 'CBA',
  'College of Criminal Justice': 'CCJ',
  'College of Engineering': 'CE',
  'College of Information Technology': 'CITCS',
  'College of Information Technology & Computer Studies': 'CITCS',
  'College of Medicine': 'CM',
  'College of Teacher Education': 'CTE'
};
function displayCollegeName(id, fullName) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = COLLEGE_SHORT_NAMES[fullName] || fullName || 'Not assigned';
  el.title = fullName || '';
  el.setAttribute('aria-label', fullName || 'Not assigned');
}

const PROGRAM_SHORT_NAMES = {
  'Associate in Computer Technology': 'ACT',
  'BA in Communication': 'BAC',
  'BEEd - ECED': 'BEEd-ECED',
  'BEEd - General Elementary': 'BEEd-GE',
  'BEEd - SPED': 'BEEd-SPED',
  'BS in Accountancy': 'BSA',
  'BS in Computer Science': 'BSCS',
  'BS in Criminology': 'BSCrim',
  'BS in IT': 'BSIT',
  'BS in Management Accounting': 'BSMA',
  'BS in Psychology': 'BSPsych',
  'BSBA - HRDM': 'BSBA-HRDM',
  'BSBA - Marketing': 'BSBA-Mktg',
  'BSBA - Operations': 'BSBA-Ops',
  'BSEd - Biological Science': 'BSEd-BioSci',
  'BSEd - English': 'BSEd-Eng',
  'BSEd - Filipino': 'BSEd-Fil',
  'BSEd - MAPEH': 'BSEd-MAPEH',
  'BSEd - Math': 'BSEd-Math',
  'BSEd - Social Science': 'BSEd-SocSci',
  'Bachelor of Science in Information Technology': 'BSIT',
  'Doctor of Medicine': 'MD'
};
function displayProgramName(id, fullName) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = PROGRAM_SHORT_NAMES[fullName] || fullName || '';
  el.title = fullName || '';
  el.setAttribute('aria-label', fullName || 'Program not assigned');
}
