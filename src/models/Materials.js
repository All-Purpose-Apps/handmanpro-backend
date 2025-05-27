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

const MaterialsList = mongoose.model('Materials', materialsSchema);

export default MaterialsList;
