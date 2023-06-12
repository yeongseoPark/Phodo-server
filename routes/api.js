const express = require('express');
const router = express.Router();
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const Image = require('../models/image');   // 이미지 모델 정의

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
    console.log(image)

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

    // 이미지 업로드 완료 처리(1) : 오류 발생 시 - 응답코드 500
    stream.on('error', (err) => { 
        console.error(err);
        res.status(500).json({ error: 'Failed to upload image' });
    });

    // 이미지 업로드 완료 처리(2) : 업로드 완료 시 (스트림이 모든 데이터를 업로드 한 후)
    stream.on('finish', async () => {
        // 업로드한 이미지 url 생성
        const imageUrl = `https://storage.googleapis.com/jungle_project/${gcsFileName}`;
        
        try {
            // Google Cloud Vision API로 이미지 태그 생성
            const [result] = await vision.labelDetection(imageUrl);
            const labels = result.labelAnnotations;

            // 이미지 태그를 배열 형태로 변환
            const imageTags = labels.map(label => ({
                description : label.description,
                score: label.score,
            }));

            console.log(imageUrl);
            console.log(imageTags);

            //MongoDB에 이미지 URL과 태그 저장
            const imageDocument = new Image({ url: imageUrl, tags: imageTags }); // mongoDB의 Image 컬렉션에 저장될 문서를 의미함
            await imageDocument.save(); // save() 메서드 : mongoDB에 저장

            // 성공 시 : 상태코드 200과 성공 메세지 전
            res.status(200).json({ message: 'Image uploaded and URL saved' });

        } catch (err) {  // 실패 시 : 상태코드 500과 에러 메세지 전달
            console.error(err);
            res.status(500).json({ error: 'Failed to save image URL' });
        }
    });    

    // 이미지 파일 스트림 종료 및 업로드 완료
    // end 메서드 : 스트림을 종료하고 작업을 완료, image.data : 이미지 데이터 자체.
    stream.end(image.data);
});

// 갤러리로 이미지 전송 라우트 핸들러
router.get('/gallery', async (req, res) => {
    try {
        // mongoDB에서 이미지 파일 url과 tag 가져오기 
        const imagesQuery = Image.find({}, 'url tags');  // find 메서드의 결과로 쿼리가 생성됨
        const images = await imagesQuery.exec();  //해당 쿼리를 실행
        
        // url과 tags를 배열 형식으로 추출
        const imageUrls = images.map((image) => image.url);
        const imageTags = images.map((image) => image.tags); 
        res.status(200).json({ url: imageUrls, tags: imageTags }); 
    } catch (err) { 
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch image URLs and Tags' });
    } 
});


// ROUTER EXPORT
module.exports = router;
