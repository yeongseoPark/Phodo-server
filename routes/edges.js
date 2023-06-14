const express = require('express');
const router = express.Router();
const User = require('../models/usermodel'); // Requiring user model
const Edge = require('../models/edge');
const Project = require('../models/project');

// Create
router.post('/edges', async (req, res) => {
});

// Save
router.post('/edges/:projectId', async (req, res) => {
    const edgeList = req.body.edges;
    const projectId = req.params.projectId;

    try {
        // Delete all existing edges
        await Edge.deleteMany({ projectId : projectId });

        for (let i = 0; i < edgeList.length; i++) {
            let edgeCurr = edgeList[i];
            let edge = new Edge({
                projectId: projectId,
                source: edgeCurr.source,
                target: edgeCurr.target
            });

            try {
                const savedEdge = await edge.save();
            } catch (err) {
                res.status(500).json({ message: 'Error while saving an edge: ' + err });
                return;
            }
        }
        res.status(200).json({ message: 'Edges successfully saved.'});
    } catch (err) {
        res.status(500).json({ message: 'Error while deleting existing edges: ' + err });
    }
});

// projectId에 해당하는 모든 edge를 배열에 담아서 반환
router.get('/edges/:projectId', async (req, res) => {
    const projectId = req.params.projectId;
    try {
        const edges = await Edge.find({ projectId : projectId });
        res.json(edges);
    } catch (err) {
        res.json({ message: err });
    }
});


// Update
router.patch('/edges/:id', async (req, res) => {
    try {
        const updatedEdge = await Edge.updateOne(
            { edgeId: req.params.id },
            { $set: {source: req.body.source, target: req.body.target} }
        );
        res.json(updatedEdge);
    } catch (err) {
        res.json({ message: err });
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
