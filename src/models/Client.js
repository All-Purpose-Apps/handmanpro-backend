import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const clientSchema = new Schema({
  firstName: {
    type: String,
    required: false,
  },
  lastName: {
    type: String,
    required: false,
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
  status: {
    type: String,
    default: 'imported from Google',
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
