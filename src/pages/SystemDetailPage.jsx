import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSystem } from '../db/systemsStore.js';
import {
  createProject,
  deleteProject,
  listProjectsBySystem,
  saveProjectSource,
} from '../db/projectsStore.js';
import AddProjectModal from '../components/AddProjectModal.jsx';
import GeneratePromptModal from '../components/GeneratePromptModal.jsx';

export default function SystemDetailPage() {
  const { id } = useParams();
  const [system, setSystem] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [promptProject, setPromptProject] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const foundSystem = await getSystem(id);
      if (!foundSystem) {
        setSystem(null);
        setProjects([]);
        setError(null);
        return;
      }
      const systemProjects = await listProjectsBySystem(id);
      setSystem(foundSystem);
      setProjects(systemProjects);
      setError(null);
    } catch (err) {
      setError(err && err.message ? err.message : 'Failed to load system.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  async function handleCreate(event) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || saving || !system) {
      return;
    }
    setSaving(true);
    try {
      await createProject(system.id, { name });
      setNewName('');
      await loadData();
    } catch (err) {
      setError(err && err.message ? err.message : 'Failed to create project.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddProjectSource(source) {
    if (!system) {
      throw new Error('The system is not loaded.');
    }
    await saveProjectSource(system.id, source);
    setShowAddModal(false);
    await loadData();
  }

  async function handleDelete(project) {
    const label = project.name || 'this project';
    if (!window.confirm(`Delete ${label}?`)) {
      return;
    }
    try {
      await deleteProject(project.id);
      await loadData();
    } catch (err) {
      setError(err && err.message ? err.message : 'Failed to delete project.');
    }
  }

  if (loading) {
    return (
      <main>
        <p>Loading system...</p>
      </main>
    );
  }

  if (!system) {
    return (
      <main>
        <p>
          <Link to="/">&larr; Back to systems</Link>
        </p>
        {error && <p role="alert">{error}</p>}
        <h1>System not found</h1>
        <p>The requested system does not exist.</p>
      </main>
    );
  }

  return (
    <main>
      <p>
        <Link to="/">&larr; Back to systems</Link>
      </p>

      <h1>{system.name || 'Untitled system'}</h1>

      <h2>Projects</h2>

      <p>
        <button type="button" onClick={() => setShowAddModal(true)}>
          Add project
        </button>
      </p>

      <form onSubmit={handleCreate}>
        <label htmlFor="new-project-name">New project name</label>{' '}
        <input
          id="new-project-name"
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Project name"
        />{' '}
        <button type="submit" disabled={saving || !newName.trim()}>
          Create project
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {projects.length === 0 ? (
        <p>No projects yet. Add one above to get started.</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id}>
              {project.name || 'Untitled project'}{' '}
              <button type="button" onClick={() => setPromptProject(project)}>
                Generate AI prompt
              </button>{' '}
              <button type="button" onClick={() => handleDelete(project)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAddModal && (
        <AddProjectModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddProjectSource}
        />
      )}

      {promptProject && (
        <GeneratePromptModal
          projectName={promptProject.name}
          projectDescription={promptProject.description}
          githubUrl={promptProject.githubUrl}
          zipFileName={promptProject.zipFileName}
          onClose={() => setPromptProject(null)}
        />
      )}
    </main>
  );
}