const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

const ADMIN_NUMBER = "5511999999999"; // COLOQUE SEU NÚMERO AQUI

let botConfig = {
    pausado: false,
    pausarTestes: false,
    indicacaoAtiva: true,
    inicioSuporte: 8,
    fimSuporte: 20,
    valorPlano: "34,90"
};

let sessoes = {};

// --- FUNÇÕES DE APOIO ---
function spintax(texto) {
    return texto.replace(/{([^{}]+)}/g, (match, choices) => {
        const options = choices.split('|');
        return options[Math.floor(Math.random() * options.length)];
    });
}

function estaNoHorario() {
    const horaAtual = new Date().getUTCHours() - 3; 
    return horaAtual >= botConfig.inicioSuporte && horaAtual < botConfig.fimSuporte;
}

// --- WEBHOOK ---
app.post('/webhook', (req, res) => {
    const { message, sender } = req.body;
    const msg = message ? message.trim().toLowerCase() : "";

    // 1. COMANDOS ADMIN
    if (sender === ADMIN_NUMBER && msg.startsWith('!')) {
        let rAdmin = "";
        if (msg === '!admin') rAdmin = "🔧 *ADMIN:* !status, !limpar, !ind on/off, !valor X, !pausa";
        else if (msg === '!status') rAdmin = `📊 Indicação: ${botConfig.indicacaoAtiva ? 'ON' : 'OFF'} | Valor: ${botConfig.valorPlano}`;
        else if (msg === '!limpar') { sessoes = {}; rAdmin = "♻️ Sessões limpas."; }
        else if (msg === '!ind on') { botConfig.indicacaoAtiva = true; rAdmin = "✅ Indicação ativa."; }
        else if (msg === '!ind off') { botConfig.indicacaoAtiva = false; rAdmin = "❌ Indicação desativada."; }
        return res.json({ response: rAdmin, method: "NOTIFICATION" });
    }

    if (botConfig.pausado) return res.status(200).send();

    // 2. SESSÃO DO CLIENTE
    if (!sessoes[sender]) sessoes[sender] = { estado: 'INICIO', historico: [], dados: {} };
    let sessao = sessoes[sender];

    if (msg === '!atender') { sessao.estado = 'SILENCIO'; return res.json({ response: "", method: "NONE" }); }
    if (sessao.estado === 'SILENCIO' || sessao.estado === 'AGUARDANDO') return res.status(200).send();
    if (msg === '0') sessao.estado = 'MENU_PRINCIPAL';

    let resposta = "";
    switch (sessao.estado) {
        case 'INICIO':
            resposta = "{🦁|🐨} *Olá! Bem-vindo à Koalla TV.*\n\n1️⃣ {Solicitar|Quero} Acesso Cortesia\n2️⃣ Valores do Plano\n3️⃣ Pagamento\n4️⃣ Dúvidas Frequentes (FAQ)";
            sessao.estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                if (!estaNoHorario()) {
                    resposta = `🌙 *Fora do horário:* Atendemos das ${botConfig.inicioSuporte}h às ${botConfig.fimSuporte}h.\n\nMas você já pode adiantar a instalação aqui: [LINK_PAGINA_APPS]`;
                } else {
                    resposta = "🚀 *Acesso Cortesia Koalla*\n\nComo posso te ajudar agora?\n\n1️⃣ Já instalei os Apps, quero o acesso!\n2️⃣ Vou instalar agora (Ver Central de Apps)\n3️⃣ Não encontrei meu aparelho / Preciso de ajuda\n\n0️⃣ Voltar";
                    sessao.estado = 'OPCOES_TESTE';
                }
            } else if (msg === '2') {
                resposta = `💎 *Acesso Koalla:* R$ ${botConfig.valorPlano} (30 dias).\n\n0️⃣ Voltar`;
            } else { resposta = "⚠️ Escolha uma opção de 1 a 4."; }
            break;

        case 'OPCOES_TESTE':
            if (msg === '1') {
                resposta = "Ótimo! Para começarmos, qual o seu *nome*?";
                sessao.estado = 'COLETAR_NOME';
            } else if (msg === '2') {
                resposta = "📥 *Central de Apps Koalla:*\n[LINK_PAGINA_APPS]\n\nLá tem o passo a passo para cada dispositivo. Quando terminar de instalar, é só me chamar aqui! 😉";
                sessao.estado = 'INICIO';
            } else if (msg === '3') {
                resposta = "👨‍💻 *Sem problemas!* Um atendente humano foi notificado e vai te auxiliar com a instalação. Aguarde um instante por favor.";
                sessao.estado = 'AGUARDANDO';
            } else { resposta = "⚠️ Escolha 1, 2 ou 3."; }
            break;

        case 'COLETAR_NOME':
            sessao.dados.nome = message;
            if (botConfig.indicacaoAtiva) {
                resposta = `Prazer, ${message}! Você tem um *Código de Indicação*?\n\n✅ Com código: *24 HORAS*\n❌ Sem código: *6 HORAS*\n\nDigite o código ou 0 para pular:`;
                sessao.estado = 'COLETAR_CODIGO';
            } else {
                sessao.estado = 'AGENDAR_OU_AGORA';
                resposta = `Perfeito, ${message}! Você deseja iniciar seu acesso de 6h *agora* ou prefere *agendar*?\n\n1️⃣ Quero agora!\n2️⃣ Prefiro agendar para depois`;
            }
            break;

        case 'COLETAR_CODIGO':
            sessao.dados.duracao = (msg !== '0') ? "24 HORAS" : "6 HORAS";
            resposta = `✅ *Código Registrado!* Você terá ${sessao.dados.duracao}.\n\nDeseja iniciar seu acesso *agora* ou prefere *agendar*?\n\n1️⃣ Quero agora!\n2️⃣ Prefiro agendar para depois`;
            sessao.estado = 'AGENDAR_OU_AGORA';
            break;

        case 'AGENDAR_OU_AGORA':
            if (msg === '1') {
                resposta = "✅ *Solicitação enviada!*\n\nEm instantes um atendente enviará seus dados de acesso aqui no chat. Prepare o seu App!";
                console.log(`[PANDDA] ACESSO AGORA: ${sessao.dados.nome} (${sender})`);
                sessao.estado = 'AGUARDANDO';
            } else if (msg === '2') {
                resposta = "📅 *Agendamento:*\n\nPor favor, escreva o *dia e horário* que você deseja realizar o seu acesso cortesia:";
                sessao.estado = 'DEFINIR_HORARIO';
            } else { resposta = "⚠️ Escolha 1 ou 2."; }
            break;

        case 'DEFINIR_HORARIO':
            sessao.dados.agendamento = message;
            resposta = `✅ *Agendamento Registrado!*\n\nPara o dia/hora: ${message}.\n\nNossa equipe entrará em contato neste horário para liberar seu acesso. Até logo!`;
            console.log(`[PANDDA] AGENDAMENTO: ${sessao.dados.nome} para ${message}`);
            sessao.estado = 'AGUARDANDO';
            break;

        case 'AGUARDANDO': return res.status(200).send();
    }

    res.json({ response: spintax(resposta), method: "NOTIFICATION" });
});

app.listen(port);