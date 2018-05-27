"use strict";

const Promise = require("bluebird");
const sqlite3 = require("sqlite3");
const path = require("path");

module.exports = {
  // Execute function when migration file runs
  up: function () {
    return new Promise(function (resolve, reject) {
      // Connect to db
      let db = new sqlite3.Database("./database/InvoiceWizard.db");
      // Enable foreign key constraints on sqlite db
      db.run(`PRAGMA foreign_keys = ON`);
      // Specify queries to create table
      // Serialize to specify queries to run sequentially not simultaneously
      db.serialize(function () {
        db.run(`CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT,
          email TEXT, 
          company_name TEXT,
          password TEXT
        )`);

        db.run(`CREATE TABLE invoices ( 
          id INTEGER PRIMARY KEY,
          name TEXT,
          user_id INTEGER,
          paid NUMERIC,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE transactions (
          id INTEGER PRIMARY KEY,
          name TEXT,
          price INTEGER,
          invoice_id INTEGER,
          FOREIGN KEY(invoice_id) REFERENCES invoices(id)
        )`);
      });
      db.close();
    })
  },
  // Reverse changes to db
  down: function () {
    return new Promise(function (resolve, reject) {
      // To rollback, revert up function and bring db to initial state
      let db = new sqlite3.Database("./database/InvoicingWizard.db");
      db.serialize(function () {
        db.run(`DROP TABLE transactions`);
        db.run(`DROP TABLE invoices`);
        db.run(`DROP TABLE users`);
      });
      db.close();
    });
  }
};

