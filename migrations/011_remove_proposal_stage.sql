UPDATE leads SET stage = 'Second Wing' WHERE stage = 'Proposal';

ALTER TABLE leads MODIFY COLUMN stage ENUM('New', 'Incoming', 'Contacted', 'Qualified', 'Second Wing', 'Won', 'Lost') DEFAULT 'New';