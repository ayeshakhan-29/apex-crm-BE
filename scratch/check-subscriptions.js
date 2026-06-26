const axios = require('axios');
require('dotenv').config();

async function checkAppSub() {
    const appId = '1129579022698967';
    const appSecret = process.env.META_APP_SECRET || '26279c2443ec0fbd774a4c0607fad876';
    const appAccessToken = `${appId}|${appSecret}`;
    
    try {
        console.log('--- Checking App Webhook Configuration ---');
        const res = await axios.get(`https://graph.facebook.com/v22.0/${appId}/subscriptions?access_token=${appAccessToken}`);
        console.log('App Webhook Configuration:', JSON.stringify(res.data.data, null, 2));
    } catch (error) {
        console.error('Error checking app subscriptions:', error.response?.data || error.message);
    }
}
checkAppSub();
