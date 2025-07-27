import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const proposalSchema = new Schema({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  proposalNumber: {
    type: String,
    required: true,
  },
  proposalDate: {
    type: Date,
    required: true,
  },
  items: [
    {
      description: {
        type: String,
      },
      regularPrice: {
        type: Number,
      },
      discountPrice: {
        type: Number,
      },
      materialListId: {
        type: Schema.Types.ObjectId,
        ref: 'MaterialsList',
      },
    },
  ],
  packagePrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: [
      'draft',
      'sent to client',
      'accepted',
      'rejected',
      'converted to invoice',
      'proposal pdf created',
      'working on project',
      'paid deposit',
      'finished project',
    ],
    default: 'draft',
  },
  dateAccepted: {
    type: String,
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
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
  },
  projectFullAddress: {
    type: String,
    default: '',
  },
  projectAddress: {
    type: String,
    default: '',
  },
  projectCity: {
    type: String,
    default: '',
  },
  projectState: {
    type: String,
    default: '',
  },
  projectZip: {
    type: String,
    default: '',
  },
  token: {
    type: String,
    default: '',
  },
});

proposalSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});
proposalSchema.pre('findOneAndUpdate', function (next) {
  this.updatedAt = Date.now();
  next();
});
proposalSchema.pre('updateOne', function (next) {
  this.updatedAt = Date.now();
  next();
});
proposalSchema.pre('updateMany', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default proposalSchema;
