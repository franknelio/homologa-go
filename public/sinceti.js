// HomologaGO → SINCETI: preenche o formulário "Preencher Termo de Responsabilidade Técnica" (COD101)
// com os dados copiados no app (botão "Copiar dados da TRT"). Carregado pelo favorito "Preencher TRT".
// Não digita o código de validação nem clica em "Cadastrar": isso fica com o profissional.
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
  painel.innerHTML = '<b style="color:#FF2D87;font-size:15px">HomologaGO · Preencher TRT</b><div id="hgoLog" style="margin-top:6px"></div>';
  document.body.appendChild(painel);
  const log = (t, cor) => { const d = document.createElement("div"); d.textContent = t; if (cor) d.style.color = cor; q("#hgoLog").appendChild(d); painel.scrollTop = 1e6 };

  try {
    if (!q("#FORMADEREGISTRO")) {
      log("Abra antes: TRT → Preencher Termo de Responsabilidade Técnica e clique em \"Li e Compreendi\". Depois clique no favorito de novo.", "#c00");
      return fim();
    }
    // dados copiados no app
    let txt = window.__HGO_DADOS ? "HGO-TRT:" + JSON.stringify(window.__HGO_DADOS) : "";
    if (!txt) try { txt = await navigator.clipboard.readText() } catch (e) {}
    if (!/HGO-TRT:/.test(txt)) txt = prompt("Cole aqui (Ctrl+V) os dados copiados no HomologaGO e clique em OK:") || "";
    const m = txt.match(/HGO-TRT:(\{[\s\S]*\})/);
    if (!m) { log("Não achei os dados. No app, clique em \"Copiar dados da TRT\" e tente de novo.", "#c00"); return fim() }
    const D = JSON.parse(m[1]);
    log("Cliente: " + D.nome);

    const dispara = (el, ...tipos) => { for (const t of tipos) { el.dispatchEvent(new Event(t, { bubbles: true })); if ($) try { $(el).trigger(t) } catch (e) {} } };
    const sel = (id, v) => { const el = q("#" + id); if (!el) return false; el.value = v; dispara(el, "change"); return el.value == v };
    const txtSet = (id, v) => { const el = q("#" + id); if (!el) return false; el.removeAttribute("readonly"); el.value = v; dispara(el, "input", "change", "blur"); return true };
    const digita = (el, v) => { el.focus(); el.value = v; for (const t of ["keydown", "keypress", "input", "keyup"]) { const ev = new KeyboardEvent(t, { bubbles: true, key: String(v).slice(-1) }); el.dispatchEvent(ev) } if ($) try { $(el).trigger("keyup") } catch (e) {} };
    const clica = (el) => { if (!el) return false; el.click(); return true };

    // 1. dados gerais
    // o resto do formulário só carrega depois de escolher a forma de registro
    if (q("#FORMADEREGISTRO").value != "5" || !q("#PARTICIPACAOTECNICA")) { sel("FORMADEREGISTRO", "5"); await espera(() => q("#PARTICIPACAOTECNICA") && q("#NOVO_ATIVIDADE"), 15000); await dorme(800) }
    if (!q("#PARTICIPACAOTECNICA")) { log("O formulário não carregou depois da forma de registro. Escolha INICIAL e clique no favorito de novo.", "#c00"); return fim() }
    sel("PARTICIPACAOTECNICA", "11"); sel("FINALIDADE", D.finalidade || "29");
    sel("ACAOINSTITUCIONAL", "17"); if (q("#ENTIDADEDECLASSE")) sel("ENTIDADEDECLASSE", "1");
    txtSet("OBSERVACAO", D.obs);
    log("✓ Forma de registro, participação, finalidade, ação institucional e observação");

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
      log("✓ Atividade: 13 - PROJETO · 50 - PROJETO E EXECUÇÃO · " + D.atividades.join(", ") + " · " + D.kwp + " kWp");
    } else avisos.push("Não abriu a parte de Atividade: clique em \"Adicionar Atividade\" e rode de novo");

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
          // lista de sugestões (bsn.AutoSuggest): precisa do mouseover para marcar a opção antes do clique
          const op = await espera(() => res().trim() ? null : [...document.querySelectorAll("#as_" + c.id + " li a")].find((x) => x.offsetParent), 6000);
          if (op) { op.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); op.onmouseover && op.onmouseover(); clica(op); await dorme(1500) }
          else dispara(c, "change", "blur");
        }
      }
      const achou = await espera(() => /Nome:/i.test(res()) || /não encontrado/i.test(res()) ? res() : null, 6000);
      if (achou && /Nome:/i.test(achou)) {
        log("✓ Contratante encontrado");
        clica(q("#proprietario0_AproveitaDados")); await dorme(800);
        log("✓ Proprietário: aproveita dados do contratante");
      } else {
        avisos.push("Contratante " + D.doc + " não está cadastrado no SINCETI: clique em \"Contratante não encontrado. Clique aqui para cadastrar\", cadastre (sem e-mail), depois marque \"Aproveita Dados do Contratante\" no Proprietário");
      }
      txtSet("CONTRATO_DATAINICIO0", D.inicio); txtSet("CONTRATO_DATAFIM0", D.fim); txtSet("CONTRATO_VALOR0", D.valor);
      log("✓ Início " + D.inicio + " · término " + D.fim + " · valor R$ " + D.valor);

      // 4. endereço da obra
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
      const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
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
      log("✓ Endereço da obra: " + [D.tipoLog, D.logradouro, D.numero || "S/N", D.bairro, D.cidade + "/" + D.uf, D.cep].filter(Boolean).join(", "));

      // 5. coordenadas (o SINCETI coloca Brasília sozinho)
      if (D.lat && D.lon) {
        sel("CONTRATO_ENDERECO_TIPO_CORDENADA0", "dd");
        const man = q("#COORDENADASMANUAL0"); if (man && !man.checked) { clica(man); await dorme(300) }
        txtSet("CONTRATO_ENDERECO_LATITUDE0", D.lat); txtSet("CONTRATO_ENDERECO_LONGITUDE0", D.lon);
        log("✓ Coordenadas " + D.lat + ", " + D.lon);
      } else avisos.push("Coordenadas: o projeto não tem latitude/longitude. Preencha à mão (NÃO deixe as de Brasília -15.77/-47.92)");
    } else avisos.push("Não abriu a parte de Contrato: clique em \"Adicionar Contrato\" e rode de novo");

    // conferência final
    const lat = (q("#CONTRATO_ENDERECO_LATITUDE0") || {}).value || "";
    if (/^-?15\.77/.test(lat)) avisos.push("ATENÇÃO: as coordenadas estão em Brasília. Corrija antes de cadastrar.");
    for (const a of avisos) log("⚠ " + a, "#b45309");
    log(avisos.length ? "Resolva os itens ⚠ acima." : "Tudo preenchido.", avisos.length ? "#b45309" : "#15803d");
    log("Agora confira a página, digite o código de validação e clique em Cadastrar.", "#FF2D87");
    const code = q("#code"); if (code) { code.scrollIntoView({ block: "center" }); code.focus() }
  } catch (e) {
    log("Erro: " + (e && e.message || e) + ". Termine à mão ou me mande um print.", "#c00");
  }
  const x = document.createElement("button"); x.textContent = "Fechar"; x.style.cssText = "margin-top:8px;padding:4px 12px;border:0;border-radius:6px;background:#FF6A00;color:#fff;cursor:pointer";
  x.onclick = () => painel.remove(); painel.appendChild(x);
  fim();
})();
