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
  proposalDescription: {
    type: String,
    required: true,
  },
  items: [
    {
      description: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      rate: {
        type: Number,
        required: true,
      },
    },
  ],
  subTotal: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Proposal = mongoose.model('Proposal', proposalSchema);

export default Proposal;
