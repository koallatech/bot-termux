<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Triangular FC 26 | Pro Edition</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <style>
        :root { 
            --primary: #10b981; /* Verde Futebol */
            --bg: #0b0f1a; 
            --card: #161e2e; 
            --text: #ffffff; 
            --accent: #fbbf24; /* Ouro */
            --danger: #f87171;
        }
        
        * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, sans-serif; }
        
        /* Aumento de Fonte Geral */
        html { font-size: 18px; } 
        body { background-color: var(--bg); color: var(--text); margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        
        .container { max-width: 700px; width: 100%; }
        h1 { text-align: center; color: var(--primary); font-size: 2.5rem; text-transform: uppercase; margin-bottom: 0; text-shadow: 2px 2px 0px #000; }
        .subtitle { text-align: center; color: var(--accent); margin-bottom: 30px; font-weight: bold; letter-spacing: 2px; }

        .card { background: var(--card); padding: 25px; border-radius: 20px; border: 2px solid #2d3748; margin-bottom: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.5); }
        .hidden { display: none !important; }

        /* Estilo Placar de Futebol */
        .match-card { 
            background: linear-gradient(145deg, #1f2937, #111827);
            padding: 20px; border-radius: 15px; margin-bottom: 15px;
            display: flex; align-items: center; justify-content: space-between;
            border: 1px solid #374151; position: relative;
        }
        .team-name { flex: 1; font-weight: 800; font-size: 1.1rem; text-transform: uppercase; }
        .score-box { display: flex; gap: 8px; align-items: center; background: #000; padding: 10px; border-radius: 10px; border: 1px solid var(--primary); }
        .score-input { width: 50px; text-align: center; background: transparent; border: none; color: var(--accent); font-size: 1.5rem; font-weight: bold; }
        
        /* Botão Salvar ao lado do placar */
        .btn-save-match { background: var(--primary); border: none; border-radius: 8px; color: white; padding: 10px; cursor: pointer; margin-left: 10px; font-size: 1.2rem; }
        
        /* Tabela de Classificação */
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { color: #94a3b8; font-size: 0.9rem; padding: 10px; border-bottom: 2px solid var(--primary); text-align: center; }
        td { padding: 15px 10px; border-bottom: 1px solid #2d3748; text-align: center; font-size: 1.2rem; }
        .td-name { text-align: left; font-weight: bold; }

        /* Final e Campeão */
        .final-section { border: 3px solid var(--accent); background: #1e1b4b; }
        .champion-box { text-align: center; padding: 30px; background: linear-gradient(to bottom, #fbbf24, #d97706); color: #000; border-radius: 15px; margin-top: 20px; animation: pulse 2s infinite; }
        .champion-name { font-size: 3rem; font-weight: 900; text-transform: uppercase; }

        button.main-btn { background: var(--primary); color: white; border: none; padding: 20px; border-radius: 12px; font-size: 1.2rem; font-weight: 800; width: 100%; cursor: pointer; text-transform: uppercase; box-shadow: 0 4px 0px #065f46; }
        button.main-btn:active { transform: translateY(4px); box-shadow: none; }

        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }
    </style>
</head>
<body>

<div class="container">
    <h1>TRIANGULAR FC 26</h1>
    <p class="subtitle">🏟️ ESTÁDIO VIRTUAL</p>

    <div id="setup-view" class="card hidden">
        <h2 style="text-align:center">Inscrição de Times</h2>
        <div id="setup-inputs"></div>
        <button class="main-btn" onclick="startTournament()">Gerar Tabela do Campeonato</button>
    </div>

    <div id="main-view" class="hidden">
        <div class="card">
            <h3>📊 Tabela de Classificação</h3>
            <table>
                <thead><tr><th style="text-align:left">TIME</th><th>P</th><th>V</th><th>SG</th></tr></thead>
                <tbody id="standings-body"></tbody>
            </table>
        </div>

        <div id="final-trigger" class="hidden" style="margin-bottom: 30px;">
            <button class="main-btn" style="background: var(--accent); color: black;" onclick="generateFinal()">🔥 Ir para a Grande Final</button>
        </div>

        <div id="final-area"></div>

        <h3>📅 Confrontos de Grupo</h3>
        <div id="matches-list"></div>
        
        <button onclick="resetApp()" style="background: none; color: #4b5563; border: none; cursor: pointer; margin-top: 50px; width: 100%;">Apagar tudo e recomeçar</button>
    </div>
</div>

<script>
    const SUPABASE_URL = "https://yvktnznpozluqcjtvxeu.supabase.co";
    const SUPABASE_KEY = "sb_publishable_cr86hqzrbumMh5oLSSJxXg_RHpqCRhE";
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let players = [];
    let matches = [];

    async function init() {
        const { data } = await _supabase.from('jogadores').select('*').order('id');
        players = data;
        if (!players || !players[0].nome) showSetup();
        else loadDashboard();
    }

    function showSetup() {
        document.getElementById('setup-view').classList.remove('hidden');
        document.getElementById('setup-inputs').innerHTML = [0,1,2].map(i => `
            <div style="display:flex; gap:10px; margin-bottom:15px">
                <input type="text" id="p${i}-name" placeholder="Nome do Player" style="flex:1; padding:15px; border-radius:10px; border:none">
                <input type="text" id="p${i}-team" placeholder="Time" style="flex:1; padding:15px; border-radius:10px; border:none">
            </div>
        `).join('');
    }

    async function startTournament() {
        const updates = [0,1,2].map(i => ({
            id: i,
            nome: document.getElementById(`p${i}-name`).value || `Player ${i+1}`,
            time: document.getElementById(`p${i}-team`).value || `Time ${i+1}`
        }));
        await _supabase.from('jogadores').upsert(updates);
        location.reload();
    }

    async function loadDashboard() {
        document.getElementById('main-view').classList.remove('hidden');
        await fetchScores();
        _supabase.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'partidas' }, () => fetchScores()).subscribe();
    }

    async function fetchScores() {
        const { data } = await _supabase.from('partidas').select('*').order('id');
        matches = data;
        renderAll();
    }

    async function saveMatch(id) {
        const hValue = document.getElementById(`h-${id}`).value;
        const aValue = document.getElementById(`a-${id}`).value;
        const update = {
            score_h: hValue === "" ? null : parseInt(hValue),
            score_a: aValue === "" ? null : parseInt(aValue)
        };
        const { error } = await _supabase.from('partidas').update(update).eq('id', id);
        if (!error) alert("Resultado Salvo! ⚽");
    }

    function renderAll() {
        const sorted = calculateStandings();
        const standingsBody = document.getElementById('standings-body');
        standingsBody.innerHTML = sorted.map((p, i) => `
            <tr>
                <td class="td-name">${i+1}º ${p.nome}<br><small style="color:var(--primary)">${p.time}</small></td>
                <td>${p.pts}</td><td>${p.v}</td><td>${p.sg}</td>
            </tr>
        `).join('');

        // Se todos os 6 jogos do grupo foram jogados, libera botão da final
        const groupMatches = matches.filter(m => m.id <= 6);
        const playedCount = groupMatches.filter(m => m.score_h !== null).length;
        if (playedCount >= 6) document.getElementById('final-trigger').classList.remove('hidden');

        // Render Grupo
        document.getElementById('matches-list').innerHTML = groupMatches.map(m => renderMatchCard(m)).join('');

        // Render Final se existir
        const finalMatch = matches.find(m => m.id === 7);
        if (finalMatch && finalMatch.score_h !== undefined) {
            document.getElementById('final-area').innerHTML = `
                <div class="card final-section">
                    <h2 style="text-align:center; color:var(--accent)">🏆 GRANDE FINAL</h2>
                    ${renderMatchCard(finalMatch)}
                    ${renderChampion(finalMatch)}
                </div>
            `;
        }
    }

    function renderMatchCard(m) {
        const pHome = players.find(p => p.id === m.home_id);
        const pAway = players.find(p => p.id === m.away_id);
        return `
            <div class="match-card">
                <div class="team-name" style="text-align:right">${pHome.nome}</div>
                <div class="score-box">
                    <input type="number" id="h-${m.id}" class="score-input" value="${m.score_h ?? ''}">
                    <span style="color:white">x</span>
                    <input type="number" id="a-${m.id}" class="score-input" value="${m.score_a ?? ''}">
                </div>
                <div class="team-name" style="text-align:left; margin-left:10px">${pAway.nome}</div>
                <button class="btn-save-match" onclick="saveMatch(${m.id})">💾</button>
            </div>
        `;
    }

    function renderChampion(m) {
        if (m.score_h === null || m.score_a === null) return '';
        let winnerName = "";
        if (m.score_h > m.score_a) winnerName = players.find(p => p.id === m.home_id).nome;
        else if (m.score_a > m.score_h) winnerName = players.find(p => p.id === m.away_id).nome;
        else return '<p style="text-align:center">Empate na final! Joguem os pênaltis!</p>';

        return `
            <div class="champion-box">
                <p style="margin:0; font-weight:bold">O GRANDE CAMPEÃO É:</p>
                <div class="champion-name">👑 ${winnerName}</div>
            </div>
        `;
    }

    async function generateFinal() {
        const sorted = calculateStandings();
        const p1 = sorted[0];
        const p2 = sorted[1];
        await _supabase.from('partidas').update({ home_id: p1.id, away_id: p2.id, score_h: null, score_a: null }).eq('id', 7);
        fetchScores();
    }

    function calculateStandings() {
        let stats = players.map(p => ({ ...p, pts: 0, v: 0, sg: 0 }));
        matches.filter(m => m.id <= 6).forEach(m => {
            if (m.score_h !== null && m.score_a !== null) {
                const h = stats.find(s => s.id === m.home_id);
                const a = stats.find(s => s.id === m.away_id);
                h.sg += (m.score_h - m.score_a); a.sg += (m.score_a - m.score_h);
                if (m.score_h > m.score_a) { h.pts += 3; h.v += 1; }
                else if (m.score_h < m.score_a) { a.pts += 3; a.v += 1; }
                else { h.pts += 1; a.pts += 1; }
            }
        });
        return stats.sort((a,b) => b.pts - a.pts || b.sg - a.sg || b.v - a.v);
    }

    async function resetApp() {
        if(confirm("Deseja resetar todo o campeonato?")) {
            await _supabase.from('jogadores').update({ nome: '', time: '' }).neq('id', 999);
            await _supabase.from('partidas').update({ score_h: null, score_a: null }).neq('id', 0);
            location.reload();
        }
    }

    init();
</script>
</body>
</html>