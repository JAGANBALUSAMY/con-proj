const ollama = require('./ollamaService');
const mock = require('./mockAnalyst');

/**
 * Orchestrate analysis between local LLM and Mock Fallback
 */
const getAnalysis = async (summary, options = {}) => {
  const useFallback = options.fallbackOnFailure !== false;
  const model = options.model || 'llama3';

  try {
    // Prepare prompt
    const prompt = `You are an industrial production intelligence system analyzing factory analytics.
        Generate a professional production intelligence report using the provided metrics.
        Return structured JSON using the following format:
        {
          "executive_summary": "string",
          "kpis": {
            "total_batches": number,
            "units_processed": number,
            "defect_rate": number,
            "top_operator": "string"
          },
          "stage_efficiency": array,
          "defect_distribution": array,
          "operator_performance": array,
          "operational_analysis": "string",
          "risk_assessment": "string",
          "recommendations": "string"
        }

        Report Requirements:
        Executive Summary: 2–3 sentences describing the overall production condition.
        Operational Analysis: Explain production efficiency across stages and identify bottlenecks.
        Risk Assessment: Identify quality risks or defect concentration patterns.
        Recommendations: Provide 2–3 practical operational suggestions.

        Rules:
        - Do NOT invent numbers.
        - Use only the provided metrics.
        - Each paragraph should be 40–80 words.
        - Return ONLY JSON. No markdown or explanations.

        Data to analyze:
        ${JSON.stringify(summary, null, 2)}`;

    // Attempt Ollama
    const result = await ollama.generate(model, prompt, { timeout: 20000 });

    // Clean potential markdown if LLM misbehaves
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
    return { data: JSON.parse(cleaned), method: 'AI_LLM' };

  } catch (error) {
    if (useFallback) {
      console.warn('AI Service failed or malformed, falling back to Mock Analyst');
      const result = mock.analyzeProduction(summary);
      return { data: result, method: 'SYSTEM_FALLBACK' };
    }
    throw error;
  }
};

module.exports = { getAnalysis };
