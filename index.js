const express = require('express');
const cors = require('cors');
require('dotenv').config()
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const moment = require('moment');
const jwt = require('jsonwebtoken');


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
        const usersCollection = client.db("novaMarket").collection("users");


        const verifyToken = (req, res, next) => {
            const token = req.headers.authorization.split(' ')[1];
            console.log('token', token)

            if (!token) {
                return res.status(403).json({
                    message: "No token provided",
                    success: false,
                });
            }

            jwt.verify(token, process.env.SECRET_TOKEN_KEY, (err, decoded) => {
                if (err) {
                    return res.status(401).json({
                        message: "Unauthorized! Invalid token",
                        success: false,
                    });
                }
                req.decoded = decoded;
                next();
            });
        };



        app.post("/signin", async (req, res) => {
            try {
                const { email, password } = req.body;
                const query = { email: email };
                const existUser = await usersCollection.findOne(query);

                if (!existUser) {
                    return res.status(400).json({
                        message: "User with this email does not exist",
                        success: false,
                        error: true,
                    });
                }

                if (existUser?.password === password) {

                    const tokenData = {
                        _id: existUser._id,
                        email: existUser.email
                    };
                    const token = jwt.sign(tokenData, process.env.SECRET_TOKEN_KEY, { expiresIn: "1d" });

                    return res.status(200).json({
                        message: "Login successful",
                        success: true,
                        error: false,
                        data: existUser,
                        token: token
                    });
                } else {
                    return res.status(401).json({
                        message: "Incorrect password",
                        success: false,
                        error: true,
                    });
                }
            } catch (error) {
                console.error("Signin error:", error);
                res.status(500).json({
                    message: "An error occurred during login",
                    success: false,
                    error: true,
                    details: error.message
                });
            }
        });




        app.post("/singup", async (req, res) => {
            try {
                // Extract the user data from the request body
                const { name, email, password, profilePhoto } = req.body;

                console.log('email', email)

                // Check if the email already exists in the database
                const query = { email: email };
                const existUser = await usersCollection.findOne(query);
                console.log('exist user', existUser)

                if (existUser) {
                    // If the user already exists, return an error response
                    res.status(400).json({
                        message: "User with this email already exists",
                        success: false,
                        error: true,
                    });
                } else {
                    // Create a new user and insert it into the database
                    const newUser = { name, email, password, profilePhoto };
                    const result = await usersCollection.insertOne(newUser);

                    // Send a success response with the inserted user data
                    res.status(200).json({
                        message: "User created successfully",
                        success: true,
                        error: false,
                        data: result,
                    });
                }
            } catch (error) {
                // Handle any unexpected errors
                res.status(500).json({
                    message: "An error occurred while processing your request",
                    success: false,
                    error: true,
                    details: error.message,
                });
            }
        });




        app.get('/user', verifyToken, async (req, res) => {
            // console.log(req.decoded)
            const userId = req?.decoded?._id
            const query = { _id: new ObjectId(userId) }
            const result = await usersCollection.findOne(query)
            // console.log(result)

            res.status(200).json({
                message: "user details",
                success: true,
                error: false,
                data: result
            });
        })



        app.get('/trades', verifyToken, async (req, res) => {
            const userEmail = req?.query?.email;  // Get the email from the query parameters
            const query = { email: userEmail };  // Filter trades by user email

            console.log(userEmail)
            try {
                const trades = await tradeCollection.find(query).toArray();
                res.json({
                    message: "User's Trades",
                    success: true,
                    error: false,
                    data: trades,
                });
            } catch (error) {
                res.status(500).json({
                    message: "Error fetching trades",
                    success: false,
                    error: true,
                    data: [],
                });
            }
        });




        app.get('/trades/:date', verifyToken, async (req, res) => {
            const date = req?.params?.date;
            const formattedDate = moment(date).format('YYYY-MM-DD');
            console.log(formattedDate)
            const email = req?.decoded?.email

            const query = { date: formattedDate, email: email }

            const result = await tradeCollection.find(query).toArray()
            console.log(result)

            if (result?.length > 0) {
                res.status(200).json({
                    success: true,
                    data: result
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: "No trades found for this date."
                });
            }

        })



        app.post("/trade", verifyToken, async (req, res) => {
            const trade = {
                ...req.body,
                email: req?.decoded?.email,  // Add user email from the token
            };
            const result = await tradeCollection.insertOne(trade);

            res.json({
                message: "Trade entered",
                success: true,
                error: false,
                data: result,
            });
        });



        app.put('/update/:id', verifyToken, async (req, res) => {
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


        app.put('/update-note/:id', async (req, res) => {
            const id = req?.params?.id;
            const { content } = req.body; // Destructure content from the request body

            try {
                const query = { _id: new ObjectId(id) };
                const update = {
                    $set: { note: content }, // Update only the note field
                };
                const result = await tradeCollection.updateOne(query, update);

                if (result?.modifiedCount > 0) {
                    res.status(200).json({
                        message: "Note updated successfully",
                        success: true,
                        error: false,
                        data: result,
                    });
                } else {
                    res.status(404).json({
                        message: "Trade not found or no changes detected",
                        success: false,
                        error: true,
                    });
                }
            } catch (error) {
                console.error('Error updating note:', error);
                res.status(500).json({
                    message: "Failed to update note",
                    success: false,
                    error: true,
                });
            }
        });




        app.delete("/trade/:id", verifyToken, async (req, res) => {
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


        // // Send a ping to confirm a successful connection
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