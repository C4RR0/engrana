-- Base de datos D1 del contador de Engrana. Se pega entera en la consola de D1.
CREATE TABLE IF NOT EXISTS sites (
  site TEXT PRIMARY KEY,   -- identificador corto: engrana, tinta-norte...
  name TEXT NOT NULL,      -- nombre que sale en el panel
  host TEXT NOT NULL,      -- dominio de la web, sin https:// (engranaia.com)
  key  TEXT NOT NULL       -- clave del panel de ese cliente
);

CREATE TABLE IF NOT EXISTS hits (
  day    TEXT NOT NULL,    -- AAAA-MM-DD (hora de Madrid)
  site   TEXT NOT NULL,
  kind   TEXT NOT NULL,    -- 'pv' = página vista; si no, nombre del clic (contacto, demo...)
  path   TEXT NOT NULL,
  ref    TEXT NOT NULL,    -- dominio de procedencia, 'directo' o 'interno'
  device TEXT NOT NULL,    -- 'movil' u 'ordenador'
  n      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, site, kind, path, ref, device)
);

CREATE INDEX IF NOT EXISTS hits_site_day ON hits (site, day);

-- Alta de la web de Engrana (cambia CLAVE_AQUI por la clave que te paso).
INSERT OR IGNORE INTO sites (site, name, host, key) VALUES ('engrana', 'Engrana', 'engranaia.com', 'CLAVE_AQUI');
