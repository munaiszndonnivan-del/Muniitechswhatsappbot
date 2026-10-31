
const MAX_INPUT_LENGTH = 12000;
const MAX_OUTPUT_LENGTH = 12000;

async function generateAIResponse(instruction, input) {
  const endpoint = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;

  if (!endpoint || !apiKey) {
    return {
      text: 'AI provider not configured. Set AI_API_URL and AI_API_KEY in your private environment settings. No paid service is automatically enabled.'
    };
  }

  if (!input || !input.trim()) {
    return { text: 'Please provide text or a question.' };
  }

  if (input.length > MAX_INPUT_LENGTH) {
    return {
      text: `Your input is too long. Maximum: ${MAX_INPUT_LENGTH} characters.`
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
        messages: [
          {
            role: 'system',
            content: instruction
          },
          {
            role: 'user',
            content: input
          }
        ]
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      return {
        text: `AI provider request failed with HTTP ${response.status}.`
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

    return {
      text: answer.trim().slice(0, MAX_OUTPUT_LENGTH)
    };
  } catch {
    return {
      text: 'Could not reach the AI provider. Check your connection and provider configuration.'
    };
  }
}

function createCommand(name, description, instruction) {
  return {
    name,
    description,
    department: 'ai-intelligence',
    permissions: ['user'],

    async execute({ args = [], text = '' } = {}) {
      const input = text.trim() || args.join(' ').trim();

      return generateAIResponse(instruction, input);
    }
  };
}

export const commands = [
  createCommand(
    'ask',
    'Ask an AI question.',
    'Answer the user accurately, clearly and helpfully. Admit uncertainty when necessary.'
  ),

  createCommand(
    'summarize',
    'Summarize long text.',
    'Produce a concise summary containing the most important information. Preserve factual accuracy.'
  ),

  createCommand(
    'translate',
    'Translate text into a requested language.',
    'Translate the supplied text into the language requested by the user. Preserve meaning and tone.'
  ),

  createCommand(
    'rewrite',
    'Rewrite text in a better style.',
    'Rewrite the supplied text to improve clarity, grammar and flow without changing its intended meaning.'
  ),

  createCommand(
    'explain',
    'Explain a topic clearly.',
    'Explain the supplied topic in simple language, using examples where helpful.'
  ),

  createCommand(
    'brainstorm',
    'Generate creative ideas.',
    'Generate original, practical and varied ideas based on the user request.'
  ),

  createCommand(
    'grammar',
    'Check grammar and spelling.',
    'Correct grammar, spelling and punctuation. Show the corrected version and briefly explain important corrections.'
  ),

  createCommand(
    'sentiment',
    'Analyze the sentiment of text.',
    'Analyze the emotional tone of the supplied text. Identify its overall sentiment and explain the language that supports your assessment.'
  ),

  createCommand(
    'keywords',
    'Extract important keywords.',
    'Extract the most important keywords and short phrases from the supplied content. Briefly explain their relevance.'
  ),

  createCommand(
    'outline',
    'Create a structured outline.',
    'Turn the supplied subject into a logical, well-organized outline with headings and subheadings.'
  ),

  createCommand(
    'quiz',
    'Generate quiz questions.',
    'Create a quiz from the supplied topic or text. Include questions, multiple-choice options and an answer key.'
  ),

  createCommand(
    'flashcards',
    'Create study flashcards.',
    'Create useful study flashcards in question-and-answer format from the supplied material.'
  ),

  createCommand(
    'email',
    'Draft a professional email.',
    'Draft a clear, appropriately toned email based on the user instructions. Include a subject line and message body.'
  ),

  createCommand(
    'story',
    'Create an original story.',
    'Write an original, engaging story based on the user topic, characters or instructions.'
  ),

  createCommand(
    'poem',
    'Write an original poem.',
    'Write an original poem that follows the requested theme, mood and style.'
  ),

  createCommand(
    'debate',
    'Prepare arguments for a debate.',
    'Present strong arguments on both sides of the supplied debate topic, then provide a balanced conclusion.'
  ),

  createCommand(
    'compare',
    'Compare two or more subjects.',
    'Compare the supplied subjects using relevant similarities, differences, strengths and weaknesses.'
  ),

  createCommand(
    'proscons',
    'List advantages and disadvantages.',
    'Provide a balanced list of advantages and disadvantages of the supplied subject. End with a practical conclusion.'
  ),

  createCommand(
    'simplify',
    'Simplify complicated text.',
    'Rewrite the supplied material in simple, accessible language while preserving its important information.'
  ),

  createCommand(
    'expand',
    'Expand short notes into detailed content.',
    'Develop the supplied notes into a coherent and detailed explanation without inventing unsupported facts.'
  ),

  createCommand(
    'classify',
    'Classify text into useful categories.',
    'Identify the most appropriate category for the supplied content and explain the classification.'
  ),

  createCommand(
    'extract',
    'Extract structured information.',
    'Extract the names, dates, figures, places and other relevant facts explicitly present in the supplied text. Do not invent missing information.'
  ),

  createCommand(
    'title',
    'Generate suitable titles.',
    'Suggest ten clear, engaging and relevant titles for the supplied content.'
  ),

  createCommand(
    'faq',
    'Generate frequently asked questions.',
    'Create useful frequently asked questions and accurate answers based on the supplied subject or material.'
  ),

  createCommand(
    'prompt',
    'Improve an AI prompt.',
    'Transform the supplied idea into a detailed, clear and effective AI prompt. Include the objective, context, constraints and expected output format.'
  )
];
  
