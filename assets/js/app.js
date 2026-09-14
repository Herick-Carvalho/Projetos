/* ============================================================
   Fichas de Parasitologia Veterinária — Lógica da Aplicação
   Caminho no repositório: assets/js/app.js

   Recursos:
   1. Carregamento resiliente do manifesto e dados dos grupos;
   2. Renderização responsiva do sumário e das fichas;
   3. Rolagem estável sem travamentos ou cancelamento de navegação;
   4. Suporte mobile completo com gaveta lateral (drawer) e FAB;
   5. Busca instantânea, filtros por status e controle de transcrição.
   ============================================================ */

const VERSAO = "7";
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
  ["reino", "Reino"], ["filo", "Filo"], ["subfilo", "Subfilo"], ["classe", "Classe"],
  ["subclasse", "Subclasse"], ["superordem", "Superordem"], ["ordem", "Ordem"],
  ["subordem", "Subordem"], ["infraordem", "Infraordem"], ["familia", "Família"],
  ["subfamilia", "Subfamília"], ["genero", "Gênero"], ["especie", "Espécie"]
];

let GRUPOS = [];
let PARASITAS = [];
let fichasEl = [];
let filtroStatusAtual = "todos";

// Trava contra interferência de observadores durante rolagem programada
let isNavigatingProgrammatically = false;
let navTimeout = null;

function marcarNavegacaoProgramada(duracao = 750) {
  isNavigatingProgrammatically = true;
  if (navTimeout) clearTimeout(navTimeout);
  navTimeout = setTimeout(() => {
    isNavigatingProgrammatically = false;
  }, duracao);
}

/* ---------------- Carregamento dos dados ---------------- */
async function carregarJSON(caminho) {
  const r = await fetch(`${caminho}?v=${VERSAO}`, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${caminho} respondeu ${r.status}`);
  return r.json();
}

async function iniciar() {
  const status = document.getElementById("statusCarga");
  let manifest;
  try {
    manifest = await carregarJSON(BASE_DADOS + "manifest.json");
  } catch (e) {
    if (status) {
      status.className = "aviso erro";
      status.innerHTML = "<b>Não foi possível carregar o manifesto dos dados.</b><br>" +
        "Verifique se o arquivo data/manifest.json existe no repositório e se a página está sendo " +
        "aberta por um servidor local ou pelo GitHub Pages.";
    }
    return;
  }

  GRUPOS = manifest.grupos.map(g => [g.sigla, g.nome]);

  const falhas = [];
  const cargas = await Promise.all(manifest.grupos.map(async g => {
    if (!g.arquivo) return { sigla: g.sigla, itens: g.itens || [], parcial: true };
    try {
      const dados = await carregarJSON(BASE_DADOS + g.arquivo);
      return { sigla: g.sigla, itens: dados.parasitas || [] };
    } catch (e) {
      falhas.push(g.nome);
      return { sigla: g.sigla, itens: g.itens || [], parcial: true };
    }
  }));

  PARASITAS = [];
  cargas.forEach(c => c.itens.forEach(p => PARASITAS.push({ ...p, grupo: c.sigla })));
  PARASITAS.sort((a, b) => a.id - b.id);

  const completas = PARASITAS.filter(preenchida).length;
  if (status) {
    status.innerHTML = `<b>Estado do preenchimento:</b> ${completas} de ${PARASITAS.length} fichas com dados completos.` +
      (falhas.length ? `<br><small style="opacity:.85">Grupos aguardando dados adicionais: ${falhas.join(", ")}.</small>` : "") +
      "<br>Navegue pelo sumário lateral/gaveta ou use as setas do teclado para avançar entre as fichas.";
  }

  montar();
}

/* ---------------- Renderização ---------------- */
const vazio = txt => `<p class="vazio">${txt}</p>`;

function bloco(valor) {
  if (!valor || (Array.isArray(valor) && !valor.length)) return vazio("Conteúdo a ser inserido.");
  if (Array.isArray(valor)) return "<ul>" + valor.map(i => `<li>${i}</li>`).join("") + "</ul>";
  return `<p>${valor}</p>`;
}

function blocoNomes(p) {
  return `<p><b>Nome científico:</b> ${p.italico ? `<em>${p.cientifico}</em>` : p.cientifico}</p>
          <p><b>Nome popular:</b> ${p.popular || "Não informado"}</p>`;
}

function blocoTaxonomia(p) {
  const t = p.taxonomia;
  if (!t) return vazio("Classificação a ser inserida.");
  return `<ul class="taxon">${
    CAMPOS_TAXON.filter(([k]) => t[k]).map(([k, r]) => `<li><b>${r}</b><span>${t[k]}</span></li>`).join("")
  }</ul>`;
}

function blocoDesenho(p) {
  const img = p.img || {};
  const moldura = img.arquivo
    ? `<img src="${BASE_IMG}${img.arquivo}?v=${VERSAO}" alt="Ilustração de ${p.cientifico}" loading="lazy">`
    : `<span>Espaço reservado à ilustração<br><small>desenhar ou colar a figura neste quadro</small></span>`;
  const estruturas = (img.estruturas && img.estruturas.length)
    ? `<ul>${img.estruturas.map(e => `<li>${e}</li>`).join("")}</ul>`
    : `<p class="vazio">Relação de estruturas a ser inserida.</p>`;
  return `<div class="painel-imagem">
      <div class="moldura">${moldura}</div>
      <div class="estruturas"><h4>Estruturas a identificar no desenho</h4>${estruturas}</div>
      <div class="legenda-img"><b>Figura ${p.id}.</b> ${img.legenda || "Legenda a ser inserida."}</div>
    </div>`;
}

const grupoNome = s => (GRUPOS.find(g => g[0] === s) || [, ""])[1];
const preenchida = p => !!p.taxonomia;

function renderFicha(p, i, total) {
  const el = document.createElement("section");
  el.className = "ficha";
  el.id = "p" + p.id;

  const topicos = ROTEIRO.map(([rotulo, chave], n) => {
    let corpo;
    if (chave === "nomes") corpo = blocoNomes(p);
    else if (chave === "taxonomia") corpo = blocoTaxonomia(p);
    else if (chave === "desenho") corpo = blocoDesenho(p);
    else corpo = bloco(p[chave]);
    return `<article class="topico">
        <h3><span class="pill">${n + 1}</span>${rotulo}</h3>
        <div class="conteudo"${chave === "desenho" ? ' style="padding:0"' : ""}>${corpo}</div>
      </article>`;
  }).join("");

  const obs = (p.observacoes && p.observacoes.length)
    ? `<ul>${p.observacoes.map(o => `<li>${o}</li>`).join("")}</ul>`
    : `<p class="vazio" style="font-family:var(--serif)">Observações a serem inseridas.</p>`;

  el.innerHTML = `
    <header class="ficha-head">
      <div class="ficha-head-top">
        <div class="ficha-num">${p.id}</div>
        <div class="nomes">
          <h2 class="${p.italico ? "" : "reto"}">${p.cientifico}</h2>
          <div class="popular">${p.popular || ""}</div>
          <span class="tag">${grupoNome(p.grupo)}</span>
        </div>
      </div>
      <div class="ficha-acoes">
        <button class="btn btn-transcrita" data-acao="marcar" data-id="${p.id}" aria-label="Marcar transcrita">Marcar transcrita</button>
        <button class="btn" data-acao="copiar" data-id="${p.id}" title="Copiar texto da ficha">Copiar texto</button>
        <button class="btn" data-acao="link" data-id="${p.id}" title="Copiar link direto para esta ficha">Copiar link</button>
      </div>
    </header>
    <div class="ficha-corpo">
      ${topicos}
      <div class="obs"><h3>Observações</h3>${obs}</div>
      <div class="fonte"><b>Fonte:</b> ${p.fonte || "Referência a ser indicada."}</div>
    </div>
    <nav class="ficha-nav">
      <button data-nav="ant" ${i === 0 ? "disabled" : ""} aria-label="Ficha anterior">← Anterior</button>
      <span class="ficha-nav-status">Ficha ${i + 1} de ${total}</span>
      <button data-nav="prox" ${i === total - 1 ? "disabled" : ""} aria-label="Próxima ficha">Próxima →</button>
    </nav>`;
  return el;
}

/* ---------------- Navegação e Rolagem Segura ---------------- */

/**
 * Rola a página suavemente até a ficha especificada,
 * compensando a altura da topbar fixa sem causar conflitos com o IntersectionObserver.
 */
function navegarParaFicha(id) {
  const el = document.getElementById("p" + id);
  if (!el) return;

  marcarNavegacaoProgramada(850);

  // Fecha o menu lateral no mobile se estiver aberto
  fecharDrawer();

  // Destaque visual no índice
  document.querySelectorAll(".indice a.ativo").forEach(a => a.classList.remove("ativo"));
  const navLink = document.getElementById("nav-p" + id);
  if (navLink) {
    navLink.classList.add("ativo");
    // Rola internamente o container do índice (desktop)
    const listaContainer = document.getElementById("indiceLista");
    if (listaContainer && window.innerWidth > 900) {
      scrollIndiceInterno(listaContainer, navLink);
    }
  }

  // Deslocamento considerando topbar fixa (usa offsetTop para maior precisão e estabilidade)
  const topbar = document.querySelector(".topbar");
  const topbarH = topbar ? topbar.offsetHeight : 56;
  const targetTop = Math.max(0, el.offsetTop - topbarH - 12);

  window.scrollTo({
    top: targetTop,
    behavior: "smooth"
  });

  if (history.pushState) {
    history.pushState(null, "", "#p" + id);
  }
}

/**
 * Rola APENAS o container do índice internamente, sem tocar no scroll da janela/documento.
 * Isto elimina o bug que travava o scroll da página.
 */
function scrollIndiceInterno(container, element) {
  if (!container || !element) return;
  const cTop = container.scrollTop;
  const cHeight = container.clientHeight;
  const eTop = element.offsetTop;
  const eHeight = element.offsetHeight;

  if (eTop < cTop + 40) {
    container.scrollTo({ top: Math.max(0, eTop - 40), behavior: "smooth" });
  } else if (eTop + eHeight > cTop + cHeight - 40) {
    container.scrollTo({ top: eTop + eHeight - cHeight + 40, behavior: "smooth" });
  }
}

/* ---------------- Drawer Mobile ---------------- */
function abrirDrawer() {
  const indice = document.getElementById("indice");
  const backdrop = document.getElementById("backdrop");
  const btnMenu = document.getElementById("btnMenu");
  if (!indice) return;

  indice.classList.add("aberto");
  if (backdrop) backdrop.classList.add("ativo");
  if (btnMenu) btnMenu.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-aberto");

  if (window.innerWidth > 900) {
    document.getElementById("busca")?.focus();
  }
}

function fecharDrawer() {
  const indice = document.getElementById("indice");
  const backdrop = document.getElementById("backdrop");
  const btnMenu = document.getElementById("btnMenu");
  if (!indice) return;

  indice.classList.remove("aberto");
  if (backdrop) backdrop.classList.remove("ativo");
  if (btnMenu) btnMenu.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-aberto");
}

let lastToggleTime = 0;
function toggleDrawer(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const now = Date.now();
  if (now - lastToggleTime < 200) return;
  lastToggleTime = now;

  const indice = document.getElementById("indice");
  if (indice?.classList.contains("aberto")) {
    fecharDrawer();
  } else {
    abrirDrawer();
  }
}

window.abrirDrawer = abrirDrawer;
window.fecharDrawer = fecharDrawer;
window.toggleDrawer = toggleDrawer;

/* ---------------- Montagem da Interface ---------------- */
function montar() {
  const areaFichas = document.getElementById("fichas");
  const listaIndice = document.getElementById("indiceLista");

  if (!areaFichas || !listaIndice) return;
  listaIndice.innerHTML = "";

  GRUPOS.forEach(([sigla, nome]) => {
    const doGrupo = PARASITAS.filter(p => p.grupo === sigla);
    if (!doGrupo.length) return;

    const h = document.createElement("div");
    h.className = "grupo-titulo";
    h.textContent = nome;
    listaIndice.appendChild(h);

    doGrupo.forEach(p => {
      const a = document.createElement("a");
      a.href = "#p" + p.id;
      a.id = "nav-p" + p.id;
      const estaCompleta = preenchida(p);
      if (!estaCompleta) a.classList.add("pendente");
      a.dataset.completa = estaCompleta ? "1" : "0";
      a.dataset.busca = (p.cientifico + " " + (p.popular || "") + " " + nome).toLowerCase();
      a.innerHTML = `<span class="num">${p.id}</span><span>${p.italico ? `<em>${p.cientifico}</em>` : p.cientifico}</span>`;
      
      // Clique com rolagem segura
      a.addEventListener("click", ev => {
        ev.preventDefault();
        navegarParaFicha(p.id);
      });

      listaIndice.appendChild(a);
    });
  });

  // Renderiza as fichas
  PARASITAS.forEach((p, i) => areaFichas.appendChild(renderFicha(p, i, PARASITAS.length)));
  fichasEl = [...document.querySelectorAll(".ficha")];

  // Observador de interseção SEGURO:
  // Nunca chama scrollIntoView na janela, apenas atualiza o item ativo
  const io = new IntersectionObserver(entries => {
    if (isNavigatingProgrammatically) return;

    // Procura a ficha mais visível no topo da viewport
    let fichaAtiva = null;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        fichaAtiva = entry.target;
      }
    });

    if (fichaAtiva) {
      const id = fichaAtiva.id;
      const alvo = document.getElementById("nav-" + id);
      if (alvo) {
        document.querySelectorAll(".indice a.ativo").forEach(a => a.classList.remove("ativo"));
        alvo.classList.add("ativo");

        // Rola apenas a barra lateral no desktop
        if (window.innerWidth > 900) {
          scrollIndiceInterno(document.getElementById("indiceLista"), alvo);
        }
      }
    }
  }, { rootMargin: "-20% 0px -60% 0px" });

  fichasEl.forEach(f => io.observe(f));

  // Índice atual para teclas e botões de navegação
  const indiceAtual = () => {
    const y = window.scrollY + 140;
    let idx = 0;
    fichasEl.forEach((f, i) => {
      if (f.offsetTop <= y) idx = i;
    });
    return idx;
  };

  const irPara = idx => {
    if (idx >= 0 && idx < fichasEl.length) {
      const id = fichasEl[idx].id.replace("p", "");
      navegarParaFicha(id);
    }
  };

  // Botão "Iniciar Leitura" na Capa
  document.getElementById("btnIniciarLeitura")?.addEventListener("click", () => {
    if (fichasEl.length) irPara(0);
  });

  // Eventos de clique nas fichas (delegação)
  document.addEventListener("click", ev => {
    const nav = ev.target.closest("[data-nav]");
    if (nav) {
      const i = fichasEl.indexOf(nav.closest(".ficha"));
      irPara(nav.dataset.nav === "prox" ? i + 1 : i - 1);
      return;
    }

    const acao = ev.target.closest("[data-acao]");
    if (!acao) return;
    const id = acao.dataset.id;

    if (acao.dataset.acao === "marcar") {
      const link = document.getElementById("nav-p" + id);
      if (link) link.classList.toggle("feito");
      const feito = link ? link.classList.contains("feito") : false;

      acao.classList.toggle("transcrita-feita", feito);
      acao.textContent = feito ? "Transcrita ✓" : "Marcar transcrita";

      salvarProgresso();
      atualizarProgresso();
      aplicarFiltros();
    }

    if (acao.dataset.acao === "copiar") {
      const fichaEl = document.getElementById("p" + id);
      if (fichaEl) {
        const texto = fichaEl.innerText
          .replace(/Marcar transcrita|Transcrita ✓|Copiar texto|Copiar link|← Anterior|Próxima →/g, "")
          .trim();
        navigator.clipboard?.writeText(texto);
        const original = acao.textContent;
        acao.textContent = "Copiado!";
        setTimeout(() => { acao.textContent = original; }, 1400);
      }
    }

    if (acao.dataset.acao === "link") {
      const url = location.origin + location.pathname + "#p" + id;
      navigator.clipboard?.writeText(url);
      const original = acao.textContent;
      acao.textContent = "Link copiado!";
      setTimeout(() => { acao.textContent = original; }, 1400);
    }
  });

  // Atalhos de Teclado
  document.addEventListener("keydown", ev => {
    if (ev.target.tagName === "INPUT") {
      if (ev.key === "Escape") fecharDrawer();
      return;
    }
    if (ev.key === "Escape") {
      fecharDrawer();
      return;
    }
    if (ev.key === "ArrowRight" || ev.key === "PageDown") {
      ev.preventDefault();
      irPara(indiceAtual() + 1);
    }
    if (ev.key === "ArrowLeft" || ev.key === "PageUp") {
      ev.preventDefault();
      irPara(indiceAtual() - 1);
    }
  });

  // Busca e Limpeza
  const inputBusca = document.getElementById("busca");
  const btnLimpar = document.getElementById("btnLimparBusca");

  inputBusca?.addEventListener("input", () => {
    const q = inputBusca.value.trim().toLowerCase();
    if (btnLimpar) btnLimpar.style.display = q ? "block" : "none";
    aplicarFiltros();
  });

  btnLimpar?.addEventListener("click", () => {
    if (inputBusca) {
      inputBusca.value = "";
      btnLimpar.style.display = "none";
      aplicarFiltros();
      inputBusca.focus();
    }
  });

  // Chips de Filtro (Todos, Completas, Transcritas) com toggle amigável
  document.querySelectorAll(".filtro-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const filtroClicado = chip.dataset.filtro || "todos";
      // Se clicou no que já estava ativo (que não seja 'todos'), volta para 'todos'
      if (filtroStatusAtual === filtroClicado && filtroClicado !== "todos") {
        filtroStatusAtual = "todos";
      } else {
        filtroStatusAtual = filtroClicado;
      }
      document.querySelectorAll(".filtro-chip").forEach(c => {
        c.classList.toggle("ativo", c.dataset.filtro === filtroStatusAtual);
      });
      aplicarFiltros();
    });
  });

  // Controle de Menu Mobile (Drawer) e Botões Flutuantes
  document.getElementById("btnMenu")?.addEventListener("click", toggleDrawer);
  document.getElementById("fabMenu")?.addEventListener("click", toggleDrawer);
  document.getElementById("btnFecharIndice")?.addEventListener("click", fecharDrawer);
  document.getElementById("backdrop")?.addEventListener("click", fecharDrawer);
  document.getElementById("topbarProgresso")?.addEventListener("click", () => {
    if (window.innerWidth <= 900) toggleDrawer();
  });

  // FAB Voltar ao Topo
  const fabContainer = document.getElementById("fabContainer");
  const fabTopo = document.getElementById("fabTopo");

  fabTopo?.addEventListener("click", () => {
    marcarNavegacaoProgramada(600);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (history.pushState) history.pushState(null, "", window.location.pathname);
  });

  // Controle de visibilidade do FAB
  window.addEventListener("scroll", () => {
    if (window.scrollY > 350) {
      fabContainer?.classList.add("visivel");
    } else {
      fabContainer?.classList.remove("visivel");
    }
  }, { passive: true });

  // Fechar drawer ao redimensionar para desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      fecharDrawer();
    }
  });

  // Tamanho da Fonte (na barra superior e no drawer mobile)
  let escala = 1;
  const aplicarFonte = () => document.documentElement.style.setProperty("--fonte-corpo", escala.toFixed(2) + "rem");
  const aumentarFonte = () => { escala = Math.min(1.45, escala + 0.06); aplicarFonte(); };
  const diminuirFonte = () => { escala = Math.max(0.82, escala - 0.06); aplicarFonte(); };

  document.getElementById("fonteMais")?.addEventListener("click", aumentarFonte);
  document.getElementById("fonteMenos")?.addEventListener("click", diminuirFonte);
  document.getElementById("drawerFonteMais")?.addEventListener("click", aumentarFonte);
  document.getElementById("drawerFonteMenos")?.addEventListener("click", diminuirFonte);

  // Impressão
  document.getElementById("btnImprimir")?.addEventListener("click", () => window.print());

  // Restaura transcrições salvas
  restaurarProgresso();
  atualizarProgresso();
  aplicarFiltros();

  // Se houver hash na URL, navega suavemente após a montagem
  if (location.hash && location.hash.startsWith("#p")) {
    const id = location.hash.replace("#p", "");
    setTimeout(() => navegarParaFicha(id), 180);
  }
}

/* ---------------- Filtros e Busca Combinados ---------------- */
function aplicarFiltros() {
  const inputBusca = document.getElementById("busca");
  const q = inputBusca ? inputBusca.value.trim().toLowerCase() : "";
  let visiveis = 0;

  document.querySelectorAll(".indice a").forEach(a => {
    const matchTexto = !q || (a.dataset.busca && a.dataset.busca.includes(q));
    let matchStatus = true;

    if (filtroStatusAtual === "completas") {
      matchStatus = a.dataset.completa === "1";
    } else if (filtroStatusAtual === "transcritas") {
      matchStatus = a.classList.contains("feito");
    }

    const exibir = matchTexto && matchStatus;
    a.style.display = exibir ? "" : "none";
    if (exibir) visiveis++;
  });

  // Oculta cabeçalhos de grupos sem itens visíveis
  document.querySelectorAll(".grupo-titulo").forEach(h => {
    let n = h.nextElementSibling;
    let temItemVisivel = false;
    while (n && n.tagName === "A") {
      if (n.style.display !== "none") temItemVisivel = true;
      n = n.nextElementSibling;
    }
    h.style.display = temItemVisivel ? "" : "none";
  });

  // Mensagem se nada for encontrado, com botão para resetar
  let avisoVazio = document.getElementById("indiceBuscaVazia");
  if (!avisoVazio) {
    avisoVazio = document.createElement("div");
    avisoVazio.id = "indiceBuscaVazia";
    avisoVazio.className = "busca-vazia";
    document.getElementById("indiceLista")?.appendChild(avisoVazio);
  }

  if (visiveis === 0) {
    avisoVazio.style.display = "block";
    avisoVazio.innerHTML = `Nenhum parasito encontrado.<br><button type="button" class="btn-chip" style="margin-top:10px" id="btnResetFiltros">Mostrar todos</button>`;
    document.getElementById("btnResetFiltros")?.addEventListener("click", () => {
      filtroStatusAtual = "todos";
      if (inputBusca) {
        inputBusca.value = "";
        const btnLimpar = document.getElementById("btnLimparBusca");
        if (btnLimpar) btnLimpar.style.display = "none";
      }
      document.querySelectorAll(".filtro-chip").forEach(c => {
        c.classList.toggle("ativo", c.dataset.filtro === "todos");
      });
      aplicarFiltros();
    });
  } else {
    avisoVazio.style.display = "none";
  }
}

/* ---------------- Progresso LocalStorage ---------------- */
function salvarProgresso() {
  const feitos = [...document.querySelectorAll(".indice a.feito")].map(a => a.id.replace("nav-p", ""));
  try {
    localStorage.setItem("fichas-transcritas", JSON.stringify(feitos));
  } catch (e) {}
}

function restaurarProgresso() {
  let feitos = [];
  try {
    feitos = JSON.parse(localStorage.getItem("fichas-transcritas") || "[]");
  } catch (e) {}

  feitos.forEach(id => {
    const link = document.getElementById("nav-p" + id);
    const btn = document.querySelector(`[data-acao="marcar"][data-id="${id}"]`);
    if (link) link.classList.add("feito");
    if (btn) {
      btn.classList.add("transcrita-feita");
      btn.textContent = "Transcrita ✓";
    }
  });
}

function atualizarProgresso() {
  const total = PARASITAS.length;
  const feitos = document.querySelectorAll(".indice a.feito").length;
  const completas = PARASITAS.filter(preenchida).length;
  const pct = total ? (feitos / total * 100).toFixed(1) : 0;

  const texto = document.getElementById("progressoTexto");
  const barra = document.getElementById("progressoBarra");
  const linha = document.getElementById("progressoLinha");

  if (texto) texto.textContent = `${feitos} / ${total}`;
  if (barra) barra.style.width = pct + "%";
  if (linha) linha.style.width = pct + "%";

  // Atualiza contadores nos chips de filtro
  const totalTodos = document.getElementById("totalFiltroTodos");
  const totalCompletas = document.getElementById("totalFiltroCompletas");
  const totalTranscritas = document.getElementById("totalFiltroTranscritas");

  if (totalTodos) totalTodos.textContent = total;
  if (totalCompletas) totalCompletas.textContent = completas;
  if (totalTranscritas) totalTranscritas.textContent = feitos;
}

// Inicia aplicação
iniciar();

