import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const timelineSchema = new Schema({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  timelineNumber: {
    type: String,
    required: true,
  },
  timelineDate: {
    type: Date,
    required: true,
  },
  timelineTitle: {
    type: String,
    required: true,
  },
  timelineDescription: {
    type: String,
    required: true,
  },
  invoices: {
    type: Array,
  },
  proposals: {
    type: Array,
  },
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

const Timeline = mongoose.model('Timeline', timelineSchema);

export default Timeline;
