/* eslint-env mocha */

const assert = require('chai').assert;
const kelda = require('kelda');
const haproxy = require('../haproxyAutoHttps');

describe('haproxy_auto_https', () => {
  beforeEach(() => {
    kelda.resetGlobals();
  });

  describe('create', () => {
    it('config', () => {
      const expConfig = `global
    tune.ssl.default-dh-param 2048

defaults
    log     global
    mode    http
    timeout connect 5000
    timeout client 5000
    timeout server 5000

resolvers dns
    nameserver gateway 10.0.0.1:53

backend acme-backend
    server acme 127.0.0.1:8080

frontend http-in
    bind *:80
    bind *:443 ssl crt /etc/letsencrypt/live/kelda/combined.pem
    acl acme-acl path_beg /.well-known/acme-challenge/
    use_backend acme-backend if acme-acl

    acl domainA_req hdr(host) -i domainA
    use_backend domainA if domainA_req

    acl domainB_req hdr(host) -i domainB
    use_backend domainB if domainB_req

backend domainA
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server foo.q foo.q:80 check resolvers dns cookie foo.q

backend domainB
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server bar.q bar.q:80 check resolvers dns cookie bar.q
`;

      const domainA = [new kelda.Container('foo', 'image')];
      const domainB = [new kelda.Container('bar', 'image')];
      const email = 'test@example.com';
      const hap = haproxy.create({ domainA, domainB }, email);
      assert.equal(hap.filepathToContent['/usr/local/etc/haproxy/haproxy.cfg'],
        expConfig);
    });
  });
});
