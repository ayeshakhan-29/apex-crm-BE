const axios = require('axios');

/**
 * Service to handle Meta (Facebook & Instagram) Lead Generation API calls
 */
class MetaLeadService {
    constructor() {
        this.token = process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
        this.apiVersion = 'v25.0';
        this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    }

    /**
     * Fetch lead details from Meta Graph API using lead_id
     * @param {string} leadId - The ID of the lead from the webhook
     * @returns {Promise<Object>} The lead details (name, email, phone, etc.)
     */
    async getLeadDetails(leadId) {
        // Simulation mode bypass for testing without Meta Developer Console headaches
        if (typeof leadId === 'string' && leadId.startsWith('mock_')) {
            console.log(`🤖 Simulation Mode: Generating mock details for ${leadId}`);
            if (leadId.includes('fb')) {
                return {
                    lead_id: leadId,
                    created_time: new Date().toISOString(),
                    platform: 'fb',
                    name: 'Abdullah (Facebook Lead)',
                    email: 'abdullah.fb@example.com',
                    phone: '+923012345678'
                };
            } else if (leadId.includes('insta')) {
                return {
                    lead_id: leadId,
                    created_time: new Date().toISOString(),
                    platform: 'ig',
                    name: 'Abdullah (Instagram Lead)',
                    email: 'abdullah.ig@example.com',
                    phone: '+923098765432'
                };
            }
        }

        if (!this.token) {
            throw new Error('Meta Access Token not configured');
        }

        const url = `${this.baseUrl}/${leadId}`;

        try {
            const response = await axios.get(url, {
                params: {
                    access_token: this.token
                }
            });

            console.log(`✅ Meta lead details fetched for ID: ${leadId}`);
            
            // Meta returns field_data as an array of {name, values}
            const fieldData = response.data.field_data || [];
            const leadInfo = {
                lead_id: leadId,
                created_time: response.data.created_time,
                platform: response.data.platform, // 'fb' or 'ig'
            };

            // Parse field data into a flat object
            fieldData.forEach(field => {
                const name = field.name;
                const value = field.values?.[0];
                
                if (name === 'full_name' || name === 'name') leadInfo.name = value;
                if (name === 'email') leadInfo.email = value;
                if (name === 'phone_number' || name === 'phone') leadInfo.phone = value;
                
                // Add any other fields as metadata
                leadInfo[name] = value;
            });

            return leadInfo;
        } catch (error) {
            console.error('❌ Failed to fetch Meta lead details:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get platform name for CRM source
     * @param {string} platform - 'fb' or 'ig'
     * @returns {string} 'Facebook' or 'Instagram'
     */
    getSourceFromPlatform(platform) {
        if (platform === 'ig') return 'Instagram';
        return 'Facebook';
    }
}

module.exports = new MetaLeadService();
