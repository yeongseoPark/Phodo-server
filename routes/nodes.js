const express = require('express');
const router = express.Router();
const User = require('../models/usermodel'); // Requiring user model
const mongoose = require('mongoose')

const Node = require('../models/node');
const Project = require('../models/project')
const { Image, imageSchema } = require('../models/image');


/* projectId가 param으로 주어지지 않는 경우 : 새 프로젝트 생성하고, 노드들 저장 */
/* projectId가 param으로 주어지지 않는 경우 : 새로운 프로젝트 생성 */
router.post('/nodes', async function(req, res, next) {
    const allNodes = req.body.nodes;
    const userId = req.session.userId; // 세션에서 사용자 ID 가져오기

    /* 새 프로젝트 만들기 */
    const project = new Project({
        userId: mongoose.Types.ObjectId(userId),
        nodeIds: []
    });

    /* 노드 리스트 생성 */
    for (let i = 0; i < allNodes.length; i++) {
        let nodeI = allNodes[i];

        const width = nodeI.width;
        const height = nodeI.height;
        const position = nodeI.position;
        const x = position.x;
        const y = position.y;
        let memo = nodeI?.data;
        memo = memo?.label;
        const image_url = nodeI?.image_url;

        try {
            let image = null;
            if (image_url) {
                image = await Image.findOne({ url: image_url });
            }
    
            let nodeData = {
                width: width,
                height: height,
                imageObj: image,
                location: {
                    type: "Point",
                    coordinates: [x, y]
                },
                memo: memo,
            }
            
            const NodeDoc = new Node(nodeData);
            await NodeDoc.save();

            // Node 저장 후 프로젝트의 nodeIds에 추가
            project.nodeIds.push(NodeDoc._id);
        } catch(err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to save Node' });
            return;
        }
    }

    // 프로젝트 저장
    try {
        await project.save();
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save project' });
        return;
    }

    // 성공 시 : 상태코드 200과 성공 메세지와 함께 생성된 프로젝트 ID 전달
    res.status(200).json({ message: 'Project successfully saved.', projectId: project._id });
});



/* projectId가 param으로 주어지는 경우 : 기존 프로젝트에 해당하는 노드들을 모두 지워주고 다시 업로드 -> 수정 OR 삭제라고 보는게 맞을듯 */
router.post('/nodes/:projectId', async function(req, res, next) {
    const allNodes = req.body.nodes;
    let projectId = req.params.projectId;
    projectId = mongoose.Types.ObjectId(req.params.id);

     /* 프로젝트 ID로 프로젝트 찾기. 없으면 새로 만들기 */
    let project;
    try {
        project = await Project.find({_id : projectId});
        if (!project) {
            throw err;
        }
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to find project' });
        return;
    }

    /* 리스트 갈아낄거임 : 노드 컬렉션에서 현재 프로젝트에 해당하는 전체 노드 모두 삭제 후 다시 집어넣기 */
    try {
        await Node.deleteMany({ _id: { $in: project.nodeIds } }); // ???
        console.log('프로젝트에 해당하는 Node의 모든 document 삭제 성공');
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete old nodes' });
        return;
    }
        
    /* 등록 / 수정 / 삭제 모두 여기서 해야함 */ 
    for (let i = 0; i < allNodes.length; i++) {
        let nodeI = allNodes[i];

        const width = nodeI.width;
        const height = nodeI.height;
        // const node_id = nodeI.id;
        const position = nodeI.position;
        const x = position.x;
        const y = position.y;
        let memo = nodeI?.data;
        memo = memo?.label;
        const image_url = nodeI?.image_url; // 이미지 url받아서 Image document자체로 변경 
        try {
            let image = null;
    
            if (image_url) {
                image = await Image.findOne({ url : image_url })
            }
    
            let nodeData = {
                width : width,
                height : height,
                // node_id : node_id,
                imageObj : image,
                location: {
                    type: "Point",  // 지리적 데이터 타입 설정
                    coordinates: [x,y]  // 지리적 좌표 설정
                  },
                memo : memo,
            }
            
            const NodeDoc = new Node(nodeData);
            await NodeDoc.save();  // save() 메서드 : mongoDB에 저장

            // Node 저장 후 프로젝트의 nodeIds에 추가
            project.nodeIds.push(NodeDoc._id);
        } catch(err) {
            // 실패 시 : 상태코드 500과 에러 메세지 전달.
            console.error(err);
            res.status(500).json({ error: 'Failed to save Node' });
            return;
        }
    }

    // 프로젝트 업데이트
    try {
        await project.save();
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update project' });
        return;
    }

    // 성공 시 : 상태코드 200과 성공 메세지 전달.
    res.status(200).json({ message: projectId });
});

/* 썸네일 이미지 & 이미지 URL 줘야함 : 썸네일 이미지 클릭시 이미지를 주는 lazy-loading 방식 */
router.get('/nodes:projectId', async function(req, res, next) {
    const projectId = req.params.projectId;

    try {
        // 먼저 프로젝트를 찾습니다.
        const project = await Project.findById(projectId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // 2번째 인자는 projection string
        const nodes = await Node.find({
            _id: { $in: project.nodeIds }
        }, 'node_id location width height memo imageObj.url imageObj.thumbnailUrl');

        const nodesWithTransformedImageObj = nodes.map(node => {
            const { _doc: originalNode } = node;
          
            // originalNode.imageObj가 undefined가 아닐 때만 새로운 형식으로 변환하고,
            // 그렇지 않으면 원래의 imageObj를 그대로 사용합니다.
            let newImageObj = originalNode.imageObj;
            if (originalNode.imageObj !== undefined) {
              newImageObj = {
                thumbnailUrl: originalNode.imageObj.thumbnailUrl,
                url: originalNode.imageObj.url
              };
            }
          
            return {
              ...originalNode,
              imageObj: newImageObj
            };
          });
          

        res.status(200).json(nodesWithTransformedImageObj);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/nodes/:node_id', async function(req, res, next) {
    try {
        const node_id = req.params.node_id;

        // Node를 찾고 삭제합니다.
        const result = await Node.findOneAndDelete({ node_id : node_id });

        if (!result) {
            return res.status(404).json({ message: 'Node not found' });
        }

        // 성공 시 : 상태코드 200과 성공 메세지 전달.
        res.status(200).json({ message: 'Node successfully deleted' });
    } catch(err) {
        // 실패 시 : 상태코드 500과 에러 메세지 전달.
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/nodes/:node_id', async function(req, res, next) {
    try {
        const node_id = req.params.node_id;
        const { width, height, imageObj, position, memo } = req.body;

        // 이미지 URL로부터 Image document 가져오기
        let image = null;
        if (imageObj) {
            image = await Image.findOne({ url : imageObj });
        }

        let updateData = {
            width: width,
            height: height,
            imageObj: image,
            location: position,
            memo: memo,
        }

        // Null 또는 Undefined 값 제거
        updateData = JSON.parse(JSON.stringify(updateData));

        const updatedNode = await Node.findOneAndUpdate({ node_id : node_id }, updateData, { new: true });

        if (!updatedNode) {
            // 수정할 노드를 찾지 못했을 때
            return res.status(404).json({ message: 'Node not found.' });
        }

        // 성공 시: 상태코드 200과 성공 메시지 전달.
        res.status(200).json({ message: 'Node successfully updated.', data: updatedNode });
    } catch(err) {
        // 실패 시: 상태코드 500과 에러 메시지 전달.
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;
