/**
 * SuprKandi project configuration.
 *
 * Generated into user projects by `kandi init`.
 */

module.exports = {
  browser: {
    type: 'chrome'
  },

  execution: {
    failFast: true
  },

  evidence: {
    enabled: true,
    cleanupAfterReport: true
  },

  reporter: {
    docx: true
  },

  paths: {
    workspaces: 'workspaces',
    scripts: 'scripts',
    evidence: 'evidence',
    reports: 'reports'
  },

  database: {
    postgres: {
      connectionString: process.env.KANDI_POSTGRES_URL || null
    },

    mysql: {
      connectionString: process.env.KANDI_MYSQL_URL || null
    }
  }
};
