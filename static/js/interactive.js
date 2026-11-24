// Interactive figures: gameplay wall, data funnel, render / synthetic / OOD explorers,
// Elo chart and dataset comparison. All numbers come from the paper's tables.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const V = './static/videos/';
  const fmt = (n) => n.toLocaleString('en-US');
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // play videos only while on screen
  const vio = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) { v.play().catch(() => {}); } else v.pause();
  }), { threshold: 0.15 });
  const watch = (v) => vio.observe(v);
  // run fn once the element is near the viewport (used to defer video downloads)
  const near = (node, fn) => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: '400px 0px' });
    io.observe(node);
  };

  // segmented controls with data-key -> callback(value)
  const seg = (card, key, fn) => $$(`.seg[data-key="${key}"] button`, card).forEach((b) => b.addEventListener('click', () => {
    $$(`.seg[data-key="${key}"] button`, card).forEach((x) => x.classList.toggle('on', x === b));
    fn(b.dataset.v);
  }));

  // ---------------- gameplay wall ----------------
  const WALL = [
    ['00', 'Microsoft Logo Cubes', 'Red back-left, green back-right, blue front-left, yellow front-right.'],
    ['01', 'Green Patch Corner Guarding', 'Place one cube at each corner of the green patch.'],
    ['02', 'Three Cube Pyramid Stacking', 'Make a small pyramid: green and blue below, red above.'],
    ['03', 'Cube Bridge Stacking', 'Build a bridge: two cubes side by side with one cube across them.'],
    ['04', 'Spell Ok Cube Alignment', 'Make the cubes spell OK facing the robot.'],
    ['05', 'Hi Cube Placement', 'Put H on the left and I on the right to read HI.'],
    ['06', 'Letter Face Alignment', 'Rotate the letter cube so the requested letter is upright and readable.'],
    ['07', 'Front To Back Cube Line', 'Line up red, green, and blue from nearest to farthest.'],
    ['08', 'Push Block to Target', 'Push every block onto the target patch.'],
    ['09', 'Blue Base Red Pyramid', 'Build a pyramid with two blue cubes below and red on top.'],
    ['10', 'Cube Zigzag Arrangement', 'Make a left-to-right zigzag: red in front, green behind, blue in front.'],
    ['11', 'Rotate Letter Block', 'Rotate the block so E is on top.'],
    ['12', 'Semantic Cube Pyramid Build', 'Build a letter pyramid with B left, C right, and A on top, all facing the robot.'],
    ['13', 'Vertical Insert Two Blocks', 'Lift one block, slide the other underneath, and stack them.'],
    ['14', 'Patch Stack And Place', 'Put red on the green patch and blue next to the patch.'],
    ['15', 'Arrange Alphabetical Order', 'Put the letters in order from left to right, faces up.'],
  ];
  const wall = $('#wall');
  if (wall) {
    wall.innerHTML = WALL.map(([f, t, i]) => `<figure class="tile"><video muted playsinline loop preload="none" src="${V}wall/${f}.mp4"></video>
      <figcaption><b>${t}</b><span>“${i}”</span></figcaption></figure>`).join('');
    $$('video', wall).forEach(watch);
  }

  // ---------------- synced video groups ----------------
  function syncGroup(videos) {
    const lead = videos[0];
    const tick = () => {
      if (!lead.paused) videos.slice(1).forEach((v) => {
        if (v.readyState >= 2 && Math.abs(v.currentTime - lead.currentTime) > 0.08) v.currentTime = lead.currentTime;
        if (v.paused) v.play().catch(() => {});
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return {
      load(srcs, keepTime = true) {
        const t = keepTime ? lead.currentTime : 0;
        videos.forEach((v, k) => {
          v.src = srcs[k];
          v.addEventListener('loadeddata', () => {
            v.currentTime = Math.min(t, v.duration - 0.05);
            const r = lead.getBoundingClientRect();
            if (r.bottom > 0 && r.top < innerHeight) v.play().catch(() => {});
          }, { once: true });
          v.load();
        });
      },
    };
  }

  // render explorer
  const RENDERS = {
    pyramid: 'Make a small pyramid: green and blue below, red above.',
    logo: 'Red back-left, green back-right, blue front-left, yellow front-right.',
    bridge: 'Build a bridge: two cubes side by side with one cube across them.',
  };
  const rc = $('#render-card');
  if (rc) {
    const vids = ['front', 'left', 'right'].map((c) => $(`video[data-cam="${c}"]`, rc));
    const g = syncGroup(vids);
    vids.forEach(watch);
    const st = { task: 'pyramid', render: 'd1' };
    const load = (keep) => {
      g.load(vids.map((v) => `${V}renders/${st.task}_${st.render}_${v.dataset.cam}.mp4`), keep);
      $('#render-instr').textContent = `“${RENDERS[st.task]}”`;
    };
    seg(rc, 'task', (v) => { st.task = v; load(false); });
    seg(rc, 'render', (v) => { st.render = v; load(true); });
    near(rc, () => load(false));
  }

  // synthetic explorer
  const SYN = [
    ['Line up red, green, and blue from nearest to farthest.', 'Line up yellow, green, and red from nearest to farthest.'],
    ['Stack red on the letter cube with A facing the robot.', 'Stack red on the letter cube with U facing the robot.'],
    ['Put red on the green patch and blue on the yellow patch.', 'Put green on the red patch and blue on the purple patch.'],
  ];
  const sc = $('#synth-card');
  if (sc) {
    const vids = $$('video', sc), instr = $$('.instr', sc);
    const g = syncGroup(vids);
    vids.forEach(watch);
    const diff = (a, b) => {
      const A = a.split(' '), B = b.split(' ');
      return [A.map((w, k) => (w !== B[k] ? `<mark class="o">${w}</mark>` : w)).join(' '), B.map((w, k) => (w !== A[k] ? `<mark>${w}</mark>` : w)).join(' ')];
    };
    const show = (i) => {
      g.load([`${V}synthetic/${i}_orig.mp4`, `${V}synthetic/${i}_var.mp4`], false);
      diff(...SYN[i]).forEach((h, k) => { instr[k].innerHTML = `“${h}”`; });
    };
    seg(sc, 'ex', (v) => show(+v));
    near(sc, () => show(0));
  }

  // ---------------- OOD explorer ----------------
  const OOD = {
    rb: { id: 'red in front of blue', view: 'Main camera moved 25 cm sideways and re-aimed at the same point (training: ≤ 15 cm).', pose: 'Cubes start closer to the robot than in training (0.30–0.38 m vs 0.40–0.70 m).', swap: 'The instruction asks for the other cube: “blue in front of red”.', color: 'A colour the task never had, named in the instruction: “pink in front of blue”.' },
    patch: { id: 'red → green, blue → yellow', view: 'Main camera moved 25 cm sideways and re-aimed at the same point (training: ≤ 15 cm).', pose: 'Cubes start closer to the robot than in training (0.30–0.38 m vs 0.40–0.70 m).', swap: 'The instruction swaps the goals: “blue → green, red → yellow”.', color: 'A colour the task never had, named in the instruction: “pink → green, blue → yellow”.' },
  };
  const oc = $('#ood-card');
  if (oc) {
    const st = { task: 'rb', axis: 'view' };
    const base = $('#ood-base'), pert = $('#ood-pert'), sl = $('#ood-slider');
    const draw = () => {
      base.src = `./static/images/ood/${st.task}_id.webp`;
      pert.src = `./static/images/ood/${st.task}_${st.axis}.webp`;
      base.alt = `In distribution: ${OOD[st.task].id}`;
      pert.alt = `${st.axis} perturbation`;
      $('#ood-axis-label').textContent = st.axis[0].toUpperCase() + st.axis.slice(1);
      $('#ood-desc').textContent = OOD[st.task][st.axis];
    };
    const clip = () => { pert.style.clipPath = `inset(0 0 0 ${sl.value}%)`; oc.style.setProperty('--split', sl.value + '%'); };
    sl.addEventListener('input', clip);
    seg(oc, 'task', (v) => { st.task = v; draw(); });
    seg(oc, 'axis', (v) => { st.axis = v; draw(); });
    draw(); clip();
  }

  // ---------------- tooltip helper ----------------
  function tipFor(card) {
    let tip = $('.tip', card);
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; card.appendChild(tip); }
    return {
      show(html, ev) {
        tip.innerHTML = html; tip.classList.add('on');
        const r = card.getBoundingClientRect();
        let x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
        if (x + tip.offsetWidth > r.width - 8) x = ev.clientX - r.left - tip.offsetWidth - 14;
        tip.style.transform = `translate(${x}px, ${y}px)`;
      },
      hide() { tip.classList.remove('on'); },
    };
  }
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const onView = (node, fn) => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { fn(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(node);
  };

  // ---------------- Sankey funnel ----------------
  const sk = $('#sankey');
  if (sk) {
    const card = $('#funnel-card'), tip = tipFor(card);
    const W = 1000, H = 440, NW = 12, K = 300 / 1124900, GAP = 16;
    const C = { blue: '#2463EB', grey: '#C5CAD3', real: '#2463EB', view: '#6E56CF', app: '#E9682C', syn: '#22A06B', train: '#111318' };
    const cols = [
      [{ id: 'att', v: 340633, label: 'Attempts', c: C.blue }],
      [{ id: 'suc', v: 316084, label: 'Successful', c: C.blue }, { id: 'fail', v: 24549, label: 'Failed', c: C.grey }],
      [{ id: 'ver', v: 309119, label: 'Verified demos', c: C.blue }, { id: 'rej', v: 6965, label: 'Rejected on replay', c: C.grey }],
      [{ id: 'd1', v: 309119, label: 'Realistic', c: C.real }, { id: 'd2', v: 309119, label: 'Viewpoint', c: C.view }, { id: 'd3', v: 309119, label: 'Appearance', c: C.app }, { id: 'syn', v: 197543, label: 'Colour / letter variants', c: C.syn }],
      [{ id: 'train', v: 1124900, label: 'Training set', c: C.train }],
    ];
    const N = {};
    cols.forEach((col, ci) => {
      const hs = col.map((n) => Math.max(3, n.v * K));
      const tot = hs.reduce((a, b) => a + b, 0) + GAP * (col.length - 1);
      // early columns: keep the main flow centred, losses hang below it
      let y = ci <= 2 ? (H - hs[0]) / 2 : (H - tot) / 2;
      col.forEach((n, k) => { n.x = 20 + ci * (W - 40 - NW - 150) / 4; n.y = y; n.h = hs[k]; n.out = 0; n.in = 0; N[n.id] = n; y += hs[k] + GAP; });
    });
    // links: [from, to, value, tooltip]; source width can differ from target width (renders fan out)
    const L = [
      ['att', 'suc', 316084, '<b>316,084 successful attempts</b> (92.8%). Local play: 94.5% success, cloud: 87.3%.'],
      ['att', 'fail', 24549, '<b>24,549 failed attempts</b>, stored and kept out of the dataset for future research.'],
      ['suc', 'ver', 309119, '<b>309,119 verified demos.</b> Each success is replayed at 30 Hz, idle frames are trimmed, and it is kept only if it still succeeds.'],
      ['suc', 'rej', 6965, '<b>Rejected on replay</b>: too short, failed the success check, joint jumps, or malformed recordings.'],
      ['ver', 'd1', 309119, '<b>Realistic render</b>: table material and lighting randomized.'],
      ['ver', 'd2', 309119, '<b>Viewpoint render</b>: also randomizes camera pose.'],
      ['ver', 'd3', 309119, '<b>Appearance render</b>: also randomizes object colour.'],
      ['ver', 'syn', 197543, '<b>197,543 synthetic variants</b>: cube colours, patch colours or letters remapped, instruction rewritten.'],
      ['d1', 'train', 309119, ''], ['d2', 'train', 309119, ''], ['d3', 'train', 309119, ''], ['syn', 'train', 197543, ''],
    ];
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Sankey diagram of the data pipeline' }, sk);
    const defs = el('defs', {}, svg);
    const cp = el('clipPath', { id: 'sk-clip' }, defs);
    const cpr = el('rect', { x: 0, y: 0, width: reduced ? W : 0, height: H }, cp);
    const g = el('g', { 'clip-path': 'url(#sk-clip)' }, svg);
    const verOut = L.filter((l) => l[0] === 'ver').reduce((a, l) => a + l[2], 0);
    L.forEach(([a, b, v, t], k) => {
      const A = N[a], B = N[b];
      const sw = a === 'ver' ? A.h * v / verOut : v * K;   // fan-out from verified demos
      const tw = Math.max(b === 'rej' ? 3 : 0, v * K);
      const y0 = A.y + A.out, y1 = B.y + B.in; A.out += sw; B.in += tw;
      const x0 = A.x + NW, x1 = B.x, mx = (x0 + x1) / 2;
      const id = `grad${k}`;
      const gr = el('linearGradient', { id, x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
      el('stop', { offset: 0, 'stop-color': A.c }, gr); el('stop', { offset: 1, 'stop-color': B.c }, gr);
      const p = el('path', {
        d: `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1} L${x1},${y1 + tw} C${mx},${y1 + tw} ${mx},${y0 + sw} ${x0},${y0 + sw} Z`,
        fill: `url(#${id})`, class: 'sk-link',
      }, g);
      if (t) {
        p.addEventListener('mousemove', (e) => tip.show(t, e));
        p.addEventListener('mouseleave', () => tip.hide());
      }
    });
    Object.values(N).forEach((n) => {
      el('rect', { x: n.x, y: n.y, width: NW, height: n.h, rx: 3, fill: n.c }, g);
      const last = n.id === 'train';
      const tx = el('text', { x: last ? n.x - 10 : n.x + NW + 8, y: n.y + n.h / 2 - (n.h > 24 ? 6 : 0), 'text-anchor': last ? 'end' : 'start', class: 'sk-label' }, g);
      tx.textContent = n.label;
      const tv = el('text', { x: last ? n.x - 10 : n.x + NW + 8, y: n.y + n.h / 2 + (n.h > 24 ? 12 : 14), 'text-anchor': last ? 'end' : 'start', class: 'sk-val', 'data-v': n.v }, g);
      tv.textContent = fmt(n.v);
      if (last) { const t2 = el('text', { x: n.x - 10, y: n.y + n.h / 2 + 32, 'text-anchor': 'end', class: 'sk-sub' }, g); t2.textContent = '1.35B frames at 30 Hz'; }
    });
    const mult = el('text', { x: (N.ver.x + N.d1.x) / 2 + 6, y: N.d1.y - 12, 'text-anchor': 'middle', class: 'sk-sub' }, g);
    mult.textContent = '× 3 renders + relabelling';
    if (!reduced) onView(sk, () => {
      const t0 = performance.now(), dur = 2200;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        cpr.setAttribute('width', W * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // ---------------- Elo chart (Table 1) ----------------
  const ec = $('#elo-chart');
  if (ec) {
    const D = [['≤1400', 62663, 69.9, 110], ['1400–1450', 27749, 90.4, 69], ['1450–1500', 35416, 89.3, 59], ['1500–1560', 56902, 95.8, 44], ['1560–1600', 26429, 96.7, 40], ['1600–1700', 45287, 97.7, 38], ['>1700', 11412, 96.7, 60]];
    const W = 560, H = 300, L = 44, R = 44, T = 16, B = 40;
    const bw = (W - L - R) / D.length;
    const ys = (v) => T + (1 - (v - 60) / 40) * (H - T - B);
    const yt = (v) => T + (1 - v / 120) * (H - T - B);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Success rate and median time by Elo band' }, ec);
    [60, 70, 80, 90, 100].forEach((v) => {
      el('line', { x1: L, x2: W - R, y1: ys(v), y2: ys(v), stroke: '#E3E5EA' }, svg);
      el('text', { x: L - 8, y: ys(v) + 4, 'text-anchor': 'end', class: 'ax' }, svg).textContent = v + '%';
    });
    [0, 40, 80, 120].forEach((v) => { el('text', { x: W - R + 8, y: yt(v) + 4, class: 'ax' }, svg).textContent = v + 's'; });
    const tip = tipFor(ec.closest('.chart-card'));
    const pts = [];
    D.forEach(([lab, n, s, t], i) => {
      const x = L + i * bw;
      const r = el('rect', { x: x + bw * 0.18, y: ys(s), width: bw * 0.64, height: H - B - ys(s), rx: 5, class: 'elo-bar' }, svg);
      r.style.transformOrigin = `0 ${H - B}px`;
      el('text', { x: x + bw / 2, y: H - B + 18, 'text-anchor': 'middle', class: 'ax' }, svg).textContent = lab;
      pts.push([x + bw / 2, yt(t)]);
      const hit = el('rect', { x, y: T, width: bw, height: H - T - B, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', (e) => { r.classList.add('hl'); tip.show(`<b>Elo ${lab}</b><br>${fmt(n)} attempts<br>${s}% success · ${t}s median`, e); });
      hit.addEventListener('mouseleave', () => { r.classList.remove('hl'); tip.hide(); });
    });
    el('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: '#E9682C', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'pointer-events': 'none' }, svg);
    pts.forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 4, fill: '#fff', stroke: '#E9682C', 'stroke-width': 2.5, 'pointer-events': 'none' }, svg));
    el('text', { x: L, y: H - 4, class: 'ax' }, svg).textContent = 'Player Elo';
    if (!reduced) { svg.classList.add('pre'); onView(ec, () => svg.classList.remove('pre')); }
  }

  // ---------------- dataset comparison (Table 4) ----------------
  const cb = $('#cmp-bars');
  if (cb) {
    // [name, group(o=ours,c=crowd,e=expert), episodes(k), +aug(k), hours, +aug hours, people, tasks]
    const D = [
      ['RoboPlayground GO!', 'o', 309.119, 815.781, 3489, 9044, 1526, 69],
      ['RoboTurk', 'c', 2.2, 0, 137.5, 0, null, 2],
      ['RoboTurk Real', 'c', 2.144, 0, 111, 0, 54, 3],
      ['RoboCrowd', 'c', 0.817, 0, null, 0, 231, 6],
      ['RoboCade', 'c', 0.910, 0, null, 0, null, 6],
      ['AXIS V2 †', 'c', 2350, 0, null, 0, null, 1092],
      ['robomimic MH', 'e', 1.2, 0, null, 0, 6, 4],
      ['DROID', 'e', 76, 0, 350, 0, 50, 86],
      ['RoboMIND', 'e', 107, 0, 305.5, 0, null, 479],
      ['AgiBot World', 'e', 1000, 0, 2976, 0, null, 217],
      ['RoboCasa365', 'e', 55, 600, 612, 1615, null, 365],
    ];
    const M = {
      episodes: { get: (d) => [d[2] * 1000, d[3] * 1000], f: (v) => (v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : fmt(v)) },
      hours: { get: (d) => [d[4], d[5]], f: (v) => fmt(Math.round(v)) + ' h' },
      people: { get: (d) => [d[6], 0], f: fmt },
      tasks: { get: (d) => [d[7], 0], f: fmt },
    };
    const card = $('#cmp-card');
    const draw = (m) => {
      const rows = D.map((d) => { const [a, b] = M[m].get(d); return { d, a, b }; }).filter((r) => r.a != null).sort((x, y) => (y.a + y.b) - (x.a + x.b));
      const max = Math.max(...rows.map((r) => r.a + r.b)), lmax = Math.log10(max) + 0.05, lmin = 0;
      const w = (v) => Math.max(0, (Math.log10(Math.max(v, 1)) - lmin) / (lmax - lmin) * 100);
      cb.innerHTML = rows.map(({ d, a, b }) => {
        const wa = w(a), wt = b ? w(a + b) : wa;
        return `<div class="cmp-row g-${d[1]}"><span class="lab">${d[0]}</span><div class="cmp-track">
          <div class="cmp-fill" style="width:${wa}%"></div>${b ? `<div class="cmp-aug" style="left:${wa}%;width:${wt - wa}%"></div>` : ''}
          <span class="cmp-val" style="left:${wt}%">${M[m].f(a)}${b ? ` <em>+${M[m].f(b)}</em>` : ''}</span></div></div>`;
      }).join('');
    };
    $$('.seg button', card).forEach((b) => b.addEventListener('click', () => {
      $$('.seg button', card).forEach((x) => x.classList.toggle('on', x === b));
      draw(b.dataset.metric);
    }));
    draw('episodes');
  }
})();
