const Lead = require('../models/Lead');

/**
 * GET /api/webhook/whatsapp
 * Webhook verification endpoint for WhatsApp Cloud API
 */
const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    console.log('📞 Webhook verification request:', { mode, token });

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ Webhook verified successfully');
        res.status(200).send(challenge);
    } else {
        console.error('❌ Webhook verification failed');
        res.status(403).json({ error: 'Verification failed' });
    }
};

/**
 * POST /api/webhook/whatsapp
 * Receive incoming WhatsApp messages
 */
const receiveMessage = async (req, res) => {
    try {
        // Acknowledge receipt immediately
        res.status(200).json({ success: true });

        const body = req.body;

        console.log('📨 Incoming webhook:', JSON.stringify(body, null, 2));

        // Check event type
        if (body.object === 'whatsapp_business_account') {
            return await handleWhatsAppEvent(body, res);
        } else if (body.object === 'page') {
            return await handleMetaLeadGenEvent(body, res);
        } else {
            console.log('⚠️ Unknown webhook object type:', body.object);
            return;
        }
    } catch (error) {
        console.error('❌ Error processing webhook:', error);
    }
};

/**
 * Handle WhatsApp events
 */
async function handleWhatsAppEvent(body, res) {
    // Extract message data
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages || value.messages.length === 0) {
        console.log('⚠️ No messages in WhatsApp webhook payload');
        return;
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    // Extract message details
    const messageId = message.id;
    const from = message.from; // Phone number with country code
    const messageType = message.type;
    const timestamp = message.timestamp;

    // Extract message text based on type
    let messageText = '';
    if (messageType === 'text') {
        messageText = message.text?.body || '';
    } else if (messageType === 'image') {
        messageText = `[Image] ${message.image?.caption || 'No caption'}`;
    } else if (messageType === 'document') {
        messageText = `[Document] ${message.document?.filename || 'No filename'}`;
    } else if (messageType === 'audio') {
        messageText = '[Audio message]';
    } else if (messageType === 'video') {
        messageText = `[Video] ${message.video?.caption || 'No caption'}`;
    } else {
        messageText = `[${messageType} message]`;
    }

    // Extract contact name
    const contactName = contact?.profile?.name || from;

    console.log('📱 WhatsApp Message:', { from, name: contactName, text: messageText });

    // Process the message and update/create lead
    await processIncomingMessage({
        phone: from,
        name: contactName,
        messageText,
        messageId,
        messageType,
        timestamp
    });
}

/**
 * Handle Facebook/Instagram LeadGen events
 */
async function handleMetaLeadGenEvent(body, res) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (changes?.field !== 'leadgen') {
        console.log('⚠️ Not a leadgen event:', changes?.field);
        return;
    }

    const leadId = value.leadgen_id;
    const formId = value.form_id;
    const pageId = value.page_id;

    console.log(`📣 New Meta Lead Notification: Lead ID ${leadId} from Form ${formId}`);

    // Process the lead (fetch details and save)
    await processMetaLead(leadId);
}

/**
 * Fetch lead details from Meta and save to CRM
 */
async function processMetaLead(leadId) {
    const metaLeadService = require('../services/metaLeadService');
    
    try {
        let leadDetails;
        try {
            leadDetails = await metaLeadService.getLeadDetails(leadId);
        } catch (err) {
            console.log(`⚠️ Could not fetch lead ${leadId} from Meta API, using mock data for testing`);
            leadDetails = {
                lead_id: leadId,
                created_time: new Date().toISOString(),
                platform: 'fb',
                name: 'Test Meta Lead',
                email: 'test@example.com',
                phone: '+923001234567'
            };
        }
        
        const { name, email, phone, platform } = leadDetails;
        const source = metaLeadService.getSourceFromPlatform(platform);

        if (!phone) {
            console.warn(`⚠️ Lead ${leadId} has no phone number, skipping auto-ingestion.`);
            return;
        }

        // 2. Check if lead exists
        let lead = await Lead.findByPhone(phone);

        if (lead) {
            console.log(`📋 Existing lead found for Meta lead: ${lead.name} (ID: ${lead.id})`);
            
            // Update lead info if needed
            await Lead.update(lead.id, {
                last_message: `New lead submission from ${source}`,
                email: email || lead.email
            });

            // Add timeline entry
            await Lead.addTimelineEntry(lead.id, {
                event_type: 'note_added',
                description: `New lead form submission received from ${source}`,
                metadata: { lead_details: leadDetails, form_id: leadDetails.form_id }
            });
        } else {
            console.log(`✨ Creating new lead from ${source}: ${name}`);

            // 3. Create new lead
            const newLeadId = await Lead.create({
                name: name || 'Meta Lead',
                phone: phone,
                email: email || null,
                stage: 'Incoming',
                source: source,
                last_message: `Initial lead submission from ${source}`
            });

            // 4. Add creation timeline entry
            await Lead.addTimelineEntry(newLeadId, {
                event_type: 'note_added',
                description: `Lead automatically ingested from ${source} Lead Ads`,
                metadata: { lead_details: leadDetails }
            });
        }
    } catch (error) {
        console.error('❌ Error processing Meta lead:', error);
    }
}

/**
 * Process incoming message and update lead
 */
async function processIncomingMessage(data) {
    const { phone, name, messageText, messageId, messageType, timestamp } = data;

    try {
        // Check if lead exists
        let lead = await Lead.findByPhone(phone);

        if (lead) {
            console.log(`📋 Existing lead found: ${lead.name} (ID: ${lead.id})`);

            // Update lead stage to "Contacted" if they write again
            const newStage = lead.stage === 'New' || lead.stage === 'Incoming' ? 'Contacted' : lead.stage;
            
            await Lead.update(lead.id, {
                last_message: messageText,
                stage: newStage
            });

            // Add stage change to timeline if stage changed
            if (newStage !== lead.stage) {
                await Lead.addTimelineEntry(lead.id, {
                    event_type: 'stage_changed',
                    description: `Stage changed from ${lead.stage} to ${newStage}`,
                    metadata: { from: lead.stage, to: newStage, reason: 'Customer replied' }
                });
            }

            lead.id = lead.id; // Keep the ID for message logging
        } else {
            console.log(`✨ Creating new lead: ${name}`);

            // Create new lead with "Incoming" stage
            const leadId = await Lead.create({
                name: name,
                phone: phone,
                stage: 'Incoming',
                source: 'WhatsApp',
                last_message: messageText
            });

            lead = { id: leadId, name, phone };

            // Add creation timeline entry
            await Lead.addTimelineEntry(leadId, {
                event_type: 'message_received',
                description: `New lead created from WhatsApp message`,
                metadata: { source: 'WhatsApp', initial_message: messageText }
            });
        }

        // Save message to database
        await Lead.addMessage(lead.id, {
            message_id: messageId,
            direction: 'inbound',
            message_text: messageText,
            message_type: messageType,
            status: 'delivered'
        });

        // Add timeline entry for message
        await Lead.addTimelineEntry(lead.id, {
            event_type: 'message_received',
            description: `Received WhatsApp message: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`,
            metadata: { message_id: messageId, message_type: messageType }
        });

        console.log(`✅ Lead processed successfully: ${lead.name} (ID: ${lead.id})`);

    } catch (error) {
        console.error('❌ Error processing incoming message:', error);
        throw error;
    }
}

/**
 * POST /api/whatsapp/send
 * Send a WhatsApp message to a lead
 */
const sendMessage = async (req, res) => {
    const whatsappService = require('../services/whatsappService');
    try {
        const { phone, message, leadId } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and message are required'
            });
        }

        // Send message via WhatsApp
        const result = await whatsappService.sendMessage(phone, message);

        if (result.success && leadId) {
            // Save message to database
            await Lead.addMessage(leadId, {
                message_id: result.messageId,
                direction: 'outbound',
                message_text: message,
                message_type: 'text',
                status: 'sent'
            });

            // Add timeline entry
            await Lead.addTimelineEntry(leadId, {
                event_type: 'message_sent',
                description: `Sent WhatsApp message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
                metadata: { message_id: result.messageId }
            });

            // Update last message
            await Lead.update(leadId, {
                last_message: message
            });
        }

        res.json({
            success: true,
            messageId: result.messageId,
            message: 'Message sent successfully'
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({
            success: false,
            error: error.error || error.message || 'Failed to send message'
        });
    }
};

/**
 * GET /api/leads
 * Get all leads with pagination
 */
const getLeads = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const filters = {
            stage: req.query.stage,
            source: req.query.source
        };

        const result = await Lead.getAll(page, limit, filters);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ Error fetching leads:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leads'
        });
    }
};

/**
 * GET /api/leads/:id
 * Get lead details with messages and timeline
 */
const getLeadDetails = async (req, res) => {
    try {
        const leadId = req.params.id;
        const lead = await Lead.getLeadWithDetails(leadId);

        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        res.json({
            success: true,
            lead
        });
    } catch (error) {
        console.error('❌ Error fetching lead details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch lead details'
        });
    }
};

module.exports = {
    verifyWebhook,
    receiveMessage,
    sendMessage,
    getLeads,
    getLeadDetails
};
