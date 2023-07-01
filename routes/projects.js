const express = require('express');
const router = express.Router();
const User = require('../models/usermodel'); // Requiring user model
const Edge = require('../models/edge');
const Project = require('../models/project');
const { route } = require('./users');
const nodemailer = require('nodemailer');
const Node = require('../models/node');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const { Configuration, OpenAIApi } = require("openai");
const rp = require('request-promise'); // request-promise module
const dotenv = require('dotenv');
const fs = require('fs');
const archiver = require('archiver');
const axios = require('axios');
const streamifier = require('streamifier');

// Google Cloud Storage 클라이언트 생성 및 인증 정보 설정      
const storage = new Storage({
    keyFilename: path.join(__dirname, '../rich-wavelet-388908-dad58487deb3.json'), // 서비스 계정 키 파일 경로 설정
    projectId: 'rich-wavelet-388908', // 구글 클라우드 프로젝트 ID
});

const system_content = "You are an architectural professional who needs to write a report on a recently completed construction site. Write a concise report in a businesslike tone"
const user_part1 =  `The sources you should use as the basis for your report will be given. and the entire list of sources ends with "||". The "||" just marks the end of the sources, so don't include them in your report. Here are the sources you should use as the basis for your report, be sure to build your report based on them: `;
const user_part2 =  ` || Guidelines for writing a detailed report: Your report should be formatted as follows: "1. Introduction" "2. Main body", "3. Conclusion". Each part should start in the format of "Introduction:", "Main body:", "Conclusion:" Based on the sources provided earlier, organize the flow of those tasks in the report in a proper chronological order. Please think through each step one by one. Your report should be a single paragraph of 600 characters in length. Please respond with your "completed final draft of the report", not "the process of writing the report"`;
const user_part3 = `Also, please do not include "anything irrelevant to the body of the report" such as """who you (ChatGpt) are""", """what sources you consulted when writing this report""", """how you wrote the report""", etc. but simply generate and respond to the "report itself".`
// const reportInstructions = `
// 당신은 최근 완공된 건설 현장에 대한 보고서를 작성해야 하는 건축 전문가입니다. 비즈니스 어투로 간결한 보고서를 작성하세요.
// - 보고서 상세 작성 지침 : 보고서의 형식은 다음과 같아야 합니다: "1. 서론" "2. 본문", "3. 결론". 뒤에서 제공될 출처들을 기반으로, 적절한 시간순으로 해당 작업들의 흐름을 보고서에서 정리하세요. 단계별로 하나씩 하나씩 생각해서 작성해주세요. 보고서의 길이는 600자 길이의 한 문단이어야 합니다. "보고서 작성 과정"이 아닌, "완성된 최종 보고서 초안" 를 응답해주세요
// - 보고서 출처 : 당신이 보고서의 기반으로 사용해야 하는 출처들은 쉼표(,)로 구분되어 주어집니다. 다음은 보고서의 기반으로 사용할 출처들입니다, 반드시 해당 출처들을 기반으로 보고서를 작성하세요 : `;
const {Translate} = require('@google-cloud/translate').v2;
const translate = new Translate({
    projectId: 'hyeontest-388510', //eg my-proj-0o0o0o0o'
    keyFilename: path.join(__dirname, '../hyeontest-388510-6a65bba5d8ca.json') //eg my-proj-0fwewexyz.json
}); 

// Create new project
router.post('/project', async (req, res) => {
    try {
        const name = req.body.name; // body.name으로 새 프로젝트의 이름 받기
        const userId = req.user._id; // 요청한 user의 id 받아오기
        const creationTime = new Date(Date.now());
    
        // 새 프로젝트 생성
        const newProject = new Project({
            name: name,
            userIds: [userId],
            creationTime,
            thumbnail: "https://storage.googleapis.com/jungle_project/1687878175402_no_image.jpeg",
            like: false
        });

        const savedProject = await newProject.save(); // 새 프로젝트 DB에 저장
        
        const user = await User.findById(userId); 
        user.projectId.push(savedProject._id); // user data에 새로 생성한 projectId 추가
        await user.save(); 

        res.status(200).json({ "id" : savedProject._id}); // 클라이언트에 projectId 전달
    } catch (err) {
        res.status(500).json({ message: err });
    }
});

async function callChatGPT(prompt) {
    const configuration = new Configuration({
        apiKey : process.env.OPENAI_API_KEY,
    });

    try {
        const openai = new OpenAIApi(configuration);

        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo-16k",
            messages: [
              {
                role: "system",
                content: system_content
              },
              {
                role: "user",
                content: `${user_part1}${prompt}${user_part2}${user_part3}`,
              },
            ],
          });

        // const response = await openai.createCompletion({
        //     model: "gpt-3.5-turbo-16k",
        //     prompt : reportInstructions + prompt

        // });  

        // console.log("??" + response.data.choices[0].text)
        return response.data.choices[0].message;
    } catch (error) {
        console.error('Error calling ChatGPT Api : ' + error.name);
        console.error(error.message);
        console.error(error.stack);
        console.error(error.response.data);

        return null;
    }
}

async function translateText(text, target) {
    try {
        let [translations] = await translate.translate(text, target);
        translations = Array.isArray(translations) ? translations : [translations];

        return translations;
    } catch(err) {
        console.log(err.message);
        console.log(err.stack)
    }
}

// REPORT 생성
router.get('/project/report/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const userName = req.user.name;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const node = await Node.findById(project.nodeId);
        let nodeInfo = JSON.parse(node.info);

        let result = nodeInfo.reduce((acc, item) => {
            if (item.data) {
                if (item.data.title) {
                    acc.texts.push(item.data.title);
                }
                if (item.data.content) {
                    acc.texts.push(item.data.content);
                }
                if (item.data.memo) {
                    acc.texts.push(item.data.memo);
                }
                if (item.data.url) {
                    acc.urls.add(item.data.url);
                }
            }
            return acc;
        }, { texts: [], urls: new Set() });

        let prompt = result.texts.join(", ");
        prompt = await translateText(prompt, 'en')
        let response = await callChatGPT(prompt);
        response = JSON.stringify(response.content);
	console.log("리스폰스: ",response);
        response =  await translateText(response, 'ko')
        console.log("중간리스폰스:", response);

        response = await response[0].replace(/\\n/g, "");
        response = await response.replace(/\\+/g, "");
	console.log("최종리스폰스:", response);

        res.status(200).json({
            title : project.name,
            presenter : userName,
            content : response,
            urls : Array.from(result.urls)
        });
    } catch (err) {
        res.status(500).json({ message: err });
    }
});
const axios = require('axios');

// 이미지 URL을 Data URL로 변환하는 비동기 함수
async function convertToDataURL(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const dataURL = `data:${response.headers['content-type']};base64,${base64}`;
    return dataURL;
}

router.get('/project/images/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const node = await Node.findById(project.nodeId);
        let nodeInfo = JSON.parse(node.info);

        let result = nodeInfo.reduce((acc, item) => {
            if (item.data) {
                if (item.data.url) {
                    acc.urls.add(item.data.url);
                }
            }
            return acc;
        }, { urls: new Set() });

        let urls = Array.from(result.urls);
        // 각 이미지 URL을 Data URL로 변환
        let dataURLs = [];
        for (let i = 0; i < urls.length; i++) {
            const dataURL = await convertToDataURL(urls[i]);
            dataURLs.push(dataURL);
        }

        // 데이터 url들 레디스에 캐싱해두었다가, 추후 zip파일 요청에서 사용
        req.app.locals.redisClient.set(projectId + 'dataurls')

        res.status(200).json({
            urls : dataURLs
        });
    } catch (err) {
        res.status(500).json({ message: err });
    }
});

router.get('/project/zipimage/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;

        // Redis에서 dataURLs 가져오기
        client.get(projectId + 'dataurls', async (err, reply) => {
            if (err) {
                console.log(err);
                return res.status(500).json({message: '레디스에서 프로젝트의 dataURL들을 가져오는 과정에서 문제가 발생했습니다.'});
            }

            const dataURLs = JSON.parse(reply);

            if (!dataURLs) {
                return res.status(404).json({message: 'No dataURLs found for this project.'});
            }

            // 임시 파일 리스트 초기화
            let tempFiles = [];

            // zip 생성기(archiver) 초기화
            const zip = archiver('zip', {
                zlib: { level: 9 }
            });

            for (let i = 0; i < dataURLs.length; i++) {
                const url = dataURLs[i];
                const response = await axios.get(url, { responseType: 'arraybuffer' }); // 이미지를 arrayBuffer형태로 다운로드 받음 
                const buffer = new Buffer.from(response.data, 'binary'); // binary데이터를 다루는데 필요한 Buffer 객체로 변환
                const stream = streamifier.createReadStream(buffer); // 버퍼 객체로부터 stream 객체를 생성 

                // Stream 객체를 사용해서 바로 zip에 추가
                zip.append(stream, { name: `image${i}.png` });
            }

            res.status(200);
            res.attachment('images.zip'); // 응답 헤더의 content-Disposition 
            
            // zip 파일을 만들고, 이를 응답에 pipe 함
            zip.finalize().pipe(res);
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({message: 'Something went wrong.'});
    }
});


/* 프로젝트에 새로운 유저 추가 */
router.post('/project/:projectId', async(req, res) => {
    try { 
        const curUser   = await User.findById(req.user._id);
        const projectId = req.params.projectId;
        const InvitedUserEmail = req.body.userEmail;  
        const InvitedUser = await User.findOne({'email' : InvitedUserEmail})

        // 방에 포함된 유저인지 확인
        if (!curUser.projectId.includes(projectId)) {
            return res.status(400).json({message: "You're not part of this project"});
        }
    
        // 해당하는 유저 이메일로 초대 이메일 발송
        let smtpTransport = nodemailer.createTransport({
            service: 'Gmail',
            auth : {
            user : process.env.GMAIL_EMAIL,
            pass : process.env.GMAIL_PASSWORD
            }
        });
        
        const project = await Project.findById(projectId);
        const domain = "https://hyeontae.shop"; // 배포시 바꿔줘야 함

        let mailOptions = {
            to: InvitedUserEmail,
            from : '1park4170@gmail.com',
            subject : curUser.name + '님이 초대하신' + project.name + '프로젝트에 참여하세요!!',
            text : '다음의 링크를 클릭하시면 프로젝트 창으로 이동할 수 있습니다' + 'https://www.phodo.store/project/' + InvitedUser.email + '/' + projectId
        };
        
        console.log("갔나??")

        smtpTransport.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log("Failed to send the email: ", err);
                console.log("Failed to send the email, name : ", err.name);
                console.log("Failed to send the email, email : ", err.message);

                res.status(500).json({message: "Failed to send the email"});
            } else {
                console.log("Email successfully sent with response: ", info);
                res.status(200).json({'Redirect URL': requestURL});
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({message: "Something went wrong."});
    }
}) 


/* 특정 프로젝트 get */
router.get('/project/:projectId', async(req, res) => { 
    try {
        const project = await Project.findById(req.params.projectId);

        const node = project?.nodeId ? await Node.findById(project.nodeId) : null;

        const edge = project?.edgeId ? await Edge.findById(project.edgeId) : null;

        let nodeInfo = node ? node.info : undefined;
        let edgeInfo = edge ? edge.info : undefined;

        nodeInfo = nodeInfo ? JSON.parse(nodeInfo) : undefined;
        edgeInfo = edgeInfo ? JSON.parse(edgeInfo) : undefined;

        console.log("노드", nodeInfo);
        console.log("엣지", edgeInfo);

        // 노드 정보와 엣지 정보를 하나의 객체로 만들고 이를 응답으로 전송
        const response = {
            node: nodeInfo,
            edge: edgeInfo
        };

        return res.json(response);
    } catch (err) {
        console.error(err);

        if (err instanceof mongoose.Error.CastError) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        if (err instanceof mongoose.Error.DocumentNotFoundError) {
            return res.status(404).json({ message: 'Document not found' });
        }

        return res.status(500).json({ message: err.message });
    }
});


// 해당 이메일 클릭시 유저와 project document 모두에 join 사실 반영
router.get('/project/:newUserEmail/:projectId', async(req, res) => {
    try {
        newUser = await User.findOne({ 'email' : req.params.newUserEmail });
        project = await Project.findById(req.params.projectId);


        if (!newUser) {
            res.status(400).json({ 'message': 'No Such User' });
        }

        if (!project) {
            res.status(400).json({ 'message': 'No Such Project' });
        }


        /* 유저 - 프로젝트 연결 */
        await project.userIds.push(newUser._id);
        await newUser.projectId.push(project._id); 


        await project.save();
        await newUser.save();


        res.status(200).json({ 'message': 'success fully joined to new project' });

        // 프로젝트로 리다이렉트 필요??
    } catch(err) {
        console.log(err)
        res.status(500).json({ 'message': err });
    }
})

async function getRepresentingImgURL(NodeId) {
    try {
        const nodes = await Node.findById(NodeId);
        if (!nodes) return null; // cannot read properties of null('info') 방지

        const nodesObj = JSON.parse(JSON.stringify(nodes));
        const parsed_json = JSON.parse(nodesObj.info)

        for(let obj of parsed_json) {
            if(obj.type === 'pix' && obj.data?.url) {
                return obj.data.url
            }
        }

        return null;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

// get project
router.get('/project', async (req, res) => {
    try {
        const userId = req.user._id;  // 요청한 유저의 ID 가져오기

        // Project 테이블에서 userIds에 userId를 포함하는 프로젝트를 모두 찾음
        const projects = await Project.find({ userIds: userId });

        // 각 프로젝트의 _id와 name만 추출
        const projectNamesAndIdsPromises = projects.map(async (project) => { // promise들의 배열 생성
            // let imageUrl = await getRepresentingImgURL(project.nodeId);
            return {
                _id: project._id,
                name: project.name,
                image : project.thumbnail,
                time: project.creationTime,
                like: project.like
            };
        });

        // promise 배열 실행 기다림
        const projectNamesAndIds = await Promise.all(projectNamesAndIdsPromises);

        // 결과 반환
        res.status(200).json(projectNamesAndIds);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 프로젝트 썸네일 변경
router.patch('/project/thumbnail', async (req, res) => {
    try {
        const projectId = req.body.projectId;
        const image = req.files.thumbnail;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        console.log("thumbnail change: ", project.name);

        const bucket = storage.bucket('jungle_project');
        const gcsFileName = `${Date.now()}_${image.name}`;
        const file = bucket.file(gcsFileName);
        const stream = file.createWriteStream({
            metadata: {
                contentType: image.mimetype,
            },
            resumable: false,
        });

        stream.on('error', (err) => {
            console.error(err);
            res.status(400).json({ error: 'Failed to upload image' });
        });

        stream.on('finish', async () => {
            const imageUrl = `https://storage.googleapis.com/jungle_project/${gcsFileName}`;
            project.thumbnail = imageUrl;
            await project.save();
            res.status(200).json({ thumbnail : project.thumbnail });
        });

        stream.end(image.data);
    } catch (err) {
        res.status(500).json({ err: err.message })
    }
});


// like project
router.patch('/project/like', async (req, res) => {
    try {
      const projectId = req.body.projectId;
      const isLike = req.body.isLike;
  
      // 프로젝트를 찾습니다
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found.' });
      }
  
      // 좋아요 상태를 업데이트합니다
      project.like = isLike;
  
      // 변경사항을 저장합니다
      await project.save();
  
      // 결과를 반환합니다
      res.status(200).json({ like: project.like });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });



// Rename project
router.patch('/project/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const newName = req.body.name;

        // Find the project by projectId and update
        const project = await Project.findByIdAndUpdate(
            projectId, 
            { name: newName }, 
            { new: true } // This option returns the updated document
        );

        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        res.sendStatus(200); // Only send HTTP status code 200 on success
    } catch (err) {
        res.status(500).json({ message: err });
    }
});


// Delete project
router.delete('/project/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const userId = req.user._id;

        // Find the project by projectId
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        await Node.findByIdAndDelete(project.nodeId);
        await Edge.findByIdAndDelete(project.edgeId);
        await Project.findByIdAndDelete(projectId);
        
        // Remove the project's id from the user's projectId array
        const user = await User.findById(userId);
        user.projectId = await user.projectId.filter(id => !id.equals(projectId));

        await user.save();

        res.status(200).json({ message: 'Project, its nodes, edges and reference from user were successfully deleted.' });
    } catch (err) {
        res.status(500).json({ message: err });
    }
});


module.exports = router;
