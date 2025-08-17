// 🚀 Arquivo específico para Vercel
// Este arquivo é necessário para o Vercel reconhecer as rotas

const express = require('express');
const path = require('path');

// Importa o app principal
const app = require('../src/web.js');

// Configuração específica para Vercel
app.use(express.static(path.join(__dirname, '../public')));

// Middleware para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Exporta o app para o Vercel
module.exports = app;
