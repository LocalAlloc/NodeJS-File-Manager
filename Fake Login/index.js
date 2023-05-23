const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const cookieParser = require('cookie-parser');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid'); // Import the UUID generator

/////////////////////////
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore({
      checkPeriod: 86400000 // Clear expired sessions every 24 hours
    }),
    cookie: {
      sameSite: 'none',
      secure: true
    }
  })
);

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/www'));
/////////////////////////

app.get('/', (req, res) => {
  const isLoggedIn = req.session.isLoggedIn || false;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const clientBrowser = req.headers['user-agent'];

  if (isLoggedIn) {
    // User is already logged in
    const existingUser = getUserByEmail(req.body.email);
    if (existingUser && existingUser.ip === clientIP && existingUser.userAgent === clientBrowser) {
      // Same IP and browser, redirect to file manager
      res.redirect('http://192.168.1.2:4444/uploads');
    } else {
      res.redirect('http://192.168.1.2:4444/uploads');
    }
  } else {
    // User is not logged in, render the login page
    res.render('index');
  }
});

app.post('/submit', (req, res) => {
  const username = req.body.email; // Updated field name to 'username'
  const password = req.body.password;

  // Check if the username and password match the expected values
  if (username === 'admin' && password === 'something@123') {
    // Authentication successful
    let data = {
      id: uuidv4(), // Generate a unique ID for the user
      email: req.body.email, // Updated field name to 'username'
      password: req.body.password,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      date: moment().format('DD/MM/YYYY HH:mm:ss')
    };

    // Store the logged-in state in the session
    req.session.isLoggedIn = true;

    const existingUser = getUserByEmail(data.email);

    if (existingUser && existingUser.isLoggedIn) {
      // User is already logged in
      res.send('You are already logged in.');
    } else {
      if (existingUser) {
        // User exists, update the logged-in state
        existingUser.isLoggedIn = true;
      } else {
        // New user, add to the data
        data.isLoggedIn = true;
        addUser(data);
      }

      res.redirect('http://192.168.1.2:4444/uploads');
    }
  } else {
    // Authentication failed
    res.status(401).send('Invalid username or password');
  }
});

function getUserByEmail(email) {
  const fileData = fs.readFileSync('information.json', 'utf-8');
  const users = JSON.parse(fileData);
  return users.find(user => user.email === email);
}

function addUser(user) {
  const fileData = fs.readFileSync('information.json', 'utf-8');
  const users = JSON.parse(fileData);
  users.push(user);
  fs.writeFileSync('information.json', JSON.stringify(users));
}

app.listen(8080, () => {
  console.log('Server running on Port: 8080');
});
