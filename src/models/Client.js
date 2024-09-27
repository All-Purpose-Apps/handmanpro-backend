import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const clientSchema = new Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zip: {
    type: String,
    required: true,
  },
  invoices: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
  },
  proposals: {
    type: Array,
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
  appointments: {
    type: Array,
  },
  tasks: {
    type: Array,
  },
  tags: {
    type: Array,
  },
  status: {
    type: String,
  },
  source: {
    type: String,
  },
});

const Client = mongoose.model('Client', clientSchema);

export default Client;
