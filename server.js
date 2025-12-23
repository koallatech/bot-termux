const express = require('express');
const app = express();
const port = 3000;

// Permite que o servidor receba JSON
app.use(express.json());

// --- PROTEÇÃO CONTRA ERRO DE JSON (BUG FIX) ---
// Captura mensagens mal formatadas (como quebras de linha) sem derrubar o bot
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('⚠️ Mensagem recebida com erro de formatação JSON. Ignorando...');
        return res.status(200).send(); 
    }
    next();
});

// --- CONFIGURAÇÕES DO ADMINISTRADOR ---
const ADMIN_NUMBER = "5511999999999"; // COLOQUE SEU NÚMERO DE ADMIN AQUI (com 55 + DDD)

let botConfig = {
    pausado: false,
    pausarTestes: false,
    indicacaoAtiva: true,
    inicioSuporte: 8,
    fimSuporte: 20,
    valorPlano: "34,90"
};

let sessoes = {}; 

// --- FUNÇÕES DE HUMANIZAÇÃO ---
function spintax(texto) {
    return texto.replace(/{([^{}]+)}/g, (match, choices) => {
        const options = choices.split('|');
        return options[Math.floor(Math.random() * options.length)];
    });
}

function calcularDelay(texto) {
    const msPorLetra = 15;
    const base = texto.length * msPorLetra;
    const aleatorio = Math.floor(Math.random() * 2000) + 1000;
    return Math.min(base + aleatorio, 5000);
}

function estaNoHorario() {
    const horaAtual = new Date().getUTCHours() - 3; // Ajuste para Horário de Brasília
    return horaAtual >= botConfig.inicioSuporte && horaAtual < botConfig.fimSuporte;
}

// --- ROTA PRINCIPAL (WEBHOOK) ---
app.post('/webhook', (req, res) => {
    const { message, sender } = req.body;
    const msg = message ? message.trim().toLowerCase() : "";

    // 1. COMANDOS EXCLUSIVOS DO ADMIN
    if (sender === ADMIN_NUMBER && msg.startsWith('!')) {
        let rAdmin = "";
        if (msg === '!admin') {
            rAdmin = "🔧 *PAINEL ADMIN KOALLA*\n\n!status - Configurações atuais\n!valor X - Muda preço\n!ind on/off - Alterna indicação\n!limpar - Reseta sessões\n!pausateste - Pausa cortesias\n!playteste - Reativa cortesias\n!pausa - Pausa bot geral\n!play - Reativa bot geral\n!hora X Y - Muda horário";
        } else if (msg === '!status') {
            rAdmin = `📊 *SISTEMA PANDDA*\nBot: ${botConfig.pausado ? 'OFF' : 'ON'}\nTestes: ${botConfig.pausarTestes ? 'OFF' : 'ON'}\nIndicação: ${botConfig.indicacaoAtiva ? 'ON' : 'OFF'}\nValor: R$ ${botConfig.valorPlano}\nSuporte: ${botConfig.inicioSuporte}h às ${botConfig.fimSuporte}h`;
        } else if (msg === '!limpar') {
            sessoes = {}; rAdmin = "♻️ Todas as sessões foram limpas.";
        } else if (msg === '!ind on') { botConfig.indicacaoAtiva = true; rAdmin = "✅ Indicação ativada."; }
        else if (msg === '!ind off') { botConfig.indicacaoAtiva = false; rAdmin = "❌ Indicação desativada."; }
        else if (msg.startsWith('!valor')) {
            botConfig.valorPlano = msg.split(' ')[1];
            rAdmin = `💰 Novo valor: R$ ${botConfig.valorPlano}`;
        }
        return res.json({ response: rAdmin, method: "NOTIFICATION" });
    }

    // 2. BLOQUEIO SE O BOT ESTIVER PAUSADO GERAL
    if (botConfig.pausado) return res.status(200).send();

    // 3. INICIALIZAÇÃO DE SESSÃO
    if (!sessoes[sender]) sessoes[sender] = { estado: 'INICIO', historico: [], dados: {} };
    let sessao = sessoes[sender];

    // 4. MODO SILENCIOSO (Pausa individual se você interceder)
    if (msg === '!atender') { sessao.estado = 'SILENCIO'; return res.json({ response: "", method: "NONE" }); }
    if (sessao.estado === 'SILENCIO' || sessao.estado === 'AGUARDANDO') return res.status(200).send();

    // 5. NAVEGAÇÃO GLOBAL
    if (msg === '0' || msg === 'inicio') { sessao.estado = 'MENU_PRINCIPAL'; }

    // 6. LÓGICA DE ESTADOS (FLUXO DO CLIENTE)
    let resposta = "";
    switch (sessao.estado) {
        case 'INICIO':
            resposta = "{🦁|🐨} *Olá! Bem-vindo ao suporte Koalla TV.*\n\n1️⃣ {Solicitar|Quero} Acesso Cortesia\n2️⃣ Valores do Plano\n3️⃣ Pagamento\n4️⃣ Dúvidas Frequentes (FAQ)";
            sessao.estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                if (botConfig.pausarTestes) {
                    resposta = "⚠️ No momento, as liberações de acesso cortesia estão suspensas para manutenção.";
                } else if (!estaNoHorario()) {
                    resposta = `🌙 *Fora do horário:* Atendemos das ${botConfig.inicioSuporte}h às ${botConfig.fimSuporte}h.\n\nMas você já pode adiantar a instalação aqui: [LINK_PAGINA_APPS]`;
                } else {
                    resposta = "🚀 *Acesso Cortesia Koalla*\n\nComo posso ajudar?\n\n1️⃣ Já instalei os Apps, quero o acesso!\n2️⃣ Vou instalar agora (Ver Central de Apps)\n3️⃣ Não encontrei meu dispositivo / Preciso de ajuda\n\n0️⃣ Voltar";
                    sessao.estado = 'OPCOES_TESTE';
                }
            } else if (msg === '2') {
                resposta = `💎 *Acesso Koalla:* R$ ${botConfig.valorPlano} (30 dias).\n\n0️⃣ Voltar`;
            } else if (msg === '3') {
                resposta = "💳 *Pagamento:*\n\n1️⃣ Chave PIX\n2️⃣ Cartão de Crédito\n\n0️⃣ Voltar";
            } else if (msg === '4') {
                resposta = "❓ *FAQ:*\n\n1. O que é DualAPP?\n2. Como renovar?\n\n0️⃣ Voltar";
            } else { resposta = "⚠️ Por favor, escolha de 1 a 4."; }
            break;

        case 'OPCOES_TESTE':
            if (msg === '1') {
                resposta = "Ótimo! Qual o seu *nome* para o cadastro?";
                sessao.estado = 'COLETAR_NOME';
            } else if (msg === '2') {
                resposta = "📥 *Central de Apps:*\n[LINK_PAGINA_APPS]\n\nInstale e volte aqui quando estiver pronto!";
                sessao.estado = 'MENU_PRINCIPAL';
            } else if (msg === '3') {
                resposta = "👨‍💻 *Aguarde um instante.* Notifiquei um atendente para te auxiliar com o seu dispositivo.";
                sessao.estado = 'AGUARDANDO';
            } else { resposta = "⚠️ Escolha 1, 2 ou 3."; }
            break;

        case 'COLETAR_NOME':
            sessao.dados.nome = message;
            if (botConfig.indicacaoAtiva) {
                resposta = `Prazer, ${message}! Possui um *Código de Indicação*?\n\n✅ Com código: *24 HORAS*\n❌ Sem código: *6 HORAS*\n\nDigite o código ou 0 para pular:`;
                sessao.estado = 'COLETAR_CODIGO';
            } else {
                resposta = `Certo, ${message}! Deseja iniciar seu acesso de 6h *agora* ou prefere *agendar*?\n\n1️⃣ Quero agora!\n2️⃣ Prefiro agendar`;
                sessao.estado = 'AGENDAR_OU_AGORA';
            }
            break;

        case 'COLETAR_CODIGO':
            sessao.dados.duracao = (msg !== '0') ? "24 HORAS" : "6 HORAS";
            resposta = `✅ *Registrado!* Você terá ${sessao.dados.duracao}.\n\nDeseja iniciar seu acesso *agora* ou prefere *agendar*?\n\n1️⃣ Quero agora!\n2️⃣ Prefiro agendar`;
            sessao.estado = 'AGENDAR_OU_AGORA';
            break;

        case 'AGENDAR_OU_AGORA':
            if (msg === '1') {
                resposta = "✅ *Solicitação enviada!*\n\nPrepare o seu App! Em instantes o atendente enviará seus dados aqui.";
                console.log(`[PANDDA] ACESSO AGORA: ${sessao.dados.nome} (${sender})`);
                sessao.estado = 'AGUARDANDO';
            } else if (msg === '2') {
                resposta = "📅 *Agendamento:*\n\nQual o melhor *dia e horário* para você realizar o teste?";
                sessao.estado = 'DEFINIR_HORARIO';
            } else { resposta = "⚠️ Escolha 1 ou 2."; }
            break;

        case 'DEFINIR_HORARIO':
            sessao.dados.agendamento = message;
            resposta = `✅ *Agendado com sucesso!*\n\nNossa equipe entrará em contato às ${message} para sua liberação.`;
            console.log(`[PANDDA] AGENDAMENTO: ${sessao.dados.nome} - ${message}`);
            sessao.estado = 'AGUARDANDO';
            break;

        default:
            sessao.estado = 'INICIO';
            resposta = "Olá! Digite 'Início' para ver as opções.";
    }

    const textoFinal = spintax(resposta);
    setTimeout(() => {
        res.json({ response: textoFinal, method: "NOTIFICATION" });
    }, calcularDelay(textoFinal));
});

app.listen(port, () => console.log('🚀 Pandda Koalla TV Online na Porta 3000'));