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

// Deixe aqui o seu número como você preferir (com ou sem formatação)
const MINHA_CONTA_ADMIN = "556399440714"; 

let botConfig = {
    pausado: false,
    valorPlano: "34,90"
};

let sessoes = {}; 
const TEXTO_MENU_PRINCIPAL = "\n\n1️⃣ Solicitar Acesso Cortesia\n2️⃣ Valores do Plano\n3️⃣ Pagamento\n4️⃣ Dúvidas Frequentes (FAQ)";

app.post('/webhook', (req, res) => {
    const { message, sender } = req.body;
    if (!message || !sender) return res.status(200).send();

    const msg = message.trim().toLowerCase();
    
    // --- LÓGICA DE COMPARAÇÃO DE NÚMERO ---
    // Limpa o que vem do WhatsApp: "+55 63 9944-0714" -> "556399440714"
    const senderLimpo = sender.replace(/\D/g, ''); 
    // Limpa a sua variável admin (por precaução): "5563..." -> "5563..."
    const adminLimpo = MINHA_CONTA_ADMIN.replace(/\D/g, '');

    // Compara as strings puras (apenas números)
    const isAdmin = senderLimpo === adminLimpo;

    // 1. COMANDOS ADMIN
    if (isAdmin && msg.startsWith('!')) {
        let rAdmin = "";
        if (msg === '!admin' || msg === '!status') {
            rAdmin = `📊 *STATUS PANDDA:* \n• Atendimento: ${botConfig.pausado ? 'OFF' : 'ON'}\n• Valor: R$ ${botConfig.valorPlano}`;
        } else if (msg === '!pausa') { botConfig.pausado = true; rAdmin = "🔴 Bot pausado."; }
        else if (msg === '!play') { botConfig.pausado = false; rAdmin = "🟢 Bot reativado."; }
        else if (msg.startsWith('!valor')) {
            const novoV = msg.split(' ')[1];
            if(novoV) { botConfig.valorPlano = novoV; rAdmin = `💰 Valor: R$ ${novoV}`; }
        }

        if (rAdmin) return res.json({ response: rAdmin, method: "NOTIFICATION" });
    }

    if (botConfig.pausado) return res.status(200).send();

    // 2. INICIALIZAÇÃO E FLUXO DO CLIENTE
    if (!sessoes[sender]) sessoes[sender] = { estado: 'INICIO' };
    let sessao = sessoes[sender];

    console.log(`📩 [LOG] ${sender} (${sessao.estado}): ${msg}`);

    if (msg === '0' || msg === 'inicio') {
        sessao.estado = 'MENU_PRINCIPAL';
        return res.json({ response: "🦁 *Menu Principal*" + TEXTO_MENU_PRINCIPAL, method: "NOTIFICATION" });
    }

    let resposta = "";
    switch (sessao.estado) {
        case 'INICIO':
            resposta = "🦁 *Bem-vindo à Koalla TV!*" + TEXTO_MENU_PRINCIPAL;
            sessao.estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                resposta = "🚀 *Acesso Cortesia*\n\n1️⃣ Já instalei os Apps\n2️⃣ Vou instalar agora\n\n0️⃣ Voltar";
                sessao.estado = 'OPCOES_TESTE';
            } else if (msg === '2') {
                resposta = `💎 *Acesso Koalla:* R$ ${botConfig.valorPlano}` + TEXTO_MENU_PRINCIPAL;
                sessao.estado = 'MENU_PRINCIPAL';
            } else {
                resposta = "⚠️ Opção inválida.";
            }
            break;

        default:
            sessao.estado = 'INICIO';
            resposta = "Olá! Digite 'Início'.";
    }

    res.json({ response: resposta, method: "NOTIFICATION" });
});

app.listen(port);