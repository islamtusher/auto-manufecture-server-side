const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xlljd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// TODO: JWT TOKEN VERIFYING
// TODO: verify the user have the valid token or not
function jwtVerify(req, res, next) {
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res.status(401).send({ message: "UnAuthorize Access" });
  } else {
    const accessToken = authorization.split(" ")[1];
    jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_TOKEN,
      function (err, decoded) {
        if (err) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        req.decoded = decoded;
        console.log(decoded);
        next();
      }
    );
  }
}

async function run() {
  try {
    await client.connect();
    console.log("Connect With MongoDB");
    const partsCollection = client
      .db("auto-manufac")
      .collection("available-parts");
    const myPurchaseCollection = client
      .db("auto-manufac")
      .collection("my-purchases");
    const userCollection = client.db("auto-manufac").collection("users");
    const paymentInfoCollection = client
      .db("auto-manufac")
      .collection("payment-info");
    const reviewsCollection = client
      .db("auto-manufac")
      .collection("user-reviews");
    const myProfileCollection = client
      .db("auto-manufac")
      .collection("my-profiles");

    // TODO: server home
    app.get("/", (req, res) => {
      res.send("Auto Menufac server running");
    });

    // TODO: verify the user is Admin or not
    const adminUserVerify = async (req, res, next) => {
      const decoded = req.decoded.email;
      const user = await userCollection.findOne({ email: decoded });
      if (user?.role === "admin") {
        next();
      } else {
        return res.status(403).send({ message: "Don't Have Permission" });
      }
    };

    // TODO: UpSerat Registered User
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const accessToken = jwt.sign(
        { email: email },
        process.env.JWT_ACCESS_TOKEN,
        { expiresIn: "10d" }
      );
      res.send([result, { accessToken: accessToken }]);
    });

    // TODO: load all users
    app.get("/allusers", async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // TODO: upDate a user to admin
    app.put(
      "/user/admin/:email",
      jwtVerify,
      adminUserVerify,
      async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // TODO: load admin user
    app.get("/admin/:email", jwtVerify, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ isAdmin: isAdmin });
    });

    // TODO: add single part/product
    app.post("/addparts", async (req, res) => {
      const part = req.body;
      const result = await partsCollection.insertOne(part);
      res.send(result);
    });

    // TODO: load available parts/items
    app.get("/parts", async (req, res) => {
      const query = {};
      const cursor = partsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // TODO: load single part/item
    app.get("/part/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.findOne(query);
      res.send(result);
    });

    // TODO: post my purchases order
    app.post("/mypurchase", async (req, res) => {
      const myPurchase = req.body;
      const result = await myPurchaseCollection.insertOne(myPurchase);
      res.send(result);
    });

    // TODO: load all purchases parts/items of current user
    app.get("/myallpurchases", jwtVerify, async (req, res) => {
      const email = req.query.userEmail;
      const query = { userEmail: email };
      const cursor = myPurchaseCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // TODO: updata my Purchases
    app.patch("/mypurchase/:id", jwtVerify, async (req, res) => {
      const partId = req.params.id;
      const paymentInfo = req.body;
      const { clientSecret, transationId, paymentMethod, status } = paymentInfo;
      const filter = { _id: ObjectId(partId) };
      const updateDoc = {
        $set: {
          paid: true,
          clientSecret: clientSecret,
          transationId: transationId,
          paymentMethod: paymentMethod,
          status: status,
        },
      };
      const insertedResult = await paymentInfoCollection.insertOne(paymentInfo);
      const myPurchaseUpdate = await myPurchaseCollection.updateOne(
        filter,
        updateDoc
      );
      res.status(200).send([insertedResult, myPurchaseUpdate]);
    });

    // TODO: load all purchase
    app.get("/allOrders", jwtVerify, adminUserVerify, async (req, res) => {
      const query = {};
      const cursor = myPurchaseCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // TODO: update the order status
    app.patch("/order/:id", jwtVerify, async (req, res) => {
      const partId = req.params.id;
      console.log(partId);
      const filter = { _id: ObjectId(partId) };
      const updateDoc = {
        $set: {
          status: "shipped",
        },
      };
      const myPurchaseUpdate = await myPurchaseCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(myPurchaseUpdate);
    });

    // TODO: Delete order
    app.delete("/order/:id", async (req, res) => {
      const query = { _id: ObjectId(req.params.id) };
      const result = await myPurchaseCollection.deleteOne(query);
      res.send(result);
    });

    // TODO: load single purchase part/item of current user
    app.get("/mypurchase/:id", jwtVerify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await myPurchaseCollection.findOne(query);
      res.send(result);
    });

    // TODO: Delete Purchased part/item of current user
    app.delete("/mypurchases", async (req, res) => {
      const query = { _id: ObjectId(req.query.id) };
      const result = await myPurchaseCollection.deleteOne(query);
      res.send(result);
    });

    // TODO: store user Review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // TODO: store user Review
    app.delete("/reviews/:id", async (req, res) => {
      console.log("back", req.params.id);
      const query = { _id: ObjectId(req.params.id) };
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
    });

    // TODO: load all users Reviews
    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // TODO: UpSerat Users profile Info
    app.put("/myprofile/:email", jwtVerify, async (req, res) => {
      const email = req.params.email;
      const profile = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: profile,
      };
      const result = await myProfileCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // TODO: load Users profile Info
    app.get("/myprofile/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const cursor = await myProfileCollection.findOne(query);
      res.send(cursor);
    });

    // TODO: payment oparation
    app.post("/create-payment-intent", jwtVerify, async (req, res) => {
      const service = req.body;
      console.log(service);
      const name = service.totalPrice;
      const price = Math.round(name * 100);
      //* Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: price,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Listing Port", port);
});
