import clientSchema from '../models/Client.js';
import invoiceSchema from '../models/Invoice.js';
import proposalSchema from '../models/Proposal.js';
import tokenSchema from '../models/Token.js';
import notificationSchema from '../models/Notification.js';
import materialsSchema from '../models/Materials.js';
import materialsListSchema from '../models/MaterialsList.js';

const getModels = (db) => ({
  Client: db.models.Client || db.model('Client', clientSchema),
  Invoice: db.models.Invoice || db.model('Invoice', invoiceSchema),
  Proposal: db.models.Proposal || db.model('Proposal', proposalSchema),
  Token: db.models.Token || db.model('Token', tokenSchema),
  Notification: db.models.Notification || db.model('Notification', notificationSchema),
  Materials: db.models.Materials || db.model('Materials', materialsSchema),
  MaterialsList: db.models.MaterialsList || db.model('MaterialsList', materialsListSchema),
});

export { getModels };
