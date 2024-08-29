const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  username: { type: String, required: false }, // Add this field
  title: { type: String, required: true },
  originalVideoPath: { type: String, required: true },
  transcodedVideoPath: { type: String },
  format: { type: String, required: true },
  size: { type: Number, required: true },
  duration: { type: Number, required: true },
  thumbnailPath: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Video', videoSchema);
