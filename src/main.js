const express = require('express')
const session = require('express-session')
const { create } = require('express-handlebars')
const cookieParser = require('cookie-parser')


const { Server: HttpServer } = require('http')
const { Server: Socket } = require('socket.io')

//const mongo = require('connect-mongo')(session);
const mongo = require('connect-mongodb-session')(session);

const ContenedorMemoria = require('../contenedores/ContenedorMemoria.js')
const ContenedorArchivo = require('../contenedores/ContenedorArchivo.js')
const { Store } = require('express-session')
const { remainder_task } = require('moongose/models/index.js')

const app = express()


advancedOptions = {useNewUrlParser : true, useUnifiedTopology: true}
//--------------------------------------------
// instancio servidor, socket y api

const httpServer = new HttpServer(app)
const io = new Socket(httpServer)

const productosApi = new ContenedorMemoria()
const mensajesApi = new ContenedorArchivo('mensajes.json')

//--------------------------------------------
// configuro el socket

io.on('connection', async socket => {
    console.log('Nuevo cliente conectado!');

    // carga inicial de productos
    socket.emit('productos', productosApi.listarAll());

    // actualizacion de productos
    socket.on('update', producto => {
        productosApi.guardar(producto)
        io.sockets.emit('productos', productosApi.listarAll());
    })

    // carga inicial de mensajes
    socket.emit('mensajes', await mensajesApi.listarAll());

    // actualizacion de mensajes
    socket.on('nuevoMensaje', async mensaje => {
        mensaje.fyh = new Date().toLocaleString()
        await mensajesApi.guardar(mensaje)
        io.sockets.emit('mensajes', await mensajesApi.listarAll());
    })
});

//--------------------------------------------
// agrego middlewares

const hbs = create({ extname : ".hbs",}) 

app.engine(".hbs",hbs.engine)
app.set('view engine', 'hbs');
app.set("views", "./views");

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

//--------------------------------------------
// Almacenar la sesion

var store = new mongo({
    uri:  'mongodb+srv://hernan1:clave@cluster0.rdsklm0.mongodb.net/test',
    collection: 'mySessions'
  });

app.post('/login',(req, res) =>{
    session.user = req.body.login;

    app.use(require('express-session')({
        secret: 'muysecreta',
        cookie: {
          maxAge: (1000 * 60 * 60) 
        },
        store: store,
        resave: true,
        saveUninitialized: false
      }));
      
    const datos = {nombre : req.body.login}
    res.render('principal',datos)
})


app.post('/logout',(req, res) =>{
    const datos = {nombre : session.user}
    res.render('logout',datos)
})


app.use(express.static('public'))
//--------------------------------------------
// inicio el servidor

const PORT = 8080
const connectedServer = httpServer.listen(PORT, () => {
    console.log(`Servidor http escuchando en el puerto ${connectedServer.address().port}`)
})
connectedServer.on('error', error => console.log(`Error en servidor ${error}`))
