/* ============================================================
   Dominoes Arena — shared client runtime for the static build
   Header injection, theme, toast, API helper, pip renderer.
   ============================================================ */
(function () {
    'use strict';

    const Arena = (window.Arena = window.Arena || {});

    // ---------- header ----------
    const HEADER_HTML = `
    <header class="site-header">
        <a class="brand" href="/">
            <svg class="logo-tile" viewBox="0 0 26 40" aria-hidden="true">
                <rect x="1" y="1" width="24" height="38" rx="4" fill="#f5f1e6" stroke="#cec7b2"/>
                <line x1="4" y1="20" x2="22" y2="20" stroke="#cec7b2" stroke-width="1.5"/>
                <circle cx="9" cy="9" r="2.2" fill="#2b2b2b"/>
                <circle cx="17" cy="13" r="2.2" fill="#2b2b2b"/>
                <circle cx="9" cy="27" r="2.2" fill="#b3261e"/>
                <circle cx="13" cy="31" r="2.2" fill="#b3261e"/>
                <circle cx="17" cy="35" r="2.2" fill="#b3261e"/>
            </svg>
            Dominoes&nbsp;Arena
        </a>
        <nav>
            <ul class="nav-links">
                <li><a href="/">🏆 Tournaments</a></li>
                <li><a href="/quick.html">⚡ Quick Match</a></li>
                <li><button type="button" id="themeToggle" title="Toggle night felt">🌙</button></li>
            </ul>
        </nav>
    </header>`;

    const FOOTER_HTML = `
    <footer class="site-footer">
        <p>🁫 Dominoes Arena — shuffle, deal, and may the lowest score win.</p>
    </footer>`;

    Arena.mount = function () {
        document.body.insertAdjacentHTML('afterbegin', HEADER_HTML);
        document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);

        const KEY = 'arena-theme';
        const toggle = document.getElementById('themeToggle');
        function apply(t) {
            document.body.classList.toggle('dark-theme', t === 'dark');
            if (toggle) toggle.textContent = t === 'dark' ? '☀️' : '🌙';
        }
        apply(localStorage.getItem(KEY) || 'felt');
        toggle && toggle.addEventListener('click', function () {
            const next = document.body.classList.contains('dark-theme') ? 'felt' : 'dark';
            localStorage.setItem(KEY, next);
            apply(next);
        });
    };

    // ---------- toast ----------
    Arena.toast = function (message, isError) {
        const el = document.createElement('div');
        el.className = 'toast' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 400);
        }, 2800);
    };

    // ---------- API ----------
    Arena.api = async function (path, opts) {
        const res = await fetch('/api' + path, {
            headers: { 'Content-Type': 'application/json' },
            ...opts
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
        return data;
    };

    // ---------- decorative domino ----------
    const PIPS = {
        0: [], 1: ['p-mc'], 2: ['p-tl', 'p-br'], 3: ['p-tl', 'p-mc', 'p-br'],
        4: ['p-tl', 'p-tr', 'p-bl', 'p-br'], 5: ['p-tl', 'p-tr', 'p-mc', 'p-bl', 'p-br'],
        6: ['p-tl', 'p-tr', 'p-ml', 'p-mr', 'p-bl', 'p-br']
    };

    Arena.domino = function (top, bottom) {
        const half = (n) =>
            '<span class="half">' +
            (PIPS[n] || []).map((c) => `<span class="pip ${c}"></span>`).join('') +
            '</span>';
        const el = document.createElement('span');
        el.className = 'domino';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = half(top) + half(bottom);
        return el;
    };

    // ---------- misc ----------
    Arena.qs = function (name) {
        return new URLSearchParams(location.search).get(name);
    };

    Arena.pill = function (text, onRemove) {
        const pill = document.createElement('span');
        pill.className = 'player-pill';
        const label = document.createElement('span');
        label.textContent = text;
        pill.appendChild(label);
        if (onRemove) {
            const x = document.createElement('button');
            x.type = 'button';
            x.textContent = '×';
            x.addEventListener('click', onRemove);
            pill.appendChild(x);
        }
        return pill;
    };
})();
