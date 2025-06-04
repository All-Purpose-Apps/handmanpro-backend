import mongoose from 'mongoose';

const TokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true }, // Set expiration time
  revoked: { type: Boolean, default: false }, // Flag for revocation
});

const Token = mongoose.model('Token', TokenSchema);
export default Token;
