// Copyright 2011 Timothy J Fontaine <tjfontaine@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE

'use strict';

var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var PendingRequests = require('./pending');
var utils = require('./utils');

var debug = function() {};

if (process.env.NODE_DEBUG && process.env.NODE_DEBUG.match(/dns/)) {
  debug = function debug() {
    var args = Array.prototype.slice.call(arguments);
    console.error.apply(this, ['client', Date.now().toString()].concat(args));
  };
}

var Request = exports.Request = function(opts) {
  if (!(this instanceof Request)) return new Request(opts);

  this.question = opts.question;
  this.server = opts.server;

  // additional settings: header
  this.header = opts.header || {};

  if (typeof this.server === 'string' || this.server instanceof String)
    this.server = { address: this.server, port: 53, type: 'udp' };

  if (!this.server || !this.server.address)
    // use platform specified
    this.server = { address: utils.parseResolv()[0] };

  if (!this.server.type || ['udp', 'tcp'].indexOf(this.server.type) === -1)
    this.server.type = 'udp';

  if (!this.server.port)
    this.server.port = 53;

  this.timeout = opts.timeout || 4 * 1000;
  this.fired = false;
  this.id = undefined;

  debug('request created', this.question);
};

util.inherits(Request, EventEmitter);

// mock settings
Request.mock = false;

Request.prototype.handle = function(err, answer, cached) {
  var mock = Request.mock;

  if (!this.fired) {
    debug('request handled', this.id, this.question);

    if (mock && mock.message === false) {
      return this.done();
    }

    if (mock && mock.message) {
      answer = mock.message;
    }

    this.emit('message', err, answer);
    this.done();
  }
};

Request.prototype.done = function() {
  var mock = Request.mock;

  debug('request finished', this.id, this.question);
  this.fired = true;
  clearTimeout(this.timer_);
  PendingRequests.remove(this);

  if (!mock || !('end' in mock) || mock.end === true) {
    this.emit('end');
  }

  this.id = undefined;
};

Request.prototype.handleTimeout = function() {
  var mock = Request.mock;

  if (!this.fired) {
    debug('request timedout', this.id, this.question);

    if (!mock || !('timeout' in mock) || mock.timeout === true)
      this.emit('timeout');

    this.done();
  }
};

Request.prototype.error = function(err) {
  if (!this.fired) {
    debug('request error', err, this.id, this.question);
    this.emit('error', err);
    this.done();
  }
};

Request.prototype.send = function() {
  var mock = Request.mock;

  debug('request not in cache', this.question);
  var self = this;

  if (mock && mock.timeout === true) {
    self.handleTimeout();
  } else {
    self.timer_ = setTimeout(function() {
      self.handleTimeout();
    }, self.timeout);

    PendingRequests.send(self);
  }
};

Request.prototype.cancel = function() {
  var mock = Request.mock;

  debug('request cancelled', this.id, this.question);

  if (!mock || !('cancelled' in mock) || mock.cancelled === true) {
    this.emit('cancelled');
    this.done();
  }
};
