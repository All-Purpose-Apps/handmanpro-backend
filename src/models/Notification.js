import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    required: true,
  },
  id: {
    type: String,
  },
});

// Automatically update the date when the document is changed
notificationSchema.pre('save', function (next) {
  this.date = Date.now();
  next();
});
notificationSchema.pre('findOneAndUpdate', function (next) {
  this.set({ date: Date.now() });
  next();
});
notificationSchema.pre('updateOne', function (next) {
  this.set({ date: Date.now() });
  next();
});
notificationSchema.pre('updateMany', function (next) {
  this.set({ date: Date.now() });
  next();
});

export default notificationSchema;
