const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// --- PROTEÇÃO CONTRA ERRO DE JSON ---
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(200).send(); 
    }
    next();
});

// --- CONFIGURAÇÕES DO ADMINISTRADOR ---
// DICA: Verifique no log exatamente como o seu número aparece (com ou sem +)
const ADMIN_NUMBER = "5563999440714"; 

let botConfig = {
    pausado: false,
    pausarTestes: false,
    indicacaoAtiva: true,
    inicioSuporte: 8,
    fimSuporte: 20,
    valorPlano: "34,90"
};

let sessoes = {}; 

// --- FUNÇÕES AUXILIARES ---
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
    if (!message || !sender) return res.status(200).send();

    const msg = message.trim().toLowerCase();
    const cleanSender = sender.replace(/\D/g, ''); // Remove + ou caracteres não numéricos

    // 1. COMANDOS ADMIN (ACEITOS A QUALQUER MOMENTO)
    // Comparamos o número limpo para evitar erro de formatação
    if (cleanSender === ADMIN_NUMBER.replace(/\D/g, '') && msg.startsWith('!')) {
        let rAdmin = "";
        if (msg === '!admin') rAdmin = "🔧 *ADMIN:* !status, !limpar, !ind on/off, !valor X, !pausa, !play";
        else if (msg === '!status') rAdmin = `📊 *PANDDA:* \nAtend: ${botConfig.pausado ? 'OFF' : 'ON'}\nInd: ${botConfig.indicacaoAtiva ? 'ON' : 'OFF'}\nValor: R$ ${botConfig.valorPlano}`;
        else if (msg === '!limpar') { sessoes = {}; rAdmin = "♻️ Sessões resetadas."; }
        else if (msg === '!ind on') { botConfig.indicacaoAtiva = true; rAdmin = "✅ Indicação ativada."; }
        else if (msg === '!ind off') { botConfig.indicacaoAtiva = false; rAdmin = "❌ Indicação desativada."; }
        else if (msg.startsWith('!valor')) { botConfig.valorPlano = msg.split(' ')[1]; rAdmin = `💰 Valor: R$ ${botConfig.valorPlano}`; }
        else if (msg === '!pausa') { botConfig.pausado = true; rAdmin = "🔴 Bot pausado."; }
        else if (msg === '!play') { botConfig.pausado = false; rAdmin = "🟢 Bot ativo."; }
        
        console.log(`🛠️ [ADMIN] Comando executado: ${msg}`);
        return res.json({ response: rAdmin, method: "NOTIFICATION" });
    }

    if (botConfig.pausado) return res.status(200).send();

    // 2. INICIALIZAÇÃO E LOG DE ESTADO
    if (!sessoes[sender]) sessoes[sender] = { estado: 'INICIO', historico: [], dados: {} };
    let sessao = sessoes[sender];
    
    console.log(`📩 [LOG] Cliente: ${sender} | Estado Atual: ${sessao.estado} | Mensagem: "${msg}"`);

    // 3. COMANDOS GLOBAIS
    if (msg === '!atender') { sessao.estado = 'SILENCIO'; return res.json({ response: "", method: "NONE" }); }
    if (sessao.estado === 'SILENCIO' || sessao.estado === 'AGUARDANDO') return res.status(200).send();
    if (msg === '0' || msg === 'inicio') { sessao.estado = 'MENU_PRINCIPAL'; }

    // 4. FLUXO DE MENUS
    let resposta = "";
    switch (sessao.estado) {
        case 'INICIO':
            resposta = "{🦁|🐨} *Bem-vindo à Koalla TV!*\n\n1️⃣ Acesso Cortesia\n2️⃣ Valores\n3️⃣ Pagamento\n4️⃣ FAQ";
            sessao.estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                if (!estaNoHorario()) {
                    resposta = `🌙 Fora do horário (${botConfig.inicioSuporte}h às ${botConfig.fimSuporte}h). Instale aqui: [LINK]`;
                } else {
                    resposta = "🚀 *Acesso Cortesia*\n\n1️⃣ Já instalei os Apps\n2️⃣ Vou instalar agora\n3️⃣ Preciso de ajuda\n\n0️⃣ Voltar";
                    sessao.estado = 'OPCOES_TESTE';
                }
            } else if (msg === '2') {
                resposta = `💎 *Acesso Koalla:* R$ ${botConfig.valorPlano} (30 dias).\n\n0️⃣ Voltar`;
            } else if (msg === '3') {
                resposta = "💳 Pagamento via PIX ou Cartão.\n\n0️⃣ Voltar";
            } else if (msg === '4') {
                resposta = "❓ FAQ: DualAPP e Renovação.\n\n0️⃣ Voltar";
            } else {
                resposta = "⚠️ *Opção Inválida.* Escolha de 1 a 4 ou 0 para o início.";
            }
            break;

        case 'OPCOES_TESTE':
            if (msg === '1' || msg.includes('instalei')) {
                resposta = "Ótimo! Qual o seu *nome* para o cadastro?";
                sessao.estado = 'COLETAR_NOME';
            } else if (msg === '2') {
                resposta = "📥 Central de Apps: [LINK]. Volte quando instalar!";
                sessao.estado = 'MENU_PRINCIPAL';
            } else if (msg === '3') {
                resposta = "👨‍💻 Suporte notificado! Aguarde um momento.";
                sessao.estado = 'AGUARDANDO';
            } else {
                resposta = "⚠️ Escolha 1 (Já instalei), 2 (Vou instalar) ou 3 (Ajuda).";
            }
            break;

        case 'COLETAR_NOME':
            sessao.dados.nome = message; // Salva o nome exatamente como enviado
            if (botConfig.indicacaoAtiva) {
                resposta = `Prazer, ${message}! Possui Código de Indicação? (Envie o código ou 0 para pular)`;
                sessao.estado = 'COLETAR_CODIGO';
            } else {
                resposta = `Certo, ${message}! Quer testar agora ou agendar?\n\n1️⃣ Quero agora!\n2️⃣ Prefiro agendar`;
                sessao.estado = 'AGENDAR_OU_AGORA';
            }
            break;

        case 'COLETAR_CODIGO':
            sessao.dados.duracao = (msg !== '0') ? "24 HORAS" : "6 HORAS";
            resposta = `✅ Registrado! Duração: ${sessao.dados.duracao}.\n\n1️⃣ Quero agora!\n2️⃣ Agendar`;
            sessao.estado = 'AGENDAR_OU_AGORA';
            break;

        case 'AGENDAR_OU_AGORA':
            if (msg === '1') {
                resposta = "✅ *Solicitação enviada!* Aguarde os dados de acesso.";
                console.log(`🎯 [CONVERSÃO] ${sessao.dados.nome} pediu teste AGORA.`);
                sessao.estado = 'AGUARDANDO';
            } else if (msg === '2') {
                resposta = "📅 Qual o melhor dia e horário para você?";
                sessao.estado = 'DEFINIR_HORARIO';
            } else {
                resposta = "⚠️ Digite 1 para AGORA ou 2 para AGENDAR.";
            }
            break;

        case 'DEFINIR_HORARIO':
            sessao.dados.agendamento = message;
            resposta = `✅ Agendado para ${message}! O suporte entrará em contato.`;
            sessao.estado = 'AGUARDANDO';
            break;

        default:
            sessao.estado = 'INICIO';
            resposta = "Olá! Digite 'Início' para começar.";
    }

    // Retorno com delay humano
    const textoFinal = spintax(resposta);
    setTimeout(() => {
        res.json({ response: textoFinal, method: "NOTIFICATION" });
    }, (textoFinal.length * 15) + 1000);
});

app.listen(port, () => console.log('🚀 Pandda Koalla TV - Sistema Corrigido'));