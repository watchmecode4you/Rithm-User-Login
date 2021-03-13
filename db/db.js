const {Client} = require('pg')
const env = require("dotenv")
env.config()

let client = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT
})

client.connect(err => {
    if(!err) console.log("Successfully connected to the postresql")
    if(err) consnole.log("Failed to connect to postgresql")
})

module.exports = client