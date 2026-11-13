const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to connect to PostgreSQL.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: Number.parseInt(process.env.PG_POOL_SIZE || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

const nativePoolQuery = pool.query.bind(pool);
const nativePoolConnect = pool.connect.bind(pool);

function convertPlaceholders(sql) {
  let output = '';
  let parameterIndex = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      output += character;
      if (character === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      output += character;
      if (character === '*' && next === '/') {
        output += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }

    if (quote) {
      output += character;
      if (character === '\\' && next) {
        output += next;
        index += 1;
      } else if (character === quote) {
        if (next === quote) {
          output += next;
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (character === '-' && next === '-') {
      output += character + next;
      index += 1;
      lineComment = true;
    } else if (character === '/' && next === '*') {
      output += character + next;
      index += 1;
      blockComment = true;
    } else if (character === "'" || character === '"' || character === '`') {
      quote = character;
      output += character;
    } else if (character === '?') {
      parameterIndex += 1;
      output += `$${parameterIndex}`;
    } else {
      output += character;
    }
  }

  return output;
}

function normalizeRows(rows, fields) {
  return rows.map((row) => {
    for (const field of fields) {
      if (field.dataTypeID === 20 && typeof row[field.name] === 'string') {
        const numericValue = Number(row[field.name]);
        if (Number.isSafeInteger(numericValue)) row[field.name] = numericValue;
      }
    }
    return row;
  });
}

function createQueryExecutor(nativeQuery) {
  return async (sql, values = []) => {
    let statement = convertPlaceholders(sql);
    const isInsert = /^\s*INSERT\b/i.test(statement);

    if (isInsert && !/\bRETURNING\b/i.test(statement)) {
      statement = statement.replace(/;\s*$/, '') + ' RETURNING id';
    }

    const result = await nativeQuery(statement, values);

    if (result.command === 'SELECT') {
      return [normalizeRows(result.rows, result.fields)];
    }

    if (isInsert) {
      return [{
        insertId: result.rows[0] ? result.rows[0].id : null,
        affectedRows: result.rowCount,
      }];
    }

    return [{ affectedRows: result.rowCount }];
  };
}

pool.query = createQueryExecutor(nativePoolQuery);
pool.getConnection = async () => {
  const client = await nativePoolConnect();
  const query = createQueryExecutor(client.query.bind(client));

  return {
    query,
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    release: () => client.release(),
  };
};
pool.runScript = (sql) => nativePoolQuery(sql);

module.exports = pool;
