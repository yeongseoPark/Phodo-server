const express = require('express');
const router = express.Router();
const User = require('../models/usermodel'); // Requiring user model
const Edge = require('../models/edge');

// Create
router.post('/edges', async (req, res) => {
    const edgeList = req.body.edges;
    for (let i = 0; i < edgeList.length; i++) {
        let edgeCurr = edgeList[i];
        let edge = new Edge({
            edgeId: edgeCurr.id,
            source: edgeCurr.source,
            target: edgeCurr.target
        });
        try {
            const savedEdge = await edge.save();
        } catch (err) {
            res.json({ message: err });
            return;
        }
    }
    res.status(200).json({ message: 'Edge succesfully saved.' });
    
});

// Read
router.get('/edges/:edgeId', async (req, res) => {
    try {
        const edge = await Edge.findOne({ edgeId: req.params.edgeId });
        res.json(edge);
    } catch (err) {
        res.json({ message: err });
    }
});

// Update
router.patch('/edges/:edgeId', async (req, res) => {
    try {
        const updatedEdge = await Edge.updateOne(
            { edgeId: req.params.edgeId },
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
