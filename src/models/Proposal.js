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
    },
  ],
  packagePrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'sent to client', 'accepted', 'rejected', 'converted to invoice', 'proposal pdf created'],
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
  materialsListId: {
    type: Schema.Types.ObjectId,
    ref: 'MaterialsList',
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
