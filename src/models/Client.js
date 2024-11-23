import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const StatusUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      'active',
      'created by user',
      'inquiry received',
      'imported from Google',
      'inactive',
      'work in progress',
      'completed',
      'archived',
      'invoice sent',
      'proposal sent',
      'invoice paid',
      'proposal accepted',
      'proposal rejected',
      'appointment scheduled',
      'task assigned',
      'invoice paid and signed',
      'canceled',
      'follow-up',
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
  firstName: {
    type: String,
    required: false,
  },
  lastName: {
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

clientSchema.path('firstName').validate(function () {
  return this.firstName || this.lastName;
}, 'Either firstName or lastName must be provided.');

clientSchema.path('lastName').validate(function () {
  return this.firstName || this.lastName;
}, 'Either firstName or lastName must be provided.');

const Client = mongoose.model('Client', clientSchema);

export default Client;
