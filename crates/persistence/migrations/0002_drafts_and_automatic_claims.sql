CREATE TABLE template_drafts(id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE automatic_claims(logical_key TEXT PRIMARY KEY);
