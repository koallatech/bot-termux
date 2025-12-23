const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

const sessoes = {};

// --- MOTOR DE HUMANIZAÇÃO ---
function spintax(texto) {
    return texto.replace(/{([^{}]+)}/g, (match, choices) => {
        const options = choices.split('|');
        return options[Math.floor(Math.random() * options.length)];
    });
}

function humanizar(texto) {
    const emojis = [' 🦁', ' 🐨', ' 📺', ' ✅', ' 🚀', ' 💎'];
    let mutado = spintax(texto);
    // Adiciona emoji apenas 40% das vezes para não parecer "poluído"
    return Math.random() > 0.6 ? mutado + emojis[Math.floor(Math.random() * emojis.length)] : mutado;
}

app.post('/webhook', (req, res) => {
    const { message, sender } = req.body;
    const msg = message ? message.trim().toLowerCase() : "";

    if (!sessoes[sender]) {
        sessoes[sender] = { estado: 'INICIO', historico: [], dados: {} };
    }

    let sessao = sessoes[sender];
    let resposta = "";

    // Navegação de Fluxo
    if (msg === '0' || msg === 'inicio') { sessao.estado = 'INICIO'; sessao.historico = []; }
    if (msg === '#' || msg === 'voltar') { sessao.estado = sessao.historico.pop() || 'INICIO'; }

    switch (sessao.estado) {
        case 'INICIO':
            resposta = "{🦁|🐨} *Olá! Bem-vindo ao suporte Koalla TV.*\n\n🚀 *Entretenimento com Liberdade:* Aqui você não fica preso a assinaturas. Pague apenas quando quiser utilizar!\n\n📺 *Onde assistir:* Smart TV, TV Box, Celular, Roku e FireStick.\n\n1️⃣ {Solicitar|Quero} Acesso Cortesia\n2️⃣ Valores e Telas Extras\n3️⃣ Formas de Pagamento\n4️⃣ Dúvidas Frequentes (FAQ)";
            sessao.estado = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            sessao.historico.push('INICIO');
            if (msg === '1' || msg.includes('cortesia') || msg.includes('acesso')) {
                resposta = "🚀 *Excelente!*\n\nPara que possamos liberar seu acesso, primeiro faça a instalação do aplicativo em nosso site:\n[LINK_CENTRAL_APPS]\n\n*Já instalou?* Por favor, me diga seu *nome* para o cadastro do seu {Acesso Cortesia|Acesso para Avaliação}:";
                sessao.estado = 'COLETAR_NOME';
            } else if (msg === '2') {
                resposta = "💎 *Acesso Koalla TV*\n\n💰 *Valor Único:* R$ 34,90 (30 dias)\n⚠️ *Sem Fidelidade:* Use apenas no mês que pagar!\n\n📺 *Telas Extras:* R$ 17,90 cada (Até 3 telas adicionais).\n\n0️⃣ Início | #️⃣ Voltar";
            } else if (msg === '3') {
                resposta = "💳 *Pagamento*\n\n{Aceitamos|Trabalhamos com} PIX e Cartão de Crédito via Checkout Seguro.\n\n1️⃣ Chave PIX\n2️⃣ Link para Cartão\n\n💡 *Aviso:* Após o pagamento, nossa equipe realiza a liberação rápida do seu login no sistema Pandda! ⚡\n\n0️⃣ Início | #️⃣ Voltar";
                sessao.estado = 'MENU_PAGAMENTO';
            } else if (msg === '4') {
                resposta = "❓ *Perguntas Frequentes*\n\n1. Como funciona o pagamento?\n2. Onde vejo a lista de conteúdos?\n3. O que é o sistema DualAPP?\n4. Posso usar no celular?\n\n0️⃣ Início | #️⃣ Voltar";
                sessao.estado = 'MENU_FAQ';
            }
            break;

        case 'MENU_PAGAMENTO':
            if (msg === '1') resposta = "🔑 *Chave PIX (Copia e Cola):*\n[SUA_CHAVE_AQUI]\n\nEnvie o comprovante para validarmos seu acesso!";
            else if (msg === '2') resposta = "🔗 *Link para Cartão:* [SEU_LINK_AQUI]\n\nAprovação e liberação rápida!";
            break;

        case 'MENU_FAQ':
            if (msg === '1') resposta = "🚫 *Sem Assinatura:* Nosso serviço é pré-pago. Você paga pelo mês que quer usar. Se não renovar, o sinal apenas expira, sem multas ou cobranças futuras.";
            else if (msg === '2') resposta = "🎬 *Grade de Conteúdos:* Para não comprometer a segurança deste canal, toda a nossa vitrine de entretenimento está disponível em: [LINK_VITRINE]";
            else if (msg === '3') resposta = "💡 *DualAPP:* Tecnologia exclusiva com 2 opções de aplicativos para o mesmo login. Estabilidade garantida mesmo em dias de alta demanda! 🐨";
            else if (msg === '4') resposta = "📱 *Uso Mobile:* Sim! Você pode usar em qualquer smartphone ou tablet, respeitando apenas o número de acessos simultâneos do seu plano.";
            break;

        case 'COLETAR_NOME':
            sessao.dados.nome = message;
            resposta = `Prazer, ${message}! 🐨\n\nQual dispositivo você escolheu na nossa Central?\n\n1. Smart TV\n2. TV Box / Fire Stick\n3. Celular / Tablet\n4. Outros\n\n#️⃣ Voltar`;
            sessao.estado = 'COLETAR_APARELHO';
            break;

        case 'COLETAR_APARELHO':
            const aparelhos = { '1': 'SmartTV', '2': 'TVBox', '3': 'Mobile', '4': 'Outros' };
            if (aparelhos[msg]) {
                sessao.dados.aparelho = aparelhos[msg];
                resposta = "✅ *Solicitação de Acesso Cortesia enviada!*\n\nComo você já instalou o app, um atendente enviará seus dados de acesso em instantes. Aguarde um momento por favor.";
                console.log(`[PANDDA] CORTESIA: ${sessao.dados.nome} | ${sessao.dados.aparelho} | Tel: ${sender}`);
                sessao.estado = 'AGUARDANDO';
            }
            break;

        case 'AGUARDANDO': return res.status(200).send();
    }

    const textoFinal = humanizar(resposta);
    const delay = Math.floor(Math.random() * 1500) + 1500; // Delay humano de 1.5s a 3s

    setTimeout(() => {
        res.json({ response: textoFinal, method: "NOTIFICATION" });
    }, delay);
});

app.listen(port);