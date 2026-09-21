/* TANDEM project page: charts, scroll-spy, copy. No dependencies. */
(function () {
  'use strict';

  var css = getComputedStyle(document.documentElement);
  function v(name) { return css.getPropertyValue(name).trim(); }
  var NS = 'http://www.w3.org/2000/svg';

  // Series follow the entity: the same approach always has the same color.
  var SERIES = {
    pre:   { label: 'π0.5-DROID (pretrained)', color: v('--s-pre') },
    hitl:  { label: 'HITL-TAMP',               color: v('--s-hitl') },
    ours:  { label: 'TANDEM',                  color: v('--s-ours') },
    human: { label: 'Human teleop (oracle)',   color: v('--s-human') }
  };

  var TASKS = [
    'Cover Bread Rolls',
    'Solve Constrained Puzzle',
    'Sort & Cover Snacks',
    'Open Obstructed Book',
    'Store Bread in Closed Box'
  ];
  var MAIN_CATS = TASKS.concat(['Average']);
  // axis labels: two lines when there is room, one short word otherwise
  var MAIN_LINES = [['Cover Bread', 'Rolls'], ['Solve Constrained', 'Puzzle'], ['Sort & Cover', 'Snacks'], ['Open Obstructed', 'Book'], ['Store Bread in', 'Closed Box'], ['Average']];
  var MAIN_SHORT = [['Bread', 'Rolls'], ['Puzzle'], ['Snacks'], ['Book'], ['Box'], ['Avg.']];

  function avg(a) { return Math.round(a.reduce(function (s, x) { return s + x; }, 0) / a.length * 10) / 10; }
  function withAvg(a) { return a.concat([avg(a)]); }

  // Fig. 6: downstream policy performance, 20 evaluation trials per task
  var MAIN = {
    sr:   { pre: withAvg([0, 0, 0, 0, 0]),              hitl: withAvg([30, 0, 15, 30, 10]),        ours: withAvg([45, 50, 75, 50, 80]) },
    prog: { pre: withAvg([41.3, 30, 31.7, 38.3, 33.3]), hitl: withAvg([68.8, 30, 68.3, 71.7, 40]), ours: withAvg([67.5, 65, 85, 76.7, 93.3]) }
  };

  // Fig. 5: Cover Bread Rolls at matched human-effort budgets (seconds)
  var SCALE_X = [262, 524, 785, 1047];
  var SCALE = {
    ep:   { ours: [20, 40, 60, 80], human: [7, 14, 21, 28] },
    sr:   { ours: [45, 75, 80, 75], human: [30, 30, 50, 65] }
  };
  var SCALE_NOTES = {
    ep: 'TANDEM collects approximately 2.9× more demonstrations than full-task teleoperation at matched human-time budgets. For example, with 524 s of human intervention, TANDEM collects 40 demonstrations compared with 14 for oracle teleoperation; with 785 s, it collects 60 compared with 21.',
    sr: 'Success of π0.5-DROID fine-tuned on the demonstrations collected at each budget. TANDEM achieves 45%, 75%, 80%, and 75% success across the four human-effort budgets, compared with 30%, 30%, 50%, and 65% for Human teleop (oracle).'
  };

  // Table I + Table III: collection attempts and failure attribution
  var FAIL_SERIES = {
    success:  { label: 'Success',                     color: v('--s-ours') },
    invent:   { label: 'Invention / phase switching', color: '#a2748f' },
    planning: { label: 'TAMP planning',               color: '#7e9b6f' },
    exec:     { label: 'TAMP execution',              color: '#b58b2a' },
    human:    { label: 'Human operator',              color: '#6f7a85' }
  };
  var FAIL_KEYS = ['success', 'invent', 'planning', 'exec', 'human'];
  var FAIL = [
    { success: 20, invent: 0, planning: 0, exec: 11, human: 0 },
    { success: 20, invent: 0, planning: 0, exec: 3,  human: 0 },
    { success: 20, invent: 0, planning: 0, exec: 2,  human: 0 },
    { success: 20, invent: 0, planning: 0, exec: 5,  human: 0 },
    { success: 20, invent: 2, planning: 0, exec: 7,  human: 0 }
  ];

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function pct(x) { return (Math.round(x * 10) / 10) + '%'; }
  var PERCENT_AXIS = { max: 100, ticks: [0, 25, 50, 75, 100], fmt: pct };

  function legend(id, keys, map) {
    var box = document.getElementById(id);
    box.innerHTML = '';
    keys.forEach(function (k) {
      var s = document.createElement('span');
      s.innerHTML = '<i style="background:' + map[k].color + '"></i>' + map[k].label;
      box.appendChild(s);
    });
  }

  // ---------- tooltip ----------
  function tooltip(container) {
    var t = document.createElement('div');
    t.className = 'tip';
    container.appendChild(t);
    return {
      show: function (x, y, html) { t.innerHTML = html; t.style.left = x + 'px'; t.style.top = y + 'px'; t.classList.add('show'); },
      hide: function () { t.classList.remove('show'); }
    };
  }

  // Plain rectangle, flush to the baseline.
  function barPath(x, y, w, h) {
    if (h <= 0) return '';
    return 'M' + x + ',' + (y + h) + 'V' + y + 'H' + (x + w) + 'V' + (y + h) + 'Z';
  }

  // ---------- grouped bar chart ----------
  function groupedBars(container, opts) {
    var tip = tooltip(container);
    var svg = null;

    function draw() {
      if (svg) svg.remove();
      var W = Math.max(container.clientWidth, 280);
      var narrow = W < 560;
      var H = opts.height || (narrow ? 280 : 320);
      var m = { t: 22, r: 1, b: 44, l: 34 };
      var iw = W - m.l - m.r, ih = H - m.t - m.b;
      var cats = opts.cats, keys = opts.keys, data = opts.data();
      var gw = iw / cats.length;
      var pad = Math.max(narrow ? 5 : 10, gw * (narrow ? 0.1 : 0.18));
      var gap = 2;
      var bw = Math.max(4, (gw - 2 * pad - gap * (keys.length - 1)) / keys.length);
      var y = function (val) { return m.t + ih - (val / 100) * ih; };
      var lines = gw < 115 ? opts.shortLines : opts.lines;

      svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': opts.aria });
      container.insertBefore(svg, container.firstChild);

      PERCENT_AXIS.ticks.forEach(function (tk) {
        el('line', { x1: m.l, x2: W - m.r, y1: y(tk), y2: y(tk), class: tk === 0 ? 'baseline' : 'gridline' }, svg);
        el('text', { x: m.l - 6, y: y(tk) + 4, 'text-anchor': 'end', class: 'tick' }, svg).textContent = tk + '%';
      });

      var bars = [];
      cats.forEach(function (c, ci) {
        var gx = m.l + ci * gw;
        if (ci === cats.length - 1 && opts.avgDivider) {
          el('line', { x1: gx, x2: gx, y1: m.t, y2: m.t + ih, class: 'gridline', 'stroke-dasharray': '3 3' }, svg);
        }
        keys.forEach(function (k, ki) {
          var val = data[k][ci];
          var bx = gx + pad + ki * (bw + gap);
          var p = el('path', { d: barPath(bx, y(val), bw, m.t + ih - y(val)), fill: opts.series[k].color, class: 'bar' }, svg);
          bars.push({ p: p, ci: ci });
          if (opts.labelKeys && opts.labelKeys.indexOf(k) >= 0 && bw >= 22) {
            el('text', { x: bx + bw / 2, y: y(val) - 5, 'text-anchor': 'middle', class: 'val' }, svg).textContent = pct(val);
          }
        });
        lines[ci].forEach(function (w, wi) {
          el('text', { x: gx + gw / 2, y: m.t + ih + 18 + wi * 14, 'text-anchor': 'middle', class: 'cat', style: narrow ? 'font-size:11px' : '' }, svg).textContent = w;
        });

        // Hit target covers the whole group; tooltip lists every series.
        var hit = el('rect', { x: gx, y: m.t, width: gw, height: ih, class: 'hit' }, svg);
        function over() {
          container.classList.add('dim');
          bars.forEach(function (b) { b.p.classList.toggle('on', b.ci === ci); });
          var title = ci < TASKS.length ? c : 'Average over five tasks';
          var html = '<div class="t">' + title + '</div>' + keys.map(function (k) {
            return '<div class="r"><span><i style="background:' + opts.series[k].color + '"></i>' + opts.series[k].label + '</span><span>' + pct(data[k][ci]) + '</span></div>';
          }).join('');
          var topVal = Math.max.apply(null, keys.map(function (k) { return data[k][ci]; }));
          var tx = Math.min(Math.max(gx + gw / 2, 110), W - 110);
          tip.show(tx, y(topVal) - 4, html);
        }
        function out() { container.classList.remove('dim'); tip.hide(); }
        hit.addEventListener('mouseenter', over);
        hit.addEventListener('mouseleave', out);
        hit.addEventListener('touchstart', over, { passive: true });
      });
      svg.addEventListener('mouseleave', function () { container.classList.remove('dim'); tip.hide(); });
    }

    draw();
    return { draw: draw };
  }

  // ---------- line chart with crosshair: TANDEM vs. teleop at matched human time ----------
  function scaleChart(container, metric) {
    var tip = tooltip(container);
    var svg = null;
    var keys = ['ours', 'human'];

    function draw() {
      if (svg) svg.remove();
      var m0 = metric();
      var data = SCALE[m0];
      var axis = m0 === 'ep' ? { max: 80, ticks: [0, 20, 40, 60, 80], fmt: String } : PERCENT_AXIS;
      var W = Math.max(container.clientWidth, 260);
      var H = 290;
      var m = { t: 22, r: 1, b: 40, l: 38 };
      var iw = W - m.l - m.r, ih = H - m.t - m.b;
      var inset = Math.min(40, iw * 0.07);
      var x = function (s) { return m.l + inset + (s - SCALE_X[0]) / (SCALE_X[SCALE_X.length - 1] - SCALE_X[0]) * (iw - 2 * inset); };
      var y = function (val) { return m.t + ih - (val / axis.max) * ih; };
      svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'TANDEM vs. human teleoperation at matched human-effort budgets on Cover Bread Rolls' });
      container.insertBefore(svg, container.firstChild);

      axis.ticks.forEach(function (tk) {
        el('line', { x1: m.l, x2: W - m.r, y1: y(tk), y2: y(tk), class: tk === 0 ? 'baseline' : 'gridline' }, svg);
        el('text', { x: m.l - 6, y: y(tk) + 4, 'text-anchor': 'end', class: 'tick' }, svg).textContent = axis.fmt(tk);
      });
      SCALE_X.forEach(function (s) {
        el('text', { x: x(s), y: m.t + ih + 18, 'text-anchor': 'middle', class: 'tick' }, svg).textContent = s + ' s';
      });
      el('text', { x: m.l + iw / 2, y: H - 4, 'text-anchor': 'middle', class: 'tick' }, svg).textContent = 'Human effort time';

      var cross = el('line', { y1: m.t, y2: m.t + ih, stroke: v('--axis'), 'stroke-width': 1, opacity: 0 }, svg);

      keys.forEach(function (k) {
        var d = SCALE_X.map(function (s, i) { return (i ? 'L' : 'M') + x(s) + ',' + y(data[k][i]); }).join('');
        el('path', { d: d, fill: 'none', stroke: SERIES[k].color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      });
      // Value labels: the higher series above its point, the lower one below.
      SCALE_X.forEach(function (s, i) {
        keys.forEach(function (k) {
          var other = data[k === 'ours' ? 'human' : 'ours'][i];
          var above = data[k][i] > other || (data[k][i] === other && k === 'ours');
          el('circle', { cx: x(s), cy: y(data[k][i]), r: 4, fill: SERIES[k].color, stroke: '#fff', 'stroke-width': 2 }, svg);
          el('text', { x: x(s), y: y(data[k][i]) + (above ? -9 : 17), 'text-anchor': 'middle', class: 'val' }, svg).textContent = axis.fmt(data[k][i]);
        });
      });

      var hit = el('rect', { x: m.l, y: m.t, width: iw, height: ih, class: 'hit' }, svg);
      function move(clientX) {
        var r = svg.getBoundingClientRect();
        var px = (clientX - r.left) * (W / r.width);
        var best = 0;
        SCALE_X.forEach(function (s, i) { if (Math.abs(x(s) - px) < Math.abs(x(SCALE_X[best]) - px)) best = i; });
        var cx = x(SCALE_X[best]);
        cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('opacity', 1);
        var html = '<div class="t">' + SCALE_X[best] + ' s of human effort</div>' + keys.map(function (k) {
          return '<div class="r"><span><i style="background:' + SERIES[k].color + '"></i>' + SERIES[k].label + '</span><span>' + axis.fmt(data[k][best]) + '</span></div>';
        }).join('');
        var top = Math.max(data.ours[best], data.human[best]);
        tip.show(Math.min(Math.max(cx, 110), W - 110), y(top) - 18, html);
      }
      hit.addEventListener('mousemove', function (e) { move(e.clientX); });
      hit.addEventListener('touchstart', function (e) { move(e.touches[0].clientX); }, { passive: true });
      hit.addEventListener('mouseleave', function () { cross.setAttribute('opacity', 0); tip.hide(); });
    }

    draw();
    return { draw: draw };
  }

  // ---------- stacked horizontal bars: collection attempts by outcome ----------
  function failureChart(container) {
    var tip = tooltip(container);
    var maxAttempts = 35;

    FAIL.forEach(function (row, i) {
      var attempts = FAIL_KEYS.reduce(function (s, k) { return s + row[k]; }, 0);
      var r = document.createElement('div');
      r.className = 'frow';
      var label = document.createElement('div');
      label.className = 'flabel';
      label.innerHTML = TASKS[i] + '<small>20 of ' + attempts + ' attempts succeeded (' + pct(20 / attempts * 100) + ')</small>';
      var track = document.createElement('div');
      track.className = 'ftrack';
      track.style.width = (attempts / maxAttempts * 100) + '%';
      FAIL_KEYS.forEach(function (k) {
        if (!row[k]) return;
        var s = document.createElement('div');
        s.className = 'fseg';
        s.style.flex = row[k] + ' 0 0';
        s.style.background = FAIL_SERIES[k].color;
        if (row[k] >= 3) s.textContent = row[k];
        track.appendChild(s);
      });
      r.appendChild(label);
      r.appendChild(track);
      container.appendChild(r);

      function over(e) {
        container.classList.add('dim');
        container.querySelectorAll('.frow').forEach(function (o) { o.classList.toggle('on', o === r); });
        var failures = attempts - row.success;
        var html = '<div class="t">' + TASKS[i] + '</div>' + FAIL_KEYS.map(function (k) {
          var share = k === 'success' ? '' : ' <span style="opacity:.6">(' + pct(failures ? row[k] / failures * 100 : 0) + ' of failures)</span>';
          return '<div class="r"><span><i style="background:' + FAIL_SERIES[k].color + '"></i>' + FAIL_SERIES[k].label + '</span><span>' + row[k] + share + '</span></div>';
        }).join('');
        var cb = container.getBoundingClientRect(), tb = track.getBoundingClientRect();
        var clientX = e && e.clientX != null ? e.clientX : (tb.left + tb.width / 2);
        var x = Math.min(Math.max(clientX - cb.left, 160), cb.width - 160);
        tip.show(x, tb.top - cb.top - 2, html);
      }
      function out() { container.classList.remove('dim'); tip.hide(); }
      r.addEventListener('mousemove', over);
      r.addEventListener('mouseleave', out);
      r.addEventListener('touchstart', function (e) { over(e.touches[0]); }, { passive: true });
    });

    var ax = document.createElement('div');
    ax.className = 'faxis';
    ax.innerHTML = '<div></div><div class="ticks">' + [0, 5, 10, 15, 20, 25, 30, 35].map(function (t) {
      return '<span style="left:' + (t / maxAttempts * 100) + '%">' + t + '</span>';
    }).join('') + '</div>';
    container.appendChild(ax);
  }

  // ---------- mount charts ----------
  var state = { main: 'sr', scale: 'ep' };
  var charts = {};

  var mainKeys = ['pre', 'hitl', 'ours'];
  legend('legend-main', mainKeys, SERIES);
  charts.main = groupedBars(document.getElementById('chart-main'), {
    cats: MAIN_CATS, lines: MAIN_LINES, shortLines: MAIN_SHORT,
    keys: mainKeys, series: SERIES, labelKeys: ['ours'], avgDivider: true,
    aria: 'Downstream policy performance by approach on five tasks',
    data: function () { return MAIN[state.main]; }
  });

  legend('legend-scale', ['ours', 'human'], SERIES);
  // line swatches for the line chart
  document.querySelectorAll('#legend-scale i').forEach(function (sw) { sw.style.height = '3px'; sw.style.width = '16px'; });
  var noteScale = document.getElementById('note-scale');
  charts.scale = scaleChart(document.getElementById('chart-scale'), function () { return state.scale; });
  noteScale.textContent = SCALE_NOTES[state.scale];

  legend('legend-fail', FAIL_KEYS, FAIL_SERIES);
  failureChart(document.getElementById('chart-fail'));

  document.querySelectorAll('.seg').forEach(function (seg) {
    var target = seg.getAttribute('data-for');
    seg.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        seg.querySelectorAll('button').forEach(function (o) { o.classList.toggle('active', o === b); });
        state[target] = b.getAttribute('data-metric');
        charts[target].draw();
        if (target === 'scale') noteScale.textContent = SCALE_NOTES[state.scale];
      });
    });
  });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { charts.main.draw(); charts.scale.draw(); }, 120);
  });

  // ---------- videos: play only while near the viewport ----------
  var vids = document.querySelectorAll('video[data-autoplay]');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    vids.forEach(function (vd) { vd.controls = true; vd.preload = 'metadata'; });
  } else {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var vd = e.target;
        if (e.isIntersecting) {
          var p = vd.play();
          if (p && p.catch) p.catch(function () { vd.controls = true; });
        } else {
          vd.pause();
        }
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach(function (vd) { vio.observe(vd); });
  }

  // ---------- TOC scroll-spy ----------
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc-list a'));
  var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  function spy() {
    var marker = window.innerHeight * 0.35, cur = -1;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= marker) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
  }
  window.addEventListener('scroll', spy, { passive: true });
  spy();

  // ---------- copy BibTeX ----------
  var copyBtn = document.querySelector('.copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = document.querySelector('.bib code').textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = 'Copied';
          setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500);
        });
      }
    });
  }
})();
