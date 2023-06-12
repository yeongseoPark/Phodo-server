//yarn add express-session
//yarn add passport
//yarn add passport-local-mongoose
//yarn add passport-local
//yarn add async
//yarn add nodemailer

const path = require('path');
const express = require('express'); 
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');

const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const PORT = 4000;
const app = express();

dotenv.config({path : './.env'});

/*--------------------- dohee 추가 : 클라우드 이미지 url ------------------------*/
// npm install : dotenv, path, express, mongoose, cookieParser
const fileUpload = require('express-fileupload');
app.use(fileUpload());

app.use(cors());

// CORS 옵션 설정
const corsOptions = {
  origin: '*', // 클라이언트 도메인을 명시적으로 지정하면 보안 상의 이유로 해당 도메인만 요청 허용 가능
  methods: 'GET, POST',
  allowedHeaders: 'Content-Type',  
  credentials : true
};

// CORS 미들웨어를 사용하여 모든 경로에 대해 CORS 옵션 적용
app.use(cors(corsOptions));

/*-------------------------------------------------------------------*/

// PARSE ALL REQUESTS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parses cookies attached to the client request object

// SERVE STATIC FILES
app.use(express.static(path.join(__dirname, '../client/dist')));

// ROUTES
// const userRoutes = require('./routes/users');
app.use('/api', require('./routes/api'));
app.use(flash());

// middleware for session
app.use(session({
    secret : 'Just a simple login/sign up application.',
    resave : true,
    saveUninitialized : true
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Requiring user model
  const User = require('./models/usermodel');
  
  
  const userRoutes = require('./routes/users');
  app.use(userRoutes);

//HANDLE CLIENT-SIDE ROUTING
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// passport.use(new LocalStrategy({usernameField : 'email'}, User.authenticate()));

passport.use(new LocalStrategy({
    usernameField: 'email',   
    passwordField: 'password',   
  }, async (email, password, done) => {
    try {
      const exUser = await User.findOne({ email: email });
      if (exUser) {
        exUser.authenticate(password, (err, user, passwordError) => {
          if (passwordError) {
            // Incorrect password
            done(null, false, {message : '비밀번호가 일치하지 않습니다'});
          } else if (err) {
            // Other error
            done(err);
          } else {
            // Success
            done(null, user);
          }
        });
      } else {
        done(null, false, {message : '가입되지 않은 회원입니다'})
      }
    } catch (error) {
      console.error(error);
      done(error);
    }
  }));
  
  
  /* passport는 현재 로그인한 유저에 대한 세션을 유지
  밑의 2개의 라인으로 그 세션을 유지할 수 있음
  - 유저가 dashboard에 접근할수 있게 하려면(세션을 기반으로)
  serialize/ deserialize로 이를 가능케 함(??)
  */
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());
  
// UNKNOWN ROUTE HANDLER
app.use((req, res) => res.status(404).send('404 Not Found'));
app.use(flash());

// // setting middleware globally
// app.use((req, res, next) => {
//   res.locals.success_msg = req.flash(('success_msg'));
//   res.locals.error_msg = req.flash(('error_msg'));
//   res.locals.error = req.flash(('error'));
//   res.locals.currentUser = req.user;
//   next();
// });

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  const defaultErr = {
    log: 'Express error handler caught unknown middleware error',
    status: 400,
    message: { err: 'An error occurred' },
  };
  const errorObj = Object.assign({}, defaultErr, err);
  console.log(errorObj.log);
  return res.status(errorObj.status).json(errorObj.message);
});

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, '../client/views'));
// app.use(express.static('public'));

// MONGODB CONNECTION
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));

// SERVER LISTEN
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
