const express = require('express');
// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
// const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
// require('dotenv').config();

const app = express()
app.use(express.json())
app.use(cors())

async function run() {
    try {
        // server home 
        app.get('/', (req, res) => {
            res.send('Auto Menufac server running')
        })

    }
    finally {
        
    }
}
run().catch(console.dir)


app.listen(port, ()=> {
    console.log('Listing Port', port);
})