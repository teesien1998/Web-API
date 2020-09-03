const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
//const http = require('http');
const request = require('request');
require('dotenv').config();
const models = require('./mongoDb');
const sgMail = require('@sendgrid/mail');
//const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
//sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.set('credential', { token: '' });
app.use(bodyParser.json()); // to be able to get body of request
app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.static('./')); // express server htmls files automatically
app.use(session({secret: 'lautee11', saveUninitialized: false, resave: false}));
//app.engine('html', require('ejs').renderFile);
//app.set('view engine', 'html');
//app.set('views', __dirname);
//var constAppkey = process.env.API_KEY;

//Set port to 4000
const port = process.env.PORT || 4000;

app.listen(port, () => {
	console.log(`server listening on port ${port}`);
});

var sess;
//var data_sess;

app.get('/', function(req, res){
	res.sendFile(path.join(__dirname,'html','login_testing.html'));
});

app.get('/login', function(req, res){
    res.sendFile(path.join(__dirname,'html','login_testing.html'))
});

app.get('/signup', function(req,res) {
    res.sendFile(path.join(__dirname,'html','signup.html'));
});

app.get('/logout',function(req,res){
    res.app.settings['credential'].token = null;
    console.log (res.app.settings['credential'].token);
    res.sendFile(path.join(__dirname,'html','login_testing.html'));
});

function authToken(req, res, next){

    const jwtToken = res.app.settings['credential'].token;
    
	if (typeof jwtToken !== 'undefined') {
		req.token = jwtToken;
		next();
    }
    else {
		console.log('Please login to consinue');
		//console.log('ensureToken', req.params.id);
		next();
	}
};

//Token Authentication for Dashboard API
app.get('/dashboard/:id', authToken, async (req, res) => {
	
	const id = req.params.id;

	await jwt.verify(req.token, id, function(err, data) {
		if (err) {
         
			console.log('403 in client', err);
			res.redirect('/login');
			
		} else {
			res.sendFile(path.join(__dirname,'html','dashboard.html'));
		}
	});

});

//Token Authentication for Graph API
app.get('/graph/:id', authToken, async (req, res) => {
	
	const id = req.params.id;

	await jwt.verify(req.token, id, function(err, data) {
		if (err) {
            
			console.log('403 in client', err);
			res.redirect('/login');
			
		} else {
			res.sendFile(path.join(__dirname,'html','graph.html'));
		}
	});

});


//Check User ID
app.get('/checkUsername/:username', function(req,res) {
    
	models.User.find({ username: req.params.username })
		.then((response) => {
            res.status(200).send(response);
            console.log(response);
			//res.status(203).json(response);
		})
		.catch((error) => {
			res.status(400).send('Error');
		});
});

app.post('/signupUser', function(req,res){

    var hash = bcrypt.hashSync(req.body.password, 10);

    var data = new models.User({
        name: req.body.name,
        username: req.body.username,
        password: hash
    });

    data.save()
        .then((response1) => {
            res.status(200).send(response1);
        })
        .catch((error) => {
            res.status(400).send(error);
        });
});

app.post('/loginUser', function(req, res){
    sess = req.session;
    models.User.find({username: req.body.username})
		.then((response) => {
            const private_key= '' + response[0]._id;
            //console.log('response',response[0].password);//fetch from database with username from user
            //console.log('password:', req.body.password);//get from html, from user
            //console.log('bool', bcrypt.compareSync(req.body.password, response[0].password));

            if (bcrypt.compareSync(req.body.password, response[0].password)){
				//JWT Authentication
                var payload = {
                    name: response[0].name,
                    username: response[0].username,  
                }

                const jwtToken = jwt.sign(payload, private_key, {expiresIn: '1d'});

				var jwtdata = {
                    mongo_id: '' + response[0]._id,
                    jwtToken
                }
                console.log('Success');
                
                //POST Request to API
                let url = 'https://api.isolarcloud.com.hk/sungws/AppService';

                var getLoginObject = {
                    lang: '_en_US',
                    user_account: 'nefin',
                    user_password: 'nefin123456',
                    service: "login",
                    sys_code: "901",
                    appkey: process.env.API_KEY
                }
                
                //POST Request to API
                request({
                    headers: {
                        "Content-Type": "application/json",
                        "sys_code": 901
                    },
                    url: url,
                    //When sending data to a web server, the data has to be a string.
                    body: JSON.stringify(getLoginObject), //convert object to string data
                    method: 'POST'
                },
                function(err,res2,body){
                    try{
                        //When receiving data (is always a string) from a web server, the data has to be an object.
                        var testing = JSON.parse(body); //convert string to object data
                        //console.log(body);
                        //console.log(testing);
                        //console.log(testing.result_data.user_id);
                        //console.log(testing.result_data.token);
                        sess.name = response[0].name;
                        //sess.user_id = testing.result_data.user_id;
                        sess.token = testing.result_data.token;
                        res.app.settings['credential'].token = jwtToken;
                        console.log("Login Successful");
                        //console.log(sess.token);
                        //console.log( '' + response[0]._id);
                        console.log(jwtdata);
                        
                        res.status(200).send({jwtdata});
                        //res.status(200).send(sess);
                    }
                    catch(err){
                        console.log(err);
                    }
                });
                //res.render('navbar_testing.html', {token:testing.result_data.token});
                
			} else {
                console.log('Wrong Password');
				res.status(400).send('Error');
			}
		})
		.catch((error) => {
            console.log('Wrong User ID');
            res.status(409).send(error);
		});
});

app.get('/dashboard_data', function(req,res){
    //data_sess = req.session;
    // console.log('start', data_sess);
    console.log('START');
    console.log('token', sess.token);
    
    //console.log('start',token);
    
    if(typeof sess.token !== null)
    {
        var URL= 'https://api.isolarcloud.com.hk/sungws/AppService?service=getPsList&appkey='+process.env.API_KEY+'&token='+sess.token+'&curPage=0&size=20&user_id=590';
        console.log(URL);
        
        var testing;
        
        request({
            headers: {
                "Content-Type": "application/json",
                "sys_code": 901
            },
            url: URL,
            method: 'GET'
        },
        function(err,res2,body){
            try{
            //When receiving data (is always a string) from a web server, the data has to be an object.
                testing = JSON.parse(res2.body); //convert string to object data
                //res.status(200).send(res);
                //console.log(body);
                //console.log(testing); 
                console.log(sess.name);

                var data = {
                    name: sess.name,
                    data_values: testing.result_data.pageList[0]
                }
                //res.statusCode = 200;
                //res.write(JSON.stringify(sess.username));
                //res.end();
                res.status(200).send(data);
            }
            catch(err){
                console.log(err);
            }
        });  
    }
});

app.get('/graph_data', function(req,res){
    
    console.log('START');
    console.log('token', sess.token);

    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth()+1;
    var last_month = date.getMonth();
    var day = date.getDate();

    if (day < 10){
        day = '0' + day;
    }

    if (month < 10){
        month = '0' + month;
    }

    if(last_month < 10){
        last_month = '0' + last_month;
    }

    console.log(last_month);
    console.log(year+ '-' +month+ '-' +day);

    if(typeof sess.user_id !== "undefined" || sess.token !== null){
        
        url = 'https://api.isolarcloud.com.hk/sungws/AppService?service=getHistoryInfo&appkey='+process.env.API_KEY+'&token='+sess.token+'&user_id=590&year='+year+'&month='+month+'&day='+day+'date_type=3'
        console.log(url);
        
        axios.all([
            //axios.get('https://api.isolarcloud.com.hk/sungws/AppService?service=getHistoryInfo&appkey='+process.env.API_KEY+'&token='+sess.token+'&user_id=590&year=2020&month=06&day=01&date_type=3'),
            axios.get('https://api.isolarcloud.com.hk/sungws/AppService?service=getHistoryInfo&appkey='+process.env.API_KEY+'&token='+sess.token+'&user_id=590&year='+year+'&month='+month+'&day='+day+'&date_type=3'),
            axios.get('https://api.isolarcloud.com.hk/sungws/AppService?service=getHistoryInfo&appkey='+process.env.API_KEY+'&token='+sess.token+'&user_id=590&year='+year+'&month='+month+'&day='+day+'&date_type=2'),
            axios.get('https://api.isolarcloud.com.hk/sungws/AppService?service=getHistoryInfo&appkey='+process.env.API_KEY+'&token='+sess.token+'&user_id=590&year='+year+'&month='+last_month+'&day='+day+'&date_type=2'),
            //axios.get('https://api.isolarcloud.com.hk/sungws/AppService?service=getHistoryInfo&appkey='+process.env.API_KEY+'&token='+sess.token+'&user_id=590&year='+year+'&month='+month+'&day='+day+'&date_type=1')
        ])

        .then(axios.spread((response1, response2, response3) => {
            console.log(response1.data.result_data);
            console.log(response2.data.result_data);
            console.log(response3.data.result_data);

            var graph_data = {
                today_data: response1.data.result_data,
                daily_data: response2.data.result_data,
                lastMonth_daily_data: response3.data.result_data,
                name: sess.name
            }

            res.status(200).send(graph_data);
        }))

        .catch(err => {
            console.log(err);
        });
    }
});


/*app.get('/sendemail', function(req,res){
    console.log(process.env.SENDGRID_API_KEY);
    const msg = {
        to: ['zeunesse1938@gmail.com', 'zeunesse@gmail.com'],
        from: {
            email:'zeunesse@hotmail.com',
            name:'Lau Tee Sien',
        },
        subject: 'Sending with SendGrid is Fun',
        text: 'diuleilomo',
      };

      sgMail.send(msg, function(error,info){
          if(error){
              console.log(error);
          }
          else{
              //res.send('Successfully Sent');
              console.log('Successfully Sent');
          }
      });    
});


/*app.get('/sendemail', function(req,res){
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        tls:{
            rejectUnauthorized: false
        },
        auth: {
        user: 'zeunesse@gmail.com',
        pass: 'lonely123'
        }
    });
    
    const msg = {
        from: '"Lau Tee Sien" zeunesse@gmail.com',
        to: 'zeunesse1938@gmail.com, zeunesse@hotmail.com',
        subject: 'Click into it for a SURPRISE',
        text: 'HARD \n WORK \n ING',
        //html: '<strong>dasdasdasda</strong>'
    };

    transporter.sendMail(msg, function(error, info){
        if(error){
            console.log(error);
        }
        else{
            console.log('Successfully Sent');
        }
    });
});*/

/*app.get('/dashboard', function(req,res){
    data_sess = req.session;
    console.log('start', data_sess);
    console.log('token', data_sess.token);
    
    //console.log('start',token);

    if( data_sess.user !== "undefined" || data_sess.token !== null)
    {
        var URL= 'https://api.isolarcloud.com.hk/sungws/AppService';
        //console.log(URL);

        var testing1;

        var getdataObject = {
            service: 'getPsList',
            appkey: process.env.API_KEY,
            token: data_sess.token,
            curPage: '0',
            size: '20',
            user_id: data_sess.user_id
        }
        
        request({
            headers: {
                "Content-Type": "application/json",
                "sys_code": 901
            },
            //When sending data to a web server, the data has to be a string.
            body: JSON.stringify(getdataObject),
            url: URL,
            method: 'POST',
        },
        function(err,res,body){
            try{
                console.log('token', getdataObject.size);
                console.log(URL);
                var testing1 = JSON.parse(body);
                //When receiving data (is always a string) from a web server, the data has to be a object.
                //testing = res.body; //convert string to object data
                //res.status(200).send(res);
                console.log(testing1);
                //console.log('dashboard res',res.body);
                //console.log(body);
                //console.log('dashboard body',testing); 
            }
            catch(err){
                console.log(err);
            }
        });
        
        res.status(200).send(testing1);
    }
});

/*app.get('/anotherHtml', function(req, res) {
    res.send ('Testing');
});*/

/*
app.get('/', function(req, res) {
    //console.log('I am here too. Eh hahahaha')
	res.sendFile(__dirname + '/Testing1.html');
});

app.get('/testingAdd', (req, res) => {
    data = new models.User({
            username: 'P',
            department: 'Comedian'
        })
    data.save()
        .then(() => {
            //res.send(`User registered Successfully`);
            console.log('I am here. Edh hehhdasdeheh')
            res.status(200).send('Naiseee, added to database');
        })
        .catch((error) => {
            res.status(400).send(error);
        });
})
*/
