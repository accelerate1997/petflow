require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { processMessage, clearSession, getActiveSessions, getSessionInfo } = require('./ai_service');
const { sendMessage } = require('./evolution');

const app  = express();
app.use(cors());
app.use(express.json());

const PORT          = process.env.PORT          || 3002;
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'PetFlow_Spa';
const SPA_NAME      = process.env.SPA_NAME      || 'PetFlow Spa';

// ─── De-duplication Cache ─────────────────────────────────────────────────────
// Prevents the same message from being processed twice (Evolution API retries)
const processedMessages = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isDuplicate(id) {
    const now = Date.now();
    if (processedMessages.has(id)) return true;
    processedMessages.set(id, now);
    // Auto-clean old entries when cache grows large
    if (processedMessages.size > 1000) {
        for (const [key, ts] of processedMessages.entries()) {
            if (now - ts > CACHE_TTL) processedMessages.delete(key);
        }
    }
    return false;
}

// ─── Recent Webhook Debug Log ─────────────────────────────────────────────────
const recentWebhooks = [];

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status:         'PETRO_ALIVE',
        agent:          `Petro | ${SPA_NAME} WhatsApp AI`,
        instance:       INSTANCE_NAME,
        activeSessions: getActiveSessions().length,
        sessions:       getActiveSessions(),
        recentWebhooks,
        uptime:         process.uptime().toFixed(0) + 's'
    });
});

// ─── Webhook ──────────────────────────────────────────────────────────────────
// Evolution API posts to this endpoint every time a WhatsApp message arrives
app.post('/webhook', async (req, res) => {
    try {
        const { event, data } = req.body;
        console.log(`\n🔥 WEBHOOK: ${event}`);

        // Only process incoming message events
        if (event !== 'messages.upsert') {
            return res.sendStatus(200);
        }

        const msg = Array.isArray(data) ? data[0] : data;

        // Anti-loop: skip messages older than 60s but newer than 1 hour
        // (avoids re-processing old messages Evolution sometimes resends on reconnect)
        const rawTs = msg?.messageTimestamp;
        if (rawTs) {
            const ageSeconds = Math.floor(Date.now() / 1000) - rawTs;
            if (ageSeconds > 60 && ageSeconds < 3600) {
                console.log(`[IGNORE] Old message (${ageSeconds}s old). Skipping.`);
                return res.sendStatus(200);
            }
        }

        // Acknowledge immediately to prevent Evolution API retries
        res.sendStatus(200);

        const key       = msg?.key;
        const msgId     = key?.id;
        const remoteJid = key?.remoteJid;
        const fromMe    = key?.fromMe;
        const message   = msg?.message;

        // De-duplicate
        if (msgId && isDuplicate(msgId)) {
            console.log(`[IGNORE] Duplicate msg: ${msgId}`);
            return;
        }

        // Skip our own outbound messages
        if (!message || !remoteJid || fromMe) return;

        // Skip WhatsApp group messages
        if (remoteJid.includes('@g.us')) {
            console.log('[IGNORE] Group message — skipping.');
            return;
        }

        // Extract text from various message types
        const text =
            message.conversation ||
            message.extendedTextMessage?.text ||
            message.imageMessage?.caption ||
            message.videoMessage?.caption;

        if (!text) {
            console.log('[IGNORE] No text content in message.');
            return;
        }

        const phone = remoteJid.split('@')[0];
        console.log(`\n📨 From ${phone}: ${text}`);

        // Add to debug log (keep last 10)
        recentWebhooks.unshift({
            time:  new Date().toISOString(),
            phone,
            text:  text.substring(0, 60)
        });
        if (recentWebhooks.length > 10) recentWebhooks.pop();

        // Human-like reading delay (2–4 seconds)
        // Simulates Luna reading the notification before replying
        const readDelay = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;
        await new Promise(resolve => setTimeout(resolve, readDelay));

        // Get AI response and send it back
        const reply = await processMessage(text, phone);
        console.log(`💬 Luna → ${phone}: ${reply.substring(0, 80)}...`);
        await sendMessage(remoteJid, reply, INSTANCE_NAME);

    } catch (error) {
        console.error('Webhook error:', error);
        if (!res.headersSent) res.sendStatus(500);
    }
});

// ─── Debug / Management Endpoints ────────────────────────────────────────────

// Clear a session for testing: POST /api/session/clear { "phone": "911234567890" }
app.post('/api/session/clear', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    clearSession(phone);
    res.json({ success: true, message: `Session cleared for ${phone}` });
});

// View session info: GET /api/session/info?phone=911234567890
app.get('/api/session/info', (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone query param required' });
    const info = getSessionInfo(phone);
    if (!info) return res.json({ found: false, message: 'No active session for this number' });
    res.json({ found: true, ...info });
});

// List all active sessions
app.get('/api/sessions', (req, res) => {
    res.json({ activeSessions: getActiveSessions() });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('\n🌟🌟🌟 PETRO STARTUP 🌟🌟🌟');
    console.log(`🐾 Petro | ${SPA_NAME} WhatsApp AI Agent running on port ${PORT}`);
    console.log(`📱 Instance: ${INSTANCE_NAME}`);
    console.log(`🔗 Webhook:  POST http://localhost:${PORT}/webhook`);
    console.log(`❤️  Health:   GET  http://localhost:${PORT}/health\n`);
    console.log('▶️  Ready to handle WhatsApp messages!\n');
});
