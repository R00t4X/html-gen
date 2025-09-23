// helpers
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const escapeHTML = (s="") => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const escapeAttr = (s="") => s.replace(/"/g,"&quot;");

// dom
const form = $("#genForm");
const iframe = $("#preview");
const btnCopy = $("#btnCopy");
const btnDownload = $("#btnDownload");
const btnReset = $("#btnReset");
const lists = {
  code: $("#codeList"),
  img: $("#imgList"),
};

// init
window.addEventListener("DOMContentLoaded", () => {
  addRow("code");
  addRow("img");

  $$("button[data-add]").forEach(btn => btn.addEventListener("click", () => addRow(btn.dataset.add)));

  form.addEventListener("submit", e => {
    e.preventDefault();
    render();
  });

  btnCopy.addEventListener("click", async () => {
    const html = buildHTML(collect());
    try {
      await navigator.clipboard.writeText(html);
      flash(btnCopy, "Скопировано");
    } catch {
      const ta = document.createElement("textarea");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      ta.value = html; document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand("copy");
      ta.remove();
      flash(btnCopy, "Скопировано");
    }
  });

  btnDownload.addEventListener("click", () => {
    const data = collect();
    const blob = new Blob([buildHTML(data)], {type:"text/html;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (slugify(data.title||"instruction")) + ".html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  });

  btnReset.addEventListener("click", () => {
    lists.code.innerHTML = "";
    lists.img.innerHTML  = "";
    addRow("code");
    addRow("img");
    setTimeout(render,0);
  });

  render();
});

// rows
function addRow(kind){
  const wrap = lists[kind];
  const row = document.createElement("div");
  row.className = "row";

  if(kind === "code"){
    row.innerHTML = `
      <textarea placeholder="Код / команды"></textarea>
      <div class="dyn-actions">
        <select class="lang">
          <option value="">текст</option>
          <option value="bash">bash</option>
          <option value="sh">sh</option>
          <option value="yaml">yaml</option>
          <option value="json">json</option>
          <option value="ini">ini</option>
          <option value="sql">sql</option>
          <option value="python">python</option>
          <option value="javascript">javascript</option>
        </select>
        <button type="button" class="btn btn--danger" data-del>Удалить</button>
      </div>
    `;
  } else if (kind === "img"){
    row.innerHTML = `
      <input type="url" class="img-url" placeholder="https://.../image.png" />
      <div class="dyn-actions">
        <input type="text" class="img-alt" placeholder="Подпись (alt)" />
        <button type="button" class="btn btn--danger" data-del>Удалить</button>
      </div>
    `;
  }

  wrap.appendChild(row);
  row.addEventListener("click", (e)=>{
    if(e.target.matches("[data-del]")) row.remove();
  });
}

// collect
function collect(){
  return {
    title: $("#title").value.trim(),
    desc:  $("#desc").value.trim(),
    codes: $$("#codeList .row").map(r => ({
      lang: $(".lang", r).value.trim(),
      body: $("textarea", r).value
    })).filter(c => c.body.trim()),
    images: $$("#imgList .row").map(r => ({
      url: $(".img-url", r).value.trim(),
      alt: $(".img-alt", r).value.trim()
    })).filter(i => i.url),
  };
}

// build final page
function buildHTML(d){
  const title = escapeHTML(d.title || "Инструкция");
  const desc  = d.desc ? `<section class="section"><p>${toHTML(d.desc)}</p></section>` : "";

  const codes = d.codes.length
    ? `<section class="section"><h2>Код / Команды</h2>${d.codes.map(c =>
         `<pre class="code" data-lang="${escapeAttr(c.lang)}"><code>${escapeHTML(c.body)}</code></pre>`
       ).join("")}</section>`
    : "";

  const images = d.images.length
    ? `<section class="section"><h2>Иллюстрации</h2><div class="img-wrap">${
         d.images.map(i => `<figure><img src="${escapeAttr(i.url)}" alt="${escapeAttr(i.alt)}"><figcaption class="muted">${escapeHTML(i.alt||"")}</figcaption></figure>`).join("")
       }</div></section>`
    : "";

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{margin:0}
    .gen{max-width:880px;margin:0 auto;padding:24px 22px 64px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1e26;line-height:1.6}
    .gen h1{margin:0 0 12px}
    .gen p{margin:0 0 8px}
    .gen .section{margin:16px 0}
    .gen .muted{color:#5a667a}
    .gen .code{background:#0f172a;color:#e2e8f0;border-radius:8px;padding:12px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:14px;border:1px solid #0b1227}
    .gen .img-wrap{display:flex;gap:12px;flex-wrap:wrap}
    .gen figure{margin:0}
    .gen img{max-width:260px;border:1px solid #e6e9f0;border-radius:8px}
  </style>
</head>
<body>
  <article class="gen">
    <h1>${title}</h1>
    ${desc}
    ${codes}
    ${images}
  </article>
</body>
</html>`;
}

// preview
function render(){
  const html = buildHTML(collect());
  if("srcdoc" in iframe){ iframe.srcdoc = html; }
  else {
    const win = iframe.contentWindow || iframe.contentDocument;
    const doc = win.document || win;
    doc.open(); doc.write(html); doc.close();
  }
}

// utils
function toHTML(txt){
  // инлайн-код `...`, переносы
  let s = escapeHTML(txt);
  s = s.replace(/`([^`]+)`/g, (_m, g1) => `<code class="muted">${g1}</code>`);
  s = s.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>");
  return `<p>${s}</p>`;
}
function slugify(s=""){
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9\u0400-\u04FF]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase();
}
function flash(btn, text){
  const t = btn.textContent; btn.textContent = text; btn.disabled = true;
  setTimeout(()=>{ btn.textContent=t; btn.disabled=false; }, 900);
}

