const axios = require('axios');

const BACKEND_URL = 'http://localhost:5001/api/webhook/whatsapp';

async function simulateLeads() {
    console.log('🚀 Starting Meta Integration Simulator...\n');

    // 1. Simulate Facebook Lead Ad
    console.log('📨 [1/3] Simulating Facebook Lead Gen Webhook...');
    try {
        const fbPayload = {
            object: 'page',
            entry: [{
                id: 'page_123',
                time: Math.floor(Date.now() / 1000),
                changes: [{
                    field: 'leadgen',
                    value: {
                        leadgen_id: 'mock_fb_lead_888',
                        form_id: 'form_fb_abc',
                        page_id: 'page_123',
                        created_time: Math.floor(Date.now() / 1000)
                    }
                }]
            }]
        };
        const res = await axios.post(BACKEND_URL, fbPayload);
        console.log('✅ Facebook Webhook accepted by server:', res.data);
    } catch (err) {
        console.error('❌ Facebook Simulation failed:', err.response?.data || err.message);
    }

    console.log('\n-----------------------------------------\n');

    // 2. Simulate Instagram Lead Ad
    console.log('📨 [2/3] Simulating Instagram Lead Gen Webhook...');
    try {
        const instaPayload = {
            object: 'page',
            entry: [{
                id: 'insta_page_456',
                time: Math.floor(Date.now() / 1000),
                changes: [{
                    field: 'leadgen',
                    value: {
                        leadgen_id: 'mock_insta_lead_999',
                        form_id: 'form_insta_xyz',
                        page_id: 'insta_page_456',
                        created_time: Math.floor(Date.now() / 1000)
                    }
                }]
            }]
        };
        const res = await axios.post(BACKEND_URL, instaPayload);
        console.log('✅ Instagram Webhook accepted by server:', res.data);
    } catch (err) {
        console.error('❌ Instagram Simulation failed:', err.response?.data || err.message);
    }

    console.log('\n-----------------------------------------\n');

    // 3. Simulate WhatsApp Message Lead
    console.log('📨 [3/3] Simulating WhatsApp Message Webhook...');
    try {
        const waPayload = {
            object: 'whatsapp_business_account',
            entry: [{
                id: 'wa_acc_789',
                changes: [{
                    field: 'messages',
                    value: {
                        messaging_product: 'whatsapp',
                        metadata: {
                            display_phone_number: '16505553333',
                            phone_number_id: '123456789'
                        },
                        contacts: [{
                            profile: { name: 'Simulated WhatsApp Lead' },
                            wa_id: '923001234567'
                        }],
                        messages: [{
                            from: '923001234567',
                            id: 'message_id_9999',
                            timestamp: Math.floor(Date.now() / 1000).toString(),
                            text: { body: 'Hello! I am interested in your CRM services.' },
                            type: 'text'
                        }]
                    }
                }]
            }]
        };
        const res = await axios.post(BACKEND_URL, waPayload);
        console.log('✅ WhatsApp Webhook accepted by server:', res.data);
    } catch (err) {
        console.error('❌ WhatsApp Simulation failed:', err.response?.data || err.message);
    }

    console.log('\n🎉 Simulation completed successfully!');
}

simulateLeads();
