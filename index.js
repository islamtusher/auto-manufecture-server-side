const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
// const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
require('dotenv').config();

const app = express()
app.use(express.json())
app.use(cors())
// auto-manufac-admin
// smM0UURzOHfGB5qI

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xlljd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect()
        console.log('Connect With MongoDB');
        const partsCollection = client.db("auto-manufac").collection("available-parts");

        // server home 
        app.get('/', (req, res) => {
            res.send('Auto Menufac server running')
        })

        //load available parts
         app.get('/parts', async(req, res)=>{
            const query ={}
            const cursor = partsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })


    }
    finally {
        
    }
}
run().catch(console.dir)


app.listen(port, ()=> {
    console.log('Listing Port', port);
})