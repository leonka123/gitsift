import type Database from "better-sqlite3";

/**
 * Every migration is append-only. `user_version` tracks how many have run.
 * Never edit a migration that has shipped — add a new one.
 */
const MIGRATIONS: string[] = [
  `
  create table if not exists repos (
    id            integer primary key,
    full_name     text not null unique,
    owner         text not null,
    name          text not null,
    description   text,
    homepage      text,
    language      text,
    topics        text not null default '[]',
    topics_text   text not null default '',
    license       text,
    stars         integer not null default 0,
    forks         integer not null default 0,
    open_issues   integer not null default 0,
    created_at    text not null,
    pushed_at     text,
    archived      integer not null default 0,
    is_fork       integer not null default 0,
    owner_type    text,
    owner_avatar  text,
    readme        text,
    summary       text,
    why_now       text,
    build_idea    text,
    quality       real not null default 0,
    bot_score     real not null default 0,
    stars_per_day real not null default 0,
    heat          real not null default 0,
    velocity_7d   real,
    velocity_source text not null default 'modeled',
    embedding     blob,
    embedding_model text,
    first_seen_at text not null,
    last_synced_at text not null
  );

  create index if not exists repos_heat_idx on repos (heat desc);
  create index if not exists repos_stars_idx on repos (stars desc);
  create index if not exists repos_created_idx on repos (created_at desc);
  create index if not exists repos_quality_idx on repos (quality);

  create table if not exists star_snapshots (
    repo_id     integer not null references repos(id) on delete cascade,
    captured_on text not null,
    stars       integer not null,
    primary key (repo_id, captured_on)
  );

  create index if not exists snapshots_date_idx on star_snapshots (captured_on);

  create virtual table if not exists repos_fts using fts5(
    full_name,
    description,
    summary,
    topics_text,
    tokenize = 'unicode61 remove_diacritics 2'
  );

  create trigger if not exists repos_fts_ai after insert on repos begin
    insert into repos_fts (rowid, full_name, description, summary, topics_text)
    values (new.id, new.full_name, coalesce(new.description, ''), coalesce(new.summary, ''), new.topics_text);
  end;

  create trigger if not exists repos_fts_ad after delete on repos begin
    delete from repos_fts where rowid = old.id;
  end;

  create trigger if not exists repos_fts_au after update on repos begin
    delete from repos_fts where rowid = old.id;
    insert into repos_fts (rowid, full_name, description, summary, topics_text)
    values (new.id, new.full_name, coalesce(new.description, ''), coalesce(new.summary, ''), new.topics_text);
  end;

  create table if not exists digests (
    id         integer primary key autoincrement,
    week       text not null unique,
    title      text not null,
    intro      text,
    published  integer not null default 0,
    created_at text not null
  );

  create table if not exists digest_items (
    digest_id integer not null references digests(id) on delete cascade,
    repo_id   integer not null references repos(id) on delete cascade,
    position  integer not null,
    blurb     text,
    primary key (digest_id, repo_id)
  );

  create table if not exists search_queries (
    id         integer primary key autoincrement,
    query      text not null,
    filters    text,
    created_at text not null
  );

  create table if not exists meta (
    key   text primary key,
    value text not null
  );
  `,
];

export function migrate(db: Database.Database): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.exec("begin");
    try {
      db.exec(MIGRATIONS[i]);
      db.pragma(`user_version = ${i + 1}`);
      db.exec("commit");
    } catch (error) {
      db.exec("rollback");
      throw error;
    }
  }
}
