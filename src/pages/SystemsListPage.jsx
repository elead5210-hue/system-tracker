import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createSystem, deleteSystem, listSystems } from '../db/systemsStore.js';
import NewSystemModal from '../components/NewSystemModal.jsx';
import { downloadExport, importDataFromZip } from '../db/dataTransfer.js';

export default function SystemsListPage() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [transferMessage, setTransferMessage] = useState(null);
  const importInputRef = useRef(null);

  const loadSystems = useCallback(async () => {
    try {
      const result = await listSystems();
      setSystems(result);
      setError(null);
    } catch (err) {
      setError(err && err.message ? err.message : 'Failed to load systems.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystems();
  }, [loadSystems]);

  async function handleSaveNewSystem(name) {
    await createSystem({ name });
    setShowModal(false);
    await loadSystems();
  }

  async function handleDelete(system) {
    const label = system.name || 'this system';
    if (!window.confirm(`Delete ${label} and all of its projects?`)) {
      return;
    }
    try {
      await deleteSystem(system.id);
      await loadSystems();
    } catch (err) {
      setError(err && err.message ? err.message : 'Failed to delete system.');
    }
  }

  async function handleExport() {
    try {
      await downloadExport();
      setTransferMessage('Data exported successfully.');
      setError(null);
    } catch (err) {
      setTransferMessage(null);
      setError(err && err.message ? err.message : 'Failed to export data.');
    }
  }

  async function handleImportFileChange(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      const result = await importDataFromZip(file);
      setTransferMessage(
        `Imported ${result.systems} system(s) and ${result.projects} project(s).`
      );
      setError(null);
      await loadSystems();
    } catch (err) {
      setTransferMessage(null);
      setError(err && err.message ? err.message : 'Failed to import data.');
    }
  }

  return (
    <main>
      <h1>Systems</h1>

      <button type="button" onClick={() => setShowModal(true)}>
        New system
      </button>{' '}
      <button type="button" onClick={handleExport}>
        Export
      </button>{' '}
      <button type="button" onClick={() => importInputRef.current && importInputRef.current.click()}>
        Import
      </button>
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,application/zip"
        onChange={handleImportFileChange}
        style={{ display: 'none' }}
      />

      {transferMessage && <p role="status">{transferMessage}</p>}

      {showModal && (
        <NewSystemModal
          onSave={handleSaveNewSystem}
          onClose={() => setShowModal(false)}
        />
      )}

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading systems...</p>
      ) : systems.length === 0 ? (
        <p>No systems yet. Click "New system" to get started.</p>
      ) : (
        <ul>
          {systems.map((system) => (
            <li key={system.id}>
              <Link to={`/systems/${encodeURIComponent(system.id)}`}>
                {system.name || 'Untitled system'}
              </Link>{' '}
              <button type="button" onClick={() => handleDelete(system)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}