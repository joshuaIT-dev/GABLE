async function loadAdminOpeningAlerts() {
  const list=document.getElementById('admin-opening-list');
  try {
    const response=await fetch('../assets/php/admin_quiz_opening_alerts.php',{credentials:'include',cache:'no-store'});
    const data=await response.json();
    if (!response.ok || !data.success) throw new Error('Alerts are temporarily unavailable.');
    list.replaceChildren();
    const syllabusResponse=await fetch('../assets/php/syllabus.php',{credentials:'include',cache:'no-store'});
    const syllabusData=syllabusResponse.ok?await syllabusResponse.json():{};
    const alerts=syllabusData.alerts||[];
    const badge=document.getElementById('admin-opening-count');
    badge.textContent=data.sections.length+alerts.length;
    badge.hidden=!(data.sections.length+alerts.length);
    badge.title=`${data.sections.length} sections with final openings; ${alerts.length} syllabus updates`;
    for(const alert of alerts.slice(0,5)){const item=document.createElement('article');const title=document.createElement('strong');title.textContent=alert.title;const message=document.createElement('p');message.textContent=alert.message;const button=document.createElement('button');button.className='btn-secondary';button.textContent='Review syllabi';button.onclick=()=>{document.getElementById(/Syllabus #|Syllabus uploaded/.test(alert.message+' '+alert.title)?'nav-syllabi':'nav-quiz-alignment')?.click();document.querySelector('.admin-opening-alerts').open=false;};item.append(title,message,button);list.append(item);}
    if (!data.sections.length && !alerts.length) list.textContent='No final openings recorded.';
    for (const row of data.sections) {
      const item=document.createElement('article');
      const title=document.createElement('strong'); title.textContent=row.section;
      const college=document.createElement('span'); college.textContent=row.college;
      const count=document.createElement('p'); count.textContent=`${row.students} student${Number(row.students)===1?'':'s'} / ${row.final_openings} final quiz opening${Number(row.final_openings)===1?'':'s'}`;
      item.append(title,college,count); list.append(item);
    }
  } catch(error) { list.textContent=error.message; }
}
loadAdminOpeningAlerts();
setInterval(loadAdminOpeningAlerts,30000);
