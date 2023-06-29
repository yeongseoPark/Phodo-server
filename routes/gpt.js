const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const { Configuration, OpenAIApi } = require("openai");

async function callChatGPT(prompt) {
    const configuration = new Configuration({
        apiKey : process.env.OPENAI_API_KEY,
    });

    try {
        const openai = new OpenAIApi(configuration);

        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{role: "user", content: "Hello world"}],
        });

        return response.data.choices[0].message;
    } catch (error) {
        console.error('Error calling ChatGPT Api : ' + error);
        return null;
    }
}

router.post('/ask', async (req, res) => { 
    try {
    const prompt = req.body.prompt;
    const response = await callChatGPT(prompt);

    res.status(200).json({'response' : response })
    } catch(err) {
        res.status(500).json({'error' : err })
    }
})

module.exports = router;