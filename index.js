const express = require('express');
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");
const { MongoClient } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const ObjectId = require('mongodb').ObjectId;

//firebase admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middle ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.obwta.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//verifying email by id token
async function VerfyToken(req, res, next){
    if(req.headers.authorization.startsWith('Bearer '))
    {
        const idtoken = req.headers.authorization.split('Bearer ')[1];
        try{
            const decodedUser = await admin.auth().verifyIdToken(idtoken);
            req.decodedEmail = decodedUser.email;
        }
        catch{

        }
    }
    next()
}

async function run(){
    try{
        await client.connect();

        const database = client.db('CarMaxDB');
        const CarmodelCollection = database.collection('CarmodelCollection');
        const OrderCollection = database.collection('OrderCollection');
        const UserCollection = database.collection('UserCollection');
        const ReviewCollection = database.collection('ReviewCollection')

        app.get('/carmodels', async(req, res) => {
            const cursor = CarmodelCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let result;
            const count = await cursor.count()
            if(page)
            {
                 result = await cursor.skip(page * size).limit(size).toArray()
            }
            else{
                result = await cursor.toArray();
            }
            res.send({
                result,
                count
            })
        })
        app.post('/carmodels', async (req,res) => {
            const data = req.body;
            const result = await CarmodelCollection.insertOne(data);
            res.json(result)
        })
        //geting car for main colloction
        app.get('/maincar', async(req, res) => {
            const cursor = CarmodelCollection.find({});
            const result = await cursor.toArray();
            res.send(result)
        })
        //deleting car
        app.delete('/deletecar/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await CarmodelCollection.deleteOne(query);
            res.send(result)
        })
        //Geting car item by id
        app.get('/carmodels/:id', async (req, res) => {
            const id = req.params.id;
            const query ={_id: ObjectId(id)};
            const car = await CarmodelCollection.findOne(query);
            res.send(car)
        })
        //posting user order
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await OrderCollection.insertOne(order);
            res.json(result)
        })
        //getting all order
        app.get('/allorders', async(req, res) => {
            const cursor = OrderCollection.find({});
            const result  = await cursor.toArray();
            res.send(result)
        })
        //getting all order from order collection
        app.get('/myorder',VerfyToken, async(req,res) => {
            const email = req.query.email;
            if(req.decodedEmail === email)
            {
                const query = {email: email}
                const result = await OrderCollection.find(query).toArray();
                res.send(result)
            }
            else{
                res.status(401).send({message: 'UnAuthorised'})
            }

        })
        //delete operation
        app.delete('/deleteorder/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const result = await OrderCollection.deleteOne(query);
            res.send(result)
        })

        //add user to UserCollection
        app.post('/users', async(req,res) => {
            const user = req.body;
            const result = await UserCollection.insertOne(user);
            res.json(result)
        })
        app.put('/makeadmin',VerfyToken,async (req, res) => {
            const email = req.query.email;

            if(req.decodedEmail === email)
            {
                const filter = {email: email};
                const option = {upsert: true};
                const updatedoc = {
                    $set:{
                        role: 'Admin'
                    }
                }
                const result = await UserCollection.updateOne(filter,updatedoc,option);
                res.json(result)
            }
        })

        //getting admin 
        app.get('/users', async (req, res) => {
            const email = req.query.email
            const query = {email: email}
            let isadmin;
            const user = await UserCollection.findOne(query)
            if(email)
            {
                if(user.role === 'Admin')
                {
                    isadmin = true
                }
                res.send({admin: isadmin})
            }
        })

        //posting review
        app.post('/reviews', async(req, res) => {
            const review = req.body;
            const result = await ReviewCollection.insertOne(review);
            res.json(result)
        })

        //accepting order 
        app.put('/action', async (req, res) => {
            const id = req.query.id;
            const query = {_id: ObjectId(id)};
            const option = {upsert: true};
            const updatedoc={
                $set:{
                    status: 'Shipped'
                }
            }
            const result = await OrderCollection.updateOne(query, updatedoc, option)
            res.json(result)
        })

         //delete order 
         app.delete('/deleteorder/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await OrderCollection.deleteOne(query);
            res.send(result)
        })

        //review get api
        app.get('/reviews', async (req, res) => {
            const cursor = ReviewCollection.find({});
            const result = await cursor.toArray();
            res.send(result)
        })
    }
    finally{
        
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Carmax Server is connected')
})

app.listen(port, (req,res) => {
    console.log('server port is', port)
})