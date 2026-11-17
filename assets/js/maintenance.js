(() => {
 const loginPage=/\/Login\.html$/i.test(location.pathname);
 const api=new URL('../php/',document.currentScript.src);
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('../css/maintenance.css',document.currentScript.src);document.head.append(css);
 let dialog=null,deadline=0,clockOffset=0,leaving=false,polling=false;
 window.showMaintenanceToast=(message)=>{
  let toast=document.getElementById('maintenance-login-toast');
  if(!toast){toast=document.createElement('aside');toast.id='maintenance-login-toast';toast.setAttribute('role','status');const title=document.createElement('strong');title.textContent='System maintenance';const text=document.createElement('p');const close=document.createElement('button');close.type='button';close.textContent='\u00d7';close.setAttribute('aria-label','Dismiss maintenance notice');close.onclick=()=>toast.remove();toast.append(title,text,close);document.body.append(toast);}
  toast.querySelector('p').textContent=message;
 };
 async function signOut(){if(leaving)return;leaving=true;try{await fetch(new URL('logout.php',api),{method:'POST',credentials:'same-origin'});}finally{location.replace(new URL('../../pages/Login.html?maintenance=1',api));}}
 function updateCountdown(){if(!deadline||leaving)return;const remaining=Math.max(0,Math.ceil((deadline-(Date.now()+clockOffset))/1000));if(dialog)dialog.querySelector('[data-countdown]').textContent=String(remaining);if(remaining===0)signOut();}
 function warning(){if(dialog)return;dialog=document.createElement('dialog');dialog.className='maintenance-countdown';dialog.setAttribute('aria-labelledby','maintenance-warning-title');dialog.innerHTML='<span class="maintenance-label">SYSTEM NOTICE</span><h2 id="maintenance-warning-title">Maintenance starts soon</h2><p>Please save your work. Your student or instructor session will be signed out automatically.</p><div class="maintenance-timer"><strong data-countdown>60</strong><span>seconds until sign-out</span></div><p class="maintenance-hint">You can sign in again once maintenance is complete.</p><button type="button">Log out now</button>';dialog.querySelector('button').onclick=signOut;dialog.addEventListener('cancel',event=>event.preventDefault());document.body.append(dialog);dialog.showModal();updateCountdown();}
 async function check(){if(polling||leaving)return;polling=true;try{const response=await fetch(new URL('platform_status.php',api),{cache:'no-store',credentials:'same-origin'});const data=await response.json();if(!data.success)return;
  if(loginPage){if(data.maintenance)showMaintenanceToast('Student and instructor login is temporarily unavailable. Please try again after maintenance.');else document.getElementById('maintenance-login-toast')?.remove();return;}
  if(data.logout){await signOut();return;}
  clockOffset=Number(data.server_time)*1000-Date.now();deadline=Number(data.deadline)*1000;
  if(deadline){warning();updateCountdown();}else if(dialog){dialog.close();dialog.remove();dialog=null;}
 }catch(error){/* Preserve the known server deadline while offline. */}finally{polling=false;}}
 if(loginPage&&new URLSearchParams(location.search).has('maintenance'))showMaintenanceToast('You were signed out for system maintenance. Please try again when maintenance is complete.');
 check();setInterval(check,2000);setInterval(updateCountdown,250);window.addEventListener('focus',check);document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateCountdown();check();}});
})();
