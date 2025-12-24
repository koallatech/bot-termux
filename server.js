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

// Configuração Admin
const MINHA_CONTA_ADMIN = "556399440714"; 

let botConfig = {
    pausado: false,
    valorPlano: "34,90"
};

let sessoes = {}; 

// Texto do menu centralizado para evitar repetição
const TEXTO_MENU_PRINCIPAL = "\n\n1️⃣ Solicitar Acesso Cortesia\n2️⃣ Valores do Plano\n3️⃣ Pagamento\n4️⃣ Dúvidas Frequentes (FAQ)";

app.post('/webhook', (req, res) => {
    const { message, sender } = req.body;
    if (!message || !sender) return res.status(200).send();

    const msg = message.trim().toLowerCase();
    const senderLimpo = sender.replace(/\D/g, ''); 
    const adminLimpo = MINHA_CONTA_ADMIN.replace(/\D/g, '');

    const isAdmin = senderLimpo === adminLimpo;

    // 1. COMANDOS ADMIN (PRIORIDADE)
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

    // 2. INICIALIZAÇÃO DE SESSÃO
    if (!sessoes[sender]) sessoes[sender] = { estado: 'INICIO', dados: {} };
    let sessao = sessoes[sender];

    // LOG DE ESTADO PARA DEBUG
    console.log(`📩 [LOG] ${sender} (${sessao.estado}): ${msg}`);

    // 3. COMANDO GLOBAL RESET (0)
    if (msg === '0' || msg === 'inicio') {
        sessao.estado = 'MENU_PRINCIPAL';
        return res.json({ response: "🦁 *Menu Principal Koalla TV*" + TEXTO_MENU_PRINCIPAL, method: "NOTIFICATION" });
    }

    // 4. MÁQUINA DE ESTADOS (FLUXO)
    let resposta = "";
    
    switch (sessao.estado) {
        case 'INICIO':
            resposta = "🦁 *Olá! Bem-vindo à Koalla TV!* 🚀" + TEXTO_MENU_PRINCIPAL;
            sessao.estado = 'MENU_PRINCIPAL'; // Próxima mensagem cai no Menu Principal
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                // Única opção que realmente MUDA o estado do cliente
                resposta = "🚀 *Acesso Cortesia*\n\n1️⃣ Já instalei os Apps\n2️⃣ Vou instalar agora\n\n0️⃣ Voltar ao Início";
                sessao.estado = 'OPCOES_TESTE';
            } 
            else if (msg === '2') {
                resposta = `💎 *Valores Koalla TV*\n💰 R$ ${botConfig.valorPlano} por 30 dias.\n✅ Sem taxas de adesão ou fidelidade.\n` + "------------------------" + TEXTO_MENU_PRINCIPAL;
                // Estado continua MENU_PRINCIPAL
            } 
            else if (msg === '3') {
                resposta = "💳 *Formas de Pagamento*\n• PIX (Liberação imediata)\n• Cartão de Crédito\n" + "------------------------" + TEXTO_MENU_PRINCIPAL;
                // Estado continua MENU_PRINCIPAL
            } 
            else if (msg === '4') {
                resposta = "❓ *Dúvidas Frequentes*\n• *Funciona em Smart TV?* Sim (Samsung, LG, Android).\n• *Preciso de antenas?* Não, apenas internet.\n" + "------------------------" + TEXTO_MENU_PRINCIPAL;
                // Estado continua MENU_PRINCIPAL
            } 
            else {
                resposta = "⚠️ *Opção Inválida.*\nPor favor, escolha de 1 a 4 ou digite *0* para o menu.";
            }
            break;

        case 'OPCOES_TESTE':
            if (msg === '1') {
                resposta = "Perfeito! Para gerar seu acesso, qual o seu *nome*?";
                sessao.estado = 'COLETAR_NOME';
            } 
            else if (msg === '2') {
                resposta = "📥 *Central de Apps:* [LINK_AQUI]\n\nInstale e nos chame aqui quando estiver pronto! 😉";
                sessao.estado = 'MENU_PRINCIPAL'; // Volta para o menu
            } 
            else {
                resposta = "⚠️ Digite *1* se já instalou ou *2* se vai instalar agora.\n\n0️⃣ Voltar";
            }
            break;

        case 'COLETAR_NOME':
            sessao.dados.nome = message;
            resposta = `Prazer, ${message}! Deseja iniciar seu teste de 6 horas agora ou prefere agendar?\n\n1️⃣ Quero agora\n2️⃣ Prefiro agendar`;
            sessao.estado = 'AGENDAR_OU_AGORA';
            break;

        case 'AGENDAR_OU_AGORA':
            if (msg === '1') {
                resposta = "✅ *Solicitação enviada!* Aguarde os dados de acesso aqui no chat em instantes.";
                sessao.estado = 'AGUARDANDO';
            } else if (msg === '2') {
                resposta = "📅 Por favor, digite o *dia e horário* que deseja receber seu teste:";
                sessao.estado = 'DEFINIR_HORARIO';
            } else {
                resposta = "⚠️ Escolha 1 (Agora) ou 2 (Agendar).";
            }
            break;

        case 'DEFINIR_HORARIO':
            sessao.dados.agendamento = message;
            resposta = `✅ *Tudo certo!* Agendamos seu teste para: ${message}. Nossa equipe entrará em contato.`;
            sessao.estado = 'AGUARDANDO';
            break;

        case 'AGUARDANDO':
            // Se o cliente falar algo enquanto espera, o bot não responde para não ser chato
            return res.status(200).send();

        default:
            sessao.estado = 'INICIO';
            resposta = "Olá! Digite 'Início' para ver as opções.";
    }

    res.json({ response: resposta, method: "NOTIFICATION" });
});

app.listen(port, () => console.log(`🚀 Pandda Bot rodando na porta ${port}`));