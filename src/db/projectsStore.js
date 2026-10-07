import { getDb, PROJECTS_STORE } from './database.js';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createProject(systemId, data = {}) {
  if (!systemId) {
    throw new Error('A systemId is required to create a project.');
  }
  const db = await getDb();
  const now = new Date().toISOString();
  const project = {
    ...data,
    id: data.id || generateId(),
    systemId,
    name: typeof data.name === 'string' ? data.name.trim() : '',
    createdAt: now,
    updatedAt: now,
  };
  await db.add(PROJECTS_STORE, project);
  return project;
}

function deriveGithubName(url) {
  const cleaned = url.replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/\.git$/i, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || '';
}

export async function saveProjectSource(systemId, source = {}) {
  if (!systemId) {
    throw new Error('A systemId is required to save a project source.');
  }
  if (!source || typeof source !== 'object') {
    throw new Error('A project source is required.');
  }

  const explicitName = typeof source.name === 'string' ? source.name.trim() : '';

  if (source.type === 'github') {
    const url = typeof source.url === 'string' ? source.url.trim() : '';
    if (!url) {
      throw new Error('A GitHub repository link is required.');
    }
    return createProject(systemId, {
      name: explicitName || deriveGithubName(url),
      sourceType: 'github',
      githubUrl: url,
    });
  }

  if (source.type === 'zip') {
    const content = source.file || source.data;
    if (!content) {
      throw new Error('A zip file is required.');
    }
    const fileName =
      typeof source.fileName === 'string' && source.fileName
        ? source.fileName
        : typeof content.name === 'string'
          ? content.name
          : '';
    const size =
      typeof source.size === 'number'
        ? source.size
        : typeof content.size === 'number'
          ? content.size
          : typeof content.byteLength === 'number'
            ? content.byteLength
            : null;
    return createProject(systemId, {
      name: explicitName || fileName.replace(/\.zip$/i, ''),
      sourceType: 'zip',
      zipFileName: fileName,
      zipSize: size,
      zipData: content,
    });
  }

  throw new Error('Unsupported project source type.');
}

export async function getProject(id) {
  const db = await getDb();
  return (await db.get(PROJECTS_STORE, id)) || null;
}

export async function listProjectsBySystem(systemId) {
  const db = await getDb();
  const projects = await db.getAllFromIndex(PROJECTS_STORE, 'systemId', systemId);
  return projects.sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
}

export async function updateProject(id, changes = {}) {
  const db = await getDb();
  const tx = db.transaction(PROJECTS_STORE, 'readwrite');
  const store = tx.objectStore(PROJECTS_STORE);
  const existing = await store.get(id);
  if (!existing) {
    await tx.done;
    return null;
  }
  const updated = {
    ...existing,
    ...changes,
    id: existing.id,
    systemId: existing.systemId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  if (typeof updated.name === 'string') {
    updated.name = updated.name.trim();
  }
  await store.put(updated);
  await tx.done;
  return updated;
}

export async function deleteProject(id) {
  const db = await getDb();
  await db.delete(PROJECTS_STORE, id);
}

export async function saveProjectDescription(systemId, description = {}) {
  if (!systemId) {
    throw new Error('A systemId is required to save a project description.');
  }
  if (!description || typeof description !== 'object' || Array.isArray(description)) {
    throw new Error('A project description object is required.');
  }
  const { id, systemId: ignoredSystemId, createdAt, updatedAt, ...fields } = description;
  return createProject(systemId, fields);
}

export async function listProjectDescriptions(systemId) {
  const db = await getDb();
  const projects = await db.getAllFromIndex(PROJECTS_STORE, 'systemId', systemId);
  return projects.sort((a, b) => {
    const timeA = a.createdAt || '';
    const timeB = b.createdAt || '';
    if (timeA < timeB) return -1;
    if (timeA > timeB) return 1;
    return 0;
  });
}