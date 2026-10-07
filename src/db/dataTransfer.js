import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { getDb, SYSTEMS_STORE, PROJECTS_STORE } from './database.js';

const DATA_FILE_NAME = 'system-tracker-data.json';
const EXPORT_FORMAT = 'system-tracker-export';
const EXPORT_VERSION = 1;

/**
 * Reads every record from IndexedDB and returns a plain JSON-serialisable object.
 */
export async function buildExportData() {
  const db = await getDb();
  const systems = await db.getAll(SYSTEMS_STORE);
  const projects = await db.getAll(PROJECTS_STORE);

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    systems,
    projects,
  };
}

/**
 * Generates the JSON object from the database, zips it and returns the zip
 * as a Blob that can be downloaded.
 */
export async function exportDataToZip() {
  const data = await buildExportData();
  const json = JSON.stringify(data, null, 2);
  const zipped = zipSync({ [DATA_FILE_NAME]: strToU8(json) });
  return new Blob([zipped], { type: 'application/zip' });
}

/**
 * Exports the database to a zip file and downloads it to the user's machine.
 */
export async function downloadExport() {
  const blob = await exportDataToZip();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `system-tracker-export-${stamp}.zip`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fileName;
}

/**
 * Unzips the given zip bytes and parses the JSON data file inside it.
 */
export function parseZipData(zipBytes) {
  let files;
  try {
    files = unzipSync(zipBytes);
  } catch (error) {
    throw new Error('The selected file is not a valid zip file.');
  }

  const entryName =
    DATA_FILE_NAME in files
      ? DATA_FILE_NAME
      : Object.keys(files).find((name) => name.toLowerCase().endsWith('.json'));

  if (!entryName) {
    throw new Error('The zip file does not contain a JSON data file.');
  }

  let data;
  try {
    data = JSON.parse(strFromU8(files[entryName]));
  } catch (error) {
    throw new Error('The JSON data file inside the zip could not be parsed.');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The JSON data file has an unexpected structure.');
  }
  if (!Array.isArray(data.systems) || !Array.isArray(data.projects)) {
    throw new Error('The JSON data file must contain systems and projects lists.');
  }

  return data;
}

function putRecord(store, record) {
  if (store.keyPath === null || store.keyPath === undefined) {
    return store.put(record, record.id);
  }
  return store.put(record);
}

/**
 * Seeds the parsed data into IndexedDB in a single transaction. Records with
 * the same id are overwritten; all other existing records are left untouched.
 */
export async function seedDatabase(data) {
  const db = await getDb();
  const tx = db.transaction([SYSTEMS_STORE, PROJECTS_STORE], 'readwrite');
  const systemsStore = tx.objectStore(SYSTEMS_STORE);
  const projectsStore = tx.objectStore(PROJECTS_STORE);

  const writes = [];
  for (const system of data.systems) {
    writes.push(putRecord(systemsStore, system));
  }
  for (const project of data.projects) {
    writes.push(putRecord(projectsStore, project));
  }

  await Promise.all(writes);
  await tx.done;

  return { systems: data.systems.length, projects: data.projects.length };
}

/**
 * Reads a zip File chosen by the user, unzips and parses it, and seeds the
 * data into IndexedDB. Returns the number of systems and projects imported.
 */
export async function importDataFromZip(file) {
  if (!file) {
    throw new Error('No file was selected for import.');
  }
  const buffer = await file.arrayBuffer();
  const data = parseZipData(new Uint8Array(buffer));
  return seedDatabase(data);
}