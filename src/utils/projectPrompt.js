// Helper that builds the copyable AI prompt for a project.
// The prompt has three parts: the instruction, the project context
// (zip or GitHub link) and the required JSON schema for the AI response.

export const PROMPT_INSTRUCTION = [
  'You are a senior software engineer and technical writer.',
  'Analyze the project described in the PROJECT CONTEXT section and produce a detailed document describing it.',
  'The document must cover: the purpose of the project, its main features, the overall architecture, the technology stack, the main modules or components and their responsibilities, the data model, how the parts interact, how to run and build it, and any risks, limitations or open questions you notice.',
  'Base your answer only on the project material provided. If something cannot be determined from it, say so explicitly instead of guessing.',
].join('\n');

export const RESPONSE_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  required: [
    'projectName',
    'summary',
    'purpose',
    'features',
    'architecture',
    'techStack',
    'modules',
    'dataModel',
    'setup',
    'risks',
    'openQuestions',
  ],
  properties: {
    projectName: { type: 'string' },
    summary: { type: 'string' },
    purpose: { type: 'string' },
    features: { type: 'array', items: { type: 'string' } },
    architecture: { type: 'string' },
    techStack: { type: 'array', items: { type: 'string' } },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'path', 'responsibility'],
        properties: {
          name: { type: 'string' },
          path: { type: 'string' },
          responsibility: { type: 'string' },
        },
      },
    },
    dataModel: { type: 'string' },
    setup: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
};

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildProjectContext(options) {
  const opts = options || {};
  const name = clean(opts.projectName);
  const description = clean(opts.projectDescription);
  const githubUrl = clean(opts.githubUrl);
  const zipFileName = clean(opts.zipFileName);

  const lines = [];
  if (name) lines.push('Project name: ' + name);
  if (description) lines.push('Project description: ' + description);
  if (githubUrl) {
    lines.push('GitHub repository: ' + githubUrl);
  }
  if (zipFileName) {
    lines.push('Project zip file: ' + zipFileName + ' (attached to this conversation)');
  }
  if (!githubUrl && !zipFileName) {
    lines.push(
      'Project source: not provided yet. Attach the project zip or paste the GitHub link in this conversation before answering.'
    );
  }
  return lines.join('\n');
}

export function buildProjectPrompt(options) {
  const instruction = PROMPT_INSTRUCTION;
  const context = buildProjectContext(options);
  const schema = JSON.stringify(RESPONSE_JSON_SCHEMA, null, 2);

  return [
    '## INSTRUCTION',
    instruction,
    '',
    '## PROJECT CONTEXT',
    context,
    '',
    '## REQUIRED RESPONSE FORMAT',
    'Respond with ONLY a single valid JSON object that follows this JSON schema exactly. Do not add any text, explanation or markdown before or after the JSON. Do not add keys that are not in the schema.',
    '',
    schema,
  ].join('\n');
}

export default buildProjectPrompt;