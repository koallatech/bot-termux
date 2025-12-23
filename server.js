const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Memória de sessões para cada cliente
const sessoes = {};

// 1. LÓGICA DE DELAY HUMANO
// Calcula o tempo baseado no tamanho do texto + um fator aleatório (800ms a 2s)
function calcularDelay(texto) {
    const msPorCaractere = 15; 
    const base = texto.length * msPorCaractere;
    const aleatorio = Math.floor(Math.random() * (2000 - 800 + 1)) + 800;
    return Math.min(base + aleatorio, 5000); // Máximo de 5 segundos
}

app.post('/webhook', (req, res) => {
    const { message, sender } = req.body;
    const msg = message ? message.trim().toLowerCase() : "";

    // Inicializa a sessão se for nova
    if (!sessoes[sender]) {
        sessoes[sender] = { 
            estado: 'INICIO', 
            historico: [], 
            dados: {} 
        };
    }

    let sessao = sessoes[sender];
    let resposta = "";

    // NAVEGAÇÃO GLOBAL
    if (msg === '0') {
        sessao.estado = 'INICIO';
        sessao.historico = [];
    } else if (msg === '#') {
        sessao.estado = sessao.historico.pop() || 'INICIO';
    }

    // CÉREBRO DO BOT - FLUXO KOALLA TV
    switch (sessao.estado) {
        case 'INICIO':
            resposta = "🦁 *Olá! Bem-vindo à Koalla TV.*\n\nComo posso ajudar?\n\n1️⃣ Solicitar Teste Grátis\n2️⃣ Valores e Planos\n3️⃣ Formas de Pagamento\n4️⃣ Dúvidas Frequentes (FAQ)\n\nDigite o número da opção.";
            sessao.estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            sessao.historico.push('INICIO'); // Salva para o comando '#'
            if (msg === '1') {
                resposta = "Ótimo! Primeiro, me diga o seu *nome* para o cadastro:";
                sessao.estado = 'COLETAR_NOME';
            } else if (msg === '2') {
                resposta = "💎 *Nossos Planos:*\n\n🔹 Mensal: R$ 35,00\n🔹 Trimestral: R$ 90,00\n\n0️⃣ Início | #️⃣ Voltar";
            } else if (msg === '3') {
                resposta = "💳 *Pagamento:*\n\nAceitamos PIX, Cartão e Boleto.\n\n0️⃣ Início | #️⃣ Voltar";
            } else if (msg === '4') {
                resposta = "❓ *FAQ:*\n\n1. Precisa de antena? (Não)\n2. Roda em Smart TV? (Sim)\n\n0️⃣ Início | #️⃣ Voltar";
            } else {
                resposta = "⚠️ Opção inválida. Digite de 1 a 4.";
            }
            break;

        case 'COLETAR_NOME':
            sessao.dados.nome = message;
            resposta = `Prazer, ${message}! 🐨\n\nEm qual aparelho você vai assistir?\n\n1. Smart TV\n2. TV Box\n3. Celular Android\n4. iPhone/iPad\n5. Roku\n\n#️⃣ Voltar`;
            sessao.estado = 'COLETAR_APARELHO';
            break;

        case 'COLETAR_APARELHO':
            const aparelhos = { '1':'Smart TV', '2':'TV Box', '3':'Android', '4':'iOS', '5':'Roku' };
            if (aparelhos[msg]) {
                sessao.dados.aparelho = aparelhos[msg];
                if (msg === '1') {
                    resposta = "Qual a marca da sua Smart TV?\n\n1. Samsung\n2. LG\n3. TCL/Semp\n4. Outra";
                    sessao.estado = 'COLETAR_MARCA';
                } else {
                    console.log(`[LOG PANDDA] Novo Teste: ${sessao.dados.nome} | ${sessao.dados.aparelho} | Tel: ${sender}`);
                    resposta = "✅ *Solicitação enviada!*\n\nJá recebemos seus dados. Um atendente enviará seu teste em instantes. Aguarde aqui.";
                    sessao.estado = 'AGUARDANDO';
                }
            } else { resposta = "Escolha de 1 a 5 ou # para voltar."; }
            break;

        case 'COLETAR_MARCA':
            const marcas = { '1':'Samsung', '2':'LG', '3':'TCL/Semp', '4':'Outra' };
            sessao.dados.marca = marcas[msg] || 'Outra';
            console.log(`[LOG PANDDA] Novo Teste: ${sessao.dados.nome} | SmartTV ${sessao.dados.marca} | Tel: ${sender}`);
            resposta = "✅ *Perfeito!*\n\nSua solicitação para Smart TV " + sessao.dados.marca + " foi recebida. Aguarde o contato do suporte.";
            sessao.estado = 'AGUARDANDO';
            break;

        case 'AGUARDANDO':
            // Não responde nada enquanto aguarda o humano
            return res.status(200).send();

        default:
            sessao.estado = 'INICIO';
            resposta = "Olá! Digite qualquer coisa para começar.";
    }

    // ENVIO COM DELAY CALCULADO
    const delay = calcularDelay(resposta);
    setTimeout(() => {
        res.json({ response: resposta, method: "NOTIFICATION" });
    }, delay);
});

app.listen(port, () => console.log(`Bot Koalla TV rodando na porta ${port}`));