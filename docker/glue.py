import os
import subprocess
import sys
import time
import urllib2
import os.path

domains = os.environ['DOMAINS']
staging = len(os.environ.get('STAGING', '').strip()) > 0
email = os.environ['EMAIL']

path_fullchain = '/etc/letsencrypt/live/kelda/fullchain.pem'
path_privkey = '/etc/letsencrypt/live/kelda/privkey.pem'
path_combined = '/etc/letsencrypt/live/kelda/combined.pem'

def start_haproxy(prev_pid=None):
    """
    Starts an HAProxy process and returns the PID of the new process.

    If 'prev_pid' is given, directs the new HAProxy process to seamlessly take over
    requests from the previous process.
    """
    cmd = ['haproxy', '-D']
    if prev_pid is not None:
        cmd += ['-sf', str(prev_pid)]
    cmd += ['--', '/usr/local/etc/haproxy/haproxy.cfg']
    proc = subprocess.Popen(cmd)
    print('Started HAProxy (pid = %d)' % proc.pid)
    return proc.pid


print('HAProxy ACME Glue')
if staging:
    print('**STAGING**')
print('With domains: ' + domains)
print('With email address: ' + email)
print('')

haproxy_pid = None
while True:
    print('Attempting to acquire/renew certificate...')
    attempt_time = time.time()

    command = ['certbot', 'certonly', '--noninteractive']
    command += ['--agree-tos', '--email', email]  # Register a Let's Encrypt account.
    if staging:
        command += ['--staging']  # Use the staging server.
    command += ['--cert-name', 'kelda']
    command += ['--expand']  # Add new domains to the certificate automatically.
    command += ['--standalone', '--preferred-challenges', 'http-01']
    if haproxy_pid is not None:
        command += ['--http-01-port', '8080']
    command += ['--domains', domains]

    result = subprocess.call(command)
    if result != 0:
        print('Certbot returned error: %d' % result)
        print('Trying again in 60 seconds.')
        time.sleep(60)
        continue

    exists_fullchain = os.path.isfile(path_fullchain)
    if not exists_fullchain:
        print('Error retrieving certificate.')
        print('Trying again in 60 seconds.')
        time.sleep(60)
        continue

    # Only reload the certificate if it has changed.
    if os.path.getmtime(path_fullchain) > attempt_time:
        print('Certificate updated -- reloading HAProxy.')

        # The fullchain PEM and privkey PEM must be combined into one file.
        with open(path_combined, 'w') as combined:
            for filename in (path_fullchain, path_privkey):
                with open(filename) as infile:
                    combined.write(infile.read())

        haproxy_pid = start_haproxy(haproxy_pid)

    print('Sleeping for 24 hours.')
    time.sleep(24 * 60 * 60)
