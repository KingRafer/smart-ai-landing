/* Master performance + live accounts — Smart AI Landing */
(function () {
  'use strict';

  var BASE = 20000; // USC for % display (same visual scale as before)

  // Fallback sample (used only if API completely fails)
  var FALLBACK = {
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
    }
  };

  var state = {
    ds: 'all',
    view: 'calendar',
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-based
    liveDays: {},      // { 'YYYY-MM-DD': pct }
    liveStats: null,
    accounts: null,
    isLive: false
  };

  var packageMap = { ACC01: 'basic', ACC02: 'gold', ACC03: 'pro' };
  var packageLabels = { ACC01: 'SMART BASIC', ACC02: 'SMART GOLD', ACC03: 'SMART PRO' };
  var colorStyles = {
    ACC01: '',
    ACC02: 'color:var(--gold)',
    ACC03: 'color:var(--purple)'
  };

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
    if (n == null || !Number.isFinite(n)) return '\u2014';
    return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
  }

  function fmtUsc(n) {
    if (n == null || !Number.isFinite(n)) return '\u2014';
    return Math.round(n).toLocaleString('en-US') + ' USC';
  }

  function formatPenarikan(v) {
    if (v == null || !Number.isFinite(Number(v))) return '\u2014';
    var n = Number(v);
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
    return SmartAIMT5.formatUSD(n);
  }

  /* ========== LIVE ACCOUNTS ========== */
  function renderAccounts(accounts) {
    var grid = document.querySelector('.perf-grid');
    if (!grid) return;

    if (!accounts || !accounts.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1">Tidak ada data akun.</p>';
      return;
    }

    accounts = accounts.slice().sort(function (a, b) {
      return String(a.account_id).localeCompare(String(b.account_id));
    });

    grid.innerHTML = accounts.map(function (a) {
      var id = a.account_id;
      var online = String(a.status || '').toUpperCase() === 'ONLINE';
      var statusText = String(a.status || 'WAITING').toUpperCase();
      var equity = Number(a.equity) || 0;
      var daily = Number(a.daily_profit) || 0;
      var dailyReturn = equity > 0 ? (daily / equity * 100) : 0;
      var returnText = (dailyReturn >= 0 ? '+' : '') + dailyReturn.toFixed(2) + '%';
      var profitClass = daily >= 0 ? 'profit' : '';

      return (
        '<div class="perf-card reveal">' +
          '<div style="display:flex;justify-content:space-between">' +
            '<span class="perf-label" style="' + (colorStyles[id] || '') + '">' + (packageLabels[id] || a.name || id) + '</span>' +
            '<span class="mt5-badge">MT5 LIVE</span>' +
          '</div>' +
          '<div class="perf-account">' + SmartAIMT5.escape(id) +
            ' <span class="' + (online ? 'online-text' : '') + '">\u25CF ' + SmartAIMT5.escape(statusText) + '</span></div>' +
          '<div class="perf-stats">' +
            '<div class="perf-stat"><div class="label">Deposit</div><div class="value">' + SmartAIMT5.formatUSD(a.deposit_awal) + '</div></div>' +
            '<div class="perf-stat"><div class="label">Equity</div><div class="value">' + SmartAIMT5.formatUSD(a.equity) + '</div></div>' +
            '<div class="perf-stat"><div class="label">Daily Profit</div><div class="value ' + profitClass + '">' +
              (daily >= 0 ? '+' : '') + SmartAIMT5.formatUSD(a.daily_profit).replace('$', '') + '</div></div>' +
            '<div class="perf-stat"><div class="label">Penarikan</div><div class="value">' + formatPenarikan(a.total_penarikan) + '</div></div>' +
          '</div>' +
          '<div class="daily-return">' +
            '<span>Daily Return</span>' +
            '<span class="value">' + returnText + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  /* ========== CALENDAR STATS FROM LIVE HISTORY ========== */
  function buildLiveDataset(history, accounts) {
    // history: [{date, profit, account_id}, ...]
    var byDay = {};
    (history || []).forEach(function (h) {
      if (!h || !h.date) return;
      var p = Number(h.profit) || 0;
      if (!byDay[h.date]) byDay[h.date] = 0;
      byDay[h.date] += p;
    });

    // Convert absolute profit (USD) → % of BASE for visual consistency with old design
    var daysPct = {};
    Object.keys(byDay).forEach(function (d) {
      daysPct[d] = Math.round((byDay[d] / BASE) * 1000) / 10; // 1 decimal
    });

    var vals = Object.keys(daysPct).map(function (k) { return daysPct[k]; });
    var pos = vals.filter(function (v) { return v > 0; }).length;
    var neg = vals.filter(function (v) { return v < 0; }).length;
    var sum = vals.reduce(function (a, b) { return a + b; }, 0);
    var realizedUsc = Math.round(sum / 100 * BASE);

    // Approximate "this week" (last 7 calendar days that have data)
    var sortedDates = Object.keys(daysPct).sort();
    var weekKeys = sortedDates.slice(-7);
    var weekSum = weekKeys.reduce(function (a, k) { return a + (daysPct[k] || 0); }, 0);
    var weekUsc = Math.round(weekSum / 100 * BASE);

    var win = vals.length ? Math.round((pos / vals.length) * 1000) / 10 : 0;

    return {
      days: daysPct,
      realized: Math.round(sum * 10) / 10,
      week: Math.round(weekSum * 10) / 10,
      win: win,
      trades: vals.length, // using trading days as proxy
      realizedUsc: realizedUsc,
      weekUsc: weekUsc,
      meta: pos + ' green \u00b7 ' + neg + ' red \u00b7 ' + (vals.length - pos - neg) + ' flat'
    };
  }

  function updateStats(d) {
    if (!d) d = FALLBACK.all;
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
    if (win) win.textContent = (d.win != null ? d.win.toFixed(1) : '\u2014') + '%';
    if (trades) trades.textContent = (d.trades || 0) + ' trading days';
    if (base) base.textContent = 'Base ' + BASE.toLocaleString('en-US') + ' USC = 100%';
  }

  function renderCalendar(d) {
    var wrap = $('cal-view');
    if (!wrap) return;
    d = d || FALLBACK.all;
    var y = state.year, m = state.month;
    var first = new Date(y, m, 1);
    var startDay = first.getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var monthEl = $('cal-month');
    if (monthEl) monthEl.textContent = months[m] + ' ' + y;

    var html = '<div class="cal-grid">';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function (h) {
      html += '<div class="cal-head">' + h + '</div>';
    });
    for (var i = 0; i < startDay; i++) html += '<div class="cal-cell empty"></div>';
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
    if (meta) meta.textContent = d.meta || '';
  }

  function renderWeekly(d) {
    var wrap = $('cal-view');
    if (!wrap) return;
    d = d || FALLBACK.all;
    var y = state.year, m = state.month;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var weeks = [];
    var weekStart = 1;
    while (weekStart <= daysInMonth) {
      var weekEnd = Math.min(weekStart + 6, daysInMonth);
      var keys = [];
      for (var dnum = weekStart; dnum <= weekEnd; dnum++) {
        keys.push(y + '-' + String(m + 1).padStart(2, '0') + '-' + String(dnum).padStart(2, '0'));
      }
      var monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      weeks.push({
        label: 'Week ' + (weeks.length + 1) + ' (' + weekStart + '\u2013' + weekEnd + ' ' + monthsShort[m] + ')',
        keys: keys
      });
      weekStart = weekEnd + 1;
    }

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
      html += '<span class="week-pct">' + (avg == null ? '\u2014' : fmtPct(avg)) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    wrap.innerHTML = html;
    var monthEl = $('cal-month');
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    if (monthEl) monthEl.textContent = months[m] + ' ' + y + ' \u2014 Weekly';
  }

  function getActiveDataset() {
    if (state.liveStats) return state.liveStats;
    return FALLBACK.all;
  }

  function render() {
    var d = getActiveDataset();
    updateStats(d);
    if (state.view === 'weekly') renderWeekly(d);
    else renderCalendar(d);

    // Update footer
    var asof = $('m-asof');
    if (asof) {
      var now = new Date();
      var opts = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' };
      var ts = now.toLocaleString('en-GB', opts);
      asof.textContent = 'as of ' + ts + ' WIB \u00b7 ' + (state.isLive ? 'live feed' : 'demo / cached');
    }
  }

  async function loadLiveData() {
    if (typeof SmartAIMT5 === 'undefined') {
      render();
      return;
    }

    try {
      // Accounts
      var accounts = await SmartAIMT5.getAccounts(true);
      state.accounts = accounts;
      state.isLive = SmartAIMT5.isLive();
      renderAccounts(accounts);

      // History for current month + selected product
      var accId = null;
      if (state.ds === 'basic') accId = 'ACC01';
      else if (state.ds === 'gold') accId = 'ACC02';
      else if (state.ds === 'pro') accId = 'ACC03';

      var history = await SmartAIMT5.getDailyHistory(state.year, state.month + 1, accId);
      state.liveStats = buildLiveDataset(history, accounts);
      state.isLive = SmartAIMT5.isLive() || state.isLive;
      render();
    } catch (e) {
      console.warn('Live load failed, using fallback', e);
      render();
    }
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
        loadLiveData(); // re-fetch with new filter
      });
    });

    // Month navigation
    var navBtns = qsa('.cal-nav button');
    if (navBtns.length >= 2) {
      navBtns[0].disabled = false;
      navBtns[1].disabled = false;
      navBtns[0].onclick = function () {
        state.month--;
        if (state.month < 0) { state.month = 11; state.year--; }
        loadLiveData();
      };
      navBtns[1].onclick = function () {
        state.month++;
        if (state.month > 11) { state.month = 0; state.year++; }
        loadLiveData();
      };
    }

    // Initial load
    loadLiveData();

    // Auto refresh every 45s
    setInterval(function () {
      loadLiveData();
    }, 45000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
