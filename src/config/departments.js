
export const COMMANDS_PER_DEPARTMENT = 25;

export const DEPARTMENTS = [
  { id: 'ai-intelligence', name: 'AI Intelligence' },
  { id: 'image-generation', name: 'Image Generation & Editing' },
  { id: 'video-media', name: 'Video & Media' },
  { id: 'audio-music', name: 'Audio & Music Tools' },
  { id: 'group-management', name: 'WhatsApp Group Management' },
  { id: 'security-anti-abuse', name: 'Security & Anti-Abuse' },
  { id: 'hosting-server', name: 'Hosting & Server Management' },
  { id: 'cpanel-pterodactyl', name: 'cPanel & Pterodactyl' },
  { id: 'developer-coding', name: 'Developer & Coding Tools' },
  { id: 'internet-web', name: 'Internet & Web Utilities' },
  { id: 'downloads-files', name: 'Download & File Management' },
  { id: 'business-finance', name: 'Business & Finance' },
  { id: 'payments-mpesa', name: 'Payments & M-Pesa' },
  { id: 'productivity-organization', name: 'Productivity & Organization' },
  { id: 'games-entertainment', name: 'Games & Entertainment' },
  { id: 'education-learning', name: 'Education & Learning' },
  { id: 'information-knowledge', name: 'Information & Knowledge' },
  { id: 'owner-administration', name: 'Owner & Bot Administration' },
  { id: 'automation-workflows', name: 'Automation & Workflows' },
  { id: 'advanced-experimental', name: 'Advanced Experimental Tools' }
];

export const TOTAL_COMMAND_TARGET =
  DEPARTMENTS.length * COMMANDS_PER_DEPARTMENT;
