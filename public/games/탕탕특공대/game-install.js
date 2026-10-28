(function(){
 'use strict';
 if(window.GAME_INSTALL_READY)return;
 const button=document.getElementById('install-app');if(!button)return;
 window.GAME_INSTALL_READY=true;
 let installPrompt;
 const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 button.textContent='내 기기에 아이콘 추가';if(standalone)button.hidden=true;
 function help(){
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const mac=!ios&&/Mac/.test(navigator.platform||navigator.userAgent);
  const android=/Android/i.test(navigator.userAgent);
  let message=ios?'Safari에서 게임 주소 열기 → 공유(또는 페이지 메뉴 → 공유) → 홈 화면에 추가 → 표시되면 웹 앱으로 열기 켜기 → 추가를 눌러 주세요. 메뉴에 없으면 동작 편집에서 홈 화면에 추가를 켜 주세요.':mac?'Safari에서 게임 주소 열기 → 공유 버튼 또는 파일 메뉴 → Dock에 추가 → 추가를 눌러 주세요.':'주소창의 설치 아이콘이나 브라우저 메뉴의 앱 설치를 선택한 뒤 설치를 확인해 주세요. Chrome·Edge에서 사용할 수 있어요.';
  if(android)message='Chrome에서 게임 주소 열기 → ⋮ 메뉴 → 홈 화면에 추가 또는 앱 설치 → 추가/설치를 눌러 주세요.';
  if(window.CURSOR_GAME_PREVIEW||location.protocol==='file:')message='지금은 제작용 미리보기예요. 완성 후 공개된 게임 주소에서 아이콘을 추가해 주세요.\n\n'+message;
  const dialog=document.getElementById('install-help'),text=document.getElementById('install-instructions');
  if(dialog&&text&&typeof dialog.showModal==='function'){text.textContent=message;if(!dialog.open)dialog.showModal();}else alert(message);
 }
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if(!standalone)button.hidden=false;});
 window.addEventListener('appinstalled',()=>{installPrompt=null;button.hidden=true;});
 button.addEventListener('click',async()=>{
  if(!installPrompt){help();return;}
  const saved=installPrompt;installPrompt=null;
  try{await saved.prompt();await saved.userChoice;}catch{help();}
 });
 document.getElementById('close-install-help')?.addEventListener('click',()=>document.getElementById('install-help')?.close());
})();
