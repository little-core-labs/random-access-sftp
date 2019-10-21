const { Client } = require('ssh2')
const create = require('random-access-storage')
const debug = require('debug')('random-access-sftp')
const url = require('url')
const fs = require('fs')

const READONLY = fs.constants.O_RDONLY
const READWRITE = fs.constants.O_RDWR | fs.constants.O_CREAT

/**
 * Thrown when the client has not yet connected to the
 * remote SFTP server.
 */
class CLIENT_NOT_CONNECTED_ERR extends Error {
  constructor() {
    super('Client is not connected.')
  }
}

/**
 * Thrown when the client SFTP RPC call indicates that the caller
 * should wait before calling again. This is thrown after several retry
 * attempts.
 */
class CLIENT_BUSY_ERR extends Error {
  constructor() {
    super('Client is busy and could not perform.')
  }
}

/**
 * Creates a random-access-storage compliant interface for interacting with
 * a SFTP file.
 * @param {String|Object} uri
 * @param {?(Object)} opts
 * @return {RandomAccessStorage}
 */
function storage(uri, opts) {
  let conf = null

  if (uri && 'object' === typeof uri) {
    conf = uri
  }

  if (uri && 'string' === typeof uri) {
    conf = new url.URL(uri)
  }

  if (!opts || 'object' !== typeof opts) {
    opts = {}
  }

  Object.assign(conf, opts)

  const client = new Client()
  const flags = false === opts.writable
    ? READONLY
    : READWRITE

  let session = null
  let fd = null

  return create({ open, close, read, write, stat })

  async function call(action, ...args) {
    let retries = 3
    const callback = args.slice(-1)[0]

    while (!action.call(session, ...args) && retries--) {
      await new Promise((resolve) => session.once('continue', resolve))
    }

    if (retries < 0) {
      return callback(new CLIENT_BUSY_ERR())
    }
  }

  function open(req) {
    client.connect(conf)
    client.on('ready', onready)

    function onready() {
      client.sftp(onsftp)
    }

    function onsftp(err, sftp) {
      if (err) {
        req.callback(err)
      } else {
        session = sftp
        call(session.open, conf.pathname, flags, onopen)
      }
    }

    function onopen(err, handle) {
      if (err) {
        req.callback(err)
      } else {
        fd = handle
        req.callback(null)
      }
    }
  }

  function close(req) {
    if (session) {
      session.close(fd, onclose)
    } else {
      onclose()
    }

    function onclose(err) {
      req.callback(err || null)
      if (session) {
        session.end()
      }
      session = null
      fd = null
    }
  }

  function read(req) {
    if (!session || !fd) {
      return req.callback(new CLIENT_NOT_CONNECTED_ERR)
    }

    const { offset, size } = req
    const buffer = Buffer.alloc(size)

    return call(session.read, fd, buffer, 0, size, offset, onread)

    function onread(err, bytesRead, buf) {
      req.callback(err, buf)
    }
  }

  function write(req) {
    if (!session || !fd) {
      return req.callback(new CLIENT_NOT_CONNECTED_ERR)
    }

    const { data, offset } = req
    const { length } = data

    return call(session.write, fd, data, 0, length, offset, onwrite)

    function onwrite(err) {
      req.callback(err)
    }
  }

  function stat(req) {
    if (!session || !fd) {
      return req.callback(new CLIENT_NOT_CONNECTED_ERR)
    }

    return call(session.fstat, fd, onfstat)

    function onfstat(err, stats) {
      if (err && err.message.match(/[not]\s?[un]?supported/)) {
        call(session.lstat, conf.pathname, onstat)
      } else {
        req.callback(err || null, stats)
      }
    }

    function onstat(err, stats) {
      req.callback(err || null, stats)
    }
  }
}

/**
 * Module exports.
 */
module.exports = storage
