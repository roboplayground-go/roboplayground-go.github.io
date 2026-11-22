(() => {
  // reveal on scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // count-up stats
  const fmt = (n) => n.toLocaleString('en-US');
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = 1400;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(end * k));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    cio.unobserve(el);
  }), { threshold: 0.6 });
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) counters.forEach((el) => cio.observe(el));

  // lightbox
  const lb = document.getElementById('lightbox'), lbImg = lb.querySelector('img');
  document.querySelectorAll('.fig img, .teaser img').forEach((img) => img.addEventListener('click', () => {
    lbImg.src = img.src; lbImg.alt = img.alt; lb.classList.add('open');
  }));
  lb.addEventListener('click', () => lb.classList.remove('open'));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.classList.remove('open'); });

  // copy bibtex
  document.querySelector('.copy').addEventListener('click', (e) => {
    navigator.clipboard.writeText(document.getElementById('bib-code').textContent);
    e.target.textContent = 'Copied'; setTimeout(() => (e.target.textContent = 'Copy'), 1500);
  });

  const segs = (card, fn) => card.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    card.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
    fn(b.dataset.metric);
  }));

  // data selection chart (Table 8)
  const SEL = {
    succ:  { v: [90.2, 92.6, 95.2, 87.4], max: 100, f: (x) => x.toFixed(1) + '%' },
    hard:  { v: [76.5, 84.5, 93.0, 73.0], max: 100, f: (x) => x.toFixed(1) + '%' },
    score: { v: [0.357, 0.395, 0.497, 0.423], max: 0.6, f: (x) => x.toFixed(3) },
  };
  const names = ['Random', 'Elo', 'Demo Score', 'DemInf'];
  const bars = document.getElementById('select-bars');
  bars.innerHTML = names.map((n) => `<div class="bar-row"><span class="lab">${n}</span><div class="bar-track"><div class="bar-fill"></div></div></div>`).join('');
  const drawSel = (m) => {
    const d = SEL[m], best = Math.max(...d.v);
    bars.querySelectorAll('.bar-row').forEach((row, i) => {
      row.classList.toggle('best', d.v[i] === best);
      const f = row.querySelector('.bar-fill');
      f.style.width = (d.v[i] / d.max * 100) + '%';
      f.textContent = d.f(d.v[i]);
    });
  };
  drawSel('succ');
  segs(document.getElementById('select-card'), drawSel);

  // scaling chart (Table 7)
  const X = ['50', '100', '500', '1,000', '1,500'];
  const SC = {
    succ:  { a: [73.6, 78.2, 90.0, 89.6, 90.2], b: [48.0, 51.0, 78.5, 76.5, 76.5], lo: 40, hi: 100, ticks: [40, 60, 80, 100], f: (x) => x + '%' },
    score: { a: [0.335, 0.376, 0.405, 0.394, 0.357], b: [0.200, 0.225, 0.355, 0.342, 0.300], lo: 0.15, hi: 0.45, ticks: [0.15, 0.25, 0.35, 0.45], f: (x) => x.toFixed(2) },
  };
  const W = 520, H = 280, L = 44, R = 16, T = 14, B = 34;
  const px = (i) => L + i * (W - L - R) / (X.length - 1);
  const holder = document.getElementById('scale-chart');
  const drawScale = (m) => {
    const d = SC[m], py = (v) => T + (1 - (v - d.lo) / (d.hi - d.lo)) * (H - T - B);
    const line = (arr, c) => `<polyline fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" points="${arr.map((v, i) => px(i) + ',' + py(v)).join(' ')}"/>` +
      arr.map((v, i) => `<circle cx="${px(i)}" cy="${py(v)}" r="4" fill="#fff" stroke="${c}" stroke-width="2.5"><title>${X[i]} demos: ${d.f(v)}</title></circle>`).join('');
    holder.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Scaling chart">
      ${d.ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${py(t)}" y2="${py(t)}" stroke="#E3E5EA"/><text x="${L - 8}" y="${py(t) + 4}" text-anchor="end">${d.f(t)}</text>`).join('')}
      ${X.map((x, i) => `<text x="${px(i)}" y="${H - 10}" text-anchor="middle">${x}</text>`).join('')}
      ${line(d.b, '#E9682C')}${line(d.a, '#2463EB')}
    </svg>`;
  };
  drawScale('succ');
  segs(document.getElementById('scaling-card'), drawScale);
})();
