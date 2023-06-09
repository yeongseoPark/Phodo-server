require('dotenv').config();
const path = require('path');
const express = require('express'); 
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const PORT = 3000;
const app = express();

/*--------------------- dohee 추가 : 클라우드 이미지 url ------------------------*/
// npm install : dotenv, path, express, mongoose, cookieParser
const fileUpload = require('express-fileupload');
app.use(fileUpload());
const cors = require('cors');
app.use(cors());

// CORS 옵션 설정
const corsOptions = {
  origin: '*', // 클라이언트 도메인을 명시적으로 지정하면 보안 상의 이유로 해당 도메인만 요청 허용 가능
  methods: 'GET, POST',
  allowedHeaders: 'Content-Type',
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
app.use('/api', require('./routes/api'));

//HANDLE CLIENT-SIDE ROUTING
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// UNKNOWN ROUTE HANDLER
app.use((req, res) => res.status(404).send('404 Not Found'));

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
