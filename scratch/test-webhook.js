const axios = require('axios');

async function testWebhook() {
    const payload = {
        "object": "page",
        "entry": [
            {
                "id": "1234567890",
                "time": Math.floor(Date.now() / 1000),
                "changes": [
                    {
                        "value": {
                            "form_id": "987654321",
                            "leadgen_id": "dummy_lead_id_123",
                            "created_time": Math.floor(Date.now() / 1000),
                            "page_id": "1234567890"
                        },
                        "field": "leadgen"
                    }
                ]
            }
        ]
    };

    try {
        console.log('🚀 Sending mock leadgen webhook to local server...');
        const response = await axios.post('http://localhost:5001/api/webhook/whatsapp', payload);
        console.log('✅ Server responded with:', response.status, response.data);
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testWebhook();
