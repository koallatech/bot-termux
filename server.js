const express = require('express');
const app = express();
const port = 3000;

// 1. LER O CORPO COMO TEXTO PURO PRIMEIRO (Para evitar o crash de JSON)
app.use(express.text({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
    console.log('--- NOVA REQUISIÇÃO RECEBIDA ---');
    console.log('Conteúdo Bruto (Raw):', req.body);

    let data;
    try {
        // Tenta transformar o texto em objeto JSON
        data = JSON.parse(req.body);
    } catch (e) {
        console.error('❌ ERRO CRÍTICO DE JSON:', e.message);
        console.log('DICA: O MacroDroid enviou algo que não é um JSON válido.');
        return res.status(200).send(); // Responde 200 para o MacroDroid não repetir
    }

    const { message, sender } = data;
    console.log(`✅ JSON VÁLIDO: Mensagem: "${message}" | Remetente: "${sender}"`);

    // ... (Aqui continua o resto da sua lógica de estados que já fizemos)
    res.json({ response: "Recebido!", method: "NOTIFICATION" });
});

app.listen(port, () => console.log(`🚀 Servidor de Diagnóstico rodando na porta ${port}`));