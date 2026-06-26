const Lead = require('../models/Lead');
const { pool } = require('../config/database');

/**
 * Get pipeline data - leads grouped by stage
 */
exports.getPipelineData = async (req, res) => {
    try {
        const stages = ['New', 'Incoming', 'Contacted', 'Qualified', 'Proposal', 'Second Wing', 'Won', 'Lost'];
        
        // Fetch all leads
        const query = 'SELECT * FROM leads ORDER BY updated_at DESC';
        const [leads] = await pool.query(query);
        
        // Group leads by stage in JavaScript for better compatibility
        const stageMap = {};
        stages.forEach(stage => {
            stageMap[stage] = {
                count: 0,
                leads: []
            };
        });

        leads.forEach(lead => {
            const stage = lead.stage;
            if (stageMap[stage]) {
                stageMap[stage].leads.push(lead);
                stageMap[stage].count++;
            } else {
                // If stage is not in our predefined list, maybe it's a legacy stage
                // We can either ignore it or add it to a "General" or existing stage
                // For safety, let's just make sure we handle the 'New Leads' vs 'New' case if it exists
                const normalizedStage = stage === 'New Leads' ? 'New' : stage;
                if (stageMap[normalizedStage]) {
                    stageMap[normalizedStage].leads.push(lead);
                    stageMap[normalizedStage].count++;
                }
            }
        });

        // Convert map to final array structure
        const pipelineData = stages.map(stage => ({
            stage: stage,
            count: stageMap[stage].count,
            leads: stageMap[stage].leads
        }));

        res.json({
            success: true,
            data: pipelineData
        });
    } catch (error) {
        console.error('Error fetching pipeline data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pipeline data',
            error: error.message
        });
    }
};

/**
 * Update lead stage (for drag-and-drop functionality)
 */
exports.updateLeadStage = async (req, res) => {
    try {
        const { id } = req.params;
        const { stage } = req.body;

        const validStages = ['New', 'Incoming', 'Contacted', 'Qualified', 'Proposal', 'Second Wing', 'Won', 'Lost'];
        
        if (!validStages.includes(stage)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid stage value'
            });
        }

        const updated = await Lead.update(id, { stage });

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        // Add timeline entry for stage change
        await Lead.addTimelineEntry(id, {
            event_type: 'stage_changed',
            description: `Stage changed to ${stage}`,
            metadata: { new_stage: stage }
        });

        res.json({
            success: true,
            message: 'Lead stage updated successfully'
        });
    } catch (error) {
        console.error('Error updating lead stage:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update lead stage',
            error: error.message
        });
    }
};

/**
 * Get pipeline statistics
 */
exports.getPipelineStats = async (req, res) => {
    try {
        const query = `
            SELECT 
                stage,
                COUNT(*) as count,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_count,
                SUM(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) THEN 1 ELSE 0 END) as week_count
            FROM leads
            GROUP BY stage
        `;

        const [results] = await pool.query(query);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error fetching pipeline stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pipeline statistics',
            error: error.message
        });
    }
};
