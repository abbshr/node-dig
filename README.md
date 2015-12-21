node-dig
========

node-dig is a node implementation of the Unix command `dig`, **fork from and based on tjfontaine/node-dns**.

### What's different?

We modified the packet generator, made it possible to customize DNS Header to be sent. (for the purpose that to support `[no]Recursion Desired` in previous, but original node-dns has hard-coded the `RD` bit to `1`, so we hack it).

Installation
------------

```
npm install node-dig
```

Client
------

native-dns exports what should be a 1:1 mapping of the upstream node.js dns
module. That is to say if it's listed in the [docs](http://nodejs.org/docs/latest/api/dns.html)
it should behave similarly. If it doesn't please file an [issue](https://github.com/tjfontaine/node-dns/issues/new).

Request
-------

Beyond matching the upstream module, native-dns also provides a method for
customizing queries.

```javascript
var dns = require('node-dig');
var util = require('util');

var question = dns.Question({
  name: 'www.google.com',
  type: 'A',
});

var start = Date.now();

var req = dns.Request({
  question: question,
  server: { address: '8.8.8.8', port: 53, type: 'udp' },
  timeout: 1000,
  // customize header
  header: {
    // no Recursion Desired
    rd: 0
  }
});

req.on('timeout', function () {
  console.log('Timeout in making request');
});

req.on('message', function (err, answer) {
  answer.answer.forEach(function (a) {
    console.log(a.address);
  });
});

req.on('end', function () {
  var delta = (Date.now()) - start;
  console.log('Finished processing request: ' + delta.toString() + 'ms');
});

req.send();
```

Request creation takes an object with the following fields

 * `question` -- an instance of Question (required)
 * `server` -- defines the remote end point (required)
  - as an object it should be
    * `address` -- a string ip address (required)
    * `port` -- a number for the remote port (optional, default 53)
    * `type` -- a string indicating `udp` or `tcp` (optional, default `udp`)
You do not need to indicate ipv4 or ipv6, the backend will handle that
  - a string ip address
 * `header` -- DNS Header set(optional)
 * `timeout` -- a number in milliseconds indicating how long to wait for the
request to finish. (optional, default 4000)
 * `try_edns` -- a boolean indicating whether to use an `EDNSPacket` (optional)
 * `cache` -- can be false to disable caching, or implement the cache model, or
an instance of Cache but with a different store (optional, default
platform.cache)

There are only two methods

 * `send` -- sends the actual request to the remote endpoint
 * `cancel` -- cancels the request and ignores any responses

Request emits the following events

 * `message` -- This is where you get a response, passes `(err, answer)` where
answer is an instance of `Packet`
 * `timeout` -- Fired when the timeout is reached
 * `cancelled` -- Fired if the request is cancelled
 * `end` -- Always fired after a request finished, regardless of disposition

Platform
--------

If you want to customize all `resolve` or `lookup`s with the replacement client
stack you can modify the platform settings accessible in the top level `platform`
object.

Methods:

 * `reload` -- Re-read system configuration files to populate name servers and
hosts

Properties:

 * `ready` -- Boolean whether requests are safe to transit, true after hosts
and name servers are filled
 * `watching` -- Boolean indicating if system configuration files are watched
for changes, default to false (currently can only be enabled on !win32)
 * `name_servers` -- An array of servers used for resolving queries against
  - Each entry is an object of `{ address: <string ip>, port: 53 }`
  - On win32 this is hard coded to be google dns until there's a sane way to get
the data
 * `search_path` -- An array of domains to try and append after a failed lookup
 * `attempts` -- The number of retries for a failed lookup/timeout (default: 5)
 * `timeout` -- The time each query is allowed to take before trying another
server. (in milliseconds, default: 5000 (5 seconds))
 * `edns` -- Whether to try and send edns queries first (default: false)
 * `cache` -- The system wide cache used by default for `lookup` and `resolve`,
set this to false to disable caching

Events:

 * `ready` -- Emitted after hosts and name servers have been loaded
 * `unready` -- Emitted when hosts and name servers configuration is being
reloaded.
