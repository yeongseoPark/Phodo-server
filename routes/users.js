const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/usermodel'); // Requiring user model

/* imports for forgot password */
const crypto = require('crypto');
const async = require('async');
const nodemailer = require('nodemailer');


// checks if user is authenticated
function isAuthenticatedUser(req, res, next) {
  if (req.isAuthenticated()) {
    return next(); // 다음 middleware
  }

  req.flash('error_msg', 'Please Login first to access this page');
  res.redirect('/login');
}


/**
 * @swagger
 * /logout:
 *   get:
 *     tags:
 *      - user
 *     summary: Log out the current user
 *     description: This endpoint logs out the current user and return a status message
 *     responses:
 *       200:
 *         description: The user has been successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "logged out"
 *       500:
 *         description: There was an error logging out the user
 */
router.get('/logout', isAuthenticatedUser ,(req, res, next) => {
  req.logOut(function(err) {
    if (err) {
      return next(err);
    }

    res.status(200).json({'message': 'logged out'});
  });
});


/**
 * @swagger
 * /reset/{token}:
 *   get:
 *     tags:
 *      - user
 *     summary: Reset user's password with provided token
 *     description: This endpoint validates the password reset token and sends a file for resetting the password
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: The password reset token
 *     responses:
 *       200:
 *         description: Sends a file for resetting the password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: The password reset token is invalid or expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset token is invalid or expired"
 *       500:
 *         description: There was an error processing the reset token
 */
router.get('/reset/:token', (req, res) => {
  console.log(req.params.token);
  User.findOne({
    resetPasswordToken  : req.params.token,
    resetPasswordExpires : {$gt : Date.now()}
  }).then(user => {
    if (!user) {
      console.log("hereeee");
      res.status(400).json({'message': 'Password reset token is invalid or expired'});
      return;
    }

    // res.sendFile('newpassword', {token : req.params.token});
    res.status(200).json({'user_email': user.email});
  })
    .catch(err => {
      console.log(err.message);
      res.status(400).json({'message': 'Password reset token is invalid or expired'});
    });
});


/* ---------------- post routes ------------- */
/**
 * @swagger
 * paths:
 *  /login:
 *   post:
 *    tags:
 *    - user
 *    description: 로그인
 *    parameters:
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *       properties:
 *        email:
 *         type: string
 *        password:
 *         type: string
 *
 *    responses:
 *     200:
 *      description: 로그인 성공
 *      schema:
 *       properties:
 *        message:
 *         type: string
 *     400:
 *      description: 로그인 실패
 *      schema:
 *       properties:
 *        message:
 *         type: string
 *
 */
// router.post('/login', passport.authenticate('local', {
//   successRedirect : '/Gallery',
//   failureRedirect : '/login',
//   failureFlash : 'Invalid email or password. Try Again!'
// })
// );

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err); // 에러가 발생하면 에러 핸들러에 전달
    }

    if (!user) { // user가 false이면 인증 실패
      return res.status(400).json({ 
        message: info ? info.message : 'Login failed'
      });
    }

    // req.login()은 Passport가 제공하는 함수로, 인증 세션을 시작합니다.
    req.login(user, err => {
      if (err) {
        return next(err);
      }
      // 로그인 성공 시 사용자 정보를 응답에 추가하고 성공 메시지를 전송합니다.
      return res.status(200).json({
        message: 'Login succeeded',
        user: user
      });
    });

  })(req, res, next); // 이 함수에 req, res, next를 전달합니다.
});



/**
 * @swagger
 * paths:
 *  /signup:
 *   post:
 *    tags:
 *    - user
 *    description: 회원가입
 *    parameters:
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *       properties:
 *        name:
 *         type: string
 *        email:
 *         type: string
 *        password:
 *         type: string
 *
 *    responses:
 *     200:
 *      description: 회원가입 성공
 *      schema:
 *       properties:
 *        message:
 *         type: string
 *     400:
 *      description: 회원가입 실패
 *      schema:
 *       properties:
 *        message:
 *         type: string
 *
 */
router.post('/signup', (req, res) => {
  let {name, email, password} = req.body;
  console.log(name, email, password);

  let userData = {
    name : name,
    email : email,
  };
  console.log(userData);

  User.register(userData, password, (err, user) => {
    if(err) {
      const status = 400;
      console.log(err);
      res.status(400).json({'message': err});
      console.log(status);
      return;
    }

    passport.authenticate('local') (req, res, () => {
      const status = 200;
      res.status(200).json({'message': 'Account created successfully'});
      console.log(status);
    });
  });
});

/**
 * @swagger
 * paths:
 *  /password/change:
 *   post:
 *    tags:
 *    - user
 *    description: 비밀번호 변경
 *    parameters:
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *       properties:
 *        password:
 *         type: string
 *        confirmpassword:
 *         type: string
 *
 *    responses:
 *     200:
 *      description: 비밀번호 변경
 *      schema:
 *       properties:
 *        message:
 *         type: string
 *     400:
 *      description: 비밀번호 변경 실패
 *      schema:
 *       properties:
 *        message:
 *         type: string
 *
 */
router.post('/password/change', (req, res) => {
  if (req.body.password !== req.body.confirmpassword) {
    res.status(400).json({'message': 'Password don\'t match'});
    return;
  }

  User.findOne({
    email : req.user.email
  })
    .then(user => {
      user.setPassword(req.body.password, err => {
        user.save()
          .then(user => {
            res.status(200).json({'message': 'Password changed successfully'});
          })
          .catch(err => {
            res.status(400).json({'message': 'ERROR: ' + err});

          });
      });
    });
});

/**
 * @swagger
 * paths:
 *  /forgot:
 *   post:
 *    tags:
 *    - user
 *    description: 비밀번호 찾기 이메일 전송
 *    parameters:
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *       properties:
 *        email:
 *         type: string
 *
 *    responses:
 *     200:
 *      description: 메일 전송 성공
 *      schema:
 *       properties:
 *        message:
 *         type: string
 *     400:
 *      description: 메일 전송 실패
 *      schema:
 *       properties:
 *        message:
 *         type: string
 *
 */
// Routes to handle forgot password
router.post('/forgot', (req, res, next) => {
  let recoveryPassword = '';
  async.waterfall([
    (done) => {
      crypto.randomBytes(30, (err, buf) => {
        let token = buf.toString('hex'); // generate token
        done(err, token);
      });
    },
    (token, done) => {
      User.findOne({email : req.body.email}) // search user
        .then(user => {
          if (!user) {
            res.status(400).json({'message': 'No user found'});
            return;
          }

          // If user exists, generate a token
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 1800000; // 30 minutes in milliseconds

          // Save the token in the DB
          user.save()
            .then(() => {
              done(null, token, user);
            })
            .catch(err => {
              done(err);
            });
        })
        .catch(err => {
          res.status(400).json({'message': 'ERROR: ' + err});
        });
    },
    (token, user) => {
      let smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth : {
          user : process.env.GMAIL_EMAIL,
          pass : process.env.GMAIL_PASSWORD
        }
      });

      let mailOptions = {
        to: user.email,
        from : '1park4170@gmail.com',
        subject : 'Recovery Email from Auth Project',
        // text : 'Please click the following link to recover your passoword: \n\n'+
        //                 'http://'+ req.headers.host +'/reset/'+token+'\n\n'+
        //                 'If you did not request this, please ignore this email.'
        text : 'Please click the following link to recover your passoword: \n\n'+
                        'http://localhost:3033/reset/'+token+'\n\n'+
                        'If you did not request this, please ignore this email.'
      };
      smtpTransport.sendMail(mailOptions, err=> {
        res.status(200).json({'message': 'Email send with further instructions. Please check that.'});
      });
    }

  ], err => {
    if (err) res.status(400).json({'message': 'cannot send email'});

  });
} );

/**
 * @swagger
 * paths:
 *  /reset/{token}:
 *   post:
 *     summary: Resets user password
 *     description: This endpoint allows for the resetting of a user's password, given a valid password reset token.
 *     tags:
 *       - user
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: The password reset token.
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             password:
 *               type: string
 *             confirmpassword:
 *               type: string
 *     responses:
 *       200:
 *         description: Password has been successfully reset.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Your password has been changed successfully"
 *       400:
 *         description: Error in resetting password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset token is invalid or has been expired"
 */
router.post('/reset/:token', (req, res) => {
  async.waterfall([
    (done) => {
      User.findOne({
        resetPasswordToken  : req.params.token,
        resetPasswordExpires : {$gt : Date.now()}})
        .then(user => {
          if (!user) {
            res.status(400).json({'message': 'Password reset token is invalid or has been expired'});
            return;
          }

          if (req.body.password !== req.body.confirmpassword) {
            res.status(400).json({'message': 'Password don\'t match'});
            return;
          }

          user.setPassword(req.body.password, err => {
            user.resetPasswordToken = undefined; // 더이상 얘는 필요없음
            user.resetPasswordExpires = undefined;

            user.save(err => {
              req.logIn(user, err => {
                done(err, user);
              });
            });
          });

        })
        .catch(err => {
          res.status(400).json({'message': 'ERROR: ' + err});
        });
    },
    (user) => {
      let smtpTransport = nodemailer.createTransport({
        service : 'Gmail',
        auth : {
          user : process.env.GMAIL_EMAIL,
          pass : process.env.GMAIL_PASSWORD
        }
      });

      let mailOptions = {
        to : user.email,
        from : '1park4170@gmail.com',
        subject : 'Your password is changed',
        text : 'Hello, ' + user.name + '\n\n' +
                    'This is the confirmation that the password for your account ' + user.email + 'has been changed'
      };

      smtpTransport.sendMail(mailOptions, err => {
        res.status(200).json({'message': 'Your password has been changed successfully'});
      });
    }

  ],err => {
    res.status(400).json({'message': 'reset failed'});
  });
});

module.exports = router;