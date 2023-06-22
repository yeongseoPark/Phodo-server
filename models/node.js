const mongoose = require('mongoose');
const { Image, imageSchema } = require('../models/image');

const nodeSchema = new mongoose.Schema({
  info : {
    type : String,
    required : true,
  },
  projectId: { 
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Project',
  }
});

const Node = mongoose.model('Node', nodeSchema);

module.exports = Node;