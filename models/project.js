const mongoose = require('mongoose');

let projectSchema = new mongoose.Schema({
  name : {
    type : String,
    required : false
  },
  userIds: [{ // 1 Project : Many Users
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  }],
  nodeId: { 
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'Node',
  },
  edgeId: { 
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'Edge',
  },
  creationTime: {
    type: Date,
    required: true
  },
  thumbnail: {
    type: String,
    required: false
  },
  like: {
    type: Boolean,
    required: true
  }
});


const Project = mongoose.model('Project', projectSchema);

module.exports = Project;