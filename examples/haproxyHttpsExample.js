const kelda = require('kelda');
const haproxy = require('../haproxyAutoHttps');

const indexPath = '/usr/share/nginx/html/index.html';

/** Create a number of webservers serving the given content.
 *
 * @param {number} [numServers] - The desired number of web servers.
 * @param {string} [text] - The text to put in index.html.
 * @returns {Container[]}
 * */
function appWithContent(numServers, text) {
  const appContainers = [];
  for (let i = 0; i < numServers; i += 1) {
    appContainers.push(new kelda.Container('web', 'nginx', {
      filepathToContent: { [indexPath]: text },
    }));
  }
  return appContainers;
}

const appleApp = appWithContent(2, 'Apples!\n');
const orangeApp = appWithContent(2, 'Oranges!\n');

// Let's Encrypt requires you to supply a contact email address
// to use for important communication and lost account retrieval.
const emailAddress = 'you@example.com'; // XXX: CHANGE ME!

// Create a load balancer to sit in front of `appContainers`.
// All of these domain names must point to the floating IP
// assigned to the load balancer.
const loadBalancer = haproxy.create({
  'oranges.com': orangeApp, // XXX: CHANGE ME!
  'apples.com': appleApp, // XXX: CHANGE ME!
}, emailAddress, { testing_cert: true }); // XXX: CHANGE ME?

// Allow requests from the public internet to the load balancer on ports 80 and 443
kelda.allowTraffic(kelda.publicInternet, loadBalancer, haproxy.exposedHttpPort);
kelda.allowTraffic(kelda.publicInternet, loadBalancer, haproxy.exposedHttpsPort);

// Deploy the application containers and load balancer.
const inf = kelda.baseInfrastructure();
appleApp.forEach(container => container.deploy(inf));
orangeApp.forEach(container => container.deploy(inf));

const floatingIp = '1.2.3.4'; // XXX: CHANGE ME!
loadBalancer.placeOn({ floatingIp });
loadBalancer.deploy(inf);
