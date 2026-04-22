export interface ScriptMetadata {
  name: string;
  type: 'hook' | 'agent' | 'tool';
  event?: string;
  description: string;
  dependencies: string[];
  version: string;
}

export function parseScriptMetadata(content: string): ScriptMetadata {
  const lines = content.split('\n');
  const fields: Record<string, string> = {};
  let hasMarker = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:#\s*|\/\/\s*)@([\w-]+)(?:\s+(.+))?$/);
    if (match) {
      const [, key, value] = match;
      if (key === 'claude-extend') {
        hasMarker = true;
      } else if (value) {
        fields[key] = value.trim();
      }
    }
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//') && !trimmed.startsWith('!')) {
      break;
    }
  }

  if (!hasMarker) {
    throw new Error('Missing @claude-extend marker');
  }

  const required = ['name', 'type', 'version'] as const;
  for (const field of required) {
    if (!fields[field]) {
      throw new Error(`Missing required field: @${field}`);
    }
  }

  const type = fields.type as ScriptMetadata['type'];
  if (type !== 'hook' && type !== 'agent' && type !== 'tool') {
    throw new Error(`Invalid @type: ${type}. Must be hook, agent, or tool`);
  }

  if (type === 'hook' && !fields.event) {
    throw new Error('Hook scripts must specify @event');
  }

  const dependencies = fields.dependencies
    ? fields.dependencies.split(',').map((d) => d.trim()).filter(Boolean)
    : [];

  return {
    name: fields.name,
    type,
    event: fields.event,
    description: fields.description || '',
    dependencies,
    version: fields.version,
  };
}
