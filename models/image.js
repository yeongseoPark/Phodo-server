const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  _id: {
    type: String
  },
  url: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    required: true,
  },
  tags: {
    type: Array,
    required: true,
  },
  // userId : {
  //   type : mongoose.Schema.Types.ObjectId,
  //   required : true,
  //   ref : 'User',
  // },
  time : {
    type : Date,
    required : true,
  },
});

const Image = mongoose.model('Image', imageSchema);

module.exports = {
  Image,
  imageSchema,
};