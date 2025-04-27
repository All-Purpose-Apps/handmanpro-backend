import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const materialsListSchema = new Schema({
  proposal: {
    type: Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true,
  },
  materials: [
    {
      description: {
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
      url: {
        type: String,
      },
    },
  ],
  total: {
    type: Number,
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
});

const MaterialsList = mongoose.model('MaterialsList', materialsListSchema);

export default MaterialsList;
