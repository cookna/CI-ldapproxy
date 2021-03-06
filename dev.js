// Dev environment for PPSdemo
module.exports = {
    tenant: {
      ui: 'https://ppsdemo.ice.ibmcloud.com',
      id: '35f095e9-65c6-4eab-9040-3c52ab6f3e3d',
      secret: '3f6bN4mw66',
      registry: 'bbdef01e-dce8-4fa4-b310-88b42b48169d'
    },
    ldap: {
      port: 389,
      root: 'o=pps',
      type: 'uid='
    },
    cache: {
      active: 'true',
      timeout: 600
    },
    log: "log"
  };