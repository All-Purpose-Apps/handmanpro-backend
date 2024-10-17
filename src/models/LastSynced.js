import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const lastSyncedSchema = new Schema({
  lastSyncedAt: {
    type: Date,
    default: Date.now, // Keeping lastSyncedAt with a default value
  },
});

const LastSynced = mongoose.model('LastSynced', lastSyncedSchema);

export default LastSynced;
