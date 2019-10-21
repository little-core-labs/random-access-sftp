const storage = require('./')
const uri = 'sftp://alice:password@localhost:9000/hello.txt'
const file = storage(uri)

file.open((err) => {
  file.stat((err, stats) => {
    console.log(stats);
    file.write(0, Buffer.from('hello'), (err) => {
      file.read(0, 5, console.log)
    })
  })
})
