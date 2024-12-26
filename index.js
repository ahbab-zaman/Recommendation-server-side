const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://recommendation-platform-1f3cf.firebaseapp.com",
      "https://recommendation-platform-1f3cf.web.app",
    ],
    credentials: true,
  })
);

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
    const recommendCollection = client.db("queryDB").collection("recommend");

    app.post("/addBid", async (req, res) => {
      const query = req.body;
      const result = await queryCollection.insertOne(query);
      res.send(result);
    });

    app.get("/allQueries", async (req, res) => {
      const query = req.body;
      const result = await queryCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
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
      if (result.length === 0) {
        return res.send({ message: "No cards found" });
      }
      res.send(result);
    });

    app.get("/myRecommend/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "userInfo.email": email };
      const result = await queryCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/singleQuery/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queryCollection.findOne(query);
      res.send(result);
    });

    app.delete("/deletedQuery/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queryCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/queryUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const cursor = { _id: new ObjectId(id) };
      const updatedQuery = req.body;
      const query = {
        $set: {
          product_name: updatedQuery.name,
          product_title: updatedQuery.title,
          product_brand: updatedQuery.brand,
          product_image: updatedQuery.photo,
          boycott: updatedQuery.boycott,
        },
      };
      const result = await queryCollection.updateOne(cursor, query);
      res.send(result);
    });

    // Recommendation API

    app.post("/addRecommend", async (req, res) => {
      const recommendData = req.body;
      const result = await recommendCollection.insertOne(recommendData);
      const filter = { _id: new ObjectId(recommendData.queryId) };
      const options = { upsert: true };
      const update = {
        $inc: { recommendationCount: 1 },
      };
      const updateRecommendCount = await queryCollection.updateOne(
        filter,
        update,
        options
      );
      res.send(result);
    });

    app.get("/recommend/:id", async (req, res) => {
      const id = req.params.id;
      const query = { queryId: id };
      const result = await recommendCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/decreaseCount/:id", async (req, res) => {
      const id = req.params.id;
      const recommendData = req.body;
      const query = { _id: new ObjectId(id) };
      const filter = { _id: new ObjectId(recommendData.queryId) };
      console.log(filter);
      const options = { upsert: true };
      const update = {
        $inc: { recommendationCount: -1 },
      };
      const updateRecommendCount = await queryCollection.updateOne(
        filter,
        update,
        options
      );
      const result = await recommendCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/allRecommend/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = {
        recommender_email: email,
      };
      const result = await recommendCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    app.get("/recommender/:email", async (req, res) => {
      const email = req.params.email;
      const query = { recommender_email: email };
      const result = await recommendCollection.find(query).toArray();
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
