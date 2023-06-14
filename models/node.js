const mongoose = require('mongoose');
const { Image, imageSchema } = require('../models/image');

const nodeSchema = new mongoose.Schema({
  imageObj: {
    type : imageSchema,
    required : false,
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
  width : {
    type : Number,
    required : true,
  },
  height : {
    type : Number,
    required : true,
  }, 
  memo : {
    type : String,
    required : false,
  },
});

const Node = mongoose.model('Node', nodeSchema);

module.exports = Node;