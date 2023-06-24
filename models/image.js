const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    required: true,
  },
  category: {
    type: Array,
    required: true,
  },
  tags: {
    type: Array,
    required: true,
  },
  userId : {
    type : mongoose.Schema.Types.ObjectId,
    required : true,
    ref : 'User',
  },
  time : {
    type : Date,
    required : true,
  },
  location : {
    type : String,
    required : false,
  },
  uploadTime: {
    type : Date,
    required : true,
  },
});

const Image = mongoose.model('Image', imageSchema);

module.exports = {
  Image,
  imageSchema,
};