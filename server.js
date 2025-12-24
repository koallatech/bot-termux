const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// --- PROTEÇÃO CONTRA ERRO DE JSON (MENSAGENS QUEBRADAS) ---
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(200).send(); 
    }
    next();
});

// --- CONFIGURAÇÃO MASTER ---
const ADMIN_NUMBER = "63999440714"; // Seu número configurado

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

// --- WEBHOOK PRINCIPAL ---
app.post('/webhook', (req, res) => {
    const { message, sender } = req.body;
    if (!message || !sender) return res.status(200).send();

    const msg = message.trim().toLowerCase();
    const cleanSender = sender.replace(/\D/g, '');
    const cleanAdmin = ADMIN_NUMBER.replace(/\D/g, '');

    // 1. COMANDOS ADMIN (PRIORIDADE TOTAL E GLOBAL)
    if (cleanSender === cleanAdmin && msg.startsWith('!')) {
        let rAdmin = "";
        
        if (msg === '!admin' || msg === '!comandos' || msg === '!ajuda') {
            rAdmin = "🛠️ *MENU DE COMANDOS ADMIN*\n\n" +
                     "*GESTÃO GERAL:*\n" +
                     "• `!status`: Mostra as configurações ativas do bot.\n" +
                     "• `!pausa`: Desativa o bot para todos os clientes.\n" +
                     "• `!play`: Reativa o bot após uma pausa.\n" +
                     "• `!limpar`: Reseta o histórico de conversas de todos.\n\n" +
                     "*VENDAS E TESTES:*\n" +
                     "• `!valor 39,90`: Altera o preço exibido no menu.\n" +
                     "• `!ind on/off`: Liga ou desliga o sistema de códigos de 24h.\n" +
                     "• `!pausateste`: Bloqueia novos pedidos de teste.\n" +
                     "• `!playteste`: Libera novos pedidos de teste.\n" +
                     "• `!hora 09 18`: Define horário de liberação (Início Fim).";
        } 
        else if (msg === '!status') {
            rAdmin = `📊 *STATUS KOALLA:* \n• Atendimento: ${botConfig.pausado ? '🔴 OFF' : '🟢 ON'}\n• Testes: ${botConfig.pausarTestes ? '🔴 OFF' : '🟢 ON'}\n• Indicação: ${botConfig.indicacaoAtiva ? '🟢 ON' : '🔴 OFF'}\n• Valor: R$ ${botConfig.valorPlano}\n• Horário: ${botConfig.inicioSuporte}h às ${botConfig.fimSuporte}h`;
        }
        else if (msg === '!pausa') { botConfig.pausado = true; rAdmin = "🔴 Bot pausado globalmente."; }
        else if (msg === '!play') { botConfig.pausado = false; rAdmin = "🟢 Bot reativado para todos."; }
        else if (msg === '!pausateste') { botConfig.pausarTestes = true; rAdmin = "🚫 Liberação de testes suspensa."; }
        else if (msg === '!playteste') { botConfig.pausarTestes = false; rAdmin = "🔓 Liberação de testes ativa."; }
        else if (msg === '!ind on') { botConfig.indicacaoAtiva = true; rAdmin = "✅ Sistema de indicação ATIVADO."; }
        else if (msg === '!ind off') { botConfig.indicacaoAtiva = false; rAdmin = "❌ Sistema de indicação DESATIVADO."; }
        else if (msg === '!limpar') { sessoes = {}; rAdmin = "♻️ Memória de conversas limpa."; }
        else if (msg.startsWith('!valor')) {
            const novoValor = msg.split(' ')[1];
            if (novoValor) { botConfig.valorPlano = novoValor; rAdmin = `💰 Preço atualizado para R$ ${novoValor}`; }
        }
        else if (msg.startsWith('!hora')) {
            const p = msg.split(' ');
            if (p[1] && p[2]) {
                botConfig.inicioSuporte = parseInt(p[1]);
                botConfig.fimSuporte = parseInt(p[2]);
                rAdmin = `⏰ Horário de suporte: ${p[1]}h às ${p[2]}h`;
            }
        }

        if (rAdmin) {
            console.log(`[ADMIN] Comando: ${msg}`);
            return res.json({ response: rAdmin, method: "NOTIFICATION" });
        }
    }

    // 2. BLOQUEIO SE O BOT ESTIVER PAUSADO
    if (botConfig.pausado) return res.status(200).send();

    // 3. SESSÃO DO CLIENTE
    if (!sessoes[sender]) sessoes[sender] = { estado: 'INICIO', historico: [], dados: {} };
    let sessao = sessoes[sender];

    // 4. MODO SILENCIOSO (Intervenção Humana)
    if (msg === '!atender') { sessao.estado = 'SILENCIO'; return res.json({ response: "", method: "NONE" }); }
    if (sessao.estado === 'SILENCIO' || sessao.estado === 'AGUARDANDO') return res.status(200).send();

    // 5. RESET/VOLTAR
    if (msg === '0' || msg === 'inicio' || msg === 'voltar') {
        sessao.estado = 'MENU_PRINCIPAL';
        return res.json({ response: spintax("{🦁|🐨} *Menu Principal*" + TEXTO_MENU_PRINCIPAL), method: "NOTIFICATION" });
    }

    // 6. LOGICA DE ESTADOS
    let resposta = "";
    switch (sessao.estado) {
        case 'INICIO':
            resposta = "{🦁|🐨} *Bem-vindo ao suporte Koalla TV!*" + TEXTO_MENU_PRINCIPAL;
            sessao.estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                if (botConfig.pausarTestes) {
                    resposta = "⚠️ No momento, as liberações de teste estão suspensas para manutenção. Tente mais tarde!";
                } else if (!estaNoHorario()) {
                    resposta = `🌙 *Fora do horário:* Acessos são liberados das ${botConfig.inicioSuporte}h às ${botConfig.fimSuporte}h.\n\nMas você já pode adiantar a instalação: [LINK]`;
                } else {
                    resposta = "🚀 *Acesso Cortesia*\n\n1️⃣ Já instalei os Apps\n2️⃣ Vou instalar agora\n3️⃣ Preciso de ajuda / Outro dispositivo\n\n0️⃣ Voltar";
                    sessao.estado = 'OPCOES_TESTE';
                }
            } else if (msg === '2') {
                resposta = `💎 *Acesso Koalla:* R$ ${botConfig.valorPlano} (30 dias).\n\n` + "------------------------\n" + TEXTO_MENU_PRINCIPAL;
                sessao.estado = 'MENU_PRINCIPAL';
            } else if (msg === '3') {
                resposta = "💳 Pagamento via PIX ou Cartão.\n\n0️⃣ Voltar";
            } else if (msg === '4') {
                resposta = "❓ FAQ: DualAPP e Renovação.\n\n0️⃣ Voltar";
            } else { resposta = "⚠️ Opção inválida. Digite de 1 a 4."; }
            break;

        case 'OPCOES_TESTE':
            if (msg === '1') {
                resposta = "Ótimo! Para começarmos, qual o seu *nome*?";
                sessao.estado = 'COLETAR_NOME';
            } else if (msg === '2') {
                resposta = "📥 [LINK_PAGINA_APPS]\n\nInstale e volte aqui quando estiver pronto!";
                sessao.estado = 'MENU_PRINCIPAL';
            } else if (msg === '3') {
                resposta = "👨‍💻 Aguarde um instante. Um atendente humano vai te auxiliar.";
                sessao.estado = 'AGUARDANDO';
            } else { resposta = "⚠️ Escolha 1, 2 ou 3."; }
            break;

        case 'COLETAR_NOME':
            sessao.dados.nome = message;
            if (botConfig.indicacaoAtiva) {
                resposta = `Prazer, ${message}! Possui um *Código de Indicação*?\n\n✅ Com código: *24 HORAS*\n❌ Sem código: *6 HORAS*\n\nDigite o código ou 0 para pular:`;
                sessao.estado = 'COLETAR_CODIGO';
            } else {
                sessao.dados.duracao = "6 HORAS";
                resposta = `Certo, ${message}! Deseja iniciar seu acesso de 6h agora ou agendar?\n\n1️⃣ Quero agora\n2️⃣ Prefiro agendar`;
                sessao.estado = 'AGENDAR_OU_AGORA';
            }
            break;

        case 'COLETAR_CODIGO':
            sessao.dados.duracao = (msg !== '0') ? "24 HORAS" : "6 HORAS";
            resposta = `✅ *Registrado!* Você terá ${sessao.dados.duracao}.\n\n1️⃣ Quero agora\n2️⃣ Prefiro agendar`;
            sessao.estado = 'AGENDAR_OU_AGORA';
            break;

        case 'AGENDAR_OU_AGORA':
            if (msg === '1') {
                resposta = "✅ *Solicitação enviada!* Aguarde os dados aqui no chat.";
                sessao.estado = 'AGUARDANDO';
            } else if (msg === '2') {
                resposta = "📅 Escreva o *dia e horário* desejado para o seu acesso:";
                sessao.estado = 'DEFINIR_HORARIO';
            } else { resposta = "⚠️ Escolha 1 ou 2."; }
            break;

        case 'DEFINIR_HORARIO':
            sessao.dados.agendamento = message;
            resposta = `✅ *Agendado!* Nossa equipe entrará em contato às ${message}.`;
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