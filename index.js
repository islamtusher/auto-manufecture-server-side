const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
require('dotenv').config();
const Stripe = require("stripe")
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express()
app.use(express.json())
app.use(cors())

// auto-manufac-admin
// smM0UURzOHfGB5qI

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xlljd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// JWT TOKEN VERIFYING 
// verify the user have the valid token or not
function jwtVerify(req, res, next) {
    const authorization = req.headers.authorization
    console.log(authorization);
    if (!authorization) {
        return res.status(401).send({message: 'UnAuthorize Access'})
    } else {
        const accessToken = authorization.split(" ")[1]
        jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN, function (err, decoded) {
            if (err) {
                return res.status(403).send({message: 'Forbidden Access'})
            }
            req.decoded = decoded
            next()
          });
    }
}

async function run() {
    try {
        await client.connect()
        console.log('Connect With MongoDB');
        const partsCollection = client.db("auto-manufac").collection("available-parts");
        const myPurchaseCollection = client.db("auto-manufac").collection("my-purchases");
        const userCollection = client.db("auto-manufac").collection("users");
        const paymentInfoCollection = client.db("auto-manufac").collection("payment-info");
        const reviewsCollection = client.db("auto-manufac").collection("user-reviews");
        const myProfileCollection = client.db("auto-manufac").collection("my-profiles");

        // server home 
        app.get('/', (req, res) => {
            res.send('Auto Menufac server running')
        })

        // UpSerat Registered User
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options)
            const accessToken = jwt.sign({ email: email}, process.env.JWT_ACCESS_TOKEN, { expiresIn: '10d' });
            res.send([result, {accessToken : accessToken}])
        })

        //load available parts/items
         app.get('/parts', async(req, res)=>{
            const query ={}
            const cursor = partsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
         })
        
        //load single part/item
        app.get('/part/:id', async (req, res) => {
            const id = req.params.id
            const query ={_id : ObjectId(id)}
            const result = await partsCollection.findOne(query)
            res.send(result)
        })

        // post my purchases order
        app.post('/mypurchase', async(req, res) => {
            const myPurchase = req.body
            const result = await myPurchaseCollection.insertOne(myPurchase)
            res.send(result)
        })

        // load all purchases parts/items of current user
        app.get('/myallpurchases', jwtVerify, async (req, res) => {
            const email = req.query.userEmail
            const query = {userEmail : email}
            const cursor = myPurchaseCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        // updata my Purchases
        app.patch('/mypurchase/:id', jwtVerify, async (req, res) => {
            const partId = req.params.id
            const paymentInfo = req.body
            const {clientSecret, transationId, paymentMethod, status} = paymentInfo
            const filter = {_id : ObjectId(partId)};
            const updateDoc = {
                $set: {
                    paid : true,
                    clientSecret : clientSecret,
                    transationId : transationId,
                    paymentMethod : paymentMethod,
                    status : status,
                },
            };
            const insertedResult = await paymentInfoCollection.insertOne(paymentInfo)
            const myPurchaseUpdate = await myPurchaseCollection.updateOne(filter, updateDoc)
            res.status(200).send([insertedResult, myPurchaseUpdate ])
        })

        // load single purchase part/item of current user
        app.get('/mypurchase/:id', jwtVerify,  async (req, res) => {
            const id = req.params.id
            const query ={_id : ObjectId(id)}
            const result = await myPurchaseCollection.findOne(query)
            res.send(result)
        })


        // Delete Purchased part/item of current user
        app.delete('/mypurchases', async (req, res) => {
            const query = {_id : ObjectId(req.query.id)}
            const result = await myPurchaseCollection.deleteOne(query)
            res.send(result)
        })

        // store ueer Reviewa
        app.post('/reviews', async (req, res) => {
            const review = req.body
            const result = await reviewsCollection.insertOne(review)
            res.send(result)
        })

        // load all users Reviews
        app.get('/reviews', async(req, res)=>{
            const query ={}
            const cursor = reviewsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        // UpSerat Users profile Info
        app.put('/myprofile/:email',jwtVerify, async (req, res) => {
            const email = req.params.email
            const profile = req.body
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: profile,
            };
            const result = await myProfileCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // payment oparation
        app.post('/create-payment-intent', jwtVerify, async (req, res) => {
            const service = req.body;
            console.log(service);
            const name = service.totalPrice
            const price = Math.round(name * 100)
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
              amount: price,
              currency: 'usd',
              payment_method_types: ["card"],
            });
          
            res.send({clientSecret: paymentIntent.client_secret});
        });
    }
    finally {
        
    }
}
run().catch(console.dir)


app.listen(port, ()=> {
    console.log('Listing Port', port);
})