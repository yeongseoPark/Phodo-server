const express = require('express');
const router = express.Router();
const User = require('../models/usermodel'); // Requiring user model

const Node = require('../models/node');
const { Image, imageSchema } = require('../models/image');

router.post('/nodes', async function(req, res, next) {
    const width = req.body.width;
    const height = req.body.height;
    const node_id = req.body.node_id;
    const position = req.body.position;
    const memo = req.body?.key;
    const image_url = req.body?.image_url; // 이미지 url받아서 Image document자체로 변경 
    try {
        let image = null;

        if (image_url) {
            image = await Image.findOne({ url : image_url })
        }

        let nodeData = {
            width : width,
            height : height,
            node_id : node_id,
            imageObj : image,
            location: {
                type: "Point",  // 지리적 데이터 타입 설정
                coordinates: position  // 지리적 좌표 설정
              },
            memo : memo,
        }

        const NodeDoc = new Node(nodeData);

        await NodeDoc.save();  // save() 메서드 : mongoDB에 저장

        // 성공 시 : 상태코드 200과 성공 메세지 전달.
        res.status(200).json({ message: 'Node succesfully saved.' });
    } catch(err) {
        // 실패 시 : 상태코드 500과 에러 메세지 전달.
        console.error(err);
        res.status(500).json({ error: 'Failed to save Node' });
    }
});

router.get('/nodes/:node_id', async function(req, res, next) {
    try {
        const node_id = req.params.node_id;
        console.log(node_id);
    
        let node = await Node.findOne({ node_id : node_id })

        node = node.toObject();

        if (node.imageObj) {
            node.imageObj = node.imageObj.url;
        }   

        // 성공 시 : 상태코드 200과 성공 메세지 전달.
        res.status(200).json({ message: node });
    } catch(err) {
        // 실패 시 : 상태코드 500과 에러 메세지 전달.
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
