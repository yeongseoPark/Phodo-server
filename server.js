//yarn add express-session
//yarn add passport
//yarn add passport-local-mongoose
//yarn add passport-local
//yarn add async
//yarn add nodemailer

const path = require('path');
const express = require('express'); 
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');

const MongoDBStore = require('connect-mongodb-session');
const mongoStore = MongoDBStore(session);

const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const cookieParser = require('cookie-parser');
const SocketIO = require("socket.io");
const http = require("http");

const PORT = 4000;
const app = express();

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

app.use(cookieParser())

// Requiring user model
const User = require('./models/usermodel');

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

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

dotenv.config({path : './.env'});



// CORS 옵션 설정
const corsOptions = {
  origin: 'http://3.36.77.22:3000', // 클라이언트 도메인을 명시적으로 지정하면 보안 상의 이유로 해당 도메인만 요청 허용 가능
  methods: 'GET, POST',
  allowedHeaders:  [
    "Content-Type",
    "Content-Length",
    "Accept-Encoding",
    "X-CSRF-Token",
    "Authorization",
    "accept",
    "origin",
    "Cache-Control",
    "X-Requested-With"
  ],  
  credentials : true
};

// CORS 미들웨어를 사용하여 모든 경로에 대해 CORS 옵션 적용
app.use(cors(corsOptions));

const store = new mongoStore({
  collection: "userSessions",
  uri: process.env.mongoURI,
  expires: 1000,
});

// middleware for session
app.use(
  session({
    name: "SESSION_NAME",
    secret: "SESS_SECRET",
    store: store,
    saveUninitialized: false,
    resave: false,
    cookie: {
      sameSite: 'lax',
      secure: false,
      httpOnly: true,
      maxAge : (4 * 60 * 60 * 1000)
    },
  })
);

app.use(passport.session());
app.use(passport.initialize());

/* 음성채팅 라우트 추가 */
app.get("/chat", (req, res) => {
  res.render("chat");
});


/*--------------------- dohee 추가 : 클라우드 이미지 url ------------------------*/
// npm install : dotenv, path, express, mongoose, cookieParser
const fileUpload = require('express-fileupload');
app.use(fileUpload());
/*-------------------------------------------------------------------*/

// PARSE ALL REQUESTS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SERVE STATIC FILES
// app.use(express.static(path.join(__dirname, '../client/dist')));
app.use("/public", express.static(__dirname + "/public"));


const userRoutes = require('./routes/users');
app.use(userRoutes);

// ROUTES
// const userRoutes = require('./routes/users');
const edgeRoutes = require('./routes/edges');
app.use(edgeRoutes);

const projectRoutes = require('./routes/projects');
app.use(projectRoutes);

app.use('/api', require('./routes/api'));
app.use('', require('./routes/nodes'));

//HANDLE CLIENT-SIDE ROUTING
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../client/dist/index.html'));
// });

// passport.use(new LocalStrategy({usernameField : 'email'}, User.authenticate()));
  
// UNKNOWN ROUTE HANDLER
app.use((req, res) => res.status(404).send('404 Not Found'));

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
  console.error(err.stack);
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

/* ------------- ---------  socket 코드  ---  -------------------------- */
app.set("view engine", "pug");
app.set("views", process.cwd() + "/src/views");

// app.use("/public", express.static(process.cwd() + "/src/public"));


// app.get("/*", (req, res) => {
//   res.redirect("/");
// });

let roomObjArr = [
  // {
  //   roomName,
  //   currentNum,
  //   users: [
  //     {
  //       socketId,
  //       nickname,
  //     },
  //   ],
  // },
];
const MAXIMUM = 5;

wsServer.on("connection", (socket) => {
  let myRoomName = null;
  let myNickname = null;

  socket.on("join_room", (roomName, nickname) => {
    myRoomName = roomName;
    myNickname = nickname;

    let isRoomExist = false;
    let targetRoomObj = null;

    // forEach를 사용하지 않는 이유: callback함수를 사용하기 때문에 return이 효용없음.
    for (let i = 0; i < roomObjArr.length; ++i) {
      if (roomObjArr[i].roomName === roomName) {
        // Reject join the room
        if (roomObjArr[i].currentNum >= MAXIMUM) {
          socket.emit("reject_join");
          return;
        }

        isRoomExist = true;
        targetRoomObj = roomObjArr[i];
        break;
      }
    }

    // Create room
    if (!isRoomExist) {
      targetRoomObj = {
        roomName,
        currentNum: 0,
        users: [],
      };
      roomObjArr.push(targetRoomObj);
    }

    //Join the room
    targetRoomObj.users.push({
      socketId: socket.id,
      nickname,
    });
    ++targetRoomObj.currentNum;

    socket.join(roomName);
    socket.emit("accept_join", targetRoomObj.users);

    socket.to(roomName).emit('new_user', { socketId: socket.id, nickname });
  });

  socket.on("offer", (offer, remoteSocketId, localNickname) => {
    socket.to(remoteSocketId).emit("offer", offer, socket.id, localNickname);
  });

  socket.on("answer", (answer, remoteSocketId) => {
    socket.to(remoteSocketId).emit("answer", answer, socket.id);
  });

  socket.on("ice", (ice, remoteSocketId) => {
    socket.to(remoteSocketId).emit("ice", ice, socket.id);
  });

  socket.on("disconnecting", () => {
    socket.to(myRoomName).emit("leave_room", socket.id, myNickname);

    let isRoomEmpty = false;
    for (let i = 0; i < roomObjArr.length; ++i) {
      if (roomObjArr[i].roomName === myRoomName) {
        const newUsers = roomObjArr[i].users.filter(
          (user) => user.socketId != socket.id
        );
        roomObjArr[i].users = newUsers;
        --roomObjArr[i].currentNum;

        if (roomObjArr[i].currentNum == 0) {
          isRoomEmpty = true;
        }
      }
    }

    // Delete room
    if (isRoomEmpty) {
      const newRoomObjArr = roomObjArr.filter(
        (roomObj) => roomObj.currentNum != 0
      );
      roomObjArr = newRoomObjArr;
    }
  });
});

// SERVER LISTEN
// app.listen(PORT, () => {
//   console.log(`Server started on port ${PORT}`);
// });

httpServer.listen(PORT,() => {
    console.log(`Server started on port ${PORT}`)});


