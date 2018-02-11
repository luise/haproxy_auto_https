const { Container, publicInternet, allowTraffic } = require('kelda');
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');

const image = 'keldaio/haproxy_auto_https';
const configPath = '/usr/local/etc/haproxy/haproxy.cfg';

// The port HAProxy uses to communicate with the containers behind it.
const internalPort = 80;

// The port HAProxy listens on for HTTP.
const exposedHttpPort = 80;

// The port HAProxy listens on for HTTPS.
const exposedHttpsPort = 443;

/**
 * Returns a map from the HAProxy config path to the combined frontend and
 * backend configs.
 * @param {string} frontendConfig
 * @param {string} backendConfig
 * @return {Object.<string, string>}
 */
function createConfigFiles(frontendConfig, backendConfig) {
  const configTempl = fs.readFileSync(
    path.join(__dirname, 'haproxy.cfg'), { encoding: 'utf8' });

  let config = Mustache.render(configTempl,
    { httpPort: exposedHttpPort, httpsPort: exposedHttpsPort });
  config += `
${frontendConfig}

${backendConfig}
`;

  const files = {};
  files[configPath] = config;

  return files;
}

/**
 * Returns an HAProxy (with automatic HTTPS) container containing the given files.
 * @param {Container[]} containers - The containers to put behind the proxy.
 * @param {Object.<string, string>} files - A map from filenames to file
 * contents, describing the files to put in each of the proxy containers.
 * @param {Object.<string, string>} env - A map of environment variables to
 * give to the proxy container.
 * @return {Container} The new HAProxy container.
 */
function createHapContainer(containers, files, env) {
  const haproxy = new Container({
    name: 'haproxy',
    image,
    env,
    filepathToContent: files,
  });

  allowTraffic(haproxy, containers, internalPort);

  // We need to be able to make connections to the ACME endpoint.
  allowTraffic(haproxy, publicInternet, 80);
  allowTraffic(haproxy, publicInternet, 443);

  return haproxy;
}


/**
 * Returns rules for choosing a backend based on the Host header in an incoming
 * HTTP request.
 * @param {string} domain - The domain name for which the given backend should handle
 * traffic.
 * @param {string} backendName - The backend that should receive traffic for the domain.
 * This is a HAProxy identifier for within the config file. It should be match
 * a backend created with `createBackendConfig`.
 * @return {string}
 */
function urlRoutingConfig(domain, backendName) {
  return `    acl ${backendName}_req hdr(host) -i ${domain}
    use_backend ${backendName} if ${backendName}_req`;
}


/**
 * Returns backend rules to load balance over the given containers, using sticky
 * sessions.
 * @param {string} name - An identifier for the created backend config. Other
 * parts of the config that reference this backend should do so using this
 * name.
 * @param {Container[]} containers - The containers that traffic should be load
 * balanced over.
 * @param {string} balance - The load balancing algorithm to use. See HAProxy's
 * docs for possible algorithms.
 * @return {string}
 */
function createBackendConfig(name, containers, balance) {
  // The SERVERID session cookie ensures that a given user's requests are always
  // forwarded to the same backend server.
  let config = `backend ${name}
    balance ${balance}
    cookie SERVERID insert indirect nocache`;

  containers.forEach((c) => {
    const addr = c.getHostname();
    config += `
    server ${addr} ${addr}:${internalPort} check resolvers dns cookie ${addr}`;
  });

  return config;
}


/**
 * Creates a HAProxy container that does load balanced, URL based
 * routing with sticky sessions and supports HTTPS using automatic
 * Let's Encrypt certificates.
 * @param {Object.<string, Container[]>} domainToContainers - A map from domain name to
 * the containers that should receive traffic for that domain.
 * @param {string} email - The email address to use for Let's Encrypt registration.
 * @param {Object} [options]
 * @param {boolean} [options.testing_cert] - Set to true to fetch a fake testing
 * certificate from Let's Encrypt instead of a real one.
 * @param {string} [options.balance] - The load balancing algorithm to use.
 * See HAProxy's docs for possible algorithms.
 * @return {Container} The HAProxy container.
 */
function create(domainToContainers, email, options = {}) {
  const balance = options.balance || 'roundrobin';

  const domains = Object.keys(domainToContainers);
  const frontendConfig = domains.map(
    domain => urlRoutingConfig(domain, domain))
    .join('\n\n');
  const backendConfig = domains.map(
    domain => createBackendConfig(domain, domainToContainers[domain], balance))
    .join('\n\n');
  const files = createConfigFiles(frontendConfig, backendConfig);

  const allContainers = domains.map(domain => domainToContainers[domain])
    .reduce((a, b) => a.concat(b), []);

  const env = { DOMAINS: domains.join(','), EMAIL: email };
  if (options.testing_cert === true) {
    env.STAGING = 'yes';
  }
  return createHapContainer(allContainers, files, env);
}


module.exports = { exposedHttpPort, exposedHttpsPort, create };
