// HomologaGO \u2192 SINCETI: preenche o formul\u00e1rio "Preencher Termo de Responsabilidade T\u00e9cnica" (COD101)
// com os dados copiados no app (bot\u00e3o "Copiar dados da TRT"). Carregado pelo favorito "Preencher TRT".
// N\u00e3o digita o c\u00f3digo de valida\u00e7\u00e3o nem clica em "Cadastrar": isso fica com o profissional.
(async () => {
  if (window.__hgoTrt) return;
  window.__hgoTrt = true;
  const fim = () => { window.__hgoTrt = false };
  const $ = window.jQuery;
  const q = (s) => document.querySelector(s);
  const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
  const espera = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await dorme(150) } return null };
  const avisos = [], feitos = [];

  // painel de progresso
  const painel = document.createElement("div");
  painel.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:999999;width:360px;max-height:70vh;overflow:auto;background:#fff;border:3px solid #FF6A00;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);font:13px/1.4 Arial,sans-serif;color:#222;padding:12px 14px";
  painel.innerHTML = '<b style="color:#FF2D87;font-size:15px">HomologaGO \u00b7 Preencher TRT</b><div id="hgoLog" style="margin-top:6px"></div>';
  document.body.appendChild(painel);
  const log = (t, cor) => { const d = document.createElement("div"); d.textContent = t; if (cor) d.style.color = cor; q("#hgoLog").appendChild(d); painel.scrollTop = 1e6 };

  // confirma\u00e7\u00e3o dentro do painel (o confirm() do navegador \u00e9 cancelado sozinho quando a janelinha do app est\u00e1 em foco)
  const pergunta = (txt) => new Promise(ok => {
    const box = document.createElement("div");
    box.style.cssText = "margin:8px 0;padding:8px;border:2px solid #FF2D87;border-radius:8px;background:#fff5fa";
    const p = document.createElement("div"); p.textContent = txt; p.style.cssText = "font-weight:bold;font-size:14px;margin-bottom:6px"; box.appendChild(p);
    const bt = (t, bg, v) => { const b = document.createElement("button"); b.textContent = t; b.style.cssText = "margin-right:8px;padding:6px 14px;border:0;border-radius:6px;color:#fff;font-weight:bold;cursor:pointer;background:" + bg; b.onclick = () => { box.remove(); ok(v) }; box.appendChild(b) };
    bt("Sim, preencher", "#16a34a", true); bt("N\u00e3o", "#c00", false);
    painel.appendChild(box); painel.scrollTop = 1e6; try { window.focus() } catch (e) {}
  });


  // cadastra o contratante novo: a janela do SINCETI abre como popup; aqui ela abre num quadro dentro
  // da pr\u00f3pria p\u00e1gina (mesmo site), o que deixa o script preencher e clicar em Cadastrar.
  async function cadastraContratante(D, tipo) {
    window.__hgoErroCad = "";
    const txtDe = (x) => (x.textContent || x.value || x.title || "").replace(/\s+/g, " ").trim();
    const caixa = q("#contratante0_ResultPesquisa");
    const zonas = [caixa, caixa && caixa.parentElement, caixa && caixa.parentElement && caixa.parentElement.parentElement, q("[id^=contratante0]") && q("[id^=contratante0]").closest("fieldset,table,div")].filter(Boolean);
    let link = null;
    for (const z of zonas) { link = [...z.querySelectorAll("a,button,input[type=button],span,img")].find((x) => (x.offsetParent || x.getClientRects().length) && /cadastr|novo contratante|incluir/i.test(txtDe(x) + " " + (x.getAttribute("onclick") || "") + " " + (x.getAttribute("href") || ""))); if (link) break }
    if (!link) link = [...document.querySelectorAll("a,button,input[type=button],span")].find((x) => x.offsetParent && /n[\u00e3a]o (encontrad|cadastrad).*cadastr|clique aqui para cadastrar|cadastrar (novo )?contratante/i.test(txtDe(x)));
    if (!link) window.__hgoDiag = "texto da pesquisa: " + (caixa ? txtDe(caixa).slice(0, 160) : "(sem caixa de resultado)");
    let alvo = null; const wo = window.open;
    let ifr = null;
    const abreQuadro = (url) => {
      ifr = document.createElement("iframe"); ifr.src = url;
      ifr.style.cssText = "position:fixed;left:2vw;top:4vh;width:60vw;height:88vh;z-index:999998;background:#fff;border:3px solid #FF6A00;border-radius:10px";
      document.body.appendChild(ifr); return ifr.contentWindow;
    };
    window.open = function (url) { alvo = url; return abreQuadro(url) };
    try { if (link) link.click(); else { window.__hgoErroCad = "n\u00e3o achei o link de cadastrar; " + (window.__hgoDiag || ""); return false } } finally { setTimeout(() => { window.open = wo }, 3000) }
    await dorme(1500);
    // o formul\u00e1rio pode abrir num quadro (popup interceptado) ou na pr\u00f3pria p\u00e1gina
    const docDe = () => { try { if (ifr && ifr.contentDocument && ifr.contentDocument.body && /Nome/i.test(ifr.contentDocument.body.textContent)) return ifr.contentDocument } catch (e) {} return /Cadastrar Contratante/i.test(document.body.textContent) && [...document.querySelectorAll("input")].some((i) => i.offsetParent && /nome/i.test(i.name || i.id)) ? document : null };
    const dc = await espera(docDe, 15000);
    if (!dc) { window.__hgoErroCad = "a janela de cadastro n\u00e3o carregou"; return false }
    if (ifr) try { ifr.contentWindow.opener = window } catch (e) {}
    const W = dc.defaultView, J = W.jQuery;
    const vis = (el) => el && (el.offsetParent || el.getClientRects().length);
    const disp = (el, ...t) => { for (const x of t) { el.dispatchEvent(new W.Event(x, { bubbles: true })); if (J) try { J(el).trigger(x) } catch (e) {} } };
    // acha o campo pelo id/name ou pelo texto do r\u00f3tulo ao lado
    const campo = (re, tag = "input,select,textarea") => {
      const els = [...dc.querySelectorAll(tag)].filter(vis);
      const porNome = els.find((e) => re.test(e.id || "") || re.test(e.name || ""));
      if (porNome) return porNome;
      const rot = [...dc.querySelectorAll("label,td,th,span,div,b")].filter((e) => vis(e) && e.children.length < 3 && re.test((e.textContent || "").trim().replace(/[:*\s]+$/, "")) && (e.textContent || "").trim().length < 40);
      for (const r of rot) {
        const f = r.htmlFor && dc.getElementById(r.htmlFor); if (f) return f;
        let n = r; for (let i = 0; i < 6 && n; i++) { n = n.nextElementSibling || (n.parentElement && n.parentElement.nextElementSibling); const e = n && (n.matches && n.matches(tag) ? n : n.querySelector && n.querySelector(tag)); if (e && vis(e)) return e }
      }
      return null;
    };
    const poe = (el, v) => { if (!el || v == null || v === "") return; el.removeAttribute("readonly"); el.focus(); el.value = v; disp(el, "input", "change", "keyup", "blur") };
    const escolhe = (el, re) => { if (!el) return; const o = [...el.options].find((o) => re.test(o.text)); if (o) { el.value = o.value; disp(el, "change") } };
    const nac = [...dc.querySelectorAll("input[type=radio]")].find((r) => /nacional/i.test((r.parentElement || {}).textContent || "") && !/estrang/i.test(r.value || "")); if (nac && !nac.checked) nac.click();
    const doc = campo(tipo === "PJ" ? /cnpj/i : /cpf/i); if (doc && !doc.value.replace(/\D/g, "")) poe(doc, D.doc);
    poe(campo(tipo === "PJ" ? /raz[\u00e3a]o|^nome/i : /^nome$|nome\s*$|^NOME/i), String(D.nome).toUpperCase());
    escolhe(campo(/sexo/i, "select"), D.sexo === "F" ? /fem/i : /masc/i);
    const em = campo(/e-?mail/i); if (em) em.value = "";
    if (D.cep) {
      poe(campo(/cep/i), D.cep);
      const bt = [...dc.querySelectorAll("button,input[type=button],a")].find((b) => /endere[\u00e7c]o a partir do cep/i.test(b.textContent || b.value || ""));
      if (bt) { bt.click(); await dorme(3000) }
    }
    const preenche = (re, v) => { const e = campo(re); if (e && !String(e.value || "").trim()) poe(e, v) };
    preenche(/logradouro$/i, D.logradouro); preenche(/n[\u00fau]mero/i, D.numero || "S/N"); preenche(/bairro/i, D.bairro); preenche(/telefone|celular|fone/i, D.tel);
    const tl = campo(/tipo\s*(de\s*)?logradouro/i, "select"); if (tl && !tl.value && D.tipoLog) escolhe(tl, new RegExp("^\\s*" + D.tipoLog, "i"));
    const uf = campo(/^uf|estado/i, "select"); if (uf && !uf.value) escolhe(uf, new RegExp("^\\s*" + D.uf + "\\b|goi", "i"));
    // cidade costuma vir do CEP; se ficou vazia, tenta escolher pelo nome
    const ci = campo(/cidade|munic/i, "select"); if (ci && !ci.value) escolhe(ci, new RegExp(D.cidade.normalize("NFD").replace(/[\u0300-\u036f]/g, ""), "i"));
    await dorme(500);
    const cad = [...dc.querySelectorAll("button,input[type=button],input[type=submit],a")].filter(vis).find((b) => /^\s*cadastrar\s*$/i.test(b.textContent || b.value || ""));
    if (!cad) { window.__hgoErroCad = "n\u00e3o achei o bot\u00e3o Cadastrar da janela"; return false }
    let alerta = ""; const wa = W.alert; W.alert = (m) => { alerta = String(m) }; W.confirm = () => true;
    cad.click();
    await dorme(4000); W.alert = wa;
    const txtFim = (() => { try { return (ifr ? ifr.contentDocument.body.textContent : document.body.textContent) || "" } catch (e) { return "" } })();
    if (/obrigat|inv[\u00e1a]lid|erro/i.test(alerta) && !/sucesso/i.test(alerta)) { window.__hgoErroCad = "SINCETI respondeu: " + alerta; return false }
    if (ifr) setTimeout(() => ifr.remove(), 1500);
    log("\u2713 Contratante cadastrado" + (alerta ? " (" + alerta.slice(0, 80) + ")" : "") + " \u00b7 sexo " + (D.sexo === "F" ? "feminino" : "masculino") + " \u00b7 sem e-mail");
    return !/obrigat/i.test(txtFim) || /sucesso/i.test(alerta + txtFim);
  }
  try {
    if (!q("#FORMADEREGISTRO")) {
      log("Abra antes: TRT \u2192 Preencher Termo de Responsabilidade T\u00e9cnica e clique em \"Li e Compreendi\". Depois clique no favorito de novo.", "#c00");
      return fim();
    }
    // dados copiados no app
    let txt = window.__HGO_DADOS ? "HGO-TRT:" + JSON.stringify(window.__HGO_DADOS) : "";
    // busca os dados direto no HomologaGO (projeto aberto), sem copiar e colar
    if (!txt) {
      const APP = "https://homologa-go.vercel.app";
      log("Pegando os dados do projeto aberto no HomologaGO\u2026");
      const w = window.open(APP + "/?ponte=1", "hgoPonte", "width=520,height=320");
      if (w) {
        const dd = await new Promise((ok) => {
          const iv = setInterval(() => { try { w.postMessage({ tipo: "hgo-pronto-trt" }, APP) } catch (e) {} }, 700);
          const fn = (e) => { if (e.origin === APP && e.data && e.data.tipo === "hgo-trt") { clearInterval(iv); removeEventListener("message", fn); ok(e.data.dados) } };
          addEventListener("message", fn); setTimeout(() => { clearInterval(iv); ok(null) }, 60000);
        });
        if (dd) txt = "HGO-TRT:" + JSON.stringify(dd);
        else log("N\u00e3o recebi os dados do HomologaGO (o projeto do cliente est\u00e1 aberto no app?).", "#b45309");
      } else log("O Chrome bloqueou a janelinha do HomologaGO: permita pop-ups deste site e clique no favorito de novo.", "#b45309");
    }
    if (!txt) try { txt = await navigator.clipboard.readText() } catch (e) {}
    if (!/HGO-TRT:/.test(txt)) txt = prompt("Cole aqui (Ctrl+V) os dados copiados no HomologaGO e clique em OK:") || "";
    const m = txt.match(/HGO-TRT:(\{[\s\S]*\})/);
    if (!m) { log("N\u00e3o achei os dados. No app, clique em \"Copiar dados da TRT\" e tente de novo.", "#c00"); return fim() }
    const D = JSON.parse(m[1]);
    if (!(await pergunta("Preencher a TRT do cliente " + D.nome + "?"))) { log("Cancelado: abra o projeto certo no HomologaGO e clique no favorito de novo.", "#c00"); return fim() }
    log("Cliente: " + D.nome);

    const dispara = (el, ...tipos) => { for (const t of tipos) { el.dispatchEvent(new Event(t, { bubbles: true })); if ($) try { $(el).trigger(t) } catch (e) {} } };
    const sel = (id, v) => { const el = q("#" + id); if (!el) return false; el.value = v; dispara(el, "change"); return el.value == v };
    const txtSet = (id, v) => { const el = q("#" + id); if (!el) return false; el.removeAttribute("readonly"); el.value = v; dispara(el, "input", "change", "blur"); return true };
    const digita = (el, v) => { el.focus(); el.value = v; for (const t of ["keydown", "keypress", "input", "keyup"]) { const ev = new KeyboardEvent(t, { bubbles: true, key: String(v).slice(-1) }); el.dispatchEvent(ev) } if ($) try { $(el).trigger("keyup") } catch (e) {} };
    const clica = (el) => { if (!el) return false; el.click(); return true };

    // 1. dados gerais
    // o resto do formul\u00e1rio s\u00f3 carrega depois de escolher a forma de registro
    if (q("#FORMADEREGISTRO").value != "5" || !q("#PARTICIPACAOTECNICA")) { sel("FORMADEREGISTRO", "5"); await espera(() => q("#PARTICIPACAOTECNICA") && q("#NOVO_ATIVIDADE"), 15000); await dorme(800) }
    if (!q("#PARTICIPACAOTECNICA")) { log("O formul\u00e1rio n\u00e3o carregou depois da forma de registro. Escolha INICIAL e clique no favorito de novo.", "#c00"); return fim() }
    sel("PARTICIPACAOTECNICA", "11"); sel("FINALIDADE", D.finalidade || "29");
    sel("ACAOINSTITUCIONAL", "17"); if (q("#ENTIDADEDECLASSE")) sel("ENTIDADEDECLASSE", "1");
    txtSet("OBSERVACAO", D.obs);
    log("\u2713 Forma de registro, participa\u00e7\u00e3o, finalidade, a\u00e7\u00e3o institucional e observa\u00e7\u00e3o");

    // 2. atividade
    if (!q("#NIVEL0")) { clica(q("#NOVO_ATIVIDADE")); await espera(() => q("#NIVEL0")) }
    if (q("#NIVEL0")) {
      if (q("#NIVEL0").value != "1004") { sel("NIVEL0", "1004"); await dorme(800) }
      if (q("#ATIVIDADEPROFISSIONAL0").value != "4059") { sel("ATIVIDADEPROFISSIONAL0", "4059"); await dorme(1000) }
      const campo = await espera(() => { const c = q("#LABELATUACAO0"); return c && !c.disabled && c });
      const escolhidas = () => (q("#listaAtividadeEscolhidoATUACAO0") || {}).textContent || "";
      for (const cod of D.atividades) {
        if (new RegExp("\\b" + cod + " - ").test(escolhidas())) continue;
        if (!campo) { avisos.push("Atividade " + cod + ": escolha na lista"); continue }
        digita(campo, cod);
        const li = await espera(() => [...document.querySelectorAll("#listaAtividadeEscolherATUACAO0 li, #listaAtividadeEscolherATUACAO0 a")].find((x) => new RegExp("^\\s*" + cod + "\\b").test(x.textContent)), 6000);
        if (li) { clica(li); await espera(() => new RegExp("\\b" + cod + " - ").test(escolhidas()), 3000) }
        else avisos.push("Atividade " + cod + ": digite " + cod + " no campo de atividades e clique nela");
      }
      sel("UNIDADE0", "18923187"); txtSet("QUANTIDADE0", D.kwp);
      log("\u2713 Atividade: 13 - PROJETO \u00b7 50 - PROJETO E EXECU\u00c7\u00c3O \u00b7 " + D.atividades.join(", ") + " \u00b7 " + D.kwp + " kWp");
    } else avisos.push("N\u00e3o abriu a parte de Atividade: clique em \"Adicionar Atividade\" e rode de novo");

    // 3. contrato
    if (!q("#CONTRATO_VALOR0")) { clica(q("#NOVO_CONTRATO")); await espera(() => q("#CONTRATO_VALOR0")) }
    if (q("#CONTRATO_VALOR0")) {
      const pj = String(D.doc).length > 11, tipo = pj ? "PJ" : "PF";
      const res = () => (q("#contratante0_ResultPesquisa") || {}).textContent || "";
      if (!res().includes(D.doc) && !res().replace(/\D/g, "").includes(D.doc)) {
        clica(q("#contratante0_Contratante" + tipo)); await dorme(400);
        const c = q("#contratante0_CampoContratante" + tipo);
        if (c) {
          digita(c, D.doc);
          // lista de sugest\u00f5es (bsn.AutoSuggest): precisa do mouseover para marcar a op\u00e7\u00e3o antes do clique
          const op = await espera(() => res().trim() ? null : [...document.querySelectorAll("#as_" + c.id + " li a")].find((x) => x.offsetParent), 6000);
          if (op) { op.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); op.onmouseover && op.onmouseover(); clica(op); await dorme(1500) }
          else dispara(c, "change", "blur");
        }
      }
      const achou = await espera(() => /Nome:/i.test(res()) || /n\u00e3o (encontrad|cadastrad)|cadastr/i.test(res()) ? res() : null, 12000);
      if (achou && /Nome:/i.test(achou)) {
        log("\u2713 Contratante encontrado");
        clica(q("#proprietario0_AproveitaDados")); await dorme(800);
        log("\u2713 Propriet\u00e1rio: aproveita dados do contratante");
      } else {
        log("Contratante n\u00e3o cadastrado: cadastrando " + D.nome + "\u2026");
        const ok = await cadastraContratante(D, tipo);
        if (ok) {
          // pesquisa de novo o CPF/CNPJ j\u00e1 cadastrado
          const c = q("#contratante0_CampoContratante" + tipo);
          if (c) {
            digita(c, ""); await dorme(300); digita(c, D.doc);
            const op = await espera(() => [...document.querySelectorAll("#as_" + c.id + " li a")].find((x) => x.offsetParent), 8000);
            if (op) { op.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); op.onmouseover && op.onmouseover(); clica(op); await dorme(1500) }
          }
          if (await espera(() => /Nome:/i.test(res()), 6000)) {
            log("\u2713 Contratante cadastrado e selecionado");
            clica(q("#proprietario0_AproveitaDados")); await dorme(800);
            log("\u2713 Propriet\u00e1rio: aproveita dados do contratante");
          } else avisos.push("Contratante cadastrado, mas n\u00e3o ficou selecionado: digite o CPF " + D.doc + " no campo do contratante e clique no nome; depois marque \"Aproveita Dados do Contratante\"");
        } else avisos.push("N\u00e3o consegui cadastrar o contratante " + D.doc + " sozinho (" + (window.__hgoErroCad || "janela n\u00e3o abriu") + ")");
      }
      txtSet("CONTRATO_DATAINICIO0", D.inicio); txtSet("CONTRATO_DATAFIM0", D.fim); txtSet("CONTRATO_VALOR0", D.valor);
      log("\u2713 In\u00edcio " + D.inicio + " \u00b7 t\u00e9rmino " + D.fim + " \u00b7 valor R$ " + D.valor);

      // 4. endere\u00e7o da obra
      clica(q("input[name='escolha_endereco'][value='outro']")); await dorme(600);
      sel("CONTRATO_ENDERECO_PAIS0", q("#CONTRATO_ENDERECO_PAIS0 option[value='BRA']") ? "BRA" : q("#CONTRATO_ENDERECO_PAIS0").value);
      txtSet("CONTRATO_ENDERECO_CEP0", D.cep); await dorme(2500);
      if (D.tipoLog) sel("CONTRATO_ENDERECO_TIPOLOGRADOURO0", D.tipoLog);
      if (D.logradouro) txtSet("CONTRATO_ENDERECO_LOGRADOURO0", D.logradouro);
      txtSet("CONTRATO_ENDERECO_NUMERO0", D.numero || "S/N");
      if (D.complemento) txtSet("CONTRATO_ENDERECO_COMPLEMENTO0", D.complemento);
      if (D.bairro) txtSet("CONTRATO_ENDERECO_BAIRRO0", D.bairro);
      if (D.tel) txtSet("CONTRATO_ENDERECO_TELEFONE0", D.tel);
      // cidade (select2)
      const cid = q("#CONTRATO_ENDERECO_CIDADE0");
      const nomeCid = () => (document.querySelector("#s2id_CONTRATO_ENDERECO_CIDADE0 .select2-chosen") || {}).textContent || "";
      const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
      if (cid && $ && $.fn.select2 && !norm(nomeCid()).includes(norm(D.cidade))) {
        try {
          $(cid).select2("open");
          const inp = await espera(() => q(".select2-drop-active .select2-input") || q(".select2-input:not(.select2-offscreen)"));
          if (inp) { inp.value = D.cidade; $(inp).trigger("keyup-change"); dispara(inp, "input", "keyup") }
          const r = await espera(() => [...document.querySelectorAll(".select2-results li.select2-result-selectable")].find((x) => norm(x.textContent).includes(norm(D.cidade)) && (!D.uf || norm(x.textContent).includes(D.uf))) || [...document.querySelectorAll(".select2-results li.select2-result-selectable")].find((x) => norm(x.textContent).startsWith(norm(D.cidade))), 8000);
          if (r) { r.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); r.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })); clica(r) }
          else { $(cid).select2("close"); avisos.push("Cidade: pesquise " + D.cidade + " no campo Cidade e escolha") }
          await dorme(800);
        } catch (e) { avisos.push("Cidade: pesquise " + D.cidade + " no campo Cidade e escolha") }
      }
      log("\u2713 Endere\u00e7o da obra: " + [D.tipoLog, D.logradouro, D.numero || "S/N", D.bairro, D.cidade + "/" + D.uf, D.cep].filter(Boolean).join(", "));

      // 5. coordenadas (o SINCETI coloca Bras\u00edlia sozinho)
      if (D.lat && D.lon) {
        sel("CONTRATO_ENDERECO_TIPO_CORDENADA0", "dd");
        const man = q("#COORDENADASMANUAL0"); if (man && !man.checked) { clica(man); await dorme(300) }
        txtSet("CONTRATO_ENDERECO_LATITUDE0", D.lat); txtSet("CONTRATO_ENDERECO_LONGITUDE0", D.lon);
        log("\u2713 Coordenadas " + D.lat + ", " + D.lon);
      } else avisos.push("Coordenadas: o projeto n\u00e3o tem latitude/longitude. Preencha \u00e0 m\u00e3o (N\u00c3O deixe as de Bras\u00edlia -15.77/-47.92)");
    } else avisos.push("N\u00e3o abriu a parte de Contrato: clique em \"Adicionar Contrato\" e rode de novo");

    // confer\u00eancia final
    const lat = (q("#CONTRATO_ENDERECO_LATITUDE0") || {}).value || "";
    if (/^-?15\.77/.test(lat)) avisos.push("ATEN\u00c7\u00c3O: as coordenadas est\u00e3o em Bras\u00edlia. Corrija antes de cadastrar.");
    for (const a of avisos) log("\u26a0 " + a, "#b45309");
    log(avisos.length ? "Resolva os itens \u26a0 acima." : "Tudo preenchido.", avisos.length ? "#b45309" : "#15803d");
    log("Agora confira a p\u00e1gina, digite o c\u00f3digo de valida\u00e7\u00e3o e clique em Cadastrar.", "#FF2D87");
    const code = q("#code"); if (code) { code.scrollIntoView({ block: "center" }); code.focus() }
  } catch (e) {
    log("Erro: " + (e && e.message || e) + ". Termine \u00e0 m\u00e3o ou me mande um print.", "#c00");
  }
  const x = document.createElement("button"); x.textContent = "Fechar"; x.style.cssText = "margin-top:8px;padding:4px 12px;border:0;border-radius:6px;background:#FF6A00;color:#fff;cursor:pointer";
  x.onclick = () => painel.remove(); painel.appendChild(x);
  fim();
})();
