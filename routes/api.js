const express = require('express');
const router = express.Router();


/*--------------------- dohee 추가 : 클라우드 이미지 url ------------------------*/
const path = require('path');
// 이미지 업로드 및 URL 저장에 필요한 모듈 임포트 (npm install @google-cloud/storage)
const { Storage } = require('@google-cloud/storage');
// 객체 분해 할당 : 모듈에서 필요한 속성만 추출해서 할당. 이렇게 하면 해당 모듈의 storage 클래스를 직접 참조 가능!
//클라이언트가 이미지를 업로드하면 --> 해당 이미지를 클라우드 스토리지에 저장 --> 업로드 완료 후 생성된 url을 몽고db에 저장

const Image = require('../models/image'); // 이미지 모델 정의

// 구글 클라우드 스토리지 클라이언트 생성 및 인증 정보 설정
// : Storage를 한 번만 생성해서 해당 인스턴스를 계속 사용하며 연결 상태를 유지. (업로드, 다운로드, 삭제 등 작업 수행)
const storage = new Storage({
  keyFilename: path.join(__dirname, 'rich-wavelet-388908-dad58487deb3.json'), // 서비스 계정 키 파일 경로 설정
  projectId: 'rich-wavelet-388908', // 구글 클라우드 프로젝트 ID
});

// 이미지 업로드 및 URL 저장 라우트 핸들러(npm install express-fileupload)
router.post('/upload', (req, res) => {
    // 클라이언트로부터 이미지 파일 받기
    const image = req.files.image;
    console.log(image)

    // 이미지 파일 업로드
    const bucket = storage.bucket('jungle_project'); // 클라우드 스토리지 버킷 이름(jungle_project)
    const gcsFileName = `${Date.now()}_${image.name}`; // 업로드할 이미지에 고유한 이름 생성
    const file = bucket.file(gcsFileName);
    const stream = file.createWriteStream({   // createWriteStream 메서드 : 이미지 파일을 스토리지에 작성하는 스트림 생성
    metadata: {   // 파일의 메타 데이터 생성
        contentType: image.mimetype,
    },
    resumable: false,   // 일시 중지된 업로드를 지원할지 여부 결정
    }); 
    // 이미지 업로드 완료 처리(1) : 오류 발생 시 
    // 스트림 객체를http 응답코드를 500으로 설정하고, 클라이언트에게 json 형식 오류메세지 반환
    stream.on('error', (err) => { 
    console.error(err);
    res.status(500).json({ error: 'Failed to upload image' });
    });

    // 이미지 업로드 완료 처리(2) : 업로드 완료 시
    // finish는 스트림이 모든 데이터를 작성한 후에 발생하는 이벤트
    stream.on('finish', () => {
    // 이미지 URL 저장
    const imageUrl = `https://storage.googleapis.com/jungle_project/${gcsFileName}`;

    // MongoDB에 이미지 URL 저장
    const imageDocument = new Image({ url: imageUrl }); // mongoDB의 Image 컬렉션에 저장될 문서를 의미함
    imageDocument.save()  // save() 메서드 : mongoDB에 저장
        .then(() => {   // 성공 시 : 상태코드 200과 성공 메세지 전달.
        res.status(200).json({ message: 'Image uploaded and URL saved' });
        })
        .catch((err) => {   // 실패 시 : 상태코드 500과 에러 메세지 전달.
        console.error(err);
        res.status(500).json({ error: 'Failed to save image URL' });
        });
    });

    // 이미지 전송 완료
    // end 메서드 : 스트림을 종료하고 작업을 완료, image.data : 이미지 데이터 자체.
    stream.end(image.data);
});
/*-------------------------------------------------------------------*/


// ROUTER EXPORT
module.exports = router;
