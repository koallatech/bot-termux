const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Armazenamento de sessões na memória RAM
const sessoes = {};

// Configuração: Tempo para resetar (ex: 30 minutos de inatividade)
const TEMPO_EXPIRACAO = 30 * 60 * 1000; 

// Função para limpar sessões inativas
function limparInatividade(sender) {
    if (sessoes[sender] && sessoes[sender].estado !== 'AGUARDANDO_SUPORTE') {
        const agora = Date.now();
        if (agora - sessoes[sender].ultimaInteracao > TEMPO_EXPIRACAO) {
            console.log(`[SESSÃO] Resetando ${sender} por inatividade.`);
            delete sessoes[sender];
        }
    }
}

app.post('/webhook', (req, res) => {
    const { message, sender } = req.body;
    const msg = message ? message.trim().toLowerCase() : "";

    // 1. Limpa inatividade antes de processar
    limparInatividade(sender);

    // 2. Inicializa nova sessão se não existir
    if (!sessoes[sender]) {
        sessoes[sender] = {
            estado: 'INICIO',
            ultimaInteracao: Date.now()
        };
    }

    // Atualiza o timestamp da última interação
    sessoes[sender].ultimaInteracao = Date.now();
    let estadoAtual = sessoes[sender].estado;
    let resposta = "";
    let acao = "NOTIFICATION";

    console.log(`[${sender}] enviou: ${msg} | Estado Atual: ${estadoAtual}`);

    // 3. Lógica de Estados (Cérebro do Bot)
    switch (estadoAtual) {
        case 'INICIO':
            resposta = "🦁 *Bem-vindo à Koalla TV!*\n\nComo posso te ajudar hoje?\n\n1️⃣ Ver meu Vencimento\n2️⃣ Renovar Assinatura\n3️⃣ Falar com Atendente";
            sessoes[sender].estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                resposta = "🔍 *Consulta de Vencimento*\n\nEstou verificando no sistema Pandda... (Integração Supabase em breve)";
                // sessoes[sender].estado = 'INICIO'; // Opcional: Volta ao início após responder
            } 
            else if (msg === '2') {
                resposta = "💳 *Renovação*\n\nPara renovar, acesse nosso site ou peça o PIX para o atendente.";
            } 
            else if (msg === '3') {
                resposta = "🎧 *Suporte Humanizado*\n\nEntendido! Um atendente foi notificado. Por favor, aguarde nesta linha.";
                sessoes[sender].estado = 'AGUARDANDO_SUPORTE';
            } 
            else {
                resposta = "⚠️ *Opção Inválida*\n\nPor favor, escolha 1, 2 ou 3.";
            }
            break;

        case 'AGUARDANDO_SUPORTE':
            // Não responde nada automaticamente para não atrapalhar o humano, 
            // ou envia uma mensagem fixa se o usuário insistir.
            console.log(`[SUPORTE] ${sender} está na fila. Ignorando resposta automática.`);
            return res.status(200).send(); 

        default:
            resposta = "Olá! Digite qualquer coisa para ver o menu.";
            sessoes[sender].estado = 'INICIO';
    }

    // Retorna o JSON para o MacroDroid
    res.json({ 
        response: resposta,
        method: acao 
    });
});

app.listen(port, () => {
    console.log(`Servidor Pandda rodando em http://localhost:${port}`);
});