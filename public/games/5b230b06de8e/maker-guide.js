(function(){
 'use strict';
 if(document.getElementById('maker-guide'))return;
 const data=document.getElementById('maker-guide-data');
 if(!data)return;
 let config;try{config=JSON.parse(data.textContent);}catch{return;}
 const panel=document.createElement('aside');panel.id='maker-guide';
 const heading=document.createElement('h2');heading.textContent='이 게임, 이렇게 바꿔 봐!';
 const intro=document.createElement('p');intro.textContent='원하는 예시를 AI 채팅에 보내거나, 네 아이디어를 자유롭게 적어 줘.';
 panel.append(heading,intro);
 for(const [index,item] of (config.examples||[]).entries()){
  const card=document.createElement('details'),title=document.createElement('summary'),prompt=document.createElement('p'),copy=document.createElement('button');
  card.open=index===0;
  title.textContent=item.title;prompt.textContent=item.prompt;copy.type='button';copy.textContent='요청 복사';
  copy.addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(item.prompt);copy.textContent='복사했어! AI 채팅에 붙여 넣어 줘.';}
   catch{copy.textContent='위 문장을 선택해 복사해 줘.';}
  });
  card.append(title,prompt,copy);panel.append(card);
 }
 const note=document.createElement('small');note.textContent='캐릭터·배경·물건·규칙·조작·목표까지 바꿀 수 있어. 이 안내는 최종 공개 게임에서 자동으로 빠져.';
 panel.append(note);document.body.append(panel);
})();
