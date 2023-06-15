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
        
        const user = await User.findById(userId);
        user.projectId.push(savedProject._id);
        await user.save();

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
    const userId = req.user._id;

    try {
        // Find the project by projectId
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        // Loop through nodeId array and delete each node
        for (let nodeId of project.nodeIds) {
            await Node.findByIdAndDelete(nodeId);
        }

        // Loop through edgeId array and delete each edge
        for (let edgeId of project.edgeIds) {
            await Edge.findByIdAndDelete(edgeId);
        }

        // Finally, delete the project
        await Project.findByIdAndDelete(projectId);
        
        // Remove the project's id from the user's projectId array
        const user = await User.findById(userId);
        user.projectId = user.projectId.filter(id => !id.equals(projectId));
        await user.save();

        res.status(200).json({ message: 'Project, its nodes, edges and reference from user were successfully deleted.' });
    } catch (err) {
        res.status(500).json({ message: err });
    }
});



module.exports = router;