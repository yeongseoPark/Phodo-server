const express = require('express');
const router = express.Router();
const User = require('../models/usermodel'); // Requiring user model
const Edge = require('../models/edge');
const Project = require('../models/project');

// Save
router.post('/edges/:projectId', async (req, res) => {
    const projectId = req.params.projectId;
    const edges = req.body.edges;

    try {
        // edges 배열의 각 엣지에 대해 MongoDB에 새 Edge를 생성하고, 그 _id를 edgeIds 배열에 추가
        const edgeIds = [];
        for (let edge of edges) {
            const newEdge = new Edge({
                source: edge.source,
                target: edge.target
        });
        try {
            const savedEdge = await newEdge.save();
            edgeIds.push(savedEdge._id);
        } catch (err) {
            console.error(`Failed to save edge: ${err}`);
        // Choose how to handle this error: rethrow, continue, etc.
    }
}
        // projectId에 해당하는 프로젝트를 찾아서 그의 edgeId 배열을 edgeIds로 교체
        const project = await Project.findById(projectId);
        
        const oldEdgeIds = project.edgeId;
        for (let oldEdgeId of oldEdgeIds) {
            await Edge.findByIdAndDelete(oldEdgeId);
        } 

        project.edgeId = edgeIds;
        await project.save();

        res.json(project);
    } catch (err) {
        res.json({ message: err });
    }
});


// projectId에 해당하는 모든 edge를 배열에 담아서 반환
router.get('/edges/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        // find the project with the given projectId
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({message: "No project found with the provided ID."});
        }

        // get the edges using the edgeId array in the project
        const edges = await Edge.find({_id: {$in: project.edgeId}});
        res.status(200).json(edges);
    } catch (err) {
        res.status(500).json({message: err});
    }
});


// Delete
router.delete('/edges/:edgeId', async (req, res) => {
    try {
        const removedEdge = await Edge.findOneAndDelete({ edgeId: req.params.edgeId });
        res.json(removedEdge);
    } catch (err) {
        res.json({ message: err });
    }
});

module.exports = router;
