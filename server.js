const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Middleware de Erro JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('⚠️ Erro de JSON recebido!');
        return res.status(200).send(); 
    }
    next();
});

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

const TEXTO_MENU_PRINCIPAL = "\n\n1️⃣ Solicitar Acesso Cortesia\n2️⃣ Valores do Plano\n3️⃣ Pagamento\n4️⃣ Dúvidas Frequentes (FAQ)";

// --- WEBHOOK COM LOG AGRESSIVO ---
app.post('/webhook', (req, res) => {
    // 🔍 LOG DE DEBUG: Ver exatamente o que chega
    console.log('--- NOVA REQUISIÇÃO ---');
    console.log('Corpo recebido:', JSON.stringify(req.body, null, 2));

    const { message, sender } = req.body;
    
    if (!message || !sender) {
        console.log('❌ Requisição ignorada: Mensagem ou Sender ausentes.');
        return res.status(200).send();
    }

    const msg = message.trim().toLowerCase();
    // Limpeza radical do número para garantir que o Admin funcione
    const cleanSender = sender.replace(/\D/g, ''); 
    const cleanAdmin = ADMIN_NUMBER.replace(/\D/g, '');

    console.log(`📱 Remetente Limpo: ${cleanSender} | Admin Limpo: ${cleanAdmin}`);

    // 1. COMANDOS ADMIN
    if (cleanSender.includes(cleanAdmin) && msg.startsWith('!')) {
        console.log(`🛠️ EXECUTANDO COMANDO ADMIN: ${msg}`);
        let rAdmin = "";
        
        if (msg === '!admin' || msg === '!status') {
            rAdmin = `📊 *STATUS KOALLA:* \n• Atendimento: ${botConfig.pausado ? 'OFF' : 'ON'}\n• Valor: R$ ${botConfig.valorPlano}`;
        } else if (msg === '!play') { botConfig.pausado = false; rAdmin = "🟢 Bot Reativado."; }
        else if (msg === '!pausa') { botConfig.pausado = true; rAdmin = "🔴 Bot Pausado."; }
        else if (msg === '!limpar') { sessoes = {}; rAdmin = "♻️ Sessões limpas."; }

        if (rAdmin) return res.json({ response: rAdmin, method: "NOTIFICATION" });
    }

    if (botConfig.pausado) {
        console.log('⛔ Bot pausado. Ignorando cliente.');
        return res.status(200).send();
    }

    // 2. LÓGICA DE SESSÃO
    if (!sessoes[sender]) sessoes[sender] = { estado: 'INICIO', historico: [], dados: {} };
    let sessao = sessoes[sender];

    console.log(`👤 Cliente: ${sender} | Estado: ${sessao.estado}`);

    // Comandos de navegação
    if (msg === '0' || msg === 'inicio') {
        sessao.estado = 'MENU_PRINCIPAL';
        return res.json({ response: "🦁 *Menu Principal*" + TEXTO_MENU_PRINCIPAL, method: "NOTIFICATION" });
    }

    let resposta = "";
    switch (sessao.estado) {
        case 'INICIO':
            resposta = "🦁 *Olá! Bem-vindo à Koalla TV!*" + TEXTO_MENU_PRINCIPAL;
            sessao.estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                resposta = "🚀 *Acesso Cortesia*\n\n1️⃣ Já instalei os Apps\n2️⃣ Vou instalar agora\n\n0️⃣ Voltar";
                sessao.estado = 'OPCOES_TESTE';
            } else if (msg === '2') {
                resposta = `💎 *Acesso Koalla:* R$ ${botConfig.valorPlano}` + TEXTO_MENU_PRINCIPAL;
            } else {
                resposta = "⚠️ Opção inválida. Digite de 1 a 4.";
            }
            break;

        case 'OPCOES_TESTE':
            if (msg === '1') {
                resposta = "Qual o seu *nome*?";
                sessao.estado = 'COLETAR_NOME';
            } else {
                resposta = "⚠️ Escolha 1 ou 2.";
            }
            break;

        case 'COLETAR_NOME':
            sessao.dados.nome = message;
            resposta = `Prazer, ${message}! Deseja o teste agora?\n1. Sim\n2. Agendar`;
            sessao.estado = 'FINAL';
            break;

        case 'FINAL':
            resposta = "✅ Solicitação enviada!";
            sessao.estado = 'AGUARDANDO';
            break;

        default:
            sessao.estado = 'INICIO';
            resposta = "Olá! Digite algo para começar.";
    }

    res.json({ response: resposta, method: "NOTIFICATION" });
});

app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));