import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createSystem, deleteSystem, listSystems } from '../db/systemsStore.js';
import NewSystemModal from '../components/NewSystemModal.jsx';

export default function SystemsListPage() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

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

  return (
    <main>
      <h1>Systems</h1>

      <button type="button" onClick={() => setShowModal(true)}>
        New system
      </button>

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