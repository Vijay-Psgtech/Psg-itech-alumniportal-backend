const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
    name: String,
    seq: Number,
});

module.exports = mongoose.model("Counter", CounterSchema);