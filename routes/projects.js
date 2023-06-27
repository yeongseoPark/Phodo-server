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

// Create new project
router.post('/project', async (req, res) => {

    const name = req.body.name; // body.name으로 새 프로젝트의 이름 받기
    const userId = req.user._id; // 요청한 user의 id 받아오기
    const creationTime = new Date(Date.now());

    // 새 프로젝트 생성
    const newProject = new Project({
        name: name,
        userIds: [userId],
        creationTime,
        like: false
    });

    try {
        const savedProject = await newProject.save(); // 새 프로젝트 DB에 저장
        
        const user = await User.findById(userId); 
        user.projectId.push(savedProject._id); // user data에 새로 생성한 projectId 추가
        await user.save(); 

        res.status(200).json({ "id" : savedProject._id}); // 클라이언트에 projectId 전달
    } catch (err) {
        res.status(500).json({ message: err });
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
            return res.status(400).json({message: "You're not part of this project"}) }
    
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
            text : '다음의 링크를 클릭하시면 프로젝트 창으로 이동할 수 있습니다' + domain + '/project/' + InvitedUser.email + '/' + projectId
        };
        
        smtpTransport.sendMail(mailOptions, err=> {
            res.status(200).json({'message': 'Email send with further instructions. Please check that.'});
          });

        res.status(200).json({message: "Invitation successfully sent"});

    } catch (err) {
        console.log(err);
        res.status(500).json({message: "Something went wrong."});
    }
}) 

/* 특정 프로젝트 get */
router.get('/project/:projectId', async(req, res) => { 
    try {
        const project = await Project.findById(req.params.projectId);
        console.log(project.nodeId)

        const node = await Node.findById(project.nodeId);
        const edge = await Edge.findById(project.edgeId);

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
            const imageUrl = await getRepresentingImgURL(project.nodeId);
            // if (!imageUrl) {
            //     // imageUrl = "./no_image.jpeg";
            // }
            return {
                _id: project._id,
                name: project.name,
                image : imageUrl,
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

// like project
router.patch('/project/like/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        
        // 프로젝트를 찾습니다
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        // 좋아요 상태를 업데이트합니다
        project.like = !project.like;
        
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
    const projectId = req.params.projectId;
    const newName = req.body.name;

    try {
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
    const projectId = req.params.projectId;
    const userId = req.user._id;

    try {
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