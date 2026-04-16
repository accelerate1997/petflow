/**
 * set-webhook.js — PetFlow Spa WhatsApp Agent
 *
 * Run this ONCE after deployment to register the agent's webhook URL
 * with your Evolution API instance.
 *
 * Usage: node set-webhook.js
 */

require('dotenv').config();

async function setWebhook() {
    const evoUrlSource  = process.env.EVOLUTION_API_URL || '';
    const evoUrl        = evoUrlSource.endsWith('/') ? evoUrlSource.slice(0, -1) : evoUrlSource;
    const evoKey        = process.env.EVOLUTION_API_KEY;
    const instanceName  = process.env.INSTANCE_NAME    || 'PetFlow_Spa';
    const agentUrl      = process.env.AGENT_PUBLIC_URL;

    if (!evoUrl || !evoKey || !agentUrl) {
        console.error('\n❌ Missing required env vars:');
        if (!evoUrl)   console.error('   → EVOLUTION_API_URL');
        if (!evoKey)   console.error('   → EVOLUTION_API_KEY');
        if (!agentUrl) console.error('   → AGENT_PUBLIC_URL');
        console.error('\nPlease fill in your .env file and try again.\n');
        process.exit(1);
    }

    const webhookUrl = `${agentUrl}/webhook`;
    console.log(`\n🔧 Registering webhook for instance: ${instanceName}`);
    console.log(`📡 Webhook URL: ${webhookUrl}`);

    try {
        const response = await fetch(`${evoUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evoKey
            },
            body: JSON.stringify({
                url:               webhookUrl,
                webhook_by_events: false,
                webhook_base64:    false,
                events:            ['messages.upsert']
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('\n✅ Webhook registered successfully!');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.error('\n❌ Failed to register webhook:');
            console.error(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('\n❌ Error connecting to Evolution API:', error.message);
        console.error('Make sure EVOLUTION_API_URL is correct and the server is running.\n');
    }
}

setWebhook();
