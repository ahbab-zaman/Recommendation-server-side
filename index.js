const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
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
    optionsSuccessStatus: 200,
  })
);
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.REVIEW_DB}:${process.env.REVIEW_PASS}@cluster0.73pqt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies.token;
  console.log(token);
  if (!token) return res.status(401).send({ message: "Unauthorized access" });
  jwt.verify(token, process.env.SECRET_KEY, (error, decoded) => {
    if (error) {
      return res.status(403).send({ message: "Unauthorized access" });
    }
    req.user = decoded;
  });

  next();
};

async function run() {
  try {
    const queryCollection = client.db("queryDB").collection("query");
    const recommendCollection = client.db("queryDB").collection("recommend");

    // generate json web-token
    app.post("/jwt", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: "365d",
      });
      console.log(token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // clear cookie form browser
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/addBid", verifyToken, async (req, res) => {
      const query = req.body;
      const decodedEmail = req?.user;
      if (!decodedEmail)
        return res.status(401).send({ message: "Forbidden access" });
      console.log("query body", query);
      const result = await queryCollection.insertOne(query);
      res.send(result);
    });

    app.get("/allQueries", async (req, res) => {
      const search = req.query.search;
      let query = {
        name: {
          $regex: search,
          $options: "i",
        },
      };
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

    app.get("/allQuery/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req?.user.email;
      if (decodedEmail !== email) {
        return res.status(401).send({ message: "Forbidden access" });
      }
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
