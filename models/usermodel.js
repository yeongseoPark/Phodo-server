const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const bcrypt = require('bcrypt')

let userScheme = new mongoose.Schema({
  name : String,
  email : String,
  resetPasswordToken : String,
  resetPasswordExpires : Date
});

userScheme.plugin(passportLocalMongoose, {usernameField : 'email'});
module.exports = mongoose.model('User', userScheme);