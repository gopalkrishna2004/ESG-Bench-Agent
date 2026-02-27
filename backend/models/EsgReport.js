const mongoose = require('mongoose');

const EsgReportSchema = new mongoose.Schema({
  serial_number:     { type: String },
  company_name:      { type: String },
  sector:            { type: String },
  esg_score:         { type: String },
  environment_score: { type: String },
  social_score:      { type: String },
  governance_score:  { type: String },
  latest_report_date:{ type: String },
  coverage:          { type: String },
  scraped_at:        { type: Date },
}, { collection: 'esg_reports', strict: false });

module.exports = mongoose.model('EsgReport', EsgReportSchema);
