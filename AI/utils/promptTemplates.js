/**
 * Production Report Prompt Template
 */
const getProductionReportPrompt = (summary) => {
    return `You are an industrial production analyst.

Analyze the manufacturing summary provided.

Focus on:
- production efficiency
- stage delays
- defect patterns
- operator productivity

Do NOT invent numbers. Only use the data provided.

Write a concise report (120–200 words).

Data:
${JSON.stringify(summary, null, 2)}`;
};

module.exports = {
    getProductionReportPrompt,
};
