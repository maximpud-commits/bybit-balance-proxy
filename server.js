// server.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 10000;

// === Настройки Bybit ===
const API_KEY = 'kdvapQWoGxJW8ILWCy'; // ← Замени, если нужно (но у тебя уже есть)
const API_SECRET = 'vHd41ahtmvyXUzi1PyVKFXxpZ2LZrShPI969'; // ← ОБЯЗАТЕЛЬНО замени на свой секрет!

// Функция для генерации HMAC-SHA256 подписи
function generateSignature(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// Эндпоинт: /balance — получение баланса
app.get('/balance', async (req, res) => {
  const timestamp = Date.now().toString(); // Должно быть строкой
  const recvWindow = '10000';
  const endpoint = '/v5/account/wallet-balance';
  const params = 'accountType=UNIFIED';

  // ✅ Формируем строку для подписи ТОЧНО по документации Bybit
  const queryString = `?${params}`;
  const message = `${timestamp}${API_KEY}${recvWindow}${endpoint}${queryString}`;

  console.log('🔧 [DEBUG] Message for signature:', message); // Лог для проверки

  const signature = generateSignature(API_SECRET, message);

  const url = `https://api.bybit.com${endpoint}${queryString}`;

  console.log('📤 [DEBUG] Sending request to:', url);
  console.log('🔑 [DEBUG] Using signature:', signature);

  try {
    const response = await axios.get(url, {
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ [SUCCESS] Response from Bybit:', response.data.retMsg);

    const wallet = response.data.result?.list?.[0];
    const usdt = wallet?.coin?.find(c => c.coin === 'USDT');

    res.json({
      success: true,
      total: usdt ? parseFloat(usdt.walletBalance) : 0,
      available: usdt ? parseFloat(usdt.availableToWithdraw) : 0,
      raw: response.data.retMsg,
    });
  } catch (error) {
    console.error('❌ [ERROR] Bybit API error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.retMsg || error.message,
      raw: error.response?.data || null,
    });
  }
});

// Главная страница — проверка, что сервер жив
app.get('/', (req, res) => {
  res.send('Bybit Proxy Server работает! Доступ: <a href="/balance">/balance</a>');
});

// Запуск сервера
app.listen(port, () => {
  console.log(`✅ Сервер запущен на порту ${port}`);
  console.log(`🌐 Открой: https://your-service-name.onrender.com/balance`);
});


