const express = require('express');
const router = express.Router();
const User = require('../models/usermodel'); // Requiring user model
const Edge = require('../models/edge');
const Project = require('../models/project');

// Create new project
router.post('/project', async (req, res) => {
    const name = req.body.name;
    const userId = req.user._id;

    const newProject = new Project({
        name: name,
        userId: [userId],
        nodeId: [],
        edgeId: []
    });

    try {
        const savedProject = await newProject.save();
        res.status(200).json(savedProject);
    } catch (err) {
        res.status(500).json({ message: err });
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

        res.status(200).json(project);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});

// Delete project
router.delete('/project/:projectId', async (req, res) => {
    const projectId = req.params.projectId;

    try {
        // Find the project by projectId
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        // Loop through nodeId array and delete each node
        for (let nodeId of project.nodeId) {
            await Node.findByIdAndDelete(nodeId);
        }

        // Loop through edgeId array and delete each edge
        for (let edgeId of project.edgeId) {
            await Edge.findByIdAndDelete(edgeId);
        }

        // Finally, delete the project
        await Project.findByIdAndDelete(projectId);

        res.status(200).json({ message: 'Project, its nodes and edges were successfully deleted.' });
    } catch (err) {
        res.status(500).json({ message: err });
    }
});


module.exports = router;