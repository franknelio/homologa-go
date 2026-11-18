// Servidor dos testes: serve public/ e imita as telas do SINCETI usadas pelo favorito (main.php).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json", ".css": "text/css" };
const TRT = "<!doctype html><html><head><meta charset=utf-8></head><body>\n<select id=FORMADEREGISTRO><option value=5 selected>INICIAL</option></select><select id=PARTICIPACAOTECNICA><option value=11>x</option></select><span id=NOVO_ATIVIDADE></span>\n<input id=CONTRATO_VALOR0><input id=CONTRATO_DATAINICIO0><input id=CONTRATO_DATAFIM0>\n<div id=bloco></div>\n<script>\nvar ultima=null;\nsetTimeout(function(){\n document.getElementById('bloco').innerHTML='<input type=radio name=contratante0 id=contratante0_ContratantePF>PF <input type=radio name=contratante0 id=contratante0_ContratantePFNome>PF Nome'+\n '<div id=contC style=\"display:none\">CPF:<input id=contratante0_CampoContratantePF></div><div id=contN style=\"display:none\">Nome:<input id=contratante0_CampoContratantePFNome></div>'+\n '<ul id=as_contratante0_CampoContratantePF></ul><ul id=as_contratante0_CampoContratantePFNome></ul><div id=contratante0_ResultPesquisa style=\"display:none\"></div>'+\n '<input type=radio name=prop id=proprietario0_AproveitaDados>Aproveita';\n var r1=document.getElementById('contratante0_ContratantePF'),r2=document.getElementById('contratante0_ContratantePFNome');\n r1.onclick=function(){contC.style.display='';contN.style.display='none'};r2.onclick=function(){contN.style.display='';contC.style.display='none'};\n function busca(inp,ul,modo){inp.addEventListener('keyup',function(){var v=inp.value;if(v===ultima)return;ultima=v;setTimeout(function(){\n   fetch('/api?q='+encodeURIComponent(v)+'&m='+modo).then(r=>r.json()).then(function(j){ul.innerHTML='';var R=document.getElementById('contratante0_ResultPesquisa');\n    if(j.length){j.forEach(function(x){var li=document.createElement('li');li.innerHTML='<a href=#>'+x+'</a>';li.firstChild.onclick=function(){R.style.display='';R.innerHTML='Nome: '+x;ul.innerHTML='';return false};ul.appendChild(li)})}\n    else if(modo=='c'&&v.replace(/\\D/g,'').length==11){R.style.display='';R.innerHTML='<a href=# class=bt onclick=\"window.open(\\'main.php?form=CadastrarContratantePF&popup=1\\');return false\">Contratante n\u00e3o encontrado. Clique aqui para cadastrar</a>'}\n   })},300)})}\n busca(document.getElementById('contratante0_CampoContratantePF'),document.getElementById('as_contratante0_CampoContratantePF'),'c');\n busca(document.getElementById('contratante0_CampoContratantePFNome'),document.getElementById('as_contratante0_CampoContratantePFNome'),'n');\n},2000);\n</script></body></html>";
const CAD = "<!doctype html><html><head><meta charset=utf-8></head><body><form onsubmit=\"return salvar()\">\n<input type=radio name=TIPO_TIPO value=PF> Nacional <input type=radio name=TIPO_TIPO value=PFE> Estrangeiro<br>\nCPF <input id=CPF><br>Nome <input id=NOME><br><select id=SEXO><option value=\"\" disabled>Sel</option><option value=M>M</option><option value=F>F</option></select><input id=EMAIL>\n<select id=ENDERECO_PAIS><option value=\"\">Sel</option><option value=1>Brasil</option></select><input id=CEP><a href=# id=aproveitarCEP onclick=\"UF.value='GO';CIDADE.value='9';return false\">Preencher endere\u00e7o a partir do CEP</a>\n<select id=TIPOLOGRADOURO><option value=\"\"></option><option value=RUA>RUA</option></select><input id=LOGRADOURO><input id=ENDERECO_NUMERO><input id=BAIRRO maxlength=30>\n<select id=CIDADE><option value=\"\"></option><option value=9>VICENTIN\u00d3POLIS</option></select><input id=UF readonly><input id=ENDERECO_TELEFONE>\n<input id=save type=submit value=Cadastrar></form><div id=out></div>\n<script>function salvar(){var f=['CPF','NOME','SEXO','TIPOLOGRADOURO','LOGRADOURO','ENDERECO_NUMERO','BAIRRO','UF','CEP'].filter(function(i){return !document.getElementById(i).value});\nif(f.length){out.innerHTML='<div class=formErrorContent>* Campo Obrigat\u00f3rio '+f.join(',')+'</div>';return false}\nfetch('/reg?cpf='+CPF.value.replace(/\\D/g,'')+'&nome='+encodeURIComponent(NOME.value)).then(function(){out.innerHTML='Contratante cadastrado com sucesso';try{opener.document.getElementById('contratante0_ContratantePF').checked=false}catch(e){}});return false}</script></body></html>";

export function iniciar() {
  const REG = new Set();
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    const out = (b, ct = "text/html; charset=utf-8", st = 200) => { res.writeHead(st, { "content-type": ct }); res.end(b) };
    if (u.pathname.endsWith("main.php")) return out(/Contratante/.test(u.searchParams.get("form") || "") ? CAD : TRT);
    if (u.pathname === "/api") {
      const q = u.searchParams.get("q") || "", m = u.searchParams.get("m");
      const r = [...REG].map((x) => x.split("|")).filter(([c, n]) => (m === "c" ? c === q.replace(/\D/g, "") : n.toUpperCase().includes(q.toUpperCase()))).map(([c, n]) => n + " - " + c);
      return out(JSON.stringify(r), "application/json");
    }
    if (u.pathname === "/reg") { REG.add(u.searchParams.get("cpf") + "|" + u.searchParams.get("nome")); return out("ok") }
    if (u.pathname.startsWith("/api/")) return out("{}", "application/json", 404);
    let f = path.join(RAIZ, decodeURIComponent(u.pathname));
    if (!f.startsWith(RAIZ)) return out("", "text/plain", 403);
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) return out("", "text/plain", 404);
    out(fs.readFileSync(f), TIPOS[path.extname(f)] || "application/octet-stream");
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok({ url: `http://127.0.0.1:${srv.address().port}`, fechar: () => srv.close() })));
}
