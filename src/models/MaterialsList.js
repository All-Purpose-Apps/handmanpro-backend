import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const materialsListSchema = new Schema({
  proposal: {
    type: String,
    required: true,
    unique: true,
  },
  materials: [
    {
      material: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
    },
  ],
  total: {
    type: Number,
    required: true,
  },
  discountTotal: {
    type: Number,
    default: 0,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  proposalId: {
    type: Schema.Types.ObjectId,
    ref: 'Proposal',
  },
});

const MaterialsList = mongoose.model('MaterialsList', materialsListSchema);

export default MaterialsList;
