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
  proposalTitle: {
    type: String,
    required: true,
  },
  items: [
    {
      description: {
        type: String,
        required: true,
      },
      regularPrice: {
        type: Number,
        required: true,
      },
      discountPrice: {
        type: Number,
        required: true,
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
    enum: ['draft', 'sent', 'accepted', 'rejected'],
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
});

const Proposal = mongoose.model('Proposal', proposalSchema);

export default Proposal;
