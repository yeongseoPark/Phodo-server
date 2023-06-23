const express = require('express');
const router = express.Router();
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { LanguageServiceClient } = require('@google-cloud/language');  // 태그 카테고리 분류
const { Image } = require('../models/image');   // 이미지 모델 정의
const sharp = require('sharp'); // image resizing to make 
const fs = require('fs'); // 파일 시스템 모듈
const exifParser = require('exif-parser');
const piexif = require('piexifjs'); // 이미지의 exif 데이터를 읽고 쓰는데 사용

const passport = require('passport');
const { default: axios } = require('axios');
const { value } = require('mongoose/lib/options/propertyOptions');
const Project = require('../models/project');

// 이미지 파일에서 촬영 시간을 읽는 함수
async function getImageCreationTime(filePath) {
    try {
        const fileData = fs.readFileSync(filePath); // 파일에서 데이터를 동기적으로 읽음
        const parser = exifParser.create(fileData); // Exif 파서 생성
        const result = parser.parse(); // Exif 데이터 파싱

        // "CreateDate" 필드가 Exif 데이터에 있는지 확인
        if (result.tags && result.tags.CreateDate) {
            const date = new Date(result.tags.CreateDate * 1000); // Exif 태그는 Unix 시간으로 저장됨 (초 단위), 자바스크립트는 밀리초 단위로 처리하므로 변환 필요
            return date.toISOString().slice(0,19); // '2020-02-21T14:33:16' 형식의 날짜와 시간 문자열 반환
        } else {
            // Exif 데이터가 없다면 파일의 생성 시간을 반환
            const stat = fs.statSync(filePath);
            return stat.birthtime.toISOString().slice(0,19);
        }
    } catch (error) {
        console.error(`Failed to read Exif data: ${error}`);
        return null;
    }
}

// 이미지 파일에서 GPS 정보를 읽는 함수
async function getImageLocation(filePath) {
    try {
        const fileData = fs.readFileSync(filePath); // 파일에서 데이터를 동기적으로 읽음
        const exifData = piexif.load(fileData.toString("binary"));  // fileData를 바이너리 형식으로 변환하고, 이미지 파일의 exif 데이터를 읽어 옴.
        const gpsData = exifData['GPS'];  // GPS 관련 데이터 추출
        
        // GPS 관련 정보 (GPSLatitude, GPSLongitude)가 exif 데이터에 존재하는지 확인
        // convertDMSToDD 함수로 GPS값을 DMS 형식에서 DD 형식으로 변환
        if (gpsData && gpsData[piexif.GPSIFD.GPSLatitude] && gpsData[piexif.GPSIFD.GPSLongitude]) {
            const latitude = convertDMSToDD(gpsData[piexif.GPSIFD.GPSLatitude], gpsData[piexif.GPSIFD.GPSLatitudeRef]);
            const longitude = convertDMSToDD(gpsData[piexif.GPSIFD.GPSLongitude], gpsData[piexif.GPSIFD.GPSLongitudeRef]);
            return { latitude, longitude };
        } else {
            // Exif 데이터에 GPS 정보가 없을 경우 null 반환
            return null;
        }
    } catch (error) {
        console.error(`Failed to read GPS data from Exif: ${error}`);
        return null;
    }
}

// Exif GPS 좌표 형식(DMS)을 십진수 형식(DD)으로 변환하는 함수
// ex) 127° 18' 45" E 를 숫자(좌표)로 변환
function convertDMSToDD(dmsArray, ref) {  // dmsArray: DMS 형식 좌표값 배열, ref: 좌표의 방향
    // 배열의 각 요소를 부동소수점 숫자로 변환
    const degrees = parseFloat(dmsArray[0]);
    const minutes = parseFloat(dmsArray[1]);
    const seconds = parseFloat(dmsArray[2]);

    // ref 문자열을 대문자로 변환
    const direction = ref.toUpperCase();

    // 숫자 형식으로 변환할 수 없는 경우 error 반환
    if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) {
        throw new Error('Invalid DMS values');
    }
    // 변환한 값을 DD 형식으로 다시 계산
    let dd = degrees + minutes / 60 + seconds / (60 * 60);
    
    // 좌표값이 S 혹은 W 인 경우 좌표값을 음수로 변경
    if (direction === 'S' || direction === 'W') {
        dd = -dd;
    }
  
    return dd;
}

// DB에 저장할 카테고리를 분류해 주는 함수
function Classification(categories) {
    let changeCategory;
    if (categories[0] == 'Autos & Vehicles') {
        changeCategory = '건설/토목';
    }
    else if (categories[0] == 'Business & Industrial') {
        if (categories[1] == 'Advertising & Marketing') {
            changeCategory = '마케팅';
        }
        else if (categories[1] == 'Construction & Maintenance') {
            changeCategory = '건설/토목';
        }
        else if (categories[1] == 'Business Education' 
                || categories[1] == 'Business Finance'
                || categories[1] == 'Business Operations'
                || categories[1] == 'Business Services') {
            changeCategory = '비즈니스';
        }
        else if (categories[1] == 'Chemicals Industry') {
            changeCategory = '화학';
        }
        else if (categories[1] == 'Energy & Utilities') {
            changeCategory = '에너지';
        }
        else if (categories[1] == 'Industrial Materials & Equipment'
                || categories[1] == 'Manufacturing') {
            changeCategory = '자재/장비';
        }
        else if (categories[1] == 'Transportation & Logistics') {
            changeCategory = '운송';
        }
        else {
            changeCategory = '기타'
        }
    }
    else if (categories[0] == 'Computers & Electronics') {
        if (categories[1] == 'Electronics & Electrical' 
        || categories[1] == 'Software') {
            if (categories[2] == 'Multimedia Software'
            || categories[2] == 'Data Sheets & Electronics Reference') {
                changeCategory = '레퍼런스'
            }
            else {
                changeCategory = '컴퓨터';
            }
        }
        else {
            changeCategory = '컴퓨터';
        }
    }
    else if (categories[0] == 'Finance') {
        changeCategory = '재무';
    }
    else if (categories[0] == 'Internet & Telecom') {
        changeCategory = '통신';
    }
    else if (categories[0] == 'Jobs & Education') {
        changeCategory = '직업/교육';
    }
    else if (categories[0] == 'News') {
        changeCategory = '뉴스';
    }
    else if (categories[0] == 'People & Society') {
        changeCategory = '사회';
    }
    else if (categories[0] == 'Reference') {
        changeCategory = '레퍼런스';
    }
    else if (categories[0] == 'Science') {
        changeCategory = '과학';
    }
    else if (categories[0] == 'Arts & Entertainment') {
        if (categories[1] == 'Movies' 
        || categories[1] == 'Music & Audio'
        || categories[1] == 'TV & Video') {
            if (categories[2] == 'Movie Reference'
            || categories[2] == 'Music Reference'
            || categories[2] == 'TV Guides & Reference') {
                changeCategory = '레퍼런스'
            }
            else {
                changeCategory = '기타';
            }
        }
        else {
            changeCategory = '기타';
        }
    }
    else if (categories[0] == 'Arts & Entertainment') {
        if (categories[1] == 'Movies' 
        && categories[2] == 'Movie Reference') {
            changeCategory = '레퍼런스'
        }
        else {
            changeCategory = '기타';
        }
    }
    else if (categories[0] == 'Games') {
        if (categories[1] == 'Computer & Video Games'
        && categories[2] == 'Gaming Reference & Reviews') {
            changeCategory = '레퍼런스'
        }
        else {
            changeCategory = '기타';
        }
    }
    else {
        changeCategory = '기타';
    }
    return changeCategory;
}

// 카카오 지도 API로 현재 좌표를 행정구역단위(동)으로 변환
const getAddressFromCoordinates = async (longitude, latitude) => {
    try {
        const response = await axios.get(
            `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${longitude}&y=${latitude}`,
            { headers: { Authorization: `KakaoAK ${process.env.REACT_APP_KAKAO_MAP_KEY}` } }
        );
        const regionName = response.data.documents[0].address_name;
        return regionName;
    } catch (error) {
        console.error('Failed to convert coordinates to address:', error);
        return null;
    }
};

// Google Natural Language API 클라이언트 생성 및 인증 정보 설정
const language = new LanguageServiceClient({
    keyFilename: path.join(__dirname,'../rich-wavelet-388908-dad58487deb3.json'), // Natural Language API 인증 키 파일 경로 설정
});

// Google Vision API 클라이언트 생성 및 인증 정보 설정
const vision = new ImageAnnotatorClient({
    keyFilename: path.join(__dirname, '../hyeontest-388510-6a65bba5d8ca.json'), // Vision API 인증 키 파일 경로 설정
});

// Google Cloud Storage 클라이언트 생성 및 인증 정보 설정
const storage = new Storage({
  keyFilename: path.join(__dirname, '../rich-wavelet-388908-dad58487deb3.json'), // 서비스 계정 키 파일 경로 설정
  projectId: 'rich-wavelet-388908', // 구글 클라우드 프로젝트 ID
});

// 이미지 업로드 및 URL 저장 라우트 핸들러(npm install express-fileupload)
router.post('/upload', (req, res) => {
    try {

        // 세션에서 현재 로그인한 사용자의 식별자 가져오기
        // console.log(req.user);
        const userId = req.user._id;

        // 클라이언트로부터 이미지 파일 받기
        let images = req.files.image;
        
        // images가 배열이 아닌 경우 배열로 감싸기
        if (!Array.isArray(images)) {
            images = [images];
        }
        
        for (const image of images) {
            console.log(image);
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
                const resizedFileName = `umbnail_${gcsFileName}`;
                const resizedFilePath = `/tmp/${resizedFileName}`;
                await sharp(tmpFilePath).resize(50).toFile(resizedFilePath); // resize() 인자로 크기 조정

                // 리사이징한 이미지를 다시 업로드
                const resizedFile = bucket.file(resizedFileName);
                await bucket.upload(resizedFilePath);
                const thumbnailUrl = `https://storage.googleapis.com/jungle_project/${resizedFileName}`;
                
                
                // Google Cloud Vision API로 이미지 태그 생성
                const [result] = await vision.labelDetection(imageUrl);
                const labels = result.labelAnnotations;
                
                // labels에서 이름 추출
                const Tags = [];
                const TagsGoodscore = [];
                // 딕셔너리 선언(output.json)
                // const dictionary = require('../label_classification/output.json');

                labels.forEach((label) => {
                    // 딕셔너리에서 각 label에 해당하는 value값을 태그에 추가
                    // const value = dictionary[label.description.toLowerCase()];
                    // if (value) {
                    //     Tags.push(value);
                    // }          
                    Tags.push(label.description.toLowerCase());
                    if (label.score >= 0.8) {
                        TagsGoodscore.push(label.description.toLowerCase());
                    }
                });

                // Natural Language API를 사용해서 카테고리(범주) 분류
                const document = {
                    content: Tags.join(' '), // 태그들을 공백으로 구분하여 하나의 문자열로 합침
                    type: 'PLAIN_TEXT',
                };

                // google natural language api version 지정
                const classificationModelOptions = {
                    v2Model: {
                    contentCategoriesVersion: 'V2',
                    },
                };
                    
                // 추출한 태그들의 카테고리 분류
                const [classification] = language.classifyText({ document, classificationModelOptions, });
                const categories = classification.categories.map(category => category.name);  // 가장 신뢰도 높은 카테고리 추출

                // 카테고리의 중분류, 소분류를 태그로 추출해서 TagsGoodscore 앞에 삽입
                const updatedTags = [];
                const allimageCategory = [];
                categories.forEach((category) => {
                    const segments = category.split('/').filter(Boolean);   // '/' 기준 분리 및 빈 문자열 제거
                    // DB에 넣을 카테고리 분류
                    changeCategory = Classification(segments);
                    allimageCategory.push(changeCategory);
                    
                    // 중분류와 소분류만 따로 자르기
                    let values = segments.slice(1);  
                    
                    // 대분류만 존재할 경우
                    if (!values) {
                        values = segments.split('&').map(value => value.trim());
                    }
                    // 중분류와 소분류를 다시 나누기
                    else {
                        for (let i = 0; i < values.length; i++) {
                            if (values[i].includes('&')) {
                                const subValues = values[i].split('&').map(value => value.trim());  // '&' 기준 분리 및 공백 제거
                                values.splice(i, 1, ...subValues);  // values 값을 subValues 값으로 대체
                                i += subValues.length - 1;  
                            }
                        }
                    }
                    // 추출된 값들 중 'Other' 항목 제거
                    values = values.filter(value => value !== 'Other');
                    // updatedTags에 values들 추가
                    values.forEach((value) => {
                        updatedTags.push(value.toLowerCase());
                    }); 
                });
                    
                // TagsGoodscore 리스트의 앞에 추가
                const allUpdatedTags = [...updatedTags, ...TagsGoodscore];

                // 최종 태그 값들 중복값 제거
                const updatedTagsSet = new Set(allUpdatedTags);
                const imageTags = [...updatedTagsSet];

                // 최종 카테고리 값들 중복값 제거
                const imageCategorySet = new Set(allimageCategory);
                const imageCategory = [...imageCategorySet];

                // Exif 데이터에서 촬영 시간 가져오기
                const imageCreationTime = await getImageCreationTime(tmpFilePath);
                // if (!imageCreationTime) { // Exif 데이터에서 촬영 시간을 가져오지 못했을 때의 처리
                //     res.status(500).json({ error: 'Failed to read image creation time from Exif data' });
                //     return;
                // }
                
                // Exif 데이터에서 장소 정보 가져오기
                const imageLocation = await getImageLocation(tmpFilePath);
                let address;
                if (imageLocation == null) {
                    address = "" // 빈 문자열 설정
                }
                if (imageLocation) {
                    let longitude = imageLocation.longitude;
                    let latitude = imageLocation.latitude;
                    address = await getAddressFromCoordinates(longitude, latitude);
                }

                // MongoDB에 이미지 URL과 태그 저장
                // const userId = req.session.id; // 현재 로그인한 사용자의 식별자 가져오기
                // const userId = req.user.id; // 현재 로그인한 사용자의 식별자 가져오기
                // console.log(userId);
                const imageDocument = new Image({ 
                    url: imageUrl, 
                    category: imageCategory,
                    tags: imageTags,
                    thumbnailUrl: thumbnailUrl,
                    time: imageCreationTime,
                    location: address,
                    userId: userId, // 소유자 정보 할당
                });
                console.log(imageDocument);
                await imageDocument.save(); // save() 메서드 : mongoDB에 저장
        
            });
            // 이미지 파일 스트림 종료 및 업로드 완료
            // end 메서드 : 스트림을 종료하고 작업을 완료, image.data : 이미지 데이터 자체.
            stream.end(image.data);
        }
        // 성공 시 : 상태코드 200과 성공 메세지 전
        res.status(200).json({ message: 'Image uploaded and URL saved'});
    } catch (err) {  // 실패 시 : 상태코드 500과 에러 메세지 전달
        console.error(err);
        res.status(500).json({ error: 'Failed to save image URL' });
    }
});

// 갤러리로 전체 이미지 전송 라우트 핸들러
router.get('/gallery', async (req, res) => {
    try {
        // 세션에서 현재 로그인한 사용자의 식별자 가져오기
        // console.log(req.user)
        const userId = req.user._id;

        // mongoDB에서 이미지 파일 url과 tag 가져오기 
        const imagesQuery = Image.find({ userId: userId })  // find 메서드의 결과로 쿼리가 생성됨
            .sort({ time: -1 });  // 시간 기준으로 내림차순 정렬(최신순)
        const images = await imagesQuery.exec();  //해당 쿼리를 실행

        // 이미지 정보를 배열 형식으로 추출
        const imageUrlsTags = images.map((image) => {
            const tags = {};
            image.tags.forEach((tag, index) => {
                tags[`tag${index +1}`] = tag;
            });
            return {
                _id: image._id,
                url: image.url,
                category: image.category,
                tags,
                thumbnailUrl: image.thumbnailUrl,
                time: image.time,
                location: image.location,
                userId: image.userId,
            };          
        });
        // console.log(imageUrlsTags);

        // 성공 시
        res.status(200).json(imageUrlsTags); 
    } catch (err) {  // 실패 시
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch image Information' });
    } 
});

// 갤러리로 카테고리별 이미지 전송 라우트 핸들러
router.post('/galleryTags', async (req, res) => {
    try {
        // 로그인한 사용자의 식별자 & 사용자가 요청한 태그(카테고리) 가져오기
        const userId = req.user._id;
        const category = req.body.tags;
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;

        // mongoDB에서 사용자의 이미지 중 요청한 태그를 가진 것만 추출
        let imagesQuery = Image.find({ userId: userId, category: { $in: category } });  // find 메서드의 결과로 쿼리가 생성됨
        
        // 해당 날짜에 속하는 것들만 다시 추출
        if (startDate && endDate) {
            imagesQuery = imagesQuery.where('time').gte(new Date(startDate)).lte(new Date(endDate));
        }
        
        imagesQuery = imagesQuery.sort({ time: -1 });  // 시간 기준으로 내림차순 정렬(최신순)
        const images = await imagesQuery.exec();  //해당 쿼리를 실행
        
        // url과 tags를 배열 형식으로 추출
        const imageUrlsTags = images.map((image) => {
            const tags = image.tags.reduce((result, tag, index) => {
                result[`tag${index + 1}`] = tag;
                return result;
            }, {});
            return {
                _id: image._id,
                url: image.url,
                category: image.category,
                tags,
                thumbnailUrl: image.thumbnailUrl,
                time: image.time,
                location: image.location,
                userId: image.userId,
            };
        });
        // 성공 시
        res.status(200).json(imageUrlsTags); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch image Information'})
    }
});

// 갤러리에서 선택된 데이터 삭제 라우터
router.post('/galleryDelete', async (req, res) => {
    try {

        // 세션에서 현재 로그인한 사용자의 식별자 가져오기
        const userId = req.user._id;

        // 클라이언트로부터 이미지 파일 받기
        let imageIds = req.body.id;

        // imageIds가 배열이 아닌 경우 배열로 감싸기
        if (!Array.isArray(imageIds)) {
            imageIds = [imageIds];
        }
        
        for (const imageId of imageIds) {

            // // 이미지 삭제 전, 다른 곳에서 참조되고 있는지 확인 필요
            // const nodes = await Node.find({ imageObj: imageID });
            // const projects = await Project.find({ nodeIds: { $in: nodes.map(node => node._id )}});

            // // 만약 참조되고 있다면
            // if (nodes.length > 0 || projects.length >0) {
            //     // const refNodes = nodes.map(node => node._id);
            //     const refProjects = projects.map(project => project._id);
            //     res.status(400).json({
            //         error: "Selected Image is referenced by other Projects",
            //         refProjects // 참조되고 있는 프로젝트 
            //     });
            //     return;
            // }

            // 이미지 삭제
            await Image.findByIdAndDelete({ userId: userId, _id: imageId});
        }    
        // 성공 시
        res.status(200).json({ message: 'Image has been deleted'}); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to Delete image'})
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