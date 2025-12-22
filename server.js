const express = require('express');
const app = express();
app.use(express.json());

// Simula um banco de dados na memória RAM
const sessoes = {}; 

app.post('/bot', (req, res) => {
    const { message, sender } = req.body;
    const msg = message.trim().toLowerCase();
    
    // Verifica se o usuário já tem um estado, senão começa no 'INICIO'
    if (!sessoes[sender]) {
        sessoes[sender] = 'INICIO';
    }

    let resposta = "";
    let acao = "NOTIFICATION"; // Padrão: responder por notificação

    // Lógica do Menu
    switch (sessoes[sender]) {
        case 'INICIO':
            resposta = "Olá! Bem-vindo ao atendimento Koalla TV. 🐨\n\nComo posso ajudar?\n1. Consultar Vencimento\n2. Problemas Técnicos\n3. Falar com Humano";
            sessoes[sender] = 'MENU_PRINCIPAL';
            break;

        case 'MENU_PRINCIPAL':
            if (msg === '1') {
                resposta = "Sua conta (Simulada) vence em: 15/01/2026. ✅\n\nDigite 0 para voltar.";
                sessoes[sender] = 'VOLTAR';
            } else if (msg === '2') {
                resposta = "Para problemas técnicos, tente reiniciar seu roteador e o app. Resolvemos? \n\nA) Sim\nB) Não, quero falar com suporte";
                sessoes[sender] = 'SUPORTE_TECNICO';
            } else if (msg === '3') {
                resposta = "Entendido! Um atendente já foi notificado e falará com você em breve. 🎧";
                sessoes[sender] = 'INICIO'; // Reseta após encaminhar
            } else {
                resposta = "Opção inválida. Digite 1, 2 ou 3.";
            }
            break;

        case 'SUPORTE_TECNICO':
            if (msg === 'a') {
                resposta = "Que ótimo! A Koalla TV agradece. 🐨";
                sessoes[sender] = 'INICIO';
            } else {
                resposta = "Certo, aguarde um momento que o técnico vai te chamar. 🛠️";
                sessoes[sender] = 'INICIO';
            }
            break;

        case 'VOLTAR':
            if (msg === '0') {
                resposta = "Voltando... \n\n1. Consultar Vencimento\n2. Problemas Técnicos\n3. Falar com Humano";
                sessoes[sender] = 'MENU_PRINCIPAL';
            }
            break;

        default:
            sessoes[sender] = 'INICIO';
            resposta = "Opa, me perdi aqui. Vamos recomeçar? Digite 'Oi'.";
    }

    console.log(`[${sender}] enviou: ${msg} | Estado: ${sessoes[sender]}`);
    
    // Retorna o JSON para o MacroDroid
    res.json({ 
        response: resposta,
        method: acao 
    });
});

app.listen(3000, '0.0.0.0', () => console.log("🚀 Menu Local Koalla Ativo na Porta 3000"));