// HomologaGO \u2192 Equatorial Goi\u00e1s (Or\u00e7amento de Conex\u00e3o GD): preenche o pedido de micro/minigera\u00e7\u00e3o e anexa os PDFs.
// Carregado pelo favorito "Preencher Equatorial". Os dados e os arquivos v\u00eam de uma janelinha do HomologaGO
// (homologa-go.vercel.app/?ponte=1), que l\u00ea a pasta do cliente aberto no app.
// N\u00e3o marca o "N\u00e3o sou um rob\u00f4" nem clica em Enviar no final: isso fica com o profissional.
(async () => {
  if (window.__hgoEq) return;
  window.__hgoEq = true;
  const APP = "https://homologa-go.vercel.app";
  const SOLICITANTE_ALT = "00494710152"; // regra do usu\u00e1rio: se o CPF do cliente for recusado (d\u00e9bito em aberto), usar este
  const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
  const espera = async (fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await dorme(200) } return null };
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const vis = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const avisos = [];

  const painel = document.createElement("div");
  painel.style.cssText = "position:fixed;right:16px;bottom:90px;z-index:2147483647;width:370px;max-height:70vh;overflow:auto;background:#fff;border:3px solid #FF6A00;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);font:13px/1.4 Arial,sans-serif;color:#222;padding:12px 14px";
  painel.innerHTML = '<b style="color:#FF2D87;font-size:15px">HomologaGO \u00b7 Preencher Equatorial</b><div id="hgoEqLog" style="margin-top:6px"></div>';
  document.body.appendChild(painel);
  const log = (t, cor) => { const d = document.createElement("div"); d.textContent = t; if (cor) d.style.color = cor; painel.querySelector("#hgoEqLog").appendChild(d); painel.scrollTop = 1e6 };
  const fim = () => { const x = document.createElement("button"); x.textContent = "Fechar"; x.style.cssText = "margin-top:8px;padding:4px 12px;border:0;border-radius:6px;background:#FF6A00;color:#fff;cursor:pointer"; x.onclick = () => painel.remove(); painel.appendChild(x); window.__hgoEq = false };

  // valor em campos de site com React/m\u00e1scara: usa o setter nativo e dispara os eventos
  const poe = (el, v) => {
    if (!el || v == null) return false;
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    el.focus();
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, String(v));
    for (const t of ["input", "change", "keyup", "blur"]) el.dispatchEvent(new Event(t, { bubbles: true }));
    return true;
  };
  // texto do r\u00f3tulo de um campo
  const rotulo = (el) => {
    if (el.labels && el.labels[0]) return el.labels[0].textContent;
    let n = el;
    for (let i = 0; i < 5 && n; i++) {
      n = n.parentElement; if (!n) break;
      const t = [...n.childNodes].filter((c) => !(c.contains && c.contains(el))).map((c) => c.textContent || "").join(" ").trim();
      if (t && t.length < 300) return t;
      let p = n.previousElementSibling; if (p && (p.textContent || "").trim() && (p.textContent || "").trim().length < 300 && !p.querySelector("input,select,textarea")) return p.textContent;
    }
    return el.getAttribute("aria-label") || el.placeholder || el.name || "";
  };
  const botao = (re) => [...document.querySelectorAll("button,a,input[type=button],input[type=submit],[role=button]")].filter(vis).find((b) => re.test(norm(b.textContent || b.value)));
  const temTexto = (re) => [...document.querySelectorAll("h1,h2,h3,h4,h5,p,strong,b,span,div,label")].some((e) => vis(e) && e.children.length < 4 && re.test(norm(e.textContent)));

  try {
    if (!/equatorialenergia\.com\.br$/.test(location.hostname)) { window.open("https://go.equatorialenergia.com.br/sua-conta/geracao-distribuida/parecer-de-acesso/", "_blank"); log("Abri o site da Equatorial numa aba nova. V\u00e1 para essa aba e clique no favorito l\u00e1 (n\u00e3o aqui no HomologaGO).", "#c00"); return fim() }
    if (!/parecer-de-acesso/.test(location.pathname)) { log("Abrindo a p\u00e1gina do Or\u00e7amento de Conex\u00e3o GD\u2026 Quando ela carregar, clique no favorito de novo.", "#b45309"); setTimeout(() => { location.href = "https://go.equatorialenergia.com.br/sua-conta/geracao-distribuida/parecer-de-acesso/" }, 1200); return fim() }
    // 1. pega dados e arquivos na janelinha do app
    log("Abrindo o HomologaGO para pegar os dados e os PDFs do cliente\u2026");
    const w = window.open(APP + "/?ponte=1", "hgoPonte", "width=560,height=380");
    if (!w) { log("O navegador bloqueou a janelinha do HomologaGO. Clique no \u00edcone de pop-up bloqueado na barra de endere\u00e7o, escolha \"Sempre permitir\" e clique no favorito de novo.", "#c00"); return fim() }
    const D = await new Promise((ok) => {
      const iv = setInterval(() => { try { w.postMessage({ tipo: "hgo-pronto" }, APP) } catch (e) {} }, 700);
      const fn = (e) => { if (e.origin === APP && e.data && e.data.tipo === "hgo-dados") { clearInterval(iv); removeEventListener("message", fn); ok(e.data) } };
      addEventListener("message", fn);
      setTimeout(() => { clearInterval(iv); ok(null) }, 180000);
    });
    if (!D) { log("N\u00e3o recebi os dados do HomologaGO. Abra o projeto do cliente no app e tente de novo (se a janelinha pedir, clique em \"Liberar a pasta\").", "#c00"); return fim() }
    log("\u2713 " + D.nome + " \u00b7 " + D.arquivos.length + " arquivos da pasta do cliente");

    // 2. CPF/CNPJ do solicitante (verifica\u00e7\u00e3o de d\u00e9bitos)
    const ehPasso1 = () => !temTexto(/^dados do titular da unidade$/) && [...document.querySelectorAll("input")].filter(vis).find((i) => /cpf|cnpj/.test(norm(rotulo(i))) || /^0{6,}$/.test(i.placeholder || ""));
    const pedidoVisivel = () => botao(/^microgeracao distribuida$/) || temTexto(/^selecione seu pedido/);
    const campoCpf = ehPasso1();
    if (campoCpf && !pedidoVisivel()) {
      // avisos da p\u00e1gina (alert) s\u00e3o capturados para o script decidir sozinho
      let ultimoAlerta = ""; const alertaOrig = window.alert; window.alert = (m) => { ultimoAlerta = String(m || ""); log("Equatorial: " + ultimoAlerta, "#b45309") };
      // termos LGPD ("Li e entendi o Aviso de Privacidade") precisam estar aceitos
      const aceitaTermos = async () => {
        const cb = [...document.querySelectorAll("input[type=checkbox]")].find((c) => /aviso de privacidade|li e entendi|termos/.test(norm((c.parentElement || {}).textContent)) || /aviso de privacidade|li e entendi|termos/.test(norm(rotulo(c))));
        if (!cb) return false;
        if (!cb.checked) cb.click();
        let box = cb.parentElement; for (let i = 0; i < 5 && box && !box.querySelector("button,input[type=button],input[type=submit],a.btn"); i++) box = box.parentElement;
        const b = box && [...box.querySelectorAll("button,input[type=button],input[type=submit],a")].find((x) => /enviar|aceitar|ok|concordo/.test(norm(x.textContent || x.value)));
        if (b && vis(b)) b.click();
        await dorme(800); log("\u2713 Termos de privacidade aceitos"); return true;
      };
      await aceitaTermos();
      // bot\u00e3o Enviar logo depois do campo de CPF (n\u00e3o o do aviso de privacidade)
      const enviarCpf = () => [...document.querySelectorAll("button,a,input[type=button],input[type=submit]")].filter((b) => vis(b) && /^enviar$/.test(norm(b.textContent || b.value)) && (campoCpf.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING))[0];
      const tenta = async (cpf) => {
        ultimoAlerta = "";
        poe(campoCpf, cpf); await dorme(300);
        const env = enviarCpf() || botao(/^enviar$/); if (env) env.click();
        let ok = await espera(() => pedidoVisivel() || ultimoAlerta, 12000);
        if (ok && /termos/i.test(ultimoAlerta) && !pedidoVisivel()) { await aceitaTermos(); ultimoAlerta = ""; const e2 = enviarCpf() || botao(/^enviar$/); if (e2) e2.click(); ok = await espera(pedidoVisivel, 12000) }
        return pedidoVisivel() ? true : null;
      };
      const ok1 = await tenta(D.doc);
      if (ok1) log("\u2713 CPF/CNPJ do cliente aceito");
      else {
        log("CPF/CNPJ do cliente recusado (prov\u00e1vel d\u00e9bito em aberto). Usando o CPF alternativo\u2026", "#b45309");
        if (await tenta(SOLICITANTE_ALT)) log("\u2713 CPF alternativo aceito");
        else { log("A Equatorial n\u00e3o aceitou nenhum dos dois CPFs. Veja a mensagem na p\u00e1gina.", "#c00"); window.alert = alertaOrig; return fim() }
      }
      window.alert = alertaOrig;
    }
    // 3. Micro ou mini, e pessoa f\u00edsica ou jur\u00eddica
    if (pedidoVisivel()) { const b = botao(D.mini ? /^minigeracao distribuida$/ : /^microgeracao distribuida$/); if (b) { b.click(); log("\u2713 " + (D.mini ? "Minigera\u00e7\u00e3o" : "Microgera\u00e7\u00e3o") + " distribu\u00edda") } await dorme(1200) }
    const bPessoa = await espera(() => temTexto(/^dados do titular da unidade$/) ? "ok" : botao(D.pj ? /^pessoa juridica$/ : /^pessoa fisica$/), 8000);
    if (bPessoa && bPessoa !== "ok") { bPessoa.click(); log("\u2713 Pessoa " + (D.pj ? "Jur\u00eddica" : "F\u00edsica")); }
    if (!(await espera(() => temTexto(/^dados do titular da unidade$/), 10000))) { log("O formul\u00e1rio n\u00e3o abriu. Abra at\u00e9 a tela \"Dados do titular da unidade\" e clique no favorito de novo.", "#c00"); return fim() }
    await dorme(600);

    // 4. campos de texto, por se\u00e7\u00e3o
    const secoes = [["tit", /^dados do titular da unidade$/], ["rt", /^responsavel tecnico$/], ["tec", /^dados tecnicos:?$/], ["docs", /^envie abaixo a copia dos documentos/]]
      .map(([k, re]) => [k, [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,strong,b,span,div,label,legend")].find((e) => vis(e) && e.children.length < 3 && re.test(norm(e.textContent)))]).filter((x) => x[1]);
    const secaoDe = (el) => { let s = ""; for (const [k, h] of secoes) if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) s = k; return s };
    const campos = [...document.querySelectorAll("input,select,textarea")].filter((i) => vis(i) && !/^(hidden|file|checkbox|radio|submit|button)$/.test(i.type || ""));
    const regras = {
      tit: [[/nome/, D.nome], [/cpf|cnpj/, D.doc], [/^telefone/, D.tel], [/celular/, D.cel]],
      rt: [[/nome/, D.rtNome], [/crea|crt|cft/, D.rtReg], [/cpf/, D.rtCpf], [/e-?mail/, D.rtEmail], [/^telefone/, D.rtTel], [/celular/, D.rtTel]],
      tec: [[/disjuntor/, D.disj]],
      docs: [[/confirme/, D.email], [/e-?mail/, D.email]],
    };
    let n = 0;
    for (const el of campos) {
      const sec = secaoDe(el), r = norm(rotulo(el)).replace(/\*/g, "").trim();
      const regra = (regras[sec] || []).find(([re]) => re.test(r));
      if (!regra) continue;
      if (!regra[1]) { avisos.push("Sem dado para \"" + r + "\" (" + ({ tit: "titular", rt: "respons\u00e1vel t\u00e9cnico", tec: "dados t\u00e9cnicos", docs: "e-mail" })[sec] + "). Complete no HomologaGO."); continue }
      if (poe(el, regra[1])) n++;
    }
    log("\u2713 " + n + " campos preenchidos (titular, respons\u00e1vel t\u00e9cnico, disjuntor " + D.disj + " A, e-mail)");

    // 5. anexos
    const arq = D.arquivos.map((a) => ({ ...a, n: norm(a.nome) }));
    const ultimo = (re) => arq.filter((a) => re.test(a.n)).sort((a, b) => b.data - a.data)[0];
    const docCli = () => arq.filter((a) => /^09_documento_cliente/.test(a.n)).sort((a, b) => (/(rg|cnh|ident|document|cpf)/.test(b.n) ? 1 : 0) - (/(rg|cnh|ident|document|cpf)/.test(a.n) ? 1 : 0))[0];
    const mapa = [
      [/identificacao do titular/, () => [docCli()]],
      [/^procuracao/, () => [ultimo(/^10_procuracao/) || ultimo(/procura/)]],
      [/identificacao do procurador/, () => [ultimo(/^11_documento_procurador/)]],
      [/formulario de solicitacao/, () => [ultimo(/^01_/)]],
      [/memorial tecnico/, () => [ultimo(/^02_/)]],
      [/art\/trt|art \/ trt/, () => [ultimo(/^00_art_trt_assinada/) || ultimo(/(art|trt).*\.pdf$/)]],
      [/diagrama unifilar/, () => [ultimo(/^03_/)]],
      [/diagrama de blocos/, () => [ultimo(/^04_/)]],
      [/relatorio de ensaio/, () => [ultimo(/^08_inmetro_inversor/)]],
      [/lista de unidades consumidoras/, () => (D.modalidade && !/local/i.test(D.modalidade) ? [ultimo(/^07_/)] : [])],
      [/documentos adicionais/, (multi) => (multi ? [ultimo(/^05_/), ultimo(/^06_/), ultimo(/^08_inmetro_modulo/)] : [ultimo(/^05_/)])],
    ];
    const anexados = [];
    for (const inp of [...document.querySelectorAll("input[type=file]")].filter((i) => vis(i) || vis(i.parentElement))) {
      const r = norm(rotulo(inp)), m = mapa.find(([re]) => re.test(r));
      if (!m) continue;
      const lista = m[1](inp.multiple).filter(Boolean);
      if (!lista.length) { if (/\*/.test(rotulo(inp)) && !/identificacao do titular/.test(r)) avisos.push("N\u00e3o achei na pasta o arquivo para \"" + rotulo(inp).replace(/\s+/g, " ").trim().slice(0, 70) + "\""); continue }
      try {
        const dt = new DataTransfer();
        for (const a of lista) dt.items.add(new File([a.buf], a.nome, { type: a.tipo || (/\.pdf$/i.test(a.nome) ? "application/pdf" : "") }));
        inp.files = dt.files;
        inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
        anexados.push(lista.map((a) => a.nome).join(" + "));
      } catch (e) { avisos.push("N\u00e3o consegui anexar em \"" + r.slice(0, 50) + "\": " + e.message) }
    }
    for (const a of anexados) log("\ud83d\udcce " + a);
    if (!docCli()) avisos.push("Documento do titular (RG/CNH) n\u00e3o est\u00e1 na pasta do cliente: anexe \u00e0 m\u00e3o ou gere de novo os documentos de um projeto criado com os documentos do cliente.");

    for (const a of avisos) log("\u26a0 " + a, "#b45309");
    log("Confira a p\u00e1gina, marque \"N\u00e3o sou um rob\u00f4\" e clique em Enviar.", "#FF2D87");
    const env = [...document.querySelectorAll("button,input[type=submit]")].filter(vis).pop(); if (env) env.scrollIntoView({ block: "center" });
  } catch (e) {
    log("Erro: " + (e && e.message || e) + ". Me mande um print deste quadro.", "#c00");
  }
  fim();
})();
