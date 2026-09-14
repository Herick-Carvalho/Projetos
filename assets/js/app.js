/* ============================================================
   Fichas de Parasitologia Veterinária — lógica da aplicação
   Caminho no repositório: assets/js/app.js

   Como funciona:
   1. carrega data/manifest.json, que lista os grupos e os arquivos;
   2. carrega cada data/grupo-*.json em paralelo;
   3. renderiza o índice lateral e as fichas.

   Um arquivo de grupo com defeito não derruba a página: o grupo
   é marcado como indisponível e os demais continuam funcionando.
   ============================================================ */

const VERSAO = "1";                 // altere para forçar atualização do cache
const BASE_DADOS = "data/";
const BASE_IMG = "assets/img/";

const ROTEIRO = [
  ["Nome científico e nome popular", "nomes"],
  ["Classificação taxonômica", "taxonomia"],
  ["Desenho do parasito e principais estruturas", "desenho"],
  ["Características morfológicas principais", "morfologia"],
  ["Formas evolutivas", "formas"],
  ["Hospedeiros acometidos", "hospedeiros"],
  ["Localização no organismo", "localizacao"],
  ["Ciclo biológico", "ciclo"],
  ["Forma de transmissão", "transmissao"],
  ["Doença causada e principais sinais clínicos", "doenca"],
  ["Método de diagnóstico", "diagnostico"],
  ["Prevenção e controle", "controle"],
  ["Importância zoonótica", "zoonose"]
];

const CAMPOS_TAXON = [
  ["reino","Reino"],["filo","Filo"],["subfilo","Subfilo"],["classe","Classe"],
  ["subclasse","Subclasse"],["superordem","Superordem"],["ordem","Ordem"],
  ["subordem","Subordem"],["infraordem","Infraordem"],["familia","Família"],
  ["subfamilia","Subfamília"],["genero","Gênero"],["especie","Espécie"]
];

let GRUPOS = [];
let PARASITAS = [];

/* ---------------- Carregamento dos dados ---------------- */
async function carregarJSON(caminho){
  const r = await fetch(`${caminho}?v=${VERSAO}`, {cache:"no-cache"});
  if(!r.ok) throw new Error(`${caminho} respondeu ${r.status}`);
  return r.json();
}

async function iniciar(){
  const status = document.getElementById("statusCarga");
  let manifest;
  try{
    manifest = await carregarJSON(BASE_DADOS + "manifest.json");
  }catch(e){
    status.className = "aviso erro";
    status.innerHTML = "<b>Não foi possível carregar o manifesto dos dados.</b><br>" +
      "Verifique se o arquivo data/manifest.json existe no repositório e se a página está sendo " +
      "aberta por um servidor ou pelo GitHub Pages, e não diretamente do disco.";
    return;
  }

  GRUPOS = manifest.grupos.map(g => [g.sigla, g.nome]);

  const falhas = [];
  const cargas = await Promise.all(manifest.grupos.map(async g => {
    if(!g.arquivo) return {sigla:g.sigla, itens:g.itens || [], parcial:true};
    try{
      const dados = await carregarJSON(BASE_DADOS + g.arquivo);
      return {sigla:g.sigla, itens:dados.parasitas || []};
    }catch(e){
      falhas.push(g.nome);
      return {sigla:g.sigla, itens:g.itens || [], parcial:true};
    }
  }));

  cargas.forEach(c => c.itens.forEach(p => PARASITAS.push({...p, grupo:c.sigla})));
  PARASITAS.sort((a,b) => a.id - b.id);

  const completas = PARASITAS.filter(preenchida).length;
  status.innerHTML = `<b>Estado do preenchimento:</b> ${completas} de ${PARASITAS.length} fichas com conteúdo completo.` +
    (falhas.length ? `<br><b>Atenção:</b> não foi possível carregar: ${falhas.join(", ")}.` : "") +
    "<br>Use o índice lateral para navegar, as setas do teclado para avançar entre fichas e a opção de impressão para obter uma ficha por folha.";

  montar();
}

/* ---------------- Renderização ---------------- */
const vazio = txt => `<p class="vazio">${txt}</p>`;

function bloco(valor){
  if(!valor || (Array.isArray(valor) && !valor.length)) return vazio("Conteúdo a ser inserido.");
  if(Array.isArray(valor)) return "<ul>" + valor.map(i=>`<li>${i}</li>`).join("") + "</ul>";
  return `<p>${valor}</p>`;
}
function blocoNomes(p){
  return `<p><b>Nome científico:</b> ${p.italico?`<em>${p.cientifico}</em>`:p.cientifico}</p>
          <p><b>Nome popular:</b> ${p.popular}</p>`;
}
function blocoTaxonomia(p){
  const t = p.taxonomia;
  if(!t) return vazio("Classificação a ser inserida.");
  return `<ul class="taxon">${
    CAMPOS_TAXON.filter(([k])=>t[k]).map(([k,r])=>`<li><b>${r}</b><span>${t[k]}</span></li>`).join("")
  }</ul>`;
}
function blocoDesenho(p){
  const img = p.img || {};
  const moldura = img.arquivo
    ? `<img src="${BASE_IMG}${img.arquivo}?v=${VERSAO}" alt="Ilustração de ${p.cientifico}" loading="lazy">`
    : `<span>Espaço reservado à ilustração<br><small>desenhar ou colar a figura neste quadro</small></span>`;
  const estruturas = (img.estruturas && img.estruturas.length)
    ? `<ul>${img.estruturas.map(e=>`<li>${e}</li>`).join("")}</ul>`
    : `<p class="vazio">Relação de estruturas a ser inserida.</p>`;
  return `<div class="painel-imagem">
      <div class="moldura">${moldura}</div>
      <div class="estruturas"><h4>Estruturas a identificar no desenho</h4>${estruturas}</div>
      <div class="legenda-img"><b>Figura ${p.id}.</b> ${img.legenda || "Legenda a ser inserida."}</div>
    </div>`;
}
const grupoNome = s => (GRUPOS.find(g=>g[0]===s) || [,""])[1];
const preenchida = p => !!p.taxonomia;

function renderFicha(p, i, total){
  const el = document.createElement("section");
  el.className = "ficha";
  el.id = "p" + p.id;

  const topicos = ROTEIRO.map(([rotulo, chave], n)=>{
    let corpo;
    if(chave==="nomes") corpo = blocoNomes(p);
    else if(chave==="taxonomia") corpo = blocoTaxonomia(p);
    else if(chave==="desenho") corpo = blocoDesenho(p);
    else corpo = bloco(p[chave]);
    return `<article class="topico">
        <h3><span class="pill">${n+1}</span>${rotulo}</h3>
        <div class="conteudo"${chave==="desenho"?' style="padding:0"':""}>${corpo}</div>
      </article>`;
  }).join("");

  const obs = (p.observacoes && p.observacoes.length)
    ? `<ul>${p.observacoes.map(o=>`<li>${o}</li>`).join("")}</ul>`
    : `<p class="vazio" style="font-family:var(--serif)">Observações a serem inseridas.</p>`;

  el.innerHTML = `
    <header class="ficha-head">
      <div class="ficha-num">${p.id}</div>
      <div class="nomes">
        <h2 class="${p.italico?"":"reto"}">${p.cientifico}</h2>
        <div class="popular">${p.popular}</div>
        <span class="tag">${grupoNome(p.grupo)}</span>
      </div>
      <div class="ficha-acoes">
        <button class="btn" data-acao="marcar" data-id="${p.id}">Marcar transcrita</button>
        <button class="btn" data-acao="copiar" data-id="${p.id}">Copiar texto</button>
        <button class="btn" data-acao="link" data-id="${p.id}">Copiar link</button>
      </div>
    </header>
    <div class="ficha-corpo">
      ${topicos}
      <div class="obs"><h3>Observações</h3>${obs}</div>
      <div class="fonte"><b>Fonte:</b> ${p.fonte || "Referência a ser indicada."}</div>
    </div>
    <nav class="ficha-nav">
      <button data-nav="ant" ${i===0?"disabled":""}>← Ficha anterior</button>
      <span style="font-size:.76rem;color:var(--tinta-suave);align-self:center">Ficha ${i+1} de ${total}</span>
      <button data-nav="prox" ${i===total-1?"disabled":""}>Próxima ficha →</button>
    </nav>`;
  return el;
}

/* ---------------- Montagem e interações ---------------- */
function montar(){
  const areaFichas = document.getElementById("fichas");
  const listaIndice = document.getElementById("indiceLista");

  GRUPOS.forEach(([sigla, nome])=>{
    const doGrupo = PARASITAS.filter(p=>p.grupo===sigla);
    if(!doGrupo.length) return;
    const h = document.createElement("div");
    h.className = "grupo-titulo";
    h.textContent = nome;
    listaIndice.appendChild(h);
    doGrupo.forEach(p=>{
      const a = document.createElement("a");
      a.href = "#p" + p.id;
      a.id = "nav-p" + p.id;
      if(!preenchida(p)) a.classList.add("pendente");
      a.dataset.busca = (p.cientifico + " " + p.popular + " " + nome).toLowerCase();
      a.innerHTML = `<span class="num">${p.id}</span><span>${p.italico?`<em>${p.cientifico}</em>`:p.cientifico}</span>`;
      listaIndice.appendChild(a);
    });
  });

  PARASITAS.forEach((p,i)=> areaFichas.appendChild(renderFicha(p, i, PARASITAS.length)));

  const fichasEl = [...document.querySelectorAll(".ficha")];

  const io = new IntersectionObserver(ents=>{
    ents.forEach(e=>{
      if(e.isIntersecting){
        document.querySelectorAll(".indice a.ativo").forEach(a=>a.classList.remove("ativo"));
        const alvo = document.getElementById("nav-" + e.target.id);
        if(alvo){ alvo.classList.add("ativo"); alvo.scrollIntoView({block:"nearest"}); }
      }
    });
  },{rootMargin:"-25% 0px -65% 0px"});
  fichasEl.forEach(f=>io.observe(f));

  const irPara = i => { if(i>=0 && i<fichasEl.length) fichasEl[i].scrollIntoView({behavior:"smooth", block:"start"}); };
  const indiceAtual = () => {
    const y = window.scrollY + 120; let idx = 0;
    fichasEl.forEach((f,i)=>{ if(f.offsetTop <= y) idx = i; });
    return idx;
  };

  document.addEventListener("click", ev=>{
    const nav = ev.target.closest("[data-nav]");
    if(nav){
      const i = fichasEl.indexOf(nav.closest(".ficha"));
      irPara(nav.dataset.nav==="prox" ? i+1 : i-1);
      return;
    }
    const acao = ev.target.closest("[data-acao]");
    if(!acao) return;
    const id = acao.dataset.id;

    if(acao.dataset.acao==="marcar"){
      const link = document.getElementById("nav-p"+id);
      link.classList.toggle("feito");
      acao.textContent = link.classList.contains("feito") ? "Transcrita ✓" : "Marcar transcrita";
      salvarProgresso();
      atualizarProgresso();
    }
    if(acao.dataset.acao==="copiar"){
      const texto = document.getElementById("p"+id).innerText
        .replace(/Marcar transcrita|Transcrita ✓|Copiar texto|Copiar link|← Ficha anterior|Próxima ficha →/g,"").trim();
      navigator.clipboard?.writeText(texto);
      acao.textContent = "Copiado"; setTimeout(()=>acao.textContent="Copiar texto", 1400);
    }
    if(acao.dataset.acao==="link"){
      navigator.clipboard?.writeText(location.origin + location.pathname + "#p" + id);
      acao.textContent = "Link copiado"; setTimeout(()=>acao.textContent="Copiar link", 1400);
    }
  });

  document.addEventListener("keydown", ev=>{
    if(ev.target.tagName==="INPUT") return;
    if(ev.key==="ArrowRight" || ev.key==="PageDown"){ ev.preventDefault(); irPara(indiceAtual()+1); }
    if(ev.key==="ArrowLeft"  || ev.key==="PageUp"){ ev.preventDefault(); irPara(indiceAtual()-1); }
  });

  document.getElementById("busca").addEventListener("input", e=>{
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll(".indice a").forEach(a=>{
      a.style.display = !q || a.dataset.busca.includes(q) ? "" : "none";
    });
    document.querySelectorAll(".grupo-titulo").forEach(h=>{
      let n = h.nextElementSibling, visivel = false;
      while(n && n.tagName==="A"){ if(n.style.display!=="none") visivel = true; n = n.nextElementSibling; }
      h.style.display = visivel ? "" : "none";
    });
  });

  let escala = 1;
  const aplicar = ()=> document.documentElement.style.setProperty("--fonte-corpo", escala.toFixed(2)+"rem");
  document.getElementById("fonteMais").onclick  = ()=>{ escala = Math.min(1.5, escala+0.06); aplicar(); };
  document.getElementById("fonteMenos").onclick = ()=>{ escala = Math.max(0.82, escala-0.06); aplicar(); };
  document.getElementById("btnImprimir").onclick = ()=> window.print();

  restaurarProgresso();
  atualizarProgresso();

  if(location.hash){
    const alvo = document.querySelector(location.hash);
    if(alvo) setTimeout(()=>alvo.scrollIntoView(), 120);
  }
}

/* Progresso de transcrição, guardado no próprio navegador */
function salvarProgresso(){
  const feitos = [...document.querySelectorAll(".indice a.feito")].map(a=>a.id.replace("nav-p",""));
  try{ localStorage.setItem("fichas-transcritas", JSON.stringify(feitos)); }catch(e){}
}
function restaurarProgresso(){
  let feitos = [];
  try{ feitos = JSON.parse(localStorage.getItem("fichas-transcritas") || "[]"); }catch(e){}
  feitos.forEach(id=>{
    const link = document.getElementById("nav-p"+id);
    const btn = document.querySelector(`[data-acao="marcar"][data-id="${id}"]`);
    if(link){ link.classList.add("feito"); }
    if(btn){ btn.textContent = "Transcrita ✓"; }
  });
}
function atualizarProgresso(){
  const total = PARASITAS.length;
  const feitos = document.querySelectorAll(".indice a.feito").length;
  document.getElementById("progressoTexto").textContent = feitos + " / " + total;
  document.getElementById("progressoBarra").style.width = (total ? feitos/total*100 : 0) + "%";
}

iniciar();
