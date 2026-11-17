/* Saved reviews and exports never request a new AI response. */
const reviewRole = /Instructor|Idashboard/i.test(location.pathname) ? 'instructor' : 'student';
function reviewNode(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}
async function reviewRequest(url, body) {
    const response = await fetch('../assets/php/' + url, { credentials: 'include', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed. Please retry.');
    return data;
}
function reviewDialog(title, variant = 'history') {
    const previous = document.getElementById('review-dialog');
    if (previous) { previous.close(); previous.remove(); }
    const dialog = reviewNode('dialog', undefined, 'review-overlay'); dialog.id = 'review-dialog';
    dialog.setAttribute('aria-labelledby', 'review-dialog-title');
    const card = reviewNode('section', undefined, 'review-dialog review-dialog--' + variant);
    const header = reviewNode('header', undefined, 'review-dialog-header');
    const heading = reviewNode('h2', title); heading.id = 'review-dialog-title';
    const close = reviewNode('button', undefined, 'review-close'); close.type = 'button'; close.setAttribute('aria-label','Close');
    close.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    close.onclick = () => dialog.close(); header.append(heading, close);
    const body = reviewNode('div', undefined, 'review-dialog-body');
    card.append(header, body); dialog.append(card);
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog); dialog.showModal(); return body;
}
async function openReviewHistory(quizId = 0) {
    const dialog = reviewDialog('Saved Reviews');
    dialog.append(reviewNode('p','Revisit saved responses without generating a new answer. Older source revisions remain available.','review-muted'));
    const filters = reviewNode('form',undefined,'review-filters');
    const search = reviewNode('input'); search.placeholder='Search subject, quiz or question'; search.setAttribute('aria-label','Search saved reviews');
    const feature = reviewNode('select'); feature.setAttribute('aria-label','Review type');
    for (const [value,label] of [['','All review types'],['explanation','Explain My Mistakes'],['class-insight','Class Insight'],['weakspot','Performance snapshot']]) { const o=reviewNode('option',label);o.value=value;feature.append(o); }
    const date = reviewNode('input'); date.type='date';date.setAttribute('aria-label','Saved date');
    const filterButton = reviewNode('button','Filter','btn-primary'); filterButton.type='submit';
    filters.append(search,feature,date,filterButton);dialog.append(filters);
    const status=reviewNode('p','','review-muted');status.setAttribute('role','status');const list=reviewNode('div',undefined,'review-list');dialog.append(status,list);
    const more=reviewNode('button','Load more','btn-secondary');more.hidden=true;dialog.append(more);
    let offset=0, loading=false, all=[];
    function render() {
        list.replaceChildren(); const groups=new Map();
        for (const row of all) { if(!groups.has(row.set_id)) groups.set(row.set_id,[]);groups.get(row.set_id).push(row); }
        for (const versions of groups.values()) {
            const first=versions[0];const card=reviewNode('article',undefined,'saved-review-card');
            card.append(reviewNode('h3',first.title || ({'class-insight':'Class Insight','weakspot':'Performance snapshot'}[first.feature] || 'Answer review')));
            const select=reviewNode('select');select.setAttribute('aria-label','Saved version');
            for (const v of versions) { const o=reviewNode('option',`Version ${v.version} - ${v.created_at}`);o.value=v.id;select.append(o); }
            const meta=reviewNode('p','','review-muted');const question=reviewNode('p');const text=reviewNode('div',undefined,'saved-review-text');
            const remove=reviewNode('button','Delete saved version','review-delete');remove.type='button';
            const draw=()=>{ const v=versions.find(x=>String(x.id)===select.value)||first;meta.textContent=[v.subject,v.outdated==='1'||v.outdated===1?'Older source revision':'Latest saved source revision',v.feature==='weakspot'?'Calculated from saved results':'AI-generated review assistance'].filter(Boolean).join(' | ');question.textContent=v.question;text.textContent=v.text;remove.textContent='Delete saved version'; };
            select.onchange=draw;draw();card.append(select,meta,question,text);
            if(reviewRole==='student' && Number(first.quiz_id)>0) { const exportBtn=reviewNode('button','Export Reviewer','btn-primary');exportBtn.onclick=()=>exportQuizReviewer(Number(first.quiz_id),exportBtn);card.append(exportBtn); }
            remove.onclick=async()=>{if(remove.textContent!=='Confirm deletion'){remove.textContent='Confirm deletion';return;}remove.disabled=true;try{await reviewRequest('review_history.php?role='+reviewRole,{action:'delete',id:Number(select.value)});all=all.filter(v=>String(v.id)!==select.value);offset=Math.max(0,offset-1);render();status.textContent='Saved version deleted. Generation limits are unchanged.';}catch(e){status.textContent=e.message;remove.disabled=false;}};
            card.append(remove);list.append(card);
        }
    }
    async function load(reset) {
        if(loading)return; loading=true;more.disabled=true;filterButton.disabled=true;
        if(reset){offset=0;all=[];list.replaceChildren();}status.textContent='Loading saved reviews...';
        try { const params=new URLSearchParams({role:reviewRole,quiz:String(quizId),search:search.value,feature:feature.value,date:date.value,offset:String(offset)});const data=await reviewRequest('review_history.php?'+params);all.push(...data.items);offset+=data.items.length;render();more.hidden=!data.more;status.textContent=all.length?'':'No saved reviews match these filters.'; }
        catch(e){status.textContent=e.message;}finally{loading=false;more.disabled=false;filterButton.disabled=false;}
    }
    filters.onsubmit=e=>{e.preventDefault();load(true);};more.onclick=()=>load(false);await load(true);
}
async function openReviewerSettings(quizId) {
    const dialog=reviewDialog('Reviewer release settings', 'settings');const status=reviewNode('p','Loading...','review-muted');dialog.append(status);
    try {
        const {settings}=await reviewRequest(`reviewer.php?role=instructor&quiz=${quizId}`);
        const enabled=reviewNode('input');enabled.type='checkbox';enabled.checked=Boolean(Number(settings.reviewer_enabled));
        const released=reviewNode('input');released.type='checkbox';released.checked=Boolean(Number(settings.answers_released));
        const label=reviewNode('label',undefined,'review-check');const exportCopy=reviewNode('span');exportCopy.append(reviewNode('strong','Enable reviewer exports'),reviewNode('small','Students can download their own submitted quiz as a Word reviewer.'));label.append(enabled,exportCopy);
        const answers=reviewNode('label',undefined,'review-check');const answerCopy=reviewNode('span');answerCopy.append(reviewNode('strong','Release answers and explanations'),reviewNode('small','Include the answer key and saved AI explanations only after grading is complete.'));answers.append(released,answerCopy);
        const sync=()=>{released.disabled=!enabled.checked;answers.classList.toggle('is-disabled',!enabled.checked);};enabled.onchange=sync;sync();
        const save=reviewNode('button','Save release settings','btn-primary');
        status.textContent='Only the submitting student can export. Older submissions without original question snapshots remain unavailable.';
        const actions=reviewNode('div',undefined,'review-dialog-actions');const cancel=reviewNode('button','Cancel','btn-secondary');cancel.onclick=()=>dialog.closest('dialog').close();actions.append(cancel,save);dialog.append(label,answers,actions);
        save.onclick=async()=>{save.disabled=true;try{await reviewRequest(`reviewer.php?role=instructor&quiz=${quizId}`,{reviewer_enabled:enabled.checked,answers_released:enabled.checked&&released.checked});dialog.closest('dialog')?.close();}catch(e){status.textContent=e.message;}finally{save.disabled=false;}};
    }catch(e){status.textContent=e.message;}
}
let reviewerDocxPromise;
function loadReviewerDocx() {
    if(window.docx)return Promise.resolve();
    if(!reviewerDocxPromise)reviewerDocxPromise=new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js';script.onload=()=>{if(window.docx)resolve();else{reviewerDocxPromise=null;reject(new Error('Word export library unavailable.'));}};script.onerror=()=>{script.remove();reviewerDocxPromise=null;reject(new Error('Unable to load Word export. Check your connection.'));};document.head.append(script);
    });return reviewerDocxPromise;
}
function buildQuizReviewer(data) {
    const d=window.docx;
    const para=text=>new d.Paragraph({text:String(text??''),spacing:{after:140,line:276}});
    const heading=text=>new d.Paragraph({text,heading:d.HeadingLevel.HEADING_2});
    const labeled=(label,value)=>new d.Paragraph({spacing:{after:120},children:[new d.TextRun({text:label+': ',bold:true}),new d.TextRun({text:String(value??'Not recorded')})]});
    const children=[new d.Paragraph({text:'Quiz Answer Review',heading:d.HeadingLevel.TITLE}),para(data.title),window.GableDocs.table(['Record','Details'],[['Subject',data.subject],['Instructor',data.instructor],['Student',data.student],['Section',data.section],['Submitted',data.submitted_at],['Exported',window.GableDocs.timestamp()]]),para(data.answers_released?'Review your submitted answers alongside the released answer key and saved AI explanations. AI explanations are study assistance; ask your instructor about anything unclear.':'Review your submitted answers. Correct answers and AI explanations are withheld until your instructor releases them.')];
    data.questions.forEach((q,i)=>{
        children.push(heading('Question '+(i+1)),para(q.question));
        (q.choices||[]).forEach((choice,j)=>children.push(new d.Paragraph({text:`${String.fromCharCode(65+j)}. ${choice}`,indent:{left:240},spacing:{after:60}})));
        children.push(labeled('Your answer',q.student_answer),labeled('Result',q.grading));
        if(data.answers_released){
            children.push(labeled('Correct answer',q.correct_answer??'No official answer recorded. Check with your instructor.'));
            if(q.explanation){children.push(new d.Paragraph({text:'AI explanation',heading:d.HeadingLevel.HEADING_3,keepNext:true}));
                for(const line of String(q.explanation).split(/\r?\n/).map(line=>line.trim()).filter(Boolean)){
                    const bullet=/^[-*]\s+/.test(line);
                    children.push(new d.Paragraph({text:line.replace(/^#{1,6}\s+/,'').replace(/^[-*]\s+/,'').replace(/\*\*(.*?)\*\*/g,'$1'),...(bullet?{bullet:{level:0}}:{}),spacing:{after:120,line:276}}));
                }
            }else children.push(para('No saved AI explanation is available for this question.'));
        }
        children.push(new d.Paragraph({text:'Study notes',spacing:{before:160,after:300}}));
    });
    return window.GableDocs.create(children,'Quiz Answer Review');
}
async function exportQuizReviewer(quizId,button) {
    if(button)button.disabled=true;
    try {
        const {reviewer}=await reviewRequest('reviewer.php?quiz='+Number(quizId));await loadReviewerDocx();
        const blob=await window.docx.Packer.toBlob(buildQuizReviewer(reviewer));const url=URL.createObjectURL(blob);const link=reviewNode('a');link.href=url;link.download=`GABLE_Quiz_Reviewer_${Number(quizId)}.docx`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){const dialog=reviewDialog('Reviewer export', 'export');dialog.append(reviewNode('p',e.message,'review-export-message'));const actions=reviewNode('div',undefined,'review-dialog-actions');const done=reviewNode('button','Got it','btn-primary');done.onclick=()=>dialog.closest('dialog').close();actions.append(done);dialog.append(actions);}finally{if(button)button.disabled=false;}
}
document.addEventListener('DOMContentLoaded',()=>{
    if(reviewRole==='student'){const panel=document.getElementById('panel-scores');if(panel){const toolbar=reviewNode('div',undefined,'review-toolbar');const btn=reviewNode('button','Saved Reviews','btn-primary');btn.onclick=()=>openReviewHistory();toolbar.append(btn);panel.prepend(toolbar);}}
});
