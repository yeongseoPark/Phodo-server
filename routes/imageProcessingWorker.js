const { parentPort, workerData } = require('worker_threads');
const storage = require('@google-cloud/storage')();
const sharp = require('sharp');
const vision = require('@google-cloud/vision');
const language = require('@google-cloud/language');
const Image = require('../models/image'); // Image 모델 불러오기
const { getImageMetadata, getAddressFromCoordinates, Classification } = require('../helpers');

async function processImage() {
    const { imagePath, imageName, userId } = workerData;

    try {
        const bucket = storage.bucket('jungle_project');
        const gcsFileName = `${Date.now()}_${imageName}`;
        const file = bucket.file(gcsFileName);

        const stream = file.createWriteStream({
            metadata: {
                contentType: 'image/jpeg', // 여기서는 이미지의 mime 타입을 알 수 없으므로, 일반적인 'image/jpeg'을 사용했습니다. 실제 mime 타입을 알고 있다면 이 부분을 변경하시면 됩니다.
            },
            resumable: false,
        });

        const imageUrl = `https://storage.googleapis.com/jungle_project/${gcsFileName}`;

        const resizedFileName = `thumbnail_${gcsFileName}`;
        const resizedFilePath = `/tmp/${resizedFileName}`;
        await sharp(imagePath).resize(128).toFile(resizedFilePath);

        const resizedFile = bucket.file(resizedFileName);
        await bucket.upload(resizedFilePath);
        const thumbnailUrl = `https://storage.googleapis.com/jungle_project/${resizedFileName}`;

        const [result] = await vision.labelDetection(imageUrl);
        const labels = result.labelAnnotations;

        const Tags = [];
        const TagsGoodscore = [];

        labels.forEach((label) => {
            Tags.push(label.description.toLowerCase());
            if (label.score >= 0.8) {
                TagsGoodscore.push(label.description.toLowerCase());
            }
        });

        const document = {
            content: Tags.join(' '),
            type: 'PLAIN_TEXT',
        };

        const classificationModelOptions = {
            v2Model: {
                contentCategoriesVersion: 'V2',
            },
        };

        const [classification] = await language.classifyText({ document, classificationModelOptions });
        const categories = classification.categories.map(category => category.name);

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

        const allUpdatedTags = [...updatedTags, ...TagsGoodscore];

        const updatedTagsSet = new Set(allUpdatedTags);
        const imageTags = [...updatedTagsSet];

        const imageCategorySet = new Set(allimageCategory);
        const imageCategory = [...imageCategorySet];

        const { creationTime: imageCreationTime, location: imageLocation } = await getImageMetadata(tmpFilePath);

        let address;
        if (imageLocation == null) {
            address = "" // 빈 문자열 설정
        }
        if (imageLocation) {
            let longitude = imageLocation.longitude;
            let latitude = imageLocation.latitude;
            address = await getAddressFromCoordinates(longitude, latitude);
        }

        const uploadTime = new Date();

        const imageDocument = {
            url: imageUrl,
            category: imageCategory,
            tags: imageTags,
            thumbnailUrl: thumbnailUrl,
            time: imageCreationTime,
            location: address,
            userId: userId,
            uploadTime: uploadTime,
        };

        parentPort.postMessage(imageDocument);
    } catch (err) {
        throw err;
    }
}

processImage();
