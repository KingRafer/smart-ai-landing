/* Master performance + live accounts — parallel load, progressive render */
(function () {
  'use strict';

  var state = {
    ds: 'all',
    view: 'calendar',
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    liveStats: null,
    accounts: null,
    isLive: false,
    loading: false
  };

  var packageLabels = { ACC01: 'SMART BASIC', ACC02: 'SMART GOLD', ACC03: 'SMART PRO' };
  var accentClass = { ACC01: 'basic', ACC02: 'gold', ACC03: 'pro' };

  function $(id) { return document.getElementById(id); }
  function qsa(sel, el) { return [].slice.call((el || document).querySelectorAll(sel)); }

  function level(profit) {
    if (profit == null || !Number.isFinite(profit)) return 'none';
    if (profit < 0) return 'loss';
    if (profit < 500) return 'lv1';
    if (profit < 2000) return 'lv2';
    if (profit < 8000) return 'lv3';
    return 'lv4';
  }

  function fmtMoney(n, forceSign) {
    if (n == null || !Number.isFinite(n)) return '\u2014';
    var abs = Math.abs(n);
    var s;
    if (abs >= 1000000) s = (abs / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
    else if (abs >= 1000) s = abs.toLocaleString('en-US', { maximumFractionDigits: 2 });
    else s = abs.toFixed(2);
    if (forceSign || n > 0) return (n >= 0 ? '+' : '-') + '$' + s;
    if (n < 0) return '-$' + s;
    return '$' + s;
  }

  function fmtPct(n) {
    if (n == null || !Number.isFinite(n)) return '\u2014';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  function formatPenarikan(v) {
    if (v == null || !Number.isFinite(Number(v))) return '\u2014';
    var n = Number(v);
    if (n >= 1000000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return SmartAIMT5.formatUSD(n);
  }

  function formatTime(iso) {
    if (!iso) return '\u2014';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'Asia/Jakarta'
      }) + ' WIB';
    } catch (e) { return String(iso); }
  }

  function ringSVG(pct, accent) {
    var r = 36;
    var c = 2 * Math.PI * r;
    var clamped = Math.max(0, Math.min(Math.abs(pct), 100));
    var offset = c - (clamped / 100) * c;
    var stroke = accent === 'gold' ? '#fbbf24' : accent === 'pro' ? '#a78bfa' : '#2dd4bf';
    if (pct < 0) stroke = '#f87171';
    return (
      '<svg class="ring-svg" viewBox="0 0 88 88" width="88" height="88">' +
        '<circle class="ring-bg" cx="44" cy="44" r="' + r + '" fill="none" stroke-width="7"/>' +
        '<circle class="ring-fg" cx="44" cy="44" r="' + r + '" fill="none" stroke-width="7"' +
          ' stroke="' + stroke + '" stroke-linecap="round"' +
          ' stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '"' +
          ' transform="rotate(-90 44 44)"/>' +
        '<text x="44" y="48" text-anchor="middle" class="ring-text" fill="' + stroke + '">' +
          fmtPct(pct) +
        '</text>' +
      '</svg>'
    );
  }

  function renderAccounts(accounts) {
    var grid = document.querySelector('.perf-grid');
    if (!grid) return;

    if (!accounts || !accounts.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem">Tidak ada data akun.</p>';
      return;
    }

    accounts = accounts.slice().sort(function (a, b) {
      return String(a.account_id).localeCompare(String(b.account_id));
    });

    grid.innerHTML = accounts.map(function (a) {
      var id = a.account_id;
      var cls = accentClass[id] || 'basic';
      var online = String(a.status || '').toUpperCase() === 'ONLINE';
      var statusText = String(a.status || 'WAITING').toUpperCase();
      var equity = Number(a.equity) || 0;
      var daily = Number(a.daily_profit) || 0;
      var dailyReturn = equity > 0 ? (daily / equity * 100) : 0;
      var dd = Number(a.daily_dd);
      if (!Number.isFinite(dd)) dd = 0;
      var stamp = formatTime(a.updated_at);

      return (
        '<article class="acc-card ' + cls + (online ? ' is-online' : '') + '">' +
          '<div class="acc-top">' +
            '<span class="acc-pkg ' + cls + '">' + (packageLabels[id] || a.name || id) + '</span>' +
            '<span class="mt5-badge">MT5 LIVE</span>' +
          '</div>' +
          '<div class="acc-id">' +
            SmartAIMT5.escape(id) +
            ' <span class="status-dot ' + (online ? 'online' : 'offline') + '"><i></i> ' +
            SmartAIMT5.escape(statusText) + '</span>' +
          '</div>' +
          '<div class="acc-metrics">' +
            '<div class="acc-metric"><div class="ml">Deposit Awal</div><div class="mv">' +
              SmartAIMT5.formatUSD(a.deposit_awal) + '</div></div>' +
            '<div class="acc-metric"><div class="ml">Equity Saat Ini</div><div class="mv">' +
              SmartAIMT5.formatUSD(a.equity) + '</div></div>' +
            '<div class="acc-metric"><div class="ml">Daily Profit</div><div class="mv ' +
              (daily >= 0 ? 'up' : 'down') + '">' + fmtMoney(daily, true) + '</div></div>' +
            '<div class="acc-metric"><div class="ml">Total Penarikan</div><div class="mv">' +
              formatPenarikan(a.total_penarikan) + '</div></div>' +
          '</div>' +
          '<div class="daily-return-box">' +
            '<div class="dr-label">Daily Return</div>' +
            '<div class="dr-value ' + (dailyReturn >= 0 ? 'up' : 'down') + '">' + fmtPct(dailyReturn) + '</div>' +
            '<div class="dr-hint">Daily Profit \u00f7 Equity Saat Ini</div>' +
          '</div>' +
          '<div class="gauge-row">' +
            '<div class="gauge-ring">' + ringSVG(dailyReturn, cls) + '</div>' +
            '<div class="gauge-detail">' +
              '<div class="gd-title">Persentase terhadap Equity Saat Ini</div>' +
              '<div class="gd-line"><span>Daily Profit:</span> <b class="' +
                (daily >= 0 ? 'up' : 'down') + '">' + fmtMoney(daily, true) + '</b></div>' +
              '<div class="gd-line"><span>Equity Saat Ini:</span> <b>' +
                SmartAIMT5.formatUSD(a.equity) + '</b></div>' +
              '<div class="gd-line"><span>Daily Drawdown:</span> <b>' +
                dd.toFixed(2) + '%</b></div>' +
            '</div>' +
          '</div>' +
          '<div class="acc-bar">' +
            '<div class="acc-bar-track">' +
              '<div class="acc-bar-fill ' + cls + '" style="width:' +
                Math.min(Math.abs(dailyReturn) * 4, 100).toFixed(1) + '%"></div>' +
            '</div>' +
          '</div>' +
          '<div class="acc-foot">Update: ' + stamp + '</div>' +
        '</article>'
      );
    }).join('');
  }

  function buildLiveDataset(history) {
    var byDay = {};
    (history || []).forEach(function (h) {
      if (!h || !h.date) return;
      var p = Number(h.profit);
      if (!Number.isFinite(p)) return;
      if (!byDay[h.date]) byDay[h.date] = 0;
      byDay[h.date] += p;
    });
    var days = {};
    Object.keys(byDay).forEach(function (d) {
      days[d] = Math.round(byDay[d] * 100) / 100;
    });
    var vals = Object.keys(days).map(function (k) { return days[k]; });
    var pos = vals.filter(function (v) { return v > 0; }).length;
    var neg = vals.filter(function (v) { return v < 0; }).length;
    var totalProfit = vals.reduce(function (a, b) { return a + b; }, 0);
    var sorted = Object.keys(days).sort();
    var weekKeys = sorted.slice(-7);
    var weekProfit = weekKeys.reduce(function (a, k) { return a + (days[k] || 0); }, 0);
    var win = vals.length ? Math.round((pos / vals.length) * 1000) / 10 : 0;
    var worst = null, worstVal = 0;
    Object.keys(days).forEach(function (k) {
      if (days[k] < worstVal) { worstVal = days[k]; worst = k; }
    });
    return {
      days: days, total: totalProfit, week: weekProfit, win: win,
      tradingDays: vals.length, pos: pos, neg: neg, worst: worst, worstVal: worstVal,
      meta: pos + ' green \u00b7 ' + neg + ' red \u00b7 ' + (vals.length - pos - neg) + ' flat'
    };
  }

  function updateStats(d) {
    if (!d) {
      ['m-real','m-real-usc','m-week','m-week-usc','m-win','m-trades'].forEach(function(id){
        var el = $(id); if (el) el.textContent = '\u2014';
      });
      return;
    }
    var real = $('m-real'), realUsc = $('m-real-usc');
    var week = $('m-week'), weekUsc = $('m-week-usc');
    var win = $('m-win'), trades = $('m-trades');
    if (real) { real.textContent = fmtMoney(d.total, true); real.className = d.total >= 0 ? 'up' : 'down'; }
    if (realUsc) realUsc.textContent = d.tradingDays + ' days';
    if (week) { week.textContent = fmtMoney(d.week, true); week.className = d.week >= 0 ? 'up' : 'down'; }
    if (weekUsc) weekUsc.textContent = 'last 7 days';
    if (win) win.textContent = (d.win != null ? d.win.toFixed(1) : '\u2014') + '%';
    if (trades) trades.textContent = (d.tradingDays || 0) + ' trading days';
    var worstEl = $('m-worst');
    if (worstEl) {
      if (d.worst) {
        var parts = d.worst.split('-');
        worstEl.textContent = 'Worst day ' + fmtMoney(d.worstVal, true) + ' (' + parts[2] + '/' + parts[1] + ')';
      } else worstEl.textContent = 'deposits not shown';
    }
  }

  function renderCalendar(d) {
    var wrap = $('cal-view');
    if (!wrap) return;
    d = d || { days: {} };
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
    var today = new Date();
    var isCurrentMonth = today.getFullYear() === y && today.getMonth() === m;
    for (var day = 1; day <= daysInMonth; day++) {
      var key = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var profit = d.days[key];
      var lv = level(profit);
      var isToday = isCurrentMonth && day === today.getDate();
      var label = profit == null ? '' : fmtMoney(profit, true);
      html += '<div class="cal-cell ' + lv + (isToday ? ' today' : '') + '" title="' +
        key + (profit != null ? ': ' + label : '') + '">';
      html += '<span class="cal-day">' + day + '</span>';
      if (profit != null) html += '<span class="cal-pct">' + label + '</span>';
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
    d = d || { days: {} };
    var y = state.year, m = state.month;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var weeks = [], weekStart = 1;
    while (weekStart <= daysInMonth) {
      var weekEnd = Math.min(weekStart + 6, daysInMonth);
      var keys = [];
      for (var dnum = weekStart; dnum <= weekEnd; dnum++) {
        keys.push(y + '-' + String(m + 1).padStart(2, '0') + '-' + String(dnum).padStart(2, '0'));
      }
      var monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      weeks.push({ label: 'Week ' + (weeks.length + 1) + ' (' + weekStart + '\u2013' + weekEnd + ' ' + monthsShort[m] + ')', keys: keys });
      weekStart = weekEnd + 1;
    }
    var html = '<div class="week-list">';
    weeks.forEach(function (w) {
      var sum = 0, n = 0;
      w.keys.forEach(function (k) { if (d.days[k] != null) { sum += d.days[k]; n++; } });
      var avg = n ? sum : null;
      var lv = level(avg);
      html += '<div class="week-row ' + lv + '">';
      html += '<span class="week-label">' + w.label + '</span>';
      html += '<span class="week-pct">' + (avg == null ? '\u2014' : fmtMoney(avg, true)) + '</span></div>';
    });
    html += '</div>';
    wrap.innerHTML = html;
    var monthEl = $('cal-month');
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    if (monthEl) monthEl.textContent = months[m] + ' ' + y + ' \u2014 Weekly';
  }

  function getActiveDataset() {
    return state.liveStats || { days: {}, total: 0, week: 0, win: 0, tradingDays: 0, meta: '' };
  }

  function render() {
    var d = getActiveDataset();
    updateStats(d);
    if (state.view === 'weekly') renderWeekly(d);
    else renderCalendar(d);
    var asof = $('m-asof');
    if (asof) {
      var now = new Date();
      var opts = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' };
      var ts = now.toLocaleString('en-GB', opts);
      asof.innerHTML = 'as of ' + ts + ' WIB \u00b7 <span class="' + (state.isLive ? 'live-tag' : 'demo-tag') + '">' +
        (state.isLive ? 'LIVE FEED' : 'DEMO / CACHED') + '</span>';
    }
  }

  async function loadLiveData(force) {
    if (typeof SmartAIMT5 === 'undefined') { render(); return; }
    if (state.loading && !force) return;
    state.loading = true;

    var grid = document.querySelector('.perf-grid');
    if (grid && !state.accounts) {
      grid.innerHTML = '<div class="perf-loading"><div class="spin"></div><div>Memuat data live\u2026</div></div>';
    }

    var accId = null;
    if (state.ds === 'basic') accId = 'ACC01';
    else if (state.ds === 'gold') accId = 'ACC02';
    else if (state.ds === 'pro') accId = 'ACC03';

    try {
      /* Parallel: accounts + history at the same time */
      var results = await Promise.all([
        SmartAIMT5.getAccounts(!!force),
        SmartAIMT5.getDailyHistory(state.year, state.month + 1, accId)
      ]);
      var accounts = results[0];
      var history = results[1];

      state.accounts = accounts;
      state.isLive = SmartAIMT5.isLive();
      renderAccounts(accounts);

      state.liveStats = buildLiveDataset(history);
      state.isLive = SmartAIMT5.isLive() || state.isLive;
      render();
    } catch (e) {
      console.warn('Live load failed', e);
      if (grid && !state.accounts) {
        grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem">Gagal memuat data. Coba refresh.</p>';
      }
      render();
    } finally {
      state.loading = false;
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
        loadLiveData(false);
      });
    });

    var navBtns = qsa('.cal-nav button');
    if (navBtns.length >= 2) {
      navBtns[0].disabled = false;
      navBtns[1].disabled = false;
      navBtns[0].onclick = function () {
        state.month--;
        if (state.month < 0) { state.month = 11; state.year--; }
        loadLiveData(false);
      };
      navBtns[1].onclick = function () {
        state.month++;
        if (state.month > 11) { state.month = 0; state.year++; }
        loadLiveData(false);
      };
    }

    loadLiveData(false);
    /* Background refresh — uses cache, no forced network if still fresh */
    setInterval(function () { loadLiveData(false); }, 45000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
