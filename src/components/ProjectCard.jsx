import React from 'react';

const cardStyle = {
  background: '#fff',
  color: '#111',
  border: '1px solid #d0d7de',
  borderRadius: 8,
  padding: 16,
  boxSizing: 'border-box',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
};

const titleStyle = {
  margin: '0 0 4px',
  fontSize: 18,
};

const metaStyle = {
  fontSize: 12,
  color: '#555',
  marginBottom: 12,
};

const sectionStyle = {
  marginTop: 12,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  color: '#444',
  marginBottom: 4,
};

const textStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.45,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const listStyle = {
  margin: 0,
  paddingLeft: 20,
  fontSize: 14,
  lineHeight: 1.45,
};

const nestedStyle = {
  margin: '4px 0 0',
  paddingLeft: 12,
  borderLeft: '2px solid #e5e7eb',
};

// Fields that belong to the stored record rather than to the AI description.
const RECORD_FIELDS = [
  'id',
  'systemId',
  'createdAt',
  'updatedAt',
  'sourceType',
  'githubUrl',
  'zipFileName',
  'zipSize',
  'zipData',
];

const TITLE_FIELDS = ['name', 'projectName', 'title'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatLabel(key) {
  const spaced = String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) {
    return String(key);
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString();
}

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function renderValue(value) {
  if (typeof value === 'string') {
    return <p style={textStyle}>{value}</p>;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <p style={textStyle}>{String(value)}</p>;
  }
  if (Array.isArray(value)) {
    return (
      <ul style={listStyle}>
        {value
          .filter((item) => !isEmptyValue(item))
          .map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
      </ul>
    );
  }
  if (isPlainObject(value)) {
    return <div style={nestedStyle}>{renderEntries(value)}</div>;
  }
  return null;
}

function renderInline(value) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return (
      <ul style={listStyle}>
        {value
          .filter((item) => !isEmptyValue(item))
          .map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
      </ul>
    );
  }
  if (isPlainObject(value)) {
    return <div style={nestedStyle}>{renderEntries(value)}</div>;
  }
  return null;
}

function renderEntries(object) {
  return Object.keys(object)
    .filter((key) => !isEmptyValue(object[key]))
    .map((key) => (
      <div key={key} style={sectionStyle}>
        <div style={labelStyle}>{formatLabel(key)}</div>
        {renderValue(object[key])}
      </div>
    ));
}

export default function ProjectCard({ project }) {
  if (!project || typeof project !== 'object') {
    return null;
  }

  let title = '';
  let titleKey = null;
  for (let i = 0; i < TITLE_FIELDS.length; i += 1) {
    const candidate = project[TITLE_FIELDS[i]];
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      title = candidate.trim();
      titleKey = TITLE_FIELDS[i];
      break;
    }
  }

  const details = {};
  Object.keys(project).forEach((key) => {
    if (key === titleKey || RECORD_FIELDS.indexOf(key) !== -1) {
      return;
    }
    details[key] = project[key];
  });

  const created = formatDate(project.createdAt);
  const sourceLabel =
    project.sourceType === 'github' && project.githubUrl
      ? project.githubUrl
      : project.sourceType === 'zip' && project.zipFileName
        ? project.zipFileName
        : '';

  return (
    <article style={cardStyle}>
      <h3 style={titleStyle}>{title || 'Untitled project'}</h3>
      {created || sourceLabel ? (
        <div style={metaStyle}>
          {sourceLabel ? <span>{sourceLabel}</span> : null}
          {sourceLabel && created ? <span> &middot; </span> : null}
          {created ? <span>Saved {created}</span> : null}
        </div>
      ) : null}
      {renderEntries(details)}
    </article>
  );
}