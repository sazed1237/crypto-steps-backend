const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config()
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const verifyToken = require('./middleware/verifyToken');

const app = express()
const port = 5000


const allowedOrigins = [process.env.FRONTEND_URL, process.env.FRONTEND_URL_PRODUCTION];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json())



app.options('*', cors({
    origin: allowedOrigins,
    credentials: true
}));


// connect HTTP server
// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: {
//         origin: function (origin, callback) {
//             if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//                 callback(null, true);
//             } else {
//                 callback(new Error('Not allowed by CORS'));
//             }
//         },
//         methods: ["GET", "POST", "PUT", "DELETE"],
//         credentials: true,
//     }
// });


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


        // const db = client.db("cryptoSteps");

        // // Pass MongoDB connection to socketHandler
        // socketHandler(io, db);


        const tradeCollection = client.db("cryptoSteps").collection("trades");
        const usersCollection = client.db("cryptoSteps").collection("users");
        const testimonialCollection = client.db("cryptoSteps").collection("testimonials");


        app.options('*', (req, res) => {
            res.sendStatus(200);
        });

        // jwt API for auth Providers 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_TOKEN_KEY, {
                expiresIn: '1h'
            })
            res.send({ token })
        })


        app.post('/user', async (req, res) => {
            const user = req?.body;
            // console.log(user)
            const query = { email: user?.email }
            const existUser = await usersCollection.findOne(query)

            if (existUser) {
                // If the user already exists, return an error response
                return res.json({
                    message: "User with this email already exists",
                    insertedId: null
                });
            }

            // Create a new user and insert it into the database
            const result = await usersCollection.insertOne(user);

            // Send a success response with the inserted user data
            res.status(200).json({
                message: "User created successfully",
                success: true,
                error: false,
                data: result,
            });

        })





        app.get('/user', verifyToken, async (req, res) => {
            // console.log(req.decoded)
            const userEmail = req?.decoded?.email
            const query = { email: userEmail }
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

            // console.log(userEmail)
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


        app.delete("/trades/:id", verifyToken, async (req, res) => {
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



        // coins geko api 

        app.get('/api/crypto', async (req, res) => {
            try {
                const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                    params: {
                        vs_currency: 'usd',
                        ids: 'bitcoin,ethereum'
                    }
                });
                // console.log(response.data)
                res.json(response.data);
            } catch (error) {
                res.status(500).send('Error fetching data');
            }
        });


        app.get('/api/testimonial', async (req, res) => {
            const testimonials = await testimonialCollection.find().toArray()

            res.send(testimonials)
        })


        // // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
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