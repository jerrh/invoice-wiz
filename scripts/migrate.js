const path = require("path");
const Umzug = require("umzug");

let umzug = new Umzug({
  logging: function () {
    console.log.apply(null, arguments);
  },
  migrations: {
    path: "./database/migrations",
    pattern: /\.js$/
  },
  upName: "up",
  downName: "down"
});

// Create fx to log events then execute up to run migration db queries 
function logUmzugEvent(eventName) {
  return function (name, migration) {
    console.log(`${name} ${eventName}`);
  };
}

// Log events using event listeners
umzug.on("migrating", logUmzugEvent("migrating"));
umzug.on("migrated", logUmzugEvent("migrated"));
umzug.on("reverting", logUmzugEvent("reverting"));
umzug.on("reverted", logUmzugEvent("reverted"));

// Run migrations
umzug.up().then(console.log("all migrations done"));