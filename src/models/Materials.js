import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const materialsSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default materialsSchema;
