import clientSchema from '../models/Client.js';
import invoiceSchema from '../models/Invoice.js';
import proposalSchema from '../models/Proposal.js';

export const getModels = (db) => ({
  Client: db.models.Client || db.model('Client', clientSchema),
  Invoice: db.models.Invoice || db.model('Invoice', invoiceSchema),
  Proposal: db.models.Proposal || db.model('Proposal', proposalSchema),
});
