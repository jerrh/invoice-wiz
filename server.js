const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const multipart = require('connect-multiparty');
const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const port = process.env.port || 3128;

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const multipartMiddleware = multipart();

// App routes
app.get('/', function (req, res) {
  res.send("Welcome to Invoicing App");
});

app.post('/register', multipartMiddleware, function (req, res) {
  // Check for empty fields
  if (
    isEmpty(req.body.name) ||
    isEmpty(req.body.email) ||
    isEmpty(req.body.company_name) ||
    isEmpty(req.body.password)
  ) {
    return res.json({
      'status': false,
      'message': 'All fields required'
    });
  }

  bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    let db = new sqlite3.Database('./database/InvoiceWizard.db');
    let sql = `INSERT INTO users(name, email, company_name, password) VALUES('${req.body.name}', '${req.body.email}', '${req.body.company_name}', '${hash}')`;
    db.run(sql, function (err) {
      if (err) {
        throw err;
      } else {
        let user_id = this.lastID;

        let query = `SELECT * FROM users WHERE id='{user_id}'`;
        db.all(query, [], (err, rows) => {
          if (err) {
            throw err;
          }
          let user = rows[0];
          delete user.password;

          // Create payload for JWT
          const payload = {
            user: user
          };

          // Create token that expires in 24 hours
          let token = jwt.sign(payload, app.get('appSecret'), {
            expiresIn: '24h'
          });

          return res.json({
            status: true,
            message: 'User created',
            user: user,
            token: token
          });
        });

      }
    });
    db.close();
  });
});

app.post('/login', function (req, res) {
  let db = new sqlite3.Database("./database/InvoicingWizard.db");
  let sql = `SELECT * from users where email='${req.body.email}'`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err;
    }
    db.close();
    if (rows.length == 0) {
      return res.json({
        status: false,
        message: "Wrong email"
      });
    }
  });

  let user = rows[0];
  let authenticated = bcrypt.compareSync(req.body.password, user.password);
  delete user.password;
  if (authenticated) {
    return res.json({
      status: true,
      user: user
    });
  }

  return res.json({
    status: false,
    message: "Wrong Password, please retry"
  });
});


app.post('/sendmail', function (req, res) {

});

app.post('/invoice', multipartMiddleware, function (req, res) {
  // Validate data
  if (isEmpty(req.body.name)) {
    return res.json({
      status: false,
      message: "Invoice needs a name"
    });
  }
  // Create invoice
  let db = new sqlite3.Database("./database/InvoicingApp.db");
  let sql = `INSERT INTO invoices(name,user_id,paid) VALUES('${req.body.name}', '${req.body.user_id}', 0)`;
  db.serialize(function () {
    db.run(sql, function (err) {
      if (err) {
        throw err;
      }
      let invoice_id = this.lastID;
      for (let i = 0; i < req.body.txn_names.length; i++) {
        let query = `INSERT INTO transactions(name,price,invoice_id) VALUES('${req.body.txn_names[i]}', '${req.body.txn_prices[i]}', '${invoice_id}')`;
        db.run(query);
      }
      return res.json({
        status: true,
        message: "Invoice created"
      });
    });
  });
})

app.get('/invoice/user/:user_id', multipartMiddleware, function (req, res) {
  let db = new sqlite3.Database("./database/InvoicingApp.db");
  let sql = `SELECT * FROM invoices LEFT JOIN transactions ON invoices.id=transactions.invoice_id WHERE user_id='${req.params.user_id}'`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err;
    }
    return res.json({
      status: true,
      transactions: rows
    });
  });
})

app.get('/invoice/user/:user_id/:invoice_id', multipartMiddleware, function (req, res) {
  let db = new sqlite3.Database("./database/InvoicingApp.db");
  let sql = `SELECT * FROM invoices LEFT JOIN transactions ON invoices.id=transactions.invoice_id WHERE user_id='${
    req.params.user_id
    }' AND invoice_id='${req.params.invoice_id}'`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err;
    }
    return res.json({
      status: true,
      transactions: rows
    });
  });
});

app.listen(port, function () {
  console.log(`Running on localhost:${port}`);
});

