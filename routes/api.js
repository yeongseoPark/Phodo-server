const express = require('express');
const router = express.Router();
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { Image } = require('../models/image');   // 이미지 모델 정의
const sharp = require('sharp'); // image resizing to make thumbnail

/*--------------------- dohee 추가 : 클라우드 이미지 url ------------------------*/
// 이미지 업로드 및 URL 저장에 필요한 모듈 임포트 (npm install @google-cloud/storage, npm install @google-cloud/vision)

// Google Vision API 클라이언트 생성 및 인증 정보 설정
const vision = new ImageAnnotatorClient({
    keyFilename: path.join(__dirname, '../hyeontest-388510-6a65bba5d8ca.json'), // Vision API 인증 키 파일 경로 설정
  });
// const vision = require('@google-cloud/vision');
// var requtil = vision.requtil;

// 구글 클라우드 스토리지 클라이언트 생성 및 인증 정보 설정
const storage = new Storage({
  keyFilename: path.join(__dirname, '../rich-wavelet-388908-dad58487deb3.json'), // 서비스 계정 키 파일 경로 설정
  projectId: 'rich-wavelet-388908', // 구글 클라우드 프로젝트 ID
});

// 이미지 업로드 및 URL 저장 라우트 핸들러(npm install express-fileupload)
router.post('/upload', (req, res) => {
    // 클라이언트로부터 이미지 파일 받기
    const image = req.files.image;
    console.log('imageInfo: \n', image);

    // 이미지 파일 업로드
    const bucket = storage.bucket('jungle_project');    // Cloud Storage 버킷 이름(jungle_project)
    const gcsFileName = `${Date.now()}_${image.name}`;  // 업로드할 이미지에 고유한 이름 생성
    const file = bucket.file(gcsFileName);              // Cloud Storage에 업로드할 파일 생성
    const stream = file.createWriteStream({             // 이미지 파일을 Stream 형식으로 작성
        metadata: {   // 파일의 메타 데이터 생성
            contentType: image.mimetype,
        },
        resumable: false,   // 일시 중지된 업로드를 지원할지 여부 결정
    }); 

    // 이미지 업로드 완료 처리(1) : 오류 발생 시 - 응답코드 400
    stream.on('error', (err) => { 
        console.error(err);
        res.status(400).json({ error: 'Failed to upload image' });
    });

    // 이미지 업로드 완료 처리(2) : 업로드 완료 시 (스트림이 모든 데이터를 업로드 한 후)
    stream.on('finish', async () => {
        // 업로드한 이미지 url 생성
        const imageUrl = `https://storage.googleapis.com/jungle_project/${gcsFileName}`;

        // 원본 이미지 파일을 다운로드 받아서 리사이징 후 다시 업로드
        const tmpFilePath = `/tmp/${gcsFileName}`;
        await file.download({ destination: tmpFilePath });
        
        // sharp를 사용해 이미지 사이즈 변경
        const resizedFileName = `thumbnail_${gcsFileName}`;
        const resizedFilePath = `/tmp/${resizedFileName}`;
        await sharp(tmpFilePath).resize(50).toFile(resizedFilePath); // resize() 인자로 크기 조정

        // 리사이징한 이미지를 다시 업로드
        const resizedFile = bucket.file(resizedFileName);
        await bucket.upload(resizedFilePath);
        const thumbnailUrl = `https://storage.googleapis.com/jungle_project/${resizedFileName}`;
        
        try {
            // Google Cloud Vision API로 이미지 태그 생성
            const [result] = await vision.labelDetection(imageUrl);
            const labels = result.labelAnnotations;
            
            // 생성된 태그(labels)를 해당하는 카테고리로 변환해서 반환   
            const Tags = [];
            // 딕셔너리 선언(output.json)
            const dictionary = require('../label_classification/output.json');

            labels.forEach((label) => {
                // 딕셔너리에서 각 label에 해당하는 value값을 태그에 추가
                const value = dictionary[label.description.toLowerCase()];
                if (value) {
                    Tags.push(value);
                }
            });
            // 중복값 제거
            const imageTagsSet = new Set(Tags);
            const imageTags = [...imageTagsSet];
            
            console.log('imageUrl: ', imageUrl);
            console.log('imageTags: ', imageTags);
            console.log('thumbnailUrl: ', thumbnailUrl);

            // MongoDB에 이미지 URL과 태그 저장
            const userId = req.user._id; // 현재 로그인한 사용자의 식별자 가져오기
            const imageDocument = new Image({ 
                url: imageUrl, 
                tags: imageTags,
                thumbnailUrl: thumbnailUrl,
                userId: userId, // 소유자 정보 할당
            });
            await imageDocument.save(); // save() 메서드 : mongoDB에 저장

            // 성공 시 : 상태코드 200과 성공 메세지 전
            res.status(200).json({ message: 'Image and thumbnail uploaded and URL saved' });

        } catch (err) {  // 실패 시 : 상태코드 500과 에러 메세지 전달
            console.error(err);
            res.status(500).json({ error: 'Failed to save image and thumbnail URL' });
        }
    });    


    // 이미지 파일 스트림 종료 및 업로드 완료
    // end 메서드 : 스트림을 종료하고 작업을 완료, image.data : 이미지 데이터 자체.
    stream.end(image.data);
});

// 갤러리로 전체 이미지 전송 라우트 핸들러
router.get('/gallery', async (req, res) => {
    try {
        // 세션에서 현재 로그인한 사용자의 식별자 가져오기
        const userId = req.user._id;

        // mongoDB에서 이미지 파일 url과 tag 가져오기 
        const imagesQuery = Image.find({ userId : userId }, '_id url tags thumbnailUrl');  // find 메서드의 결과로 쿼리가 생성됨
        const images = await imagesQuery.exec();  //해당 쿼리를 실행
        
        // url과 tags를 배열 형식으로 추출
        const imageUrlsTags = images.map((image) => ({
            _id: image._id,
            url: image.url,
            tags: {
                tag1: image.tags[0],
                tag2: image.tags[1],
                tag3: image.tags[2],
                tag4: image.tags[3]
            },
            thumbnailUrl: image.thumbnailUrl
        }));
        console.log(imageUrlsTags);

        // 성공 시
        res.status(200).json(imageUrlsTags); 
    } catch (err) {  // 실패 시
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch image URLs and Tags' });
    } 
});

// 갤러리로 태그별 이미지 전송 라우트 핸들러
router.get('/galleryTags', async (req, res) => {
    try {
        // 로그인한 사용자의 식별자 & 사용자가 요청한 태그 가져오기
        const userId = req.user._id;
        const tag = req.body.tags;

        // mongoDB에서 사용자의 이미지 중 요청한 태그를 가진 것만 추출
        const imagesQuery = Image.find({ userId: userId, tags: {$in:tag} }, '_id url tags thumbnailUrl');  // find 메서드의 결과로 쿼리가 생성됨
        const images = await imagesQuery.exec();  //해당 쿼리를 실행
        
        // url과 tags를 배열 형식으로 추출
        const imageUrlsTags = images.map((image) => ({
            _id: image._id,
            url: image.url,
            tags: {
                tag1: image.tags[0],
                tag2: image.tags[1],
                tag3: image.tags[2],
                tag4: image.tags[3]
            },
            thumbnailUrl: image.thumbnailUrl
        }));   
        
        // 성공 시
        res.status(200).json(imageUrlsTags); 
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch image URLs and Tags'})
    }
});


// Phodo 즐겨찾기 라우터 (미완성)
router.get('/likePhodo', (req,res) => {
    try {

        res.status(200).json(
            [
                {
                    "name" : "좋아하는 포도",
                    "id" : "1"
                },
                {
                    "name" : "강아지 포도",
                    "id" : "2"
                }
            ]
        );

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load your Phodos'});
    }
});

// ROUTER EXPORT
module.exports = router;