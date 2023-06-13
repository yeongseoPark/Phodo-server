const express = require('express');
const router = express.Router();
const User = require('../models/usermodel'); // Requiring user model
const Edge = require('../models/edge');

// Create
router.post('/edges', async (req, res) => {
    const edge = new Edge({
        edgeId: req.body.edgeId,
        source: req.body.source,
        target: req.body.target
    });
    try {
        const savedEdge = await edge.save();
        res.json(savedEdge);
    } catch (err) {
        res.json({ message: err });
    }
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
