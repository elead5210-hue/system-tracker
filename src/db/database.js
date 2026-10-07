import { openDB } from 'idb';

export const DB_NAME = 'system-tracker';
export const DB_VERSION = 1;
export const SYSTEMS_STORE = 'systems';
export const PROJECTS_STORE = 'projects';

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SYSTEMS_STORE)) {
          const systems = db.createObjectStore(SYSTEMS_STORE, {
            keyPath: 'id',
          });
          systems.createIndex('name', 'name', { unique: false });
          systems.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projects = db.createObjectStore(PROJECTS_STORE, {
            keyPath: 'id',
          });
          projects.createIndex('systemId', 'systemId', { unique: false });
          projects.createIndex('name', 'name', { unique: false });
          projects.createIndex('createdAt', 'createdAt', { unique: false });
        }
      },
      blocking() {
        // Another tab needs to upgrade the database; release our connection.
        dbPromise = null;
      },
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}