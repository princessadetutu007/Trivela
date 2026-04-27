import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS campaigns (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  slug              TEXT    NOT NULL UNIQUE,
  description       TEXT    NOT NULL DEFAULT '',
  active            INTEGER NOT NULL DEFAULT 1,
  featured          INTEGER NOT NULL DEFAULT 0,
  reward_per_action INTEGER NOT NULL DEFAULT 0,
  start_date        TEXT,
  end_date          TEXT,
  featured          INTEGER NOT NULL DEFAULT 0,
  hidden            INTEGER NOT NULL DEFAULT 0,
  hidden_reason     TEXT,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL
);
`;

// Indexes for common query patterns (slug lookups, active/hidden/featured filters, date ordering, search).
const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_campaigns_slug       ON campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_active     ON campaigns(active);
CREATE INDEX IF NOT EXISTS idx_campaigns_hidden     ON campaigns(hidden);
CREATE INDEX IF NOT EXISTS idx_campaigns_featured   ON campaigns(featured);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_name       ON campaigns(name);
`;

/**
 * Status rules (deterministic, evaluated at read time):
 *   ended   — end_date is set and end_date <= now
 *   upcoming — start_date is set and start_date > now (and not ended)
 *   active  — everything else (within range or no date constraints)
 */
export function computeCampaignStatus({ startDate, endDate }) {
  const now = new Date();
  if (endDate && new Date(endDate) <= now) return 'ended';
  if (startDate && new Date(startDate) > now) return 'upcoming';
  return 'active';
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function rowToCampaign(row) {
  const campaign = {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description,
    active: row.active === 1,
    featured: row.featured === 1,
    rewardPerAction: row.reward_per_action,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    featured: row.featured === 1,
    hidden: row.hidden === 1,
    hiddenReason: row.hidden_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
  campaign.status = computeCampaignStatus(campaign);
  return campaign;
}

export function createSqliteCampaignRepository({
  dbPath = ':memory:',
  seed = [],
} = {}) {
  const db = new Database(dbPath);
  db.exec(SCHEMA);

  // Migrate columns added after initial release.
  const campaignColumns = db.prepare('PRAGMA table_info(campaigns)').all();
  const columnNames = new Set(campaignColumns.map((c) => c.name));

  if (!columnNames.has('updated_at')) {
    db.exec('ALTER TABLE campaigns ADD COLUMN updated_at TEXT');
    db.exec('UPDATE campaigns SET updated_at = created_at WHERE updated_at IS NULL');
  }
  if (!columnNames.has('featured')) {
    db.exec('ALTER TABLE campaigns ADD COLUMN featured INTEGER NOT NULL DEFAULT 0');
  }
  if (!columnNames.has('hidden')) {
    db.exec('ALTER TABLE campaigns ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0');
  }
  if (!columnNames.has('hidden_reason')) {
    db.exec('ALTER TABLE campaigns ADD COLUMN hidden_reason TEXT');
  }

  // Create indexes after all columns are guaranteed to exist.
  db.exec(INDEXES);

  const hasFeatured = campaignColumns.some((column) => column.name === 'featured');
  if (!hasFeatured) {
    db.exec('ALTER TABLE campaigns ADD COLUMN featured INTEGER DEFAULT 0');
  }

  if (seed.length > 0) {
    const count = db.prepare('SELECT COUNT(*) AS n FROM campaigns').get().n;
    if (count === 0) {
      const insert = db.prepare(
<<<<<<< feat/campaign-indexes-featured-hidden-explorer
        'INSERT INTO campaigns (name, slug, description, active, reward_per_action, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
=======
        'INSERT INTO campaigns (name, slug, description, active, featured, reward_per_action, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
>>>>>>> main
      );
      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          const createdAt = row.createdAt ?? new Date().toISOString();
          insert.run(
            row.name,
            row.slug ?? generateSlug(row.name),
            row.description ?? '',
            row.active ? 1 : 0,
            row.featured ? 1 : 0,
            row.rewardPerAction ?? 0,
            row.startDate ?? null,
            row.endDate ?? null,
            createdAt,
            row.updatedAt ?? createdAt,
          );
        }
      });
      insertMany(seed);
    }
  }

  // Builds a paginated list. Featured campaigns sort first, then by id.
  // Hidden campaigns are excluded unless includeHidden is true (admin use).
  function list({ active, q, includeHidden = false } = {}) {
    const where = [];
    const params = [];

    if (!includeHidden) {
      where.push('hidden = 0');
    }

    if (active !== undefined) {
      where.push('active = ?');
      params.push(active ? 1 : 0);
    }

    if (typeof q === 'string' && q.length > 0) {
      const term = `%${q.toLowerCase()}%`;
      where.push('(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)');
      params.push(term, term);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT * FROM campaigns ${whereClause} ORDER BY featured DESC, id ASC`;
    return db.prepare(sql).all(...params).map(rowToCampaign);
  }

  function getById(id) {
    const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(Number(id));
    return row ? rowToCampaign(row) : undefined;
  }

  function getBySlug(slug) {
    const row = db.prepare('SELECT * FROM campaigns WHERE slug = ?').get(slug);
    return row ? rowToCampaign(row) : undefined;
  }

  function create({ name, slug, description = '', rewardPerAction = 0, startDate = null, endDate = null, featured = false }) {
    const createdAt = new Date().toISOString();
    const finalSlug = slug ?? generateSlug(name);
    const info = db
      .prepare(
<<<<<<< feat/campaign-indexes-featured-hidden-explorer
        'INSERT INTO campaigns (name, slug, description, active, reward_per_action, start_date, end_date, featured, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)',
      )
      .run(name, finalSlug, description, rewardPerAction, startDate, endDate, featured ? 1 : 0, createdAt, createdAt);
=======
        'INSERT INTO campaigns (name, slug, description, active, featured, reward_per_action, start_date, end_date, created_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)',
      )
      .run(name, finalSlug, description, featured ? 1 : 0, rewardPerAction, startDate, endDate, createdAt);
>>>>>>> main

    return getById(info.lastInsertRowid);
  }

  function update(id, fields) {
    const allowed = ['name', 'description', 'active', 'rewardPerAction', 'startDate', 'endDate', 'featured', 'hidden', 'hiddenReason'];
    const columnMap = {
      name: 'name',
      description: 'description',
      active: 'active',
      featured: 'featured',
      rewardPerAction: 'reward_per_action',
      startDate: 'start_date',
      endDate: 'end_date',
      featured: 'featured',
      hidden: 'hidden',
      hiddenReason: 'hidden_reason',
    };
    const booleanFields = new Set(['active', 'featured', 'hidden']);
    const sets = [];
    const values = [];

    for (const key of allowed) {
      if (key in fields) {
        sets.push(`${columnMap[key]} = ?`);
<<<<<<< feat/campaign-indexes-featured-hidden-explorer
        values.push(booleanFields.has(key) ? (fields[key] ? 1 : 0) : fields[key]);
=======
        values.push(
          key === 'active' || key === 'featured'
            ? (fields[key] ? 1 : 0)
            : fields[key],
        );
>>>>>>> main
      }
    }

    if (sets.length === 0) {
      return getById(id);
    }

    const updatedAt = new Date().toISOString();
    db.prepare(`UPDATE campaigns SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).run(
      ...values,
      updatedAt,
      Number(id),
    );
    return getById(id);
  }

  function remove(id) {
    const info = db.prepare('DELETE FROM campaigns WHERE id = ?').run(Number(id));
    return info.changes > 0;
  }

  return {
    list,
    getById,
    getBySlug,
    create,
    update,
    delete: remove,
  };
}
