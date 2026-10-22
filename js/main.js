/* =========================================================
   Costa Nobre Imóveis — interações
   ========================================================= */
(() => {
  // =========================================================
  // CONFIGURAÇÃO DO LANÇAMENTO — preencha aqui
  // =========================================================
  const CONFIG = {
    // Link de convite do grupo (ex.: 'https://chat.whatsapp.com/XXXXXXXX').
    // Enquanto estiver vazio, o botão abre uma conversa no WhatsApp do corretor.
    grupoUrl: '',
    whatsapp: '554898117413',
    mensagemWhatsapp: 'Olá! Quero entrar no grupo VIP do lançamento em Balneário Gaivota.',
    // ID do Pixel do Meta (Gerenciador de Eventos → Fontes de dados). Ex.: '123456789012345'
    pixelId: ''
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Utilidades de easing ----------
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };
  const easeInCubic = t => t * t * t;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
  // sobe de 0→1 entre a e b, desce de 1→0 entre b e c
  const bell = (x, a, b, c) => smoothstep(a, b, x) * (1 - smoothstep(b, c, x));

  // =========================================================
  // HERO — câmera de drone
  // =========================================================
  const hero = $('#hero');
  const stage = $('#stage');
  const sceneWide = $('#sceneWide');
  const sceneTowers = $('#sceneTowers');
  const mediaWide = $('#mediaWide');
  const mediaTowers = $('#mediaTowers');
  const frontWide = $('.layer--front', mediaWide);
  const frontTowers = $('.layer--front', mediaTowers);
  const haze = $('#fxHaze');
  const streaks = $('#fxStreaks');
  const cta = $('#heroCta');
  const cue = $('#scrollCue');
  const progressFill = $('#progressFill');
  const progressLabel = $('#progressLabel');
  const titles = $$('.title').map(el => ({
    el,
    w: el.dataset.window.split(',').map(Number) // [entra-início, entra-fim, sai-início, sai-fim]
  }));

  // Pontos para onde a câmera "voa" (em % da imagem)
  mediaWide.style.transformOrigin = '62% 78%';   // borda infinita encontrando o mar
  mediaTowers.style.transformOrigin = '50% 50%';  // horizonte visto do terraço

  let stageW = 0, stageH = 0;

  // Dimensiona cada .media com a proporção real da imagem cobrindo a tela,
  // mantendo o ponto focal (data-fx / data-fy) visível em qualquer viewport.
  function layoutMedia() {
    stageW = stage.clientWidth;
    stageH = stage.clientHeight;
    [mediaWide, mediaTowers].forEach(m => {
      const r = parseFloat(m.dataset.ratio);
      const fx = parseFloat(m.dataset.fx);
      const fy = parseFloat(m.dataset.fy);
      let w, h;
      if (stageW / stageH > r) { w = stageW; h = stageW / r; }
      else { h = stageH; w = stageH * r; }
      m.style.width = `${w}px`;
      m.style.height = `${h}px`;
      m.style.left = `${(stageW - w) * fx}px`;
      m.style.top = `${(stageH - h) * fy}px`;
    });
  }

  let target = 0;      // progresso real do scroll (0 → 1)
  let current = 0;     // progresso suavizado (câmera)
  let lastFrame = 0;
  let rafId = null;
  let heroLabel = '';

  function readScroll() {
    const rect = hero.getBoundingClientRect();
    const travel = hero.offsetHeight - stageH;
    target = travel > 0 ? clamp(-rect.top / travel) : 0;
  }

  function render(p) {
    // ---- Cena 1: voo sobre a piscina em direção ao mar ----
    const a = clamp(p / 0.62);
    const sW = 1 + 0.12 * a + 1.3 * easeInCubic(a);
    const txW = -0.02 * a * stageW;
    const tyW = -0.015 * a * stageH;
    const rotW = reduceMotion ? 0 : -0.6 * Math.sin(Math.PI * a); // leve inclinação do drone
    mediaWide.style.transform =
      `translate3d(${txW}px, ${tyW}px, 0) rotate(${rotW}deg) scale(${sW})`;
    // torres da frente avançam mais rápido que o fundo → profundidade
    const fW = 1 + 0.14 * a * a;
    frontWide.style.transform = `translate3d(0, ${-0.02 * a * stageH}px, 0) scale(${fW})`;

    const blurW = reduceMotion ? 0 : smoothstep(0.38, 0.6, p) * 7;
    const opW = 1 - smoothstep(0.6, 0.68, p);
    sceneWide.style.opacity = opW;
    sceneWide.style.filter = blurW > 0.05 ? `blur(${blurW}px)` : 'none';
    sceneWide.style.visibility = opW <= 0.001 ? 'hidden' : 'visible';

    // ---- Cena 2: chegada às torres, desacelerando ----
    const b = clamp((p - 0.48) / 0.52);
    const e = easeOutCubic(b);
    const sT = 1.08 + 0.55 * (1 - e);
    const tyT = 0.03 * (1 - e) * stageH;
    const rotT = reduceMotion ? 0 : 0.5 * (1 - e);
    mediaTowers.style.transform =
      `translate3d(0, ${tyT}px, 0) rotate(${rotT}deg) scale(${sT})`;
    const fT = 1 + 0.1 * (1 - e);
    frontTowers.style.transform = `translate3d(0, ${0.025 * (1 - e) * stageH}px, 0) scale(${fT})`;

    const opT = smoothstep(0.48, 0.62, p);
    const blurT = reduceMotion ? 0 : (1 - smoothstep(0.52, 0.7, p)) * 7;
    const flash = 1 + 0.25 * (1 - smoothstep(0.55, 0.75, p));
    sceneTowers.style.opacity = opT;
    sceneTowers.style.visibility = opT <= 0.001 ? 'hidden' : 'visible';
    sceneTowers.style.filter =
      `${blurT > 0.05 ? `blur(${blurT}px) ` : ''}brightness(${flash})`;

    // ---- Atmosfera ----
    haze.style.transform = `translate3d(${-4 * p}%, ${2 * p}%, 0) scale(${1 + 0.45 * p})`;
    haze.style.opacity = 0.55 + 0.35 * bell(p, 0.35, 0.55, 0.8);
    const sp = bell(p, 0.34, 0.55, 0.74);
    streaks.style.opacity = (sp * 0.9).toFixed(3);
    streaks.style.transform = `scale(${1 + 0.8 * easeInOutSine(sp)}) rotate(${p * 4}deg)`;

    // ---- Títulos (fade-in subindo, fade-out subindo) ----
    titles.forEach(({ el, w }) => {
      const tin = smoothstep(w[0], w[1], p);
      const tout = smoothstep(w[2], w[3], p);
      const o = tin * (1 - tout);
      const y = (1 - tin) * 48 - tout * 48;
      const bl = reduceMotion ? 0 : (1 - tin) * 6 + tout * 6;
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0, ${y}px, 0)`;
      el.style.filter = bl > 0.05 ? `blur(${bl}px)` : 'none';
    });

    // ---- CTA, indicador e dica de rolagem ----
    const c = smoothstep(0.86, 0.96, p);
    cta.style.opacity = c.toFixed(3);
    cta.style.transform = `translate3d(0, ${(1 - c) * 20}px, 0)`;
    cta.classList.toggle('is-active', c > 0.05);

    cue.style.opacity = (1 - smoothstep(0, 0.04, p)).toFixed(3);
    progressFill.style.transform = `scaleY(${p})`;
    const label = p < 0.34 ? '01' : p < 0.66 ? '02' : '03';
    if (label !== heroLabel) { progressLabel.textContent = label; heroLabel = label; }
  }

  function tick(now) {
    const dt = Math.min(64, now - (lastFrame || now));
    lastFrame = now;
    // inércia da câmera independente da taxa de quadros
    const k = reduceMotion ? 1 : 1 - Math.pow(1 - 0.075, dt / 16.67);
    current = lerp(current, target, k);
    if (Math.abs(target - current) < 0.0002) current = target;
    render(current);
    rafId = current !== target ? requestAnimationFrame(tick) : null;
    if (!rafId) lastFrame = 0;
  }

  function requestTick() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  // =========================================================
  // Header, menu, panorama, reveal, formulário
  // =========================================================
  const header = $('.site-header');
  const nav = $('#nav');
  const menuToggle = $('#menuToggle');
  const panorama = $('#panoramaImg');
  const ctaBar = $('#ctaBar');
  const scrollProgress = $('#scrollProgress');

  function onScroll() {
    readScroll();
    requestTick();

    const heroEnd = hero.offsetTop + hero.offsetHeight - stageH;
    header.classList.toggle('is-solid', window.scrollY > heroEnd - 40);
    // barra do grupo: aparece depois da abertura e some na chamada final
    const join = $('#grupo').getBoundingClientRect();
    ctaBar.classList.toggle('is-visible', window.scrollY > heroEnd + 40 && join.top > window.innerHeight * 0.6);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;

    if (panorama && !reduceMotion) {
      const r = panorama.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -0.12;
        panorama.style.transform = `translate3d(0, ${offset}px, 0) scale(1.05)`;
      }
    }
  }

  function onResize() {
    layoutMedia();
    onScroll();
    render(current);
  }

  // ---------- Menu mobile ----------
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => {
    if (!nav.classList.contains('is-open')) return;
    menuToggle.click();
  }));

  // ---------- Revelação suave das seções ----------
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealEls.forEach(el => {
      const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
      el.style.setProperty('--delay', `${siblings.indexOf(el) * 0.12}s`);
      io.observe(el);
    });
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // ---------- Pixel do Meta ----------
  if (CONFIG.pixelId) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', CONFIG.pixelId);
    window.fbq('track', 'PageView');
  }
  const track = (event, params) => { if (window.fbq) window.fbq('track', event, params); };

  // ---------- Botões "Entrar no grupo" ----------
  const grupoHref = CONFIG.grupoUrl ||
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.mensagemWhatsapp)}`;
  $$('[data-cta="grupo"]').forEach(btn => {
    btn.href = grupoHref;
    btn.target = '_blank';
    btn.rel = 'noopener';
    // cada clique conta como Lead no Meta Ads
    btn.addEventListener('click', () => track('Lead', { content_name: 'Grupo VIP lançamento' }));
  });

  // ---------- Números que contam ao aparecer ----------
  const counters = $$('.facts dt').map(el => {
    const m = el.textContent.match(/^([\d.,]+)(.*)$/);
    if (!m) return null;
    const decimals = (m[1].split(',')[1] || '').length;
    return { el, value: parseFloat(m[1].replace(/\./g, '').replace(',', '.')), decimals, suffix: m[2] };
  }).filter(Boolean);
  const formatNum = (v, d) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  if ('IntersectionObserver' in window && !reduceMotion) {
    const countIO = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const c = counters.find(x => x.el === entry.target);
        countIO.unobserve(entry.target);
        const t0 = performance.now();
        const step = now => {
          const k = easeOutCubic(clamp((now - t0) / 1800));
          c.el.textContent = formatNum(c.value * k, c.decimals) + c.suffix;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(c => countIO.observe(c.el));
  }

  // ---------- Carrossel do lazer (autoplay, loop, setas, arrastar) ----------
  const lazerTrack = $('#lazerTrack');
  if (lazerTrack) {
    const carousel = $('#lazerCarousel');
    const slides = $$('.grid-photo', lazerTrack);
    const count = $('#lazerCount');
    const timer = $('#lazerTimer');
    const playBtn = $('#lazerPlay');
    const pad = n => String(n).padStart(2, '0');
    const DELAY = 4000;
    let index = 0;
    let playing = !reduceMotion;
    let hovering = false;
    let elapsed = 0;
    let last = 0;

    const slideLeft = i => slides[i].offsetLeft - slides[0].offsetLeft;
    const maxLeft = () => lazerTrack.scrollWidth - lazerTrack.clientWidth;
    const currentIndex = () => {
      const x = lazerTrack.scrollLeft;
      if (x >= maxLeft() - 4) return slides.length - 1;
      let best = 0;
      slides.forEach((s, i) => { if (Math.abs(slideLeft(i) - x) < Math.abs(slideLeft(best) - x)) best = i; });
      return best;
    };
    const goTo = i => {
      index = (i + slides.length) % slides.length;
      lazerTrack.scrollTo({ left: Math.min(slideLeft(index), maxLeft()), behavior: reduceMotion ? 'auto' : 'smooth' });
      elapsed = 0;
    };
    const updateCarousel = () => {
      index = currentIndex();
      count.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
    };
    const setPlaying = on => {
      playing = on;
      playBtn.textContent = on ? '❚❚' : '▶';
      playBtn.setAttribute('aria-pressed', String(!on));
      playBtn.setAttribute('aria-label', on ? 'Pausar a passagem automática' : 'Retomar a passagem automática');
    };

    // relógio do autoplay: só corre com a seção na tela, sem mouse por cima
    let onScreen = false;
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0.3 }).observe(carousel);
    const loop = now => {
      const dt = last ? now - last : 0;
      last = now;
      if (playing && !hovering && onScreen && !document.hidden) {
        elapsed += dt;
        if (elapsed >= DELAY) goTo(index + 1);
      }
      timer.style.transform = `scaleX(${playing ? Math.min(1, elapsed / DELAY) : 0})`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    $('#lazerPrev').addEventListener('click', () => goTo(index - 1));
    $('#lazerNext').addEventListener('click', () => goTo(index + 1));
    playBtn.addEventListener('click', () => { setPlaying(!playing); elapsed = 0; });
    carousel.addEventListener('mouseenter', () => { hovering = true; });
    carousel.addEventListener('mouseleave', () => { hovering = false; });
    carousel.addEventListener('focusin', () => { hovering = true; });
    carousel.addEventListener('focusout', () => { hovering = false; });
    lazerTrack.addEventListener('touchstart', () => { elapsed = 0; }, { passive: true });
    lazerTrack.addEventListener('scroll', updateCarousel, { passive: true });

    // arrastar com o mouse
    let dragX = null, startLeft = 0, moved = false;
    lazerTrack.addEventListener('pointerdown', ev => {
      if (ev.pointerType !== 'mouse') return;
      dragX = ev.clientX; startLeft = lazerTrack.scrollLeft; moved = false;
    });
    window.addEventListener('pointermove', ev => {
      if (dragX === null) return;
      const dx = ev.clientX - dragX;
      if (Math.abs(dx) > 6 && !moved) { moved = true; lazerTrack.classList.add('is-dragging'); }
      if (moved) lazerTrack.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (dragX === null) return;
      dragX = null;
      if (!moved) return;
      lazerTrack.classList.remove('is-dragging');
      goTo(currentIndex());
    });

    setPlaying(playing);
    updateCarousel();
  }

  // ---------- Abas (plantas e diferenciais) ----------
  $$('[data-tabs]').forEach(group => {
    const tabs = $$('[role="tab"]', group);
    const select = tab => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', ev => {
        const step = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        const next = tabs[(i + step + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
  });

  // ---------- Visualizador de imagens e plantas ----------
  const lightbox = $('#lightbox');
  const lbImg = $('#lightboxImg');
  const lbCap = $('#lightboxCap');
  const lbPrev = $('#lightboxPrev');
  const lbNext = $('#lightboxNext');
  let lbItems = [];
  let lbIndex = 0;

  function showLightbox(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    const item = lbItems[lbIndex];
    lbImg.src = item.dataset.lightbox;
    lbImg.alt = item.dataset.caption || '';
    lbCap.textContent = item.dataset.caption || '';
    lbPrev.hidden = lbNext.hidden = lbItems.length < 2;
  }

  $$('[data-lightbox]').forEach(item => {
    item.addEventListener('click', () => {
      lbItems = $$(`[data-lightbox][data-group="${item.dataset.group}"]`);
      showLightbox(lbItems.indexOf(item));
      lightbox.showModal();
      document.body.style.overflow = 'hidden';
    });
  });
  lbPrev.addEventListener('click', () => showLightbox(lbIndex - 1));
  lbNext.addEventListener('click', () => showLightbox(lbIndex + 1));
  $('#lightboxClose').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', ev => { if (ev.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('close', () => { document.body.style.overflow = ''; });
  lightbox.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowLeft') showLightbox(lbIndex - 1);
    if (ev.key === 'ArrowRight') showLightbox(lbIndex + 1);
  });

  $('#year').textContent = new Date().getFullYear();

  // ---------- Inicialização ----------
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  layoutMedia();
  readScroll();
  current = target;   // ao recarregar no meio da página, não "voa" do início
  render(current);
  onScroll();
})();
