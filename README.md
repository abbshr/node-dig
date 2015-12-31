node-dig
========

node-dig is a library based on **tjfontaine/native-dns-packet** that enable the more powerful ability to manipulate DNS request, comparing to the original `require("dns")` module, it exposed the DNS underlying mechanism to Node.js layer. It's easy to build customized DNS utilities base on it, such as Unix command `dig`.

### What's different?

We modified the packet generator, made it possible to customize DNS Header to be sent. (for the purpose that to support `[no]Recursion Desired` in previous, but original node-dns has hard-coded the `RD` bit to `1`, so we hack it).

```coffee
# supported DNS request header fields

# jump to https://www.ietf.org/rfc/rfc1035.txt (4.1.1. Header section format) for a detail view.
qr
opcode
aa
tc
rd
ra
res1
res2
res3
rcode
```

Installation
------------

```
npm install node-dig
```

Usages
-------

```js
var dig = require('node-dig');

var question = dig.Question({
  name: 'www.google.com.co',
  type: 'NS',
});

var req = dig
  .Request({
    question: question,
    timeout: 1000,
    // customize header
    header: {
      // no Recursion Desired
      rd: 0
    }
  })
  .on('timeout', function () {
    console.log('Timeout in making request');
  })
  .on('message', function (err, answer) {
    answer.answer.forEach(function (a) {
      console.log(a.address);
    });
  })
  .on('end', function () {
    console.log('end query');
  })

req.send();
```

API
---

## Class: `Question`

```js
var question = dig.Question(queryType);
```

## Class: `Request`

```js
var request = require('node-dig').Request(options);
```

There are only two methods on `request`

 * `request.send` -- sends the actual request to the remote endpoint
 * `request.cancel` -- cancels the request and ignores any responses

QueryType
---------

queryTypes is an object with the following fields:

+ `name`: server name
+ `type`: query type

the `type` list below are available:

```
'A'
'AAAA'
'NS'
'CNAME'
'PTR'
'NAPTR'
'TXT'
'MX'
'SRV'
'SOA'
'TLSA'
```

Options
-------

Request creation takes an object with the following fields

 * `question` -- an instance of Question (required)
 * `server` -- defines the remote end point (optional)
  - as an object it should be
    * `address` -- a string ip address (required)
    * `port` -- a number for the remote port (optional, default 53)
    * `type` -- a string indicating `udp` or `tcp` (optional, default `udp`)
You do not need to indicate ipv4 or ipv6, the backend will handle that,
if you hadn't specified this field, it'll be setted to system wide `nameserver` from `/etc/resolv.conf`
  - a string ip address
 * `header` -- DNS Header set(optional), see rfc1035 for details.
 * `timeout` -- a number in milliseconds indicating how long to wait for the
request to finish. (optional, default 4000)

Events type
-----------

Request emits the following events

 * `message` -- This is where you get a response, passes `(err, answer)` where
answer is an instance of `Packet`
 * `timeout` -- Fired when the timeout is reached
 * `cancelled` -- Fired if the request is cancelled
 * `end` -- Always fired after a request finished, regardless of disposition

Mock
----

we support mock by mounting an mock settings object on the exposed module.

### Usage

```js
var dig = require('node-dig');

// into mock env
dig.mock = {
  timeout: true
};

// main logic goes here...

// jump out of mock env any time
dig.mock = null;

// continue ...
```

### mock settings object

The following fields are available:

+ `timeout`: <Boolean>
+ `end`: <Boolean>
+ `message`: <Object>
+ `cancelled`: <Boolean>
