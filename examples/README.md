# HAProxy Examples with Kelda

This directory contains an example for Kelda's HAProxy blueprint.
This blueprint boots two applications with the domain names `apples.com` and
`oranges.com` respectively, and fetches a valid HTTPS certificate for them
from Let's Encrypt. Both applications sit behind the HAProxy load
balancer, so they will have the same IP address. This example has a lot of
moving parts and requires some personalized setup:

1. [**Install Kelda**](http://docs.kelda.io/#installing-kelda) with
    ```console
    $ npm install -g @kelda/install
    ```
2. **Get the blueprints** by cloning this repository.
    ```console
    $ git clone https://github.com/kelda/haproxy
    ```
3. **Set up an infrastructure** by running `kelda init`. In the first question, name your infrastructure `default`.
4. **Install dependencies** by running `npm install` in the cloned
  `haproxy` directory.
5. **Start Kelda** by running `kelda daemon` in a different terminal window.
6. **Reserve a floating IP address** with your cloud provider of choice.
7. **Buy a domain name** through a registrar like Namecheap.
8. **Configure the domain's DNS** to map the domain or sub-domains to the floating IP.
9. **Edit the example blueprint** to replace your own email address, domain name(s), and floating
  IP address in `haproxyHttpsExample.js`. You'll need to change all of the lines marked `XXX: CHANGE ME!`.
  
  Optionally change the line with `testing_cert: true` to `testing_cert: false` (or remove that argument altogether)
  to request a real Let's Encrypt certificate as opposed to a testing certificate. Testing certificates
  are not trusted by browsers. However, they are not rate limited, making them suitable for development.
10. **Boot the applications** by running the following command from
  this `haproxy/examples` directory.

    ```console
    $ kelda run ./haproxyHttpsExample.js
    ```
11. **Stop the deployment** with `kelda stop` when you're done, and then kill
  the daemon with Ctrl+C.

## More Info
For more details, check out our documentation for
[running a replicated, load balanced application behind a single IP address](http://docs.kelda.io/#how-to-run-a-replicated-load-balanced-application-behind-a-single-ip-address).
