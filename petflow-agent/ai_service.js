require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load Petro's system prompt from the markdown file at runtime
const SYSTEM_PROMPT = fs.readFileSync(
    path.join(__dirname, 'pet_spa_prompt.md'),
    'utf-8'
);

// Inject spa name, booking link, and today's date into the PETRO prompt at runtime
function buildSystemPrompt() {
    const bookingLink = process.env.BOOKING_LINK || '[BOOKING LINK NOT SET — please add BOOKING_LINK to .env]';
    const spaName     = process.env.SPA_NAME     || 'PetFlow Spa';
    const today       = new Date().toDateString();

    return SYSTEM_PROMPT
        .replace(/\[BOOKING_LINK\]/g, bookingLink)
        .replace(/\[SPA_NAME\]/g,     spaName)
        + `\n\n[TODAY'S DATE: ${today}]`;
}

// In-memory session store: { phone: [{ role, content }, ...] }
// Each phone number gets its own conversation history
const sessions = {};

/**
 * Process an incoming WhatsApp message through Luna (AI).
 * @param {string} userInput - The incoming text message
 * @param {string} phone     - The sender's phone (clean, no @s.whatsapp.net)
 * @returns {Promise<string>} - Luna's reply text
 */
async function processMessage(userInput, phone) {
    try {
        if (!sessions[phone]) {
            console.log(`[SESSION] New session started for ${phone}`);
            sessions[phone] = [
                { role: 'system', content: buildSystemPrompt() }
            ];
        } else {
            // Always refresh the system prompt in case env changed
            sessions[phone][0] = { role: 'system', content: buildSystemPrompt() };
        }

        const chatContext = sessions[phone];
        chatContext.push({ role: 'user', content: userInput });

        // Keep context window manageable: keep system prompt + last 20 messages
        if (chatContext.length > 22) {
            const systemMsg = chatContext[0];
            const recent = chatContext.slice(-20);
            sessions[phone] = [systemMsg, ...recent];
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: chatContext,
            temperature: 0.65,
            max_tokens: 600
        });

        const replyText = response.choices[0].message.content?.trim();
        chatContext.push({ role: 'assistant', content: replyText });

        console.log(`[Petro → ${phone}]: ${replyText?.substring(0, 80)}...`);
        return replyText || "Sorry, I had a little moment there! Could you say that again? 🐾 — Petro";

    } catch (error) {
        console.error('[OpenAI Error]:', error.message);
        if (error.status === 429) {
            return "I'm a little overwhelmed right now — please try again in a moment! 🙏";
        }
        return "Sorry, I ran into a little issue. Please try again shortly! 🐾";
    }
}

/**
 * Clear a user's conversation session (e.g. for testing or manual reset).
 */
function clearSession(phone) {
    delete sessions[phone];
    console.log(`[SESSION] Cleared for ${phone}`);
}

/**
 * Get all active session phones (for health check / debugging).
 */
function getActiveSessions() {
    return Object.keys(sessions);
}

/**
 * Get session message count for a phone (for debugging).
 */
function getSessionInfo(phone) {
    if (!sessions[phone]) return null;
    return {
        phone,
        messageCount: sessions[phone].length,
        preview: sessions[phone].slice(-3)
    };
}

module.exports = { processMessage, clearSession, getActiveSessions, getSessionInfo };
