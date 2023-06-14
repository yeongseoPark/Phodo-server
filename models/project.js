const mongoose = require('mongoose');

let projectSchema = new mongoose.Schema({
  name : {
    type : String,
    required : false,
  },
  userId : [{ // user와 2-Way
    type : mongoose.Schema.Types.ObjectId,
    required : true,
    ref : 'User',
  }],
  nodeId : [{
    type : mongoose.Schema.Types.ObjectId,
    ref : 'Node',
  }],
  edgeId : [{
    type : mongoose.Schema.Types.ObjectId,
    ref : 'Edge',
  }],
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;