
const commands = [
  {
    name: 'ask',
    description: 'Ask a question and receive an answer from a configured AI provider.',
    department: 'ai-intelligence',
    permissions: ['user'],
    async execute({ args = [], text = '' } = {}) {
      const question = text.trim() || args.join(' ').trim();

      if (!question) {
        return { text: 'Usage: .ask <your question>' };
      }

      const endpoint = process.env.AI_API_URL;
      const apiKey = process.env.AI_API_KEY;

      if (!endpoint || !apiKey) {
        return {
          text: 'AI is not configured yet. MUNAISZN X does not pretend to generate AI answers without a working AI provider. Configure a compatible provider to enable this command.'
        };
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: question }]
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
          return {
            text: `AI provider returned HTTP ${response.status}. Please try again later.`
          };
        }

        const data = await response.json();

        const answer =
          data.choices?.[0]?.message?.content ??
          data.output_text ??
          data.response;

        if (typeof answer !== 'string' || !answer.trim()) {
          return {
            text: 'The AI provider returned no readable answer.'
          };
        }

        return { text: answer.trim().slice(0, 12000) };
      } catch {
        return {
          text: 'Could not reach the configured AI provider. Check its endpoint and connection.'
        };
      }
    }
  },

  {
    name: 'summarize',
    description: 'Summarize text using a configured AI provider.',
    department: 'ai-intelligence',
    permissions: ['user'],
    async execute({ args = [], text = '' } = {}) {
      const content = text.trim() || args.join(' ').trim();

      if (!content) {
        return { text: 'Usage: .summarize <text to summarize>' };
      }

      const endpoint = process.env.AI_API_URL;
      const apiKey = process.env.AI_API_KEY;

      if (!endpoint || !apiKey) {
        return {
          text: 'Summarization requires a configured AI provider. No AI service is currently connected.'
        };
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Summarize the following text clearly and accurately:\n\n${content}`
            }]
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
          return {
            text: `AI provider returned HTTP ${response.status}.`
          };
        }

        const data = await response.json();

        const summary =
          data.choices?.[0]?.message?.content ??
          data.output_text ??
          data.response;

        if (typeof summary !== 'string' || !summary.trim()) {
          return { text: 'The provider returned no readable summary.' };
        }

        return { text: summary.trim().slice(0, 12000) };
      } catch {
        return { text: 'Unable to contact the configured AI provider.' };
      }
    }
  }
];

export { commands };
            
