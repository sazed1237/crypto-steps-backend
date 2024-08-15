const express = require('express');
const cors = require('cors');
require('dotenv').config()
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const moment = require('moment');


const app = express()
const port = process.env.PORT || 5000


app.use(cors({
    origin: process.env.FRONTEND_URL_PRODUCTION,
    credentials: true
}))
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yr1gg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const tradeCollection = client.db("novaMarket").collection("trades");

        app.get('/trades', async (req, res) => {
            const trade = await tradeCollection.find().toArray()

            res.json({
                message: "All Trads",
                success: true,
                error: false,
                data: trade
            })
        })


        app.get('/trades/:date', async (req, res) => {
            const date = req.params.date;
            const formattedDate = moment(date).format('YYYY-MM-DD');
            console.log(formattedDate)
            const query = { date: formattedDate }

            const result = await tradeCollection.find(query).toArray()
            console.log(result)

            if (result.length > 0) {
                res.status(200).json({ success: true, data: result });
            } else {
                res.status(404).json({ success: false, message: "No trades found for this date." });
            }

        })


        app.post("/trade", async (req, res) => {
            const trade = req.body
            // console.log(trade)
            const result = await tradeCollection.insertOne(trade)

            res.json({
                message: "Trade entered",
                success: true,
                error: false,
                data: result,
            })
        })

        app.put('/update/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const updatedTrade = req.body;
            const query = { _id: new ObjectId(id) }
            const result = await tradeCollection.replaceOne(query, updatedTrade)
            // console.log(result)

            res.json({
                message: "Update successful",
                success: true,
                error: false,
                data: result
            })
        })


        app.delete("/trade/:id", async (req, res) => {
            const tradeId = req.params.id;
            console.log(tradeId)
            const query = { _id: new ObjectId(tradeId) }
            const result = await tradeCollection.deleteOne(query)

            res.json({
                message: "Delete successful",
                success: true,
                error: false,
                data: result
            })

        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.listen(port, () => {
    console.log(`app is running on port ${port}`)
})