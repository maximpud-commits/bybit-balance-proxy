// server.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// === Настройки Bybit (заполни их!) ===
const API_KEY = 'kdvapQWoGxJW8ILWCy';           // ← Вставь свой
const API_SECRET = 'vHd41ahtmvyXUzi1PyVKFXxpZ2LZrShPI969';     // ← Вставь свой

// === Генерация подписи ===
function generateSignature(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// === Эндпоинт для Google Таблицы ===
app.get('/balance', async (req, res) => {
  const timestamp = Date.now();
  const recvWindow = '10000';
  const endpoint = '/v5/account/wallet-balance';
  const params = 'accountType=UNIFIED';
  const url = `https://api.bybit.com${endpoint}?${params}`;

  const message = `${timestamp}${API_KEY}${recvWindow}${endpoint}?${params}`;
  const signature = generateSignature(API_SECRET, message);

  try {
    const response = await axios.get(url, {
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
      },
    });

    // Отправляем только нужные данные
    const wallet = response.data.result?.list?.[0];
    const usdt = wallet?.coin?.find(c => c.coin === 'USDT');

    res.json({
      success: true,
      total: usdt ? parseFloat(usdt.walletBalance) : 0,
      available: usdt ? parseFloat(usdt.availableToWithdraw) : 0,
      raw: response.data.retMsg,
    });
  } catch (error) {
    console.error('Ошибка Bybit:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.retMsg || error.message,
    });
  }
});

// Проверка, что сервер жив
app.get('/', (req, res) => {
  res.send('Bybit Proxy Server работает! Доступ: /balance');
});

app.listen(port, () => {
  console.log(`✅ Сервер запущен на порту ${port}`);
});