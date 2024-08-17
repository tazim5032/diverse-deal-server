const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',

  ],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());


//verify jwt middleware
const verifyToken = (req, res, next) => {

  const token = req.cookies?.token;

  if (!token) return res.status(401).send({ message: 'unauthorized access' });

  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        res.status(401).send({ message: 'unauthorized access' });
      }
      console.log(decoded);

      req.user = decoded; //req er modhe key decoded kore nie nilam
      next();
    })
  }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o4eqbyc.mongodb.net/?retryWrites=true&w=majority`


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

    const productCollection = client.db('productDB').collection('product');

    //jwt generate - json web token
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      //token banaiteci
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d'
      })
      //browser er cookie te send korteci
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',

      }).send({ success: true })
      // res.send({ token })
    })

    //clear token on logout
    app.get('/logout', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 0,
      }).send({ success: true })
    })


    //find all products from db for feature section
    app.get('/all-products', async (req, res) => {
      const result = await productCollection.find({}).toArray();

      res.send(result);
    })

    app.get('/products', async (req, res) => {
      let { page = 1, limit = 10, search, sorting, brand, category, min, max } = req.query;
      // const query = {};
      min = parseInt(min);
      max = parseInt(max);
      // console.log('from original  = ', min, max);
      const skip = (page - 1) * limit;
      const query = {};
      let option = {};
      if (search) {
        query.name = new RegExp(search, 'i');
      }
      if (brand) {
        query.brand = new RegExp(brand, 'i');
      }
      if (category) {
        query.category = new RegExp(category, 'i');
      }
      // query.price = {$gte : min, $lte : max};
      query.price = {};
      if (min) {
        query.price.$gte = Number(min); // Minimum price filter
      }
      if (max) {
        query.price.$lte = Number(max); // Maximum price filter
      }
      if (sorting) {
        if (sorting == 'newest') {
          option = {
            sort: {
              'created_date': -1,

            }
          }
        }
        else {
          option = {
            sort: {
              price: sorting == 'low' ? 1 : -1
            }
          }
        }
      }
      const products = await productCollection.find(query, option).skip(Number(skip)).limit(Number(limit)).toArray();
      res.send(products);
    })

    app.get('/docCount', async (req, res) => {
      let { search, brand, category, min, max } = req.query;
      // console.log(min, max);
      min = parseInt(min);
      max = parseInt(max);
      const query = {};
      if (search) {
        query.name = new RegExp(search, 'i');
      }
      if (brand) {
        query.brand = new RegExp(brand, 'i');
      }
      if (category) {
        query.category = new RegExp(category, 'i');
      }
      query.price = {};
      if (min) {
        query.price.$gte = Number(min); // Minimum price filter
      }
      if (max) {
        query.price.$lte = Number(max); // Maximum price filter
      }
      const countDoc = await productCollection.find(query).toArray();
      // console.log(countDoc)
      res.send(countDoc);
    })


    





    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from edu-flow Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))