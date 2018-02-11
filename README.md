# HAProxy for Kelda

This repository implements a HAProxy blueprint for Kelda that supports automatic HTTPS
certificate generation using Let's Encrypt. The module has a single constructor:
`withURLrouting`.

### withURLrouting
The `withURLrouting` constructor creates an HAProxy container that performs load
balanced, URL based routing with sticky sessions. It uses session cookies to implement
the sticky sessions.
The constructor takes the following arguments:

```javascript
/*
 * @param {Object.<string, Container[]>} domainToContainers - A map from domain name to
 * the containers that should receive traffic for that domain.
 * @param {string} email - The email address to use for Let's Encrypt registration.
 * @param {string} balance - The load balancing algorithm to use. See HAProxy's
 * docs for possible algorithms.
 * @param {Object} options
 * @param {boolean} options.testing_cert - Set to true to fetch a fake testing
 * certificate from Let's Encrypt instead of a real one.
 */
```

HAProxy will communicate with the services behind it on port 80.

#### Example
*See [a full example](./examples/haproxyExampleMultipleApps.js) in the
`examples` directory*.

```javascript
const webAContainers = [];
for (let i = 0; i < 3; i += 1) {
  webAContainers.push(new Container({ name: 'webA', image: 'nginx' }));
}

const webBContainers = [];
for (let i = 0; i < 2; i += 1) {
  webBContainers.push(new Container({ name: 'webB', image: 'nginx' }));
}

const emailAddress = 'you@example.com';

const proxy = haproxy.create({
  'webA.com': webAContainers,
  'webB.com': webBContainers,
}, emailAddress);

const floatingIp = '1.2.3.4';
proxy.placeOn({ floatingIp });
```

`proxy` now refers to an HAProxy instance that sits in front of the
replicated websites at `webA.com` and `webB.com` respectively. Requests sent to the
HAProxy IP address will be forwarded to the correct web server as determined by the
`Host` header in the HTTP request. An HTTPS certificate for both domains will be
automatically requested from Let's Encrypt and installed.

All domains need to be pointing at the floating IP address assigned to the
proxy.

## Accessing the Proxy
To make the proxy accessible from the public internet, simply add the following
lines to your blueprint:

```javascript
allowTraffic(publicInternet, proxy, haproxy.exposedHttpPort);
allowTraffic(publicInternet, proxy, haproxy.exposedHttpsPort);
```

This will open ports 80 and 443 on the proxy instance.

## More
See [Kelda](http://kelda.io) for more information.
