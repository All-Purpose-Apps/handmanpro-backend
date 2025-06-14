import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const invoiceSchema = new Schema({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
  },
  invoiceDate: {
    type: Date,
    required: true,
  },
  items: [
    {
      description: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  subTotal1: {
    type: Number,
    required: true,
  },
  extraWorkMaterials: {
    type: Number,
    default: 0,
  },
  subTotal2: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'credit/debit', 'online', 'awaiting payment'],
    default: 'awaiting payment',
  },
  checkNumber: {
    type: String,
    required: function () {
      return this.paymentMethod === 'check';
    },
  },
  creditCardFee: {
    type: Number,
    default: 0,
  },
  depositAdjustment: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  fromProposalId: {
    type: Schema.Types.ObjectId,
    ref: 'Proposal',
  },
  status: {
    type: String,
    enum: ['created', 'awaiting signature', 'awaiting payment', 'sent', 'paid', 'canceled', 'signed and paid', 'signed', 'deleted', 'invoice pdf created'],
    default: 'created',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  fileUrl: {
    type: String,
  },
  signedPdfUrl: {
    type: String,
  },
  signed: {
    type: Boolean,
    default: false,
  },
  paid: {
    type: Boolean,
    default: false,
  },
  token: {
    type: String,
  },
  projectAddress: {
    type: String,
    default: '',
  },
});

// Automatically update updatedAt when document is changed
invoiceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

invoiceSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

invoiceSchema.pre('updateOne', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});
invoiceSchema.pre('updateMany', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

export default invoiceSchema;
