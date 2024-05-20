const express = require('express');
const cors = require('cors');
const ApiError = require('./app/api-error');
const morgan = require('morgan');

const app = express();

//HTTP logger
app.use(morgan('combined'));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.get('/', (req, res) => {
  res.json({message: 'Welcome to Job Finder DB'})
});

app.use((req, res, next)=>{
    return next(new ApiError(404, 'Resourse not found'));
});

app.use((err, req, res, next)=>{
    return res.status(err.statusCode || 500).json({
        message: err.message || 'Internal server error'
    })
});

module.exports = app;