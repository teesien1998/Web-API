const mongoose = require('mongoose')

const db = 'mongodb+srv://lautee:lautee1998@cluster0-gcmgq.mongodb.net/lautee?retryWrites=true&w=majority'

mongoose
    .connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .then(resp => {
        console.log('Connected to database');
    })
    .catch((error) => {
        console.log('Error connecting to database', error);
    });


var testingSchema = new mongoose.Schema({
    name: String,
    username: { type: String,
                unique: true,
                required: true
    },
    password: { type: String,
                required: true
    },
    date_created: { type: Date,
                    default: Date.now
    }
});


var testing2Schema = new mongoose.Schema({
    name: String,
    username: { type: String,
                unique: true,
                required: true
    },
    password: { type: String,
                required: true
    },
    date_created: { type: Date,
                    default: Date.now
    }
});

var User = mongoose.model('testing', testingSchema);
var User2 = mongoose.model('testing2', testing2Schema);

module.exports = {
    User: User,
    User2: User2
};

