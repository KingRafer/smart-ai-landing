/* Master performance calendar — Smart AI */
(function () {
  'use strict';

  var BASE = 20000; // USC

  // Sample daily returns (% of base) for Sep 2026 — illustrative
  var DATA = {
    all: {
      days: {
        '2026-09-01': 2.1, '2026-09-02': 4.5, '2026-09-03': 1.2, '2026-09-04': 6.8,
        '2026-09-05': 3.4, '2026-09-08': 9.2, '2026-09-09': 5.1, '2026-09-10': 2.8,
        '2026-09-11': 11.4, '2026-09-12': 7.6, '2026-09-15': 3.9, '2026-09-16': 8.3,
        '2026-09-17': 1.5, '2026-09-18': 14.2, '2026-09-19': 4.7, '2026-09-22': -8.7,
        '2026-09-23': 6.1, '2026-09-24': 2.3, '2026-09-25': 10.5, '2026-09-26': 5.8,
        '2026-09-29': 9.5
      },
      realized: 256.1, week: 9.5, win: 64.8, trades: 645,
      realizedUsc: 51215, weekUsc: 1903
    },
    basic: {
      days: {
        '2026-09-01': 1.8, '2026-09-02': 3.2, '2026-09-03': 0.9, '2026-09-04': 5.1,
        '2026-09-05': 2.4, '2026-09-08': 7.1, '2026-09-09': 4.0, '2026-09-10': 2.1,
        '2026-09-11': 8.6, '2026-09-12': 5.9, '2026-09-15': 2.8, '2026-09-16': 6.4,
        '2026-09-17': 1.1, '2026-09-18': 10.8, '2026-09-19': 3.5, '2026-09-22': -5.2,
        '2026-09-23': 4.7, '2026-09-24': 1.9, '2026-09-25': 8.1, '2026-09-26': 4.4,
        '2026-09-29': 7.2
      },
      realized: 198.4, week: 7.2, win: 62.1, trades: 412,
      realizedUsc: 19840, weekUsc: 1440
    },
    gold: {
      days: {
        '2026-09-01': 2.4, '2026-09-02': 5.1, '2026-09-03': 1.5, '2026-09-04': 7.8,
        '2026-09-05': 3.9, '2026-09-08': 10.4, '2026-09-09': 5.8, '2026-09-10': 3.2,
        '2026-09-11': 12.9, '2026-09-12': 8.4, '2026-09-15': 4.5, '2026-09-16': 9.2,
        '2026-09-17': 1.8, '2026-09-18': 15.6, '2026-09-19': 5.3, '2026-09-22': -9.8,
        '2026-09-23': 6.9, '2026-09-24': 2.7, '2026-09-25': 11.8, '2026-09-26': 6.5,
        '2026-09-29': 10.8
      },
      realized: 312.6, week: 10.8, win: 66.3, trades: 518,
      realizedUsc: 31260, weekUsc: 2160
    },
    pro: {
      days: {
        '2026-09-01': 2.8, '2026-09-02': 5.8, '2026-09-03': 1.7, '2026-09-04': 8.9,
        '2026-09-05': 4.5, '2026-09-08': 11.9, '2026-09-09': 6.6, '2026-09-10': 3.6,
        '2026-09-11': 14.7, '2026-09-12': 9.6, '2026-09-15': 5.1, '2026-09-16': 10.5,
        '2026-09-17': 2.0, '2026-09-18': 17.8, '2026-09-19': 6.0, '2026-09-22': -11.2,
        '2026-09-23': 7.9, '2026-09-24': 3.1, '2026-09-25': 13.5, '2026-09-26': 7.4,
        '2026-09-29': 12.3
      },
      realized: 428.9, week: 12.3, win: 68.2, trades: 721,
      realizedUsc: 85780, weekUsc: 2460
    }
  };

  var state = { ds: 'all', view: 'calendar', year: 2026, month: 8 };

  function $(id) { return document.getElementById(id); }
  function qsa(sel, el) { return [].slice.call((el || document).querySelectorAll(sel)); }

  function level(pct) {
    if (pct == null) return 'none';
    if (pct < 0) return 'loss';
    if (pct < 3) return 'lv1';
    if (pct < 8) return 'lv2';
    if (pct < 15) return 'lv3';
    return 'lv4';
  }

  function fmtPct(n) {
    return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
  }

  function fmtUsc(n) {
    return n.toLocaleString('en-US') + ' USC';
  }

  function updateStats() {
    var d = DATA[state.ds] || DATA.all;
    var real = $('m-real');
    var realUsc = $('m-real-usc');
    var week = $('m-week');
    var weekUsc = $('m-week-usc');
    var win = $('m-win');
    var trades = $('m-trades');
    var base = $('m-base');
    if (real) real.textContent = fmtPct(d.realized);
    if (realUsc) realUsc.textContent = fmtUsc(d.realizedUsc);
    if (week) week.textContent = fmtPct(d.week);
    if (weekUsc) weekUsc.textContent = fmtUsc(d.weekUsc);
    if (win) win.textContent = d.win.toFixed(1) + '%';
    if (trades) trades.textContent = d.trades + ' closed trades';
    if (base) base.textContent = 'Base ' + BASE.toLocaleString('en-US') + ' USC = 100%';
  }

  function renderCalendar() {
    var wrap = $('cal-view');
    if (!wrap) return;
    var d = DATA[state.ds] || DATA.all;
    var y = state.year, m = state.month;
    var first = new Date(y, m, 1);
    var startDay = first.getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var monthEl = $('cal-month');
    if (monthEl) monthEl.textContent = months[m] + ' ' + y;

    var html = '<div class="cal-grid">';
    var heads = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    heads.forEach(function (h) {
      html += '<div class="cal-head">' + h + '</div>';
    });
    for (var i = 0; i < startDay; i++) {
      html += '<div class="cal-cell empty"></div>';
    }
    for (var day = 1; day <= daysInMonth; day++) {
      var key = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var pct = d.days[key];
      var lv = level(pct);
      var label = pct == null ? '' : fmtPct(pct);
      html += '<div class="cal-cell ' + lv + '" title="' + key + (pct != null ? ': ' + label : '') + '">';
      html += '<span class="cal-day">' + day + '</span>';
      if (pct != null) html += '<span class="cal-pct">' + label + '</span>';
      html += '</div>';
    }
    html += '</div>';
    wrap.innerHTML = html;

    var meta = $('cal-meta');
    if (meta) {
      var vals = Object.keys(d.days).map(function (k) { return d.days[k]; });
      var pos = vals.filter(function (v) { return v > 0; }).length;
      var neg = vals.filter(function (v) { return v < 0; }).length;
      meta.textContent = pos + ' green · ' + neg + ' red · ' + (vals.length - pos - neg) + ' flat';
    }
  }

  function renderWeekly() {
    var wrap = $('cal-view');
    if (!wrap) return;
    var d = DATA[state.ds] || DATA.all;
    var weeks = [
      { label: 'Week 1 (1–5 Sep)', keys: ['2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05'] },
      { label: 'Week 2 (8–12 Sep)', keys: ['2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12'] },
      { label: 'Week 3 (15–19 Sep)', keys: ['2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-19'] },
      { label: 'Week 4 (22–26 Sep)', keys: ['2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26'] },
      { label: 'Week 5 (29 Sep)', keys: ['2026-09-29'] }
    ];
    var html = '<div class="week-list">';
    weeks.forEach(function (w) {
      var sum = 0, n = 0;
      w.keys.forEach(function (k) {
        if (d.days[k] != null) { sum += d.days[k]; n++; }
      });
      var avg = n ? sum : null;
      var lv = level(avg);
      html += '<div class="week-row ' + lv + '">';
      html += '<span class="week-label">' + w.label + '</span>';
      html += '<span class="week-pct">' + (avg == null ? '—' : fmtPct(avg)) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    wrap.innerHTML = html;
    var monthEl = $('cal-month');
    if (monthEl) monthEl.textContent = 'September 2026 — Weekly';
  }

  function render() {
    updateStats();
    if (state.view === 'weekly') renderWeekly();
    else renderCalendar();
  }

  function bind() {
    var card = $('master-card');
    if (!card) return;

    qsa('.master-tabs button', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.master-tabs button', card).forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        state.view = btn.getAttribute('data-view') || 'calendar';
        render();
      });
    });

    qsa('#master-pick button', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('#master-pick button', card).forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        state.ds = btn.getAttribute('data-ds') || 'all';
        render();
      });
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
