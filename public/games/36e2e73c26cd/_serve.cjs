const http=require("http"),fs=require("fs"),path=require("path");
const root=process.cwd();
http.createServer((q,s)=>{
  let u=decodeURIComponent((q.url||"/").split("?")[0]);
  if(u==="/")u="/index.html";
  const f=path.normalize(path.join(root,u.replace(/^\//,"")));
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);s.end("missing");return;}
  const ext=path.extname(f);
  const types={".html":"text/html;charset=utf-8",".js":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8",".json":"application/json",".mjs":"text/javascript;charset=utf-8"};
  s.writeHead(200,{"Content-Type":types[ext]||"application/octet-stream","Cache-Control":"no-store"});
  fs.createReadStream(f).pipe(s);
}).listen(8767,"127.0.0.1",()=>console.log("READY"));
