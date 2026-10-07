// Validator for the AI response pasted back into the app.
// It parses the pasted text as JSON and checks it against the required
// response schema (RESPONSE_JSON_SCHEMA from ./projectPrompt.js), returning
// either the validated data or readable error messages.

import * as projectPrompt from './projectPrompt.js';

const MAX_ERRORS = 25;

function loadSchema() {
  const raw = projectPrompt.RESPONSE_JSON_SCHEMA;
  if (raw && typeof raw === 'object') {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

function stripCodeFence(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```$/);
  return match ? match[1].trim() : trimmed;
}

function typeOfValue(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value, type) {
  const actual = typeOfValue(value);
  if (type === 'integer') {
    return actual === 'number' && Number.isInteger(value);
  }
  if (type === 'number') {
    return actual === 'number' && Number.isFinite(value);
  }
  return actual === type;
}

function describePath(path) {
  return path ? path : 'the response';
}

function childKey(path, key) {
  return path ? path + '.' + key : key;
}

function childIndex(path, index) {
  return (path || 'response') + '[' + index + ']';
}

function resolveRef(ref, root) {
  if (typeof ref !== 'string' || ref.charAt(0) !== '#') {
    return null;
  }
  const parts = ref
    .slice(1)
    .split('/')
    .filter(function (part) {
      return part !== '';
    })
    .map(function (part) {
      return part.replace(/~1/g, '/').replace(/~0/g, '~');
    });
  let node = root;
  for (let i = 0; i < parts.length; i += 1) {
    if (node && typeof node === 'object' && parts[i] in node) {
      node = node[parts[i]];
    } else {
      return null;
    }
  }
  return node && typeof node === 'object' ? node : null;
}

function pushError(errors, message) {
  if (errors.length < MAX_ERRORS) {
    errors.push(message);
  }
}

function validateNode(value, schema, path, root, errors, depth) {
  if (!schema || typeof schema !== 'object' || depth > 50) {
    return;
  }

  if (schema.$ref) {
    const target = resolveRef(schema.$ref, root);
    if (target) {
      validateNode(value, target, path, root, errors, depth + 1);
    }
    return;
  }

  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach(function (sub) {
      validateNode(value, sub, path, root, errors, depth + 1);
    });
  }

  const unions = schema.anyOf || schema.oneOf;
  if (Array.isArray(unions) && unions.length > 0) {
    const passes = unions.some(function (sub) {
      const subErrors = [];
      validateNode(value, sub, path, root, subErrors, depth + 1);
      return subErrors.length === 0;
    });
    if (!passes) {
      pushError(errors, describePath(path) + ' does not match any of the allowed formats.');
      return;
    }
  }

  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    pushError(
      errors,
      describePath(path) + ' must be ' + JSON.stringify(schema.const) + '.'
    );
    return;
  }

  if (Array.isArray(schema.enum)) {
    const found = schema.enum.some(function (option) {
      return JSON.stringify(option) === JSON.stringify(value);
    });
    if (!found) {
      pushError(
        errors,
        describePath(path) +
          ' must be one of: ' +
          schema.enum
            .map(function (option) {
              return JSON.stringify(option);
            })
            .join(', ') +
          '.'
      );
      return;
    }
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const ok = types.some(function (type) {
      return matchesType(value, type);
    });
    if (!ok) {
      pushError(
        errors,
        describePath(path) +
          ' must be of type ' +
          types.join(' or ') +
          ' but is ' +
          typeOfValue(value) +
          '.'
      );
      return;
    }
  }

  const actual = typeOfValue(value);

  if (actual === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      pushError(
        errors,
        describePath(path) +
          (schema.minLength === 1
            ? ' must not be empty.'
            : ' must be at least ' + schema.minLength + ' characters long.')
      );
    }
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
      pushError(
        errors,
        describePath(path) + ' must be at most ' + schema.maxLength + ' characters long.'
      );
    }
    if (typeof schema.pattern === 'string') {
      try {
        if (!new RegExp(schema.pattern).test(value)) {
          pushError(errors, describePath(path) + ' has an invalid format.');
        }
      } catch (e) {
        // Ignore patterns the runtime cannot compile.
      }
    }
  }

  if (actual === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      pushError(errors, describePath(path) + ' must be at least ' + schema.minimum + '.');
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      pushError(errors, describePath(path) + ' must be at most ' + schema.maximum + '.');
    }
  }

  if (actual === 'array') {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      pushError(
        errors,
        describePath(path) + ' must contain at least ' + schema.minItems + ' item(s).'
      );
    }
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
      pushError(
        errors,
        describePath(path) + ' must contain at most ' + schema.maxItems + ' item(s).'
      );
    }
    if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
      for (let i = 0; i < value.length; i += 1) {
        validateNode(value[i], schema.items, childIndex(path, i), root, errors, depth + 1);
      }
    }
  }

  if (actual === 'object') {
    const properties =
      schema.properties && typeof schema.properties === 'object' ? schema.properties : {};

    if (Array.isArray(schema.required)) {
      schema.required.forEach(function (key) {
        if (!(key in value) || value[key] === undefined) {
          pushError(
            errors,
            'Missing required field "' + childKey(path, key) + '".'
          );
        }
      });
    }

    Object.keys(properties).forEach(function (key) {
      if (key in value && value[key] !== undefined) {
        validateNode(value[key], properties[key], childKey(path, key), root, errors, depth + 1);
      }
    });

    if (schema.additionalProperties === false) {
      Object.keys(value).forEach(function (key) {
        if (!(key in properties)) {
          pushError(errors, 'Unexpected field "' + childKey(path, key) + '".');
        }
      });
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === 'object'
    ) {
      Object.keys(value).forEach(function (key) {
        if (!(key in properties)) {
          validateNode(
            value[key],
            schema.additionalProperties,
            childKey(path, key),
            root,
            errors,
            depth + 1
          );
        }
      });
    }
  }
}

// Parses the pasted AI response and validates it against the required schema.
// Returns { valid: true, data, errors: [] } on success, or
// { valid: false, data: null, errors: [string, ...] } on failure.
export function validateProjectResponse(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return {
      valid: false,
      data: null,
      errors: ['Paste the AI response before saving.'],
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(stripCodeFence(text));
  } catch (e) {
    return {
      valid: false,
      data: null,
      errors: [
        'The pasted text is not valid JSON' +
          (e && e.message ? ' (' + e.message + ')' : '') +
          '. Paste only the JSON object returned by the AI.',
      ],
    };
  }

  if (typeOfValue(parsed) !== 'object') {
    return {
      valid: false,
      data: null,
      errors: ['The response must be a JSON object.'],
    };
  }

  const schema = loadSchema();
  const errors = [];
  if (schema) {
    validateNode(parsed, schema, '', schema, errors, 0);
  }

  if (errors.length > 0) {
    return { valid: false, data: null, errors: errors };
  }

  return { valid: true, data: parsed, errors: [] };
}

export const parseProjectResponse = validateProjectResponse;

export default validateProjectResponse;