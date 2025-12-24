const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Proteção contra erro de JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('⚠️ JSON Malformado! Verifique as chaves { } no MacroDroid.');
        return res.status(200).send(); 
    }
    next();
});

const ADMIN_NUMBER = "63999440714"; 

let botConfig = {
    pausado: false,
    pausarTestes: false,
    indicacaoAtiva: true,
    inicioSuporte: 8,
    fimSuporte: 20,
    valorPlano: "34,90"
};

let sessoes = {}; 

const TEXTO_MENU_PRINCIPAL = "\n\n1️⃣ Solicitar Acesso Cortesia\n2️⃣ Valores do Plano\n3️⃣ Pagamento\n4️⃣ Dúvidas Frequentes (FAQ)";

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

app.post('/webhook', (req, res) => {
    const { message, sender } = req.body;
    if (!message || !sender) return res.status(200).send();

    const msg = message.trim().toLowerCase();
    const cleanSender = sender.replace(/\D/g, ''); 
    const cleanAdmin = ADMIN_NUMBER.replace(/\D/g, '');

    // 1. ADMIN (Identifica pelo número ou pelo nome Raphael enquanto você ajusta)
    if ((cleanSender === cleanAdmin || sender === "Raphael") && msg.startsWith('!')) {
        let rAdmin = "";
        if (msg === '!admin' || msg === '!status') {
            rAdmin = `📊 *STATUS PANDDA:* \n• Atendimento: ${botConfig.pausado ? 'OFF' : 'ON'}\n• Valor: R$ ${botConfig.valorPlano}\n• Indicação: ${botConfig.indicacaoAtiva ? 'ON' : 'OFF'}`;
        } else if (msg === '!pausa') { botConfig.pausado = true; rAdmin = "🔴 Bot pausado."; }
        else if (msg === '!play') { botConfig.pausado = false; rAdmin = "🟢 Bot reativado."; }
        else if (msg === '!limpar') { sessoes = {}; rAdmin = "♻️ Sessões limpas."; }
        else if (msg.startsWith('!valor')) {
            botConfig.valorPlano = msg.split(' ')[1] || botConfig.valorPlano;
            rAdmin = `💰 Valor: R$ ${botConfig.valorPlano}`;
        }
        if (rAdmin) return res.json({ response: rAdmin, method: "NOTIFICATION" });
    }

    if (botConfig.pausado) return res.status(200).send();

    // 2. SESSÃO
    if (!sessoes[sender]) sessoes[sender] = { estado: 'INICIO', historico: [], dados: {} };
    let sessao = sessoes[sender];

    console.log(`📩 [LOG] ${sender} (${sessao.estado}): ${msg}`);

    // 3. GLOBAL 0 / INICIO
    if (msg === '0' || msg === 'inicio') {
        sessao.estado = 'MENU_PRINCIPAL';
        return res.json({ response: spintax("{🦁|🐨} *Menu Principal*" + TEXTO_MENU_PRINCIPAL), method: "NOTIFICATION" });
    }

    if (sessao.estado === 'AGUARDANDO') return res.status(200).send();

    // 4. LÓGICA DE ESTADOS
    let resposta = "";
    switch (sessao.estado) {
        case 'INICIO':
            resposta = "{🦁|🐨} *Olá! Bem-vindo à Koalla TV!*" + TEXTO_MENU_PRINCIPAL;
            sessao.estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                if (!estaNoHorario()) {
                    resposta = `🌙 Atendemos das ${botConfig.inicioSuporte}h às ${botConfig.fimSuporte}h. Instale aqui: [LINK]`;
                } else {
                    resposta = "🚀 *Acesso Cortesia*\n\n1️⃣ Já instalei os Apps\n2️⃣ Vou instalar agora\n3️⃣ Ajuda\n\n0️⃣ Voltar";
                    sessao.estado = 'OPCOES_TESTE';
                }
            } else if (msg === '2') {
                resposta = `💎 *Acesso Koalla:* R$ ${botConfig.valorPlano} (30 dias)\n⚠️ Sem fidelidade.` + TEXTO_MENU_PRINCIPAL;
                sessao.estado = 'MENU_PRINCIPAL';
            } else if (msg === '3') {
                resposta = "💳 Pagamento via PIX ou Cartão.\n\n0️⃣ Início";
            } else if (msg === '4') {
                resposta = "❓ FAQ: DualAPP e Renovação.\n\n0️⃣ Início";
            } else { resposta = "⚠️ Escolha de 1 a 4."; }
            break;

        case 'OPCOES_TESTE':
            if (msg === '1') {
                resposta = "Ótimo! Qual o seu *nome*?";
                sessao.estado = 'COLETAR_NOME';
            } else if (msg === '2') {
                resposta = "📥 [LINK_PAGINA_APPS]\n\nVolte quando terminar!";
                sessao.estado = 'MENU_PRINCIPAL';
            } else if (msg === '3') {
                resposta = "👨‍💻 Suporte notificado! Aguarde.";
                sessao.estado = 'AGUARDANDO';
            } else { resposta = "⚠️ Escolha 1, 2 ou 3."; }
            break;

        case 'COLETAR_NOME':
            sessao.dados.nome = message;
            if (botConfig.indicacaoAtiva) {
                resposta = `Prazer, ${message}! Tem Código de Indicação? (Envie o código ou 0 para pular)`;
                sessao.estado = 'COLETAR_CODIGO';
            } else {
                resposta = `Certo, ${message}! Testar agora ou agendar?\n1️⃣ Agora\n2️⃣ Agendar`;
                sessao.estado = 'AGENDAR_OU_AGORA';
            }
            break;

        case 'COLETAR_CODIGO':
            sessao.dados.duracao = (msg !== '0') ? "24 HORAS" : "6 HORAS";
            resposta = `✅ Registrado! Duração: ${sessao.dados.duracao}.\n\n1️⃣ Agora\n2️⃣ Agendar`;
            sessao.estado = 'AGENDAR_OU_AGORA';
            break;

        case 'AGENDAR_OU_AGORA':
            if (msg === '1') {
                resposta = "✅ Solicitação enviada! Aguarde os dados aqui no chat.";
                console.log(`🎯 [CONVERSÃO] ${sessao.dados.nome} pediu AGORA.`);
                sessao.estado = 'AGUARDANDO';
            } else if (msg === '2') {
                resposta = "📅 Qual dia e horário?";
                sessao.estado = 'DEFINIR_HORARIO';
            } else { resposta = "⚠️ Escolha 1 ou 2."; }
            break;

        case 'DEFINIR_HORARIO':
            sessao.dados.agendamento = message;
            resposta = `✅ Agendado para ${message}!`;
            sessao.estado = 'AGUARDANDO';
            break;

        default:
            sessao.estado = 'INICIO';
            resposta = "Olá! Digite 'Início'.";
    }

    const textoFinal = spintax(resposta);
    setTimeout(() => {
        res.json({ response: textoFinal, method: "NOTIFICATION" });
    }, (textoFinal.length * 15) + 1200);
});

app.listen(port);