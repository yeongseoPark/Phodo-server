const mongoose = require('mongoose');
const imageSchema = require('./image');

const nodeSchema = new mongoose.Schema({
  imageObj: {
    type : imageSchema,
    require : false,
  },
  location: {
    type : {
        type: String,
        enum: ['Point'],
        required: true,
    },
    coordinates : {
        type : [Number],
        required : true
    }
  },
  memo : {
    type : String,
    required : false,
  },
});

const Node = mongoose.model('Node', nodeSchema);

module.exports = Node;