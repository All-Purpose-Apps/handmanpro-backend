import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const StatusUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      'active',
      'archived',
      'appointment scheduled',
      'canceled',
      'completed',
      'created by user',
      'follow-up',
      'imported from Google',
      'inactive',
      'inquiry received',
      'invoice approved',
      'invoice created',
      'invoice deleted',
      'invoice paid',
      'invoice signed and paid',
      'invoice signed',
      'invoice sent',
      'invoice rejected',
      'invoice updated',
      'proposal accepted',
      'proposal created',
      'proposal deleted',
      'proposal rejected',
      'proposal sent',
      'proposal updated',
      'proposal signed',
      'task assigned',
      'work in progress',
      'review requested',
    ],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const clientSchema = new Schema({
  givenName: {
    type: String,
    required: false,
  },
  familyName: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  resourceName: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String, // No uniqueness and can be an empty string
  },
  phone: {
    type: String, // No uniqueness and can be an empty string
  },
  address: {
    type: String,
    default: '',
  },
  invoices: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
  },
  proposals: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Proposal' }],
  },
  notes: {
    type: Array,
  },
  documents: {
    type: Array,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  appointments: {
    type: Array,
  },
  tasks: {
    type: Array,
  },
  tags: {
    type: Array,
  },
  statusHistory: {
    type: [StatusUpdateSchema],
    default: [
      {
        status: 'imported from Google',
        date: Date.now(),
      },
    ],
  },
  source: {
    type: String,
    default: 'google',
  },
});

// Custom validation to require either email or phone, but allow empty strings

clientSchema.path('givenName').validate(function () {
  return this.givenName || this.familyName;
}, 'Either firstName or lastName must be provided.');

clientSchema.path('familyName').validate(function () {
  return this.givenName || this.lastName;
}, 'Either firstName or lastName must be provided.');

export default clientSchema;
