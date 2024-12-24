const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

app.use(express.json());
app.use(cors());

// const cookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: process.env.NODE_ENV === "production" ? "None" : "strict",
// };

const uri = `mongodb+srv://${process.env.REVIEW_DB}:${process.env.REVIEW_PASS}@cluster0.73pqt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const queryCollection = client.db("queryDB").collection("query");
    app.post("/addBid", async (req, res) => {
      const query = req.body;
      const result = await queryCollection.insertOne(query);
      res.send(result);
    });

    app.get("/allQueries", async (req, res) => {
      const query = req.body;
      const result = await queryCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/recentQueries", async (req, res) => {
      const query = req.body;
      const result = await queryCollection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/allQuery/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "userInfo.email": email };
      const result = await queryCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      // if (result.length === 0) {
      //   return res.status(404).send({ message: "No cards found" });
      // }
        res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("recommendation server is running on the street");
});

app.listen(port, () => {
  console.log("Recommendation server is running on the port of", port);
});
