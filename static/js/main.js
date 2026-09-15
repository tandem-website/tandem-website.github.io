/* TANDEM project page: charts, scroll-spy, reveal, copy. No dependencies. */
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
    'Pick 3 Breads & Cover',
    'Remove Toy & Solve Puzzle',
    'Bread in Blue Bowl, Banana in Green Bowl, Cover Bread',
    'Remove Pen, Place on Tray, Open Book',
    'Pick Bread, Place on Plate, Open Box, Bread in Box'
  ];
  var MAIN_CATS = ['Breads & Cover', 'Toy & Puzzle', 'Bowls & Cover', 'Pen, Tray & Book', 'Bread in Box', 'Average'];

  function avg(a) { return Math.round(a.reduce(function (s, x) { return s + x; }, 0) / a.length * 10) / 10; }
  function withAvg(a) { return a.concat([avg(a)]); }

  // Table II
  var MAIN = {
    sr:   { pre: withAvg([0, 0, 0, 0, 0]),       hitl: withAvg([30, 0, 15, 30, 10]),  ours: withAvg([45, 50, 75, 50, 80]) },
    prog: { pre: withAvg([30, 30, 32, 52, 33]),  hitl: withAvg([69, 30, 68, 70, 40]), ours: withAvg([68, 66, 87, 77, 93]) }
  };

  // Table III: Pick 3 Breads & Cover at matched human time
  var SCALE_CATS = ['262 s', '524 s', '785 s', '1047 s'];
  var SCALE = {
    ep:   { ours: [20, 40, 60, 80], human: [7, 14, 21, 28] },
    sr:   { ours: [45, 75, 80, 75], human: [30, 30, 50, 65] },
    prog: { ours: [68, 90, 94, 85], human: [71, 63, 75, 91] }
  };
  var SCALE_NOTES = {
    ep: 'Successful demonstrations collected for each human-time budget. TANDEM collects about 2.9× as many at every budget.',
    sr: 'Success of π0.5-DROID fine-tuned on the demonstrations collected for each budget. TANDEM is higher at every budget.',
    prog: 'Task progress of the same checkpoints. Teleoperation is higher at 262 s and 1047 s; TANDEM is higher at 524 s and 785 s.'
  };

  // Table I: failure attribution
  var FAIL_SERIES = {
    success:  { label: 'Success',              color: v('--s-ours') },
    invent:   { label: 'Invention / switch',   color: v('--s-pre') },
    planning: { label: 'TAMP planning',        color: '#eda100' },
    exec:     { label: 'TAMP execution',       color: v('--s-hitl') },
    human:    { label: 'Human operator',       color: v('--s-human') }
  };
  var FAIL_KEYS = ['success', 'invent', 'planning', 'exec', 'human'];
  var FAIL = [
    { success: 20, invent: 0, planning: 1,  exec: 27, human: 0 },
    { success: 20, invent: 4, planning: 3,  exec: 32, human: 3 },
    { success: 20, invent: 0, planning: 0,  exec: 12, human: 0 },
    { success: 20, invent: 0, planning: 4,  exec: 17, human: 0 },
    { success: 20, invent: 0, planning: 16, exec: 32, human: 2 }
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

  // Vertical bar path with 4px rounded data-end, square at the baseline.
  function barPath(x, y, w, h) {
    if (h <= 0) return '';
    var r = Math.min(4, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }

  // ---------- grouped bar chart ----------
  function groupedBars(container, opts) {
    var tip = tooltip(container);
    var svg = null;

    function draw() {
      if (svg) svg.remove();
      var W = Math.max(container.clientWidth, 280);
      var narrow = W < 600;
      var H = opts.height || (narrow ? 290 : 320);
      var m = { t: 22, r: 8, b: narrow ? 50 : 34, l: 34 };
      var iw = W - m.l - m.r, ih = H - m.t - m.b;
      var cats = opts.cats, keys = opts.keys, data = opts.data();
      var axis = opts.axis ? opts.axis() : PERCENT_AXIS;
      var gw = iw / cats.length;
      var pad = Math.max(narrow ? 5 : 10, gw * (narrow ? 0.1 : 0.18));
      var gap = 2;
      var bw = Math.max(4, (gw - 2 * pad - gap * (keys.length - 1)) / keys.length);
      var y = function (val) { return m.t + ih - (val / axis.max) * ih; };

      svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': opts.aria });
      container.insertBefore(svg, container.firstChild);

      axis.ticks.forEach(function (tk) {
        el('line', { x1: m.l, x2: W - m.r, y1: y(tk), y2: y(tk), class: tk === 0 ? 'baseline' : 'gridline' }, svg);
        el('text', { x: m.l - 6, y: y(tk) + 4, 'text-anchor': 'end', class: 'tick' }, svg).textContent = axis.fmt(tk);
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
          if (opts.labelKeys && opts.labelKeys.indexOf(k) >= 0 && (!narrow || bw >= 26)) {
            el('text', { x: bx + bw / 2, y: y(val) - 5, 'text-anchor': 'middle', class: 'val' }, svg).textContent = axis.fmt(val);
          }
        });
        var words = narrow ? c.split(' ') : [c];
        // join short trailing tokens like "&" onto the previous line
        if (narrow) words = words.reduce(function (acc, w) {
          if (acc.length && (acc[acc.length - 1].length + w.length < 9)) acc[acc.length - 1] += ' ' + w; else acc.push(w);
          return acc;
        }, []);
        words.forEach(function (w, wi) {
          el('text', { x: gx + gw / 2, y: m.t + ih + 18 + wi * 14, 'text-anchor': 'middle', class: 'cat', style: narrow ? 'font-size:11px' : '' }, svg).textContent = w;
        });

        // Hit target covers the whole group; tooltip lists every series.
        var hit = el('rect', { x: gx, y: m.t, width: gw, height: ih, class: 'hit' }, svg);
        function over() {
          container.classList.add('dim');
          bars.forEach(function (b) { b.p.classList.toggle('on', b.ci === ci); });
          var title = opts.tipTitle ? opts.tipTitle(ci) : c;
          var html = '<div class="t">' + title + '</div>' + keys.map(function (k) {
            return '<div class="r"><span><i style="background:' + opts.series[k].color + '"></i>' + opts.series[k].label + '</span><span>' + axis.fmt(data[k][ci]) + '</span></div>';
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

  // ---------- stacked horizontal bars: collection attempts by outcome ----------
  function failureChart(container) {
    var tip = tooltip(container);
    var maxAttempts = 70;

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
        if (row[k] >= 4) s.textContent = row[k];
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
          var share = k === 'success' ? '' : ' <span style="opacity:.6;font-weight:500">(' + pct(failures ? row[k] / failures * 100 : 0) + ' of failures)</span>';
          return '<div class="r"><span><i style="background:' + FAIL_SERIES[k].color + '"></i>' + FAIL_SERIES[k].label + '</span><span>' + row[k] + share + '</span></div>';
        }).join('');
        var cb = container.getBoundingClientRect(), tb = track.getBoundingClientRect();
        var clientX = e && e.clientX != null ? e.clientX : (tb.left + tb.width / 2);
        var x = Math.min(Math.max(clientX - cb.left, 150), cb.width - 150);
        tip.show(x, tb.top - cb.top - 2, html);
      }
      function out() { container.classList.remove('dim'); tip.hide(); }
      r.addEventListener('mousemove', over);
      r.addEventListener('mouseleave', out);
      r.addEventListener('touchstart', function (e) { over(e.touches[0]); }, { passive: true });
    });

    var ax = document.createElement('div');
    ax.className = 'faxis';
    ax.innerHTML = '<div></div><div class="ticks">' + [0, 10, 20, 30, 40, 50, 60, 70].map(function (t) {
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
    cats: MAIN_CATS, keys: mainKeys, series: SERIES, labelKeys: ['ours'], avgDivider: true,
    aria: 'Downstream policy performance by method on five tasks',
    tipTitle: function (ci) { return ci < TASKS.length ? TASKS[ci] : 'Average over five tasks'; },
    data: function () { return MAIN[state.main]; }
  });

  var scaleKeys = ['ours', 'human'];
  legend('legend-scale', scaleKeys, SERIES);
  var noteScale = document.getElementById('note-scale');
  charts.scale = groupedBars(document.getElementById('chart-scale'), {
    cats: SCALE_CATS, keys: scaleKeys, series: SERIES, labelKeys: scaleKeys, height: 290,
    aria: 'TANDEM vs. human teleoperation at matched human-time budgets',
    tipTitle: function (ci) { return SCALE_CATS[ci] + ' of human time'; },
    axis: function () {
      return state.scale === 'ep'
        ? { max: 80, ticks: [0, 20, 40, 60, 80], fmt: function (x) { return String(x); } }
        : PERCENT_AXIS;
    },
    data: function () { return SCALE[state.scale]; }
  });
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

  // ---------- reveal on scroll ----------
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add('in'); });
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
