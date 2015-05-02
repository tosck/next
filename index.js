/**
 * tosck <https://github.com/tunnckoCore/tosck>
 *
 * Copyright (c) 2015 Charlike Mike Reagent, contributors.
 * Released under the MIT license.
 */

'use strict';

// require('autoinstall');
var handleArguments = require('handle-arguments');
var prependHttp = require('prepend-http');
var lowercase = require('lowercase-keys');
var extender = require('extend-shallow');
var resolveUrl = require('url').resolve;
var formatUrl = require('url').format;
var parseUrl = require('url').parse;
var errors = require('http-errors');
var abbrev = require('map-types');
var kindOf = require('kind-of');
var omit = require('object.omit');
var https = require('https');
var http = require('http');
var zlib = require('zlib');
var util = require('util');
var qs = require('qs');

// var fullUrl = 'https://user:pass@github.com/foo/damn?foo=bar&baz[0]=qux&baz[1]=jax&cat=123&a[b]=c#users=hash';
// tosck(fullUrl, {query: {aaaa: {bbb: 'ccc'}, path: '/cat/meow?foo=dog', maxRedirects: 12})

function tosck(url, opts, callback) {
  var argz = handleArguments(arguments);
  argz = transformArguments(argz);
  argz = validateArguments(argz.url, argz.opts, argz.callback);
  argz = normalizeArguments(argz.url, argz.opts, argz.callback);

  var options = {
    opts: argz.opts,
    requestOptions: argz.requestOptions
  };
  request(argz.requestUrl, options, function(err, res) {
    if (err) {
      errors('[tosck] request error', err);
      return;
    }

    // read `res`
  });

  console.log(JSON.stringify(argz, 0, 2));
}

function request(url, options, callback) {
  var req = options.requestOptions.protocol === 'https:' ? https : http;

  if (options.opts.method !== 'GET') {
    url = options.requestOptions
    url.method = options.opts.method;
  }

  req = req.request(url, function(res) {
    callback(null, res)
  });
  req.once('error', callback);
  req.end(options.opts.body || undefined)
}

/**
 * Transform arguments to something meaningful
 *
 * @param  {Object} `argz`
 * @return {Object}
 * @api private
 */
function transformArguments(argz) {
  return {
    url: argz.args[0],
    opts: argz.args[1] || {},
    callback: argz.callback
  };
}

/**
 * Validate type of arguments
 *
 * @param  {String}   `url`
 * @param  {Object}   `[opts]`
 * @param  {Function} `callback`
 * @api private
 */
function validateArguments(url, opts, callback) {
  if (kindOf(url) !== 'string') {
    throw new TypeError('[tosck] url should be string');
  }
  opts = validateOptions(opts);

  return {
    url: url,
    opts: opts,
    callback: callback
  };
}

/**
 * Validate options object properties
 *
 * @param  {Object} `opts`
 * @return {Object}
 * @api private
 */
function validateOptions(opts) {
  var map = {
    query: 'so',
    path: 's',
    pathname: 's',
    host: 's',
    hostname: 's',
    timeout: 'n',
    socketTimeout: 'n',
    maxRedirects: 'n',
    followRedirects: 'b'
  };
  Object.keys(map).forEach(function(prop) {
    delegateError(opts[prop], map[prop], '[tosck] opts.' + prop);
  })
  return opts;
}
var abbrev = require('map-types');
var kindOf = require('kind-of');

function abbrevKindof(val, type) {
  var abbrs = abbrev(type);
  var len = abbrs.length;
  var i = -1;

  if (len <= 1) {
    type = abbrs[0];
    return !(val && kindOf(val) !== type);
  }

  while (i < len) {
    i = i+1;
    type = abbrs[i];
    var next = abbrs[i+1];
    if (next) {
      return !(val && kindOf(val) !== type && kindOf(val) !== next);
    }
    return !(val && kindOf(val) !== type);
  }
}

function delegateError(value, abbr, message) {
  if (abbrevKindof(value, abbr)) {
    return;
  }
  var types = abbrev(abbr).join(' or ');
  throw new TypeError(message + ' should be ' + types);
}

/**
 * Normalize arguments to their default values
 *
 * @param  {String}   `url`
 * @param  {Object}   `opts`
 * @param  {Function} `callback`
 * @return {Object}
 * @api private
 */
function normalizeArguments(url, opts, callback) {
  url = prependHttp(url);

  if (opts.body && kindOf(opts.body) !== 'string' && kindOf(opts.body) !== 'buffer') {
    throw new TypeError('[tosck] opts.body should be buffer or string');
  }
  if (opts.body) {
    opts.method = kindOf(opts.method) === 'string' ? opts.method : 'post';
  }

  opts.method = opts.method ? opts.method.toUpperCase() : undefined;
  opts.timeout = opts.timeout ? opts.timeout : false;
  opts.socketTimeout = opts.socketTimeout ? opts.socketTimeout : false;
  opts.maxRedirects = opts.maxRedirects ? opts.maxRedirects : 10;
  opts.followRedirects = opts.followRedirects ? opts.followRedirects : false;
  opts.headers = extender({
    'user-agent': 'https://github.com/tunnckoCore/tosck',
    'accept-encoding': 'gzip,deflate'
  }, lowercase(opts.headers));

  var requestOptions = normalizeRequestOptions(url, opts);
  var requestUrl = formatUrl(requestOptions);

  return {
    url: url,
    opts: omit(opts, Object.keys(requestOptions)),
    requestUrl: requestUrl,
    requestOptions: requestOptions,
    callback: callback
  };
}

/**
 * Normalize, parse and set defaults of http.request options
 *
 * @param  {String} `url`
 * @param  {Object} `opts`
 * @return {Object}
 * @api private
 */
function normalizeRequestOptions(url, opts) {
  var requestOptions = parseUrl(url);
  var query = null;

  // normalize opts.query (extend opts.query possibilities)
  if (kindOf(opts.query) === 'string') {
    query = qs.stringify(qs.parse(opts.query, opts), opts);
  }
  if (kindOf(opts.query) === 'object') {
    query = qs.stringify(opts.query, opts);
  }

  requestOptions.query = query || requestOptions.query;
  requestOptions.path = requestOptions.pathname + '?' + requestOptions.query;
  requestOptions.pathname = opts.path || requestOptions.pathname || null;
  requestOptions.port = opts.port || requestOptions.port || null;
  requestOptions.search = '?' + requestOptions.query;

  if (opts.path && opts.path.indexOf('?') !== -1) {
    var parts = opts.path.split('?');
    requestOptions.pathname = parts[0];
    requestOptions.query = parts[1] + '&' + requestOptions.query;
    requestOptions.search = '?' + requestOptions.query
  }

  if (opts.host && opts.host.indexOf(':') !== -1) {
    var parts = opts.host.split(':');
    requestOptions.hostname = parts[0];
    requestOptions.port = parts[1] || requestOptions.port;
  }

  requestOptions.path = requestOptions.pathname + requestOptions.search;
  requestOptions.host = requestOptions.port
    ? requestOptions.hostname + ':' + requestOptions.port
    : requestOptions.hostname;
  requestOptions.port = requestOptions.port
    ? String(requestOptions.port)
    : null;

  return requestOptions;
}
