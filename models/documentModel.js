const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  app: {
    type: String,
    default: 'system',
  },
  path: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    default: '',
  },
  created: {
    type: Number,
    default: () => Date.now(),
  },
  delete: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Document', documentSchema);
