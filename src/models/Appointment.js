import mongoose from 'mongoose';
import { Schema } from 'mongoose';

const appointmentSchema = new Schema({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  endDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  invoice: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
  },
  proposal: {
    type: Schema.Types.ObjectId,
    ref: 'Proposal',
  },
  status: {
    type: String,
    default: 'scheduled',
    required: true,
  },
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
