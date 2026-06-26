-- Migration: 010_update_leads_source_enum.sql
-- Description: Update leads table source ENUM to support Facebook and Instagram lead ads
-- Date: 2026-05-19

ALTER TABLE leads 
MODIFY COLUMN source ENUM('WhatsApp', 'Facebook', 'Instagram', 'Website', 'Referral', 'Cold Call', 'Email', 'Social Media', 'Other') 
DEFAULT 'WhatsApp';
