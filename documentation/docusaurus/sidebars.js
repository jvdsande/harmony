module.exports = {
  someSidebar: {
    'Guides': [
      'guides',
      'guides/tutorial/introduction',

      // Server tutorial
      {
        'Tutorial - Server': [
          'guides/tutorial/server/server',
          'guides/tutorial/server/persistence',
          'guides/tutorial/server/authentication',
          'guides/tutorial/server/scopes',
          'guides/tutorial/server/database',
          'guides/tutorial/server/computed',
        ],
        'Tutorial - Client': [
          // Client tutorial
          'guides/tutorial/client/client',
          'guides/tutorial/client/login',
          'guides/tutorial/client/main',
          'guides/tutorial/client/list',
          'guides/tutorial/client/todo',
          'guides/tutorial/client/panels',
        ],
      },

      // Cheat-sheets
      'guides/cheatsheets/introduction',
    ],
    'API Reference': ['api', 'api/server', 'api/persistence', 'api/query', 'api/logger'],
    'Plugins': ['plugins'],
  },
};
