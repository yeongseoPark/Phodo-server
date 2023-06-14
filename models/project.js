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
  nodeIds: [{ // 1 Project : Many Nodes
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Node',
  }],
  edgeIds: [{ // 1 Project : Many Edges
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Edge',
  }],
});


const Project = mongoose.model('Project', projectSchema);

module.exports = Project;