const mongoose = require('mongoose');

const EdgeSchema = mongoose.Schema({
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

module.exports = mongoose.model('Edges', EdgeSchema);