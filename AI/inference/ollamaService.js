const axios = require('axios');

/**
 * Execute inference on local Ollama instance
 */
const generate = async (model, prompt, options = {}) => {
    try {
        const response = await axios.post('http://localhost:11434/api/generate', {
            model,
            prompt,
            stream: false,
            ...options
        }, {
            timeout: options.timeout || 10000
        });

        return response.data.response;
    } catch (error) {
        console.error('Ollama Inference Error:', error.message);
        throw error;
    }
};

module.exports = {
    generate,
};
