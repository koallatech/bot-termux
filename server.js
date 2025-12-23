const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// --- PROTEÇÃO CONTRA ERRO DE JSON ---
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('⚠️ Erro de JSON (Provável quebra de linha no WhatsApp). Ignorando...');
        return res.status(200).send(); 
    }
    next();
});

// --- CONFIGURAÇÕES ---
const ADMIN_NUMBER = "5511999999999"; 

let botConfig = {
    pausado: false,
    pausarTestes: false,
    indicacaoAtiva: true,
    inicioSuporte: 8,
    fimSuporte: 20,
    valorPlano: "34,90"
};

let sessoes = {}; 

function spintax(texto) {
    return texto.replace(/{([^{}]+)}/g, (match, choices) => {
        const options = choices.split('|');
        return options[Math.floor(Math.random() * options.length)];
    });
}

function calcularDelay(texto) {
    return Math.min((texto.length * 15) + 1000, 5000);
}

function estaNoHorario() {
    const horaAtual = new Date().getUTCHours() - 3; 
    return horaAtual >= botConfig.inicioSuporte && horaAtual < botConfig.fimSuporte;
}

// --- WEBHOOK ---
app.post('/webhook', (req, res) => {
    const { message, sender } = req.body;
    const msg = message ? message.trim().toLowerCase() : "";

    // 🔴 NOVO LOG GERAL: Agora você verá cada mensagem que entrar
    if (msg) {
        console.log(`📩 [MENSAGEM] De: ${sender} | Texto: "${msg}"`);
    }

    // 1. COMANDOS ADMIN
    if (sender === ADMIN_NUMBER && msg.startsWith('!')) {
        let rAdmin = "";
        if (msg === '!admin') rAdmin = "🔧 !status, !limpar, !ind on/off, !valor X, !pausa";
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
    if (msg === '0' || msg === 'inicio') sessao.estado = 'MENU_PRINCIPAL';

    let resposta = "";
    switch (sessao.estado) {
        case 'INICIO':
            resposta = "{🦁|🐨} *Olá! Bem-vindo à Koalla TV.*\n\n1️⃣ Solicitar Acesso Cortesia\n2️⃣ Valores do Plano\n3️⃣ Pagamento\n4️⃣ Dúvidas Frequentes (FAQ)";
            sessao.estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                if (!estaNoHorario()) {
                    resposta = `🌙 Fora do horário (${botConfig.inicioSuporte}h às ${botConfig.fimSuporte}h). Adinte a instalação aqui: [LINK]`;
                } else {
                    resposta = "🚀 *Acesso Cortesia Koalla*\n\n1️⃣ Já instalei os Apps, quero o acesso!\n2️⃣ Vou instalar agora\n3️⃣ Preciso de ajuda\n\n0️⃣ Voltar";
                    sessao.estado = 'OPCOES_TESTE';
                }
            } else if (msg === '2') {
                resposta = `💎 *Acesso Koalla:* R$ ${botConfig.valorPlano} (30 dias).`;
            } else if (msg === '3') {
                resposta = "💳 Pagamento via PIX ou Cartão.";
            } else if (msg === '4') {
                resposta = "❓ FAQ: DualAPP e Renovação.";
            } else { resposta = "⚠️ Escolha de 1 a 4."; }
            break;

        case 'OPCOES_TESTE':
            if (msg === '1') {
                resposta = "Qual o seu *nome*?";
                sessao.estado = 'COLETAR_NOME';
            } else if (msg === '2') {
                resposta = "📥 [LINK_PAGINA_APPS]";
                sessao.estado = 'MENU_PRINCIPAL';
            } else if (msg === '3') {
                resposta = "👨‍💻 Suporte notificado!";
                sessao.estado = 'AGUARDANDO';
            }
            break;

        case 'COLETAR_NOME':
            sessao.dados.nome = message;
            if (botConfig.indicacaoAtiva) {
                resposta = `Prazer, ${message}! Tem Código de Indicação? (Envie o código ou 0)`;
                sessao.estado = 'COLETAR_CODIGO';
            } else {
                resposta = `Certo, ${message}! Quer testar *agora* ou *agendar*?\n1. Agora\n2. Agendar`;
                sessao.estado = 'AGENDAR_OU_AGORA';
            }
            break;

        case 'COLETAR_CODIGO':
            sessao.dados.duracao = (msg !== '0') ? "24 HORAS" : "6 HORAS";
            resposta = `✅ Registrado! Duração: ${sessao.dados.duracao}.\n\n1. Quero agora\n2. Prefiro agendar`;
            sessao.estado = 'AGENDAR_OU_AGORA';
            break;

        case 'AGENDAR_OU_AGORA':
            if (msg === '1') {
                resposta = "✅ Solicitação enviada! Aguarde os dados.";
                console.log(`🎯 [CONVERSÃO] ${sessao.dados.nome} (${sender}) pediu teste AGORA.`);
                sessao.estado = 'AGUARDANDO';
            } else if (msg === '2') {
                resposta = "📅 Qual dia e horário?";
                sessao.estado = 'DEFINIR_HORARIO';
            }
            break;

        case 'DEFINIR_HORARIO':
            sessao.dados.agendamento = message;
            resposta = `✅ Agendado para ${message}!`;
            console.log(`📅 [AGENDAMENTO] ${sessao.dados.nome} (${sender}) para ${message}`);
            sessao.estado = 'AGUARDANDO';
            break;

        default:
            sessao.estado = 'INICIO';
            resposta = "Olá! Digite 'Início'.";
    }

    const textoFinal = spintax(resposta);
    setTimeout(() => {
        res.json({ response: textoFinal, method: "NOTIFICATION" });
    }, calcularDelay(textoFinal));
});

app.listen(port, () => console.log('🚀 Pandda Koalla TV Online'));