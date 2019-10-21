random-access-sftp
==================

> A [random access storage][ras] compliant interface for SFTP files random access.

## Installation

```sh
$ npm install random-access-sftp
```

## Usage

```js
const sftp = require('random-access-sftp')
cont file = sftp(`sftp://user:password@hostname:9000/path/to/file`)

file.open((err) => {
  file.stat((err, stats) => {
    file.write(0, Buffer.from('hello'), (err) => {
      file.read(0, 5, console.log)
    })
  })
})

```

## API

### `file = require('random-access-sftp')(uri[, opts])`

Creates a [random-access-storage][ras] interface to a SFTP file where
`uri` is a valid URL string or
[WHATWG URL](https://nodejs.org/api/url.html#url_the_whatwg_url_api) and
`opts` is an optional options object that is merged into the parsed `URL()`
object that `uri` is given to. In other words, `uri` can contain all of
the properties needed to create a SFTP connection and point to the file
that will be randomly accessed.

```js
const file = sftp({
  pathname: '/path/to/file',
  host: 'example.com',
  password: 'password',
  username: 'alice',
  port: 9000
})
```

Or with a valid URL

```js
const file = sftp('sftp://alice:password@example.com:9000/path/to/file')
```

## License

MIT


[ras]: https://github.com/random-access-storage/random-access-storage
