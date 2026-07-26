// Minimal in-memory stand-in for the slice of the MongoDB driver the routes use.
//
// Exists so `LEARNO_MODE=sandbox` runs with no database at all: a client can
// clone the repo and see the lessons and dashboard without provisioning Mongo.
// It deliberately implements the real driver's shape rather than faking the
// routes, so progress.js keeps running its actual SM-2 code path against it.
//
// Supported surface (everything routes/*.js touches, nothing more):
//   collection(name).find(query).sort(spec).limit(n).toArray()
//   collection(name).findOne(query)
//   collection(name).updateOne(filter, { $set, $push }, { upsert })
//   collection(name).insertOne(doc)
//
// Query matching is plain field equality plus `$lte`/`$gte` on dates/numbers —
// the only operators the routes use. Anything richer is a deliberate omission;
// if a route grows a new operator this file must grow with it.

function matches(doc, query = {}) {
  return Object.entries(query).every(([key, cond]) => {
    const value = doc[key];
    if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)) {
      return Object.entries(cond).every(([op, operand]) => {
        switch (op) {
          case '$lte': return value <= operand;
          case '$gte': return value >= operand;
          case '$ne':  return value !== operand;
          case '$in':  return Array.isArray(operand) && operand.includes(value);
          default:
            throw new Error(`memdb: unsupported query operator ${op}`);
        }
      });
    }
    return value === cond;
  });
}

function applySort(docs, spec = {}) {
  const entries = Object.entries(spec);
  if (!entries.length) return docs;
  return [...docs].sort((a, b) => {
    for (const [key, dir] of entries) {
      const av = a[key], bv = b[key];
      if (av === bv) continue;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return (av < bv ? -1 : 1) * (dir < 0 ? -1 : 1);
    }
    return 0;
  });
}

// Deep-ish clone so callers can't mutate stored docs by accident, the way a
// real driver's BSON round-trip would prevent.
function clone(doc) {
  return JSON.parse(JSON.stringify(doc), (_k, v) =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v) ? new Date(v) : v
  );
}

class Cursor {
  constructor(docs) { this._docs = docs; }
  sort(spec)  { this._docs = applySort(this._docs, spec); return this; }
  limit(n)    { this._docs = this._docs.slice(0, n);      return this; }
  async toArray() { return this._docs.map(clone); }
}

class Collection {
  constructor(name, docs = []) {
    this.name  = name;
    this._docs = docs.map(clone);
    this._seq  = 0;
  }

  find(query = {}) {
    return new Cursor(this._docs.filter(d => matches(d, query)));
  }

  async findOne(query = {}) {
    const hit = this._docs.find(d => matches(d, query));
    return hit ? clone(hit) : null;
  }

  async insertOne(doc) {
    const stored = clone({ _id: `mem_${this.name}_${this._seq++}`, ...doc });
    this._docs.push(stored);
    return { acknowledged: true, insertedId: stored._id };
  }

  async updateOne(filter, update, options = {}) {
    let target = this._docs.find(d => matches(d, filter));

    if (!target) {
      if (!options.upsert) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
      target = clone({ _id: `mem_${this.name}_${this._seq++}`, ...filter });
      this._docs.push(target);
    }

    for (const [key, value] of Object.entries(update.$set  ?? {})) target[key] = value;
    for (const [key, value] of Object.entries(update.$push ?? {})) {
      if (!Array.isArray(target[key])) target[key] = [];
      target[key].push(value);
    }

    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }
}

class MemoryDb {
  constructor(seed = {}) {
    this._collections = new Map(
      Object.entries(seed).map(([name, docs]) => [name, new Collection(name, docs)])
    );
  }

  collection(name) {
    if (!this._collections.has(name)) this._collections.set(name, new Collection(name));
    return this._collections.get(name);
  }
}

module.exports = { MemoryDb };
