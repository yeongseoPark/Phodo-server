const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const bcrypt = require('bcrypt');

let userScheme = new mongoose.Schema({
  name : String,
  email : String,
  resetPasswordToken : String,
  resetPasswordExpires : Date,
  projectId : [{
    type : mongoose.Schema.Types.ObjectId,
    required : false,
    ref : 'Project',
  }]
});

userScheme.plugin(passportLocalMongoose, {usernameField : 'email'});
module.exports = mongoose.model('User', userScheme);