const ollamaService = require('../inference/ollamaService');
const promptTemplates = require('../utils/promptTemplates');

/**
 * Generate a production report pipeline
 */
const runReportPipeline = async (summary) => {
    const prompt = promptTemplates.getProductionReportPrompt(summary);
    return await ollamaService.generate('llama3', prompt);
};

module.exports = {
    runReportPipeline,
};
