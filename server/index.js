import express from 'express'
import zlib from 'zlib'
const app = express()
import path from 'path'
// import fs from 'fs'
// import https from 'https'
import http from 'http'
import expressWebSockets from 'express-ws'

const PORT = 8443
const UNSECURED_PORT = 8080

// define servers
// const key = fs.readFileSync(path.resolve('./server/certs/key.pem'))
// const cert = fs.readFileSync(path.resolve('./server/certs/cert.pem'))
// const credentials = { key, cert }

// const server = https.createServer(credentials, app)
const unsecureServer = http.createServer(app)
let source = null
let clients = []

const expressWS = expressWebSockets(app, unsecureServer)
// const expressWS = expressWebSockets(app, server)
// const expressWSUnsecured = expressWebSockets(app, unsecureServer)

const wssInstance = expressWS.getWss()

// define routes
app.use('/', express.static(path.resolve('./dist')))
app.get('/api', (req, res) => {
  res.send('ok')
})

wssInstance.on('connection', socket => {
  console.log('CONNECTED', socket.protocol)
  if (socket.protocol === 'client') {
    clients.push(socket)
    socket.onclose = () => {
      clients = clients.filter(client => client !== socket)
    }
  }
})

app.ws('/', (ws, req) => {
  ws.on('message', msg => {
    // console.log('MESSAGE', msg)
    clients.forEach(socket => socket.send(msg))
  })
})

// listen
unsecureServer.listen(UNSECURED_PORT, () => {
  console.log(`listening on port: ${UNSECURED_PORT}`)
})

// server.listen(PORT, () => {
//     console.log(`listening on port: ${PORT}`)
// })