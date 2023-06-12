const mongoose = require('mongoose');

const edgeSchema = new mongoose.Schema({
    startNodeId : {
        type : mongoose.Schema.Types.ObjectId,
        required : true,
        ref : 'Node',
      },
    endNodeId : {
        type : mongoose.Schema.Types.ObjectId,
        required : true,
        ref : 'Node',
      },
});

const Edge = mongoose.model('Edge', edgeSchema);

module.exports = Edge;