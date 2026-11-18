/* SMARTAI MT5 API — live + demo fallback (fast cache) */
(function (w) {
  'use strict';

  var LIVE_BASE = 'https://script.google.com/macros/s/AKfycbw8AEMeie38BBxW3S-22bf0WrI_7vGHPkpANGEsoQiTv7Jg86X8rrTEQ3AtDyzQol5D_Q/exec';

  var ACCOUNT_META = {
    ACC01: { package: 'Smart Basic', login: '100000052', owner: 'willy', server: 'TrijayaPratamaFutures-Live', broker_label: 'PT. Trijaya Pratama Futures', mode: 'Hedge · Access Server' },
    ACC02: { package: 'Smart Gold', login: null, owner: null, server: null, broker_label: 'PT. Trijaya Pratama Futures', mode: null },
    ACC03: { package: 'Smart Pro', login: null, owner: null, server: null, broker_label: 'Exness Technologies Ltd', mode: null }
  };

  var demoAccounts = [
    { account_id:'ACC01', status:'DEMO', balance:89795.21, equity:90786.35, deposit_awal:10000.00, daily_profit:991.14, total_profit:80795.21, daily_dd:1.2, total_penarikan:73862.00, updated_at:'DEMO DATA', name:'Smart Basic', broker:'Trijaya pratama futures' },
    { account_id:'ACC02', status:'DEMO', balance:106455.80, equity:106793.83, deposit_awal:10000.00, daily_profit:338.03, total_profit:96455.80, daily_dd:0.8, total_penarikan:28000.00, updated_at:'DEMO DATA', name:'Smart Gold' },
    { account_id:'ACC03', status:'DEMO', balance:645950.70, equity:656274.00, deposit_awal:60000.00, daily_profit:10323.30, total_profit:585950.70, daily_dd:2.1, total_penarikan:5540000.00, updated_at:'DEMO DATA', name:'Smart Pro' }
  ];

  var cache = { accounts: null, history: null, isLive: false, fetchedAt: null, historyFetchedAt: null, error: null, inflightAccounts: null, inflightHistory: null };
  var FRESH_MS = 25000;
  var HISTORY_FRESH_MS = 90000;

  function formatUSD(value) {
    if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '\u2014';
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:2 }).format(Number(value));
  }
  function formatNumber(value, digits) {
    if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '\u2014';
    return Number(value).toLocaleString('en-US', { minimumFractionDigits:digits || 2, maximumFractionDigits:digits || 2 });
  }
  function escape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function apiUrl(action, extra) {
    var proxy = (typeof w.SMARTAI_API_PROXY === 'string' && w.SMARTAI_API_PROXY) ? w.SMARTAI_API_PROXY.replace(/\/$/, '') : null;
    if (proxy) {
      if (action === 'live') return proxy + '/live.php';
      if (action === 'history') return proxy + '/history.php' + (extra || '');
    }
    var q = '?action=' + encodeURIComponent(action);
    if (extra) q += extra.replace(/^\?/, '&');
    return LIVE_BASE + q;
  }

  function num(v) {
    if (v === null || v === undefined || v === '' || !isFinite(Number(v))) return null;
    return Number(v);
  }

  function normalizeAccount(a) {
    if (!a || typeof a !== 'object') return null;
    var id = String(a.account_id || a.id || '');
    if (!id) return null;
    var meta = ACCOUNT_META[id] || {};
    return {
      account_id: id,
      name: a.name || meta.package || null,
      package: meta.package || a.name || null,
      login: meta.login || null,
      owner: meta.owner || null,
      server: meta.server || null,
      broker: a.broker || meta.broker_label || null,
      broker_label: meta.broker_label || a.broker || null,
      mode: meta.mode || null,
      status: a.status || 'WAITING',
      balance: num(a.balance),
      equity: num(a.equity),
      deposit_awal: num(a.deposit_awal),
      daily_profit: num(a.daily_profit),
      total_profit: num(a.total_profit),
      daily_dd: num(a.daily_dd),
      total_dd: num(a.total_dd),
      total_penarikan: num(a.total_penarikan != null ? a.total_penarikan : a.total_withdrawal),
      updated_at: a.updated_at || null
    };
  }

  function cloneAccounts(list) {
    return (list || []).map(function(a){ return Object.assign({}, a); });
  }

  function fetchJson(url, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    return new Promise(function(resolve, reject) {
      var done = false;
      var timer = setTimeout(function() {
        if (done) return;
        done = true;
        reject(new Error('Timeout ' + timeoutMs + 'ms'));
      }, timeoutMs);
      fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'default',
        headers: { 'Accept': 'application/json' }
      }).then(function(res) {
        if (done) return;
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(function(data) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(data);
      }).catch(function(err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function fetchAccountsNetwork() {
    if (cache.inflightAccounts) return cache.inflightAccounts;
    cache.inflightAccounts = fetchJson(apiUrl('live'), 8000).then(function(data) {
      if (!data || !data.ok || !Array.isArray(data.accounts)) throw new Error('Invalid live response');
      var list = data.accounts.map(normalizeAccount).filter(Boolean);
      if (!list.length) throw new Error('No accounts');
      cache.accounts = list;
      cache.isLive = true;
      cache.fetchedAt = Date.now();
      cache.error = null;
      return list;
    }).catch(function(err) {
      cache.error = err && err.message ? err.message : String(err);
      cache.isLive = false;
      throw err;
    }).finally(function() {
      cache.inflightAccounts = null;
    });
    return cache.inflightAccounts;
  }

  async function getAccounts(force) {
    var age = cache.fetchedAt ? (Date.now() - cache.fetchedAt) : Infinity;

    /* Fresh cache — return immediately */
    if (!force && cache.accounts && age < FRESH_MS) {
      return cloneAccounts(cache.accounts);
    }

    /* Stale cache — return now, refresh in background */
    if (!force && cache.accounts && age < FRESH_MS * 4) {
      fetchAccountsNetwork().catch(function(){});
      return cloneAccounts(cache.accounts);
    }

    try {
      var list = await fetchAccountsNetwork();
      return cloneAccounts(list);
    } catch (err) {
      if (cache.accounts) return cloneAccounts(cache.accounts);
      return demoAccounts.map(function(a){ return normalizeAccount(a); });
    }
  }

  function equityHistoryToDailyProfit(historyRows) {
    var byAcc = {};
    (historyRows || []).forEach(function(h) {
      if (!h || !h.account_id || h.equity == null) return;
      var day = String(h.timestamp || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      var eq = Number(h.equity);
      if (!Number.isFinite(eq)) return;
      if (!byAcc[h.account_id]) byAcc[h.account_id] = {};
      byAcc[h.account_id][day] = eq;
    });
    var out = [];
    Object.keys(byAcc).forEach(function(accId) {
      var days = Object.keys(byAcc[accId]).sort();
      var prev = null;
      days.forEach(function(day) {
        var eq = byAcc[accId][day];
        var profit = prev === null ? 0 : Math.round((eq - prev) * 100) / 100;
        out.push({ date: day, profit: profit, account_id: accId, equity: eq });
        prev = eq;
      });
    });
    return out;
  }

  function generateDemoHistory(year, month, accountId) {
    var results = [];
    var daysInMonth = new Date(year, month, 0).getDate();
    var accounts = accountId
      ? demoAccounts.filter(function(a) { return a.account_id === accountId; })
      : demoAccounts;
    accounts.forEach(function(acc) {
      var base = Number(acc.daily_profit) || 200;
      for (var d = 1; d <= daysInMonth; d++) {
        var dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        var seed = year * 10000 + month * 100 + d + (acc.account_id.charCodeAt(4) || 1) * 17;
        var r = Math.sin(seed) * 10000; r = r - Math.floor(r);
        var weekday = new Date(year, month - 1, d).getDay();
        var profit;
        if (weekday === 0 || weekday === 6) {
          profit = r < 0.75 ? 0 : base * 0.2 * (r - 0.5);
        } else if (r < 0.12) {
          profit = -(base * (0.3 + r));
        } else if (r < 0.7) {
          profit = base * (0.5 + r);
        } else {
          profit = base * (1.2 + r);
        }
        results.push({ date: dateStr, profit: Math.round(profit * 100) / 100, account_id: acc.account_id });
      }
    });
    return results;
  }

  function fetchHistoryNetwork() {
    if (cache.inflightHistory) return cache.inflightHistory;
    cache.inflightHistory = fetchJson(apiUrl('history', '?days=45'), 10000).then(function(data) {
      if (!data || !data.ok || !Array.isArray(data.history)) throw new Error('Invalid history');
      cache.history = equityHistoryToDailyProfit(data.history);
      cache.historyFetchedAt = Date.now();
      cache.isLive = true;
      return cache.history;
    }).finally(function() {
      cache.inflightHistory = null;
    });
    return cache.inflightHistory;
  }

  async function getDailyHistory(year, month, accountId) {
    try {
      var age = cache.historyFetchedAt ? (Date.now() - cache.historyFetchedAt) : Infinity;
      if (!cache.history || age > HISTORY_FRESH_MS) {
        if (cache.history && age < HISTORY_FRESH_MS * 2) {
          fetchHistoryNetwork().catch(function(){});
        } else {
          await fetchHistoryNetwork();
        }
      }
      var prefix = year + '-' + String(month).padStart(2, '0');
      return (cache.history || []).filter(function(r) {
        if (accountId && r.account_id !== accountId) return false;
        return r.date.indexOf(prefix) === 0;
      }).map(function(r){ return Object.assign({}, r); });
    } catch (err) {
      if (cache.history) {
        var p = year + '-' + String(month).padStart(2, '0');
        return cache.history.filter(function(r) {
          if (accountId && r.account_id !== accountId) return false;
          return r.date.indexOf(p) === 0;
        }).map(function(r){ return Object.assign({}, r); });
      }
      return generateDemoHistory(year, month, accountId);
    }
  }

  function getAccountMeta(id) {
    return ACCOUNT_META[id] ? Object.assign({}, ACCOUNT_META[id]) : null;
  }

  /* Prefetch on load so first paint is faster */
  try {
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          getAccounts(false).catch(function(){});
          getDailyHistory(new Date().getFullYear(), new Date().getMonth() + 1, null).catch(function(){});
        });
      } else {
        getAccounts(false).catch(function(){});
        getDailyHistory(new Date().getFullYear(), new Date().getMonth() + 1, null).catch(function(){});
      }
    }
  } catch (e) {}

  w.SmartAIMT5 = {
    base: 'LIVE',
    getAccounts: getAccounts,
    getDailyHistory: getDailyHistory,
    getAccountMeta: getAccountMeta,
    formatUSD: formatUSD,
    formatNumber: formatNumber,
    escape: escape,
    isLive: function(){ return !!cache.isLive; },
    lastError: function(){ return cache.error; },
    lastFetchedAt: function(){ return cache.fetchedAt; }
  };
})(window);
