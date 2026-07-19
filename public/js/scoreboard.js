/* ============================================================
   Dominoes Arena — shared scoreboard engine
   Powers both the tournament game board and the Quick Match.
   In dominoes here, LOWEST total wins, so the leader column is
   the one with the smallest sum.
   ============================================================ */
(function () {
    'use strict';

    /**
     * @param {Object} cfg
     * @param {string}   cfg.storageKey       localStorage key for autosave
     * @param {number[][]} [cfg.initialRounds] rounds already stored server-side
     * @param {string}   [cfg.endpoint]       POST target for "End Game" (tournament only)
     * @param {function} [cfg.onEnd]          callback(rounds, totals, ranking) after end
     */
    window.initScoreboard = function initScoreboard(cfg) {
        const table = document.getElementById('scoreTable');
        if (!table) return;

        const headCells = Array.from(table.querySelectorAll('thead th.player-head'));
        const players = headCells.map((th) => th.dataset.player);
        const body = document.getElementById('roundsBody');
        const entryInputs = Array.from(table.querySelectorAll('tfoot .entry-row input.score-input'));
        const totalCells = Array.from(table.querySelectorAll('tfoot .total-row .total-value'));

        const addBtn = document.getElementById('addRoundBtn');
        const undoBtn = document.getElementById('undoBtn');
        const endBtn = document.getElementById('endBtn');

        let rounds = loadRounds();

        function loadRounds() {
            const saved = localStorage.getItem(cfg.storageKey);
            if (saved) {
                try { return JSON.parse(saved); } catch (e) { /* fall through */ }
            }
            return Array.isArray(cfg.initialRounds) ? cfg.initialRounds.slice() : [];
        }

        function save() {
            localStorage.setItem(cfg.storageKey, JSON.stringify(rounds));
        }

        function render() {
            body.innerHTML = '';
            rounds.forEach((round, idx) => {
                const tr = document.createElement('tr');
                const indexCell = document.createElement('td');
                indexCell.className = 'round-index';
                indexCell.textContent = 'R' + (idx + 1);
                tr.appendChild(indexCell);
                players.forEach((_, pIdx) => {
                    const td = document.createElement('td');
                    td.textContent = Number(round[pIdx]) || 0;
                    tr.appendChild(td);
                });
                body.appendChild(tr);
            });
            recalc();
        }

        function totals() {
            return players.map((_, pIdx) =>
                rounds.reduce((sum, r) => sum + (Number(r[pIdx]) || 0), 0)
            );
        }

        function recalc() {
            const t = totals();
            let min = Infinity;
            t.forEach((v) => { if (v < min) min = v; });

            totalCells.forEach((cell, pIdx) => {
                cell.textContent = t[pIdx];
            });

            // Rank players by ascending total for the leader dot (1/2/3).
            const order = t
                .map((v, i) => ({ v, i }))
                .sort((a, b) => a.v - b.v);

            headCells.forEach((th) => th.classList.remove('p1', 'p2', 'p3'));
            order.forEach((entry, rank) => {
                if (rank < 3 && rounds.length > 0) {
                    headCells[entry.i].classList.add('p' + (rank + 1));
                }
            });

            // Tint the winning column(s).
            highlightColumn(rounds.length > 0 ? min : null, t);
        }

        function highlightColumn(min, t) {
            const allRows = table.querySelectorAll('tr');
            allRows.forEach((row) => {
                const cells = row.children;
                // column 0 is the round-index/label column
                for (let c = 1; c < cells.length; c++) {
                    cells[c].classList.remove('leader-col');
                    if (min !== null && t[c - 1] === min) {
                        cells[c].classList.add('leader-col');
                    }
                }
            });
        }

        function addRound() {
            const values = entryInputs.map((inp) => {
                const n = parseInt(inp.value, 10);
                return isNaN(n) ? 0 : n;
            });
            rounds.push(values);
            entryInputs.forEach((inp) => (inp.value = ''));
            save();
            render();
            entryInputs[0] && entryInputs[0].focus();
        }

        function undo() {
            if (rounds.length === 0) return;
            const last = rounds.pop();
            entryInputs.forEach((inp, i) => (inp.value = last[i] != null ? last[i] : ''));
            save();
            render();
        }

        function ranking() {
            const t = totals();
            return t
                .map((v, i) => ({ name: players[i], total: v }))
                .sort((a, b) => a.total - b.total);
        }

        // --- events ---
        addBtn && addBtn.addEventListener('click', addRound);
        undoBtn && undoBtn.addEventListener('click', undo);

        // Enter in the last input adds the round.
        entryInputs.forEach((inp, i) => {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (i === entryInputs.length - 1) addRound();
                    else entryInputs[i + 1].focus();
                }
            });
        });

        endBtn && endBtn.addEventListener('click', async function () {
            const t = totals();
            const rank = ranking();

            if (cfg.endpoint) {
                try {
                    const res = await fetch(cfg.endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rounds })
                    });
                    if (!res.ok) throw new Error('Save failed');
                    localStorage.removeItem(cfg.storageKey);
                    window.Arena && window.Arena.toast('Game saved to tournament!');
                } catch (err) {
                    window.Arena && window.Arena.toast('Could not save game', true);
                }
            }

            if (typeof cfg.onEnd === 'function') cfg.onEnd(rounds, t, rank);
        });

        render();

        // Expose a tiny handle for pages that want it.
        return { getRounds: () => rounds, getTotals: totals, getRanking: ranking, reset() {
            rounds = [];
            localStorage.removeItem(cfg.storageKey);
            render();
        } };
    };
})();
