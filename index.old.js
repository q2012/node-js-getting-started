let curErr = 10;

const PORT = process.env.PORT || 5000;

let express = require('express');
let app     = express();
const bodyParser = require("body-parser");
let path    = require("path");

let multer = require('multer');
let upload = multer();
let uploadedBuffer;
let testBuffer;

let pressButt = 0;


let log = "";


app.use(bodyParser.urlencoded({  extended: true}));

app.use(bodyParser.json()); 
app.use(bodyParser.text()); 


var MODE = Object.freeze({fitness:"fitness", family:"family", biohack:"biohack"});

function Pair(key, val) {
  this.key = key;
  this.val = val;
}

function Lock(lockID, lockName) {
  this.lockID = lockID;
  this.lockName = lockName;
  this.state = 'close';
  this.setOpen;
  this.time = new Time(0,0);
  this.setTime = new Time(0,0);
  this.shift = 0;
  this.mode = MODE.fitness;
  this.PIN;
  this.setOpenTime = new Time(0,0);
  this.setCloseTime = new Time(0,0); 
  this.battery = '100';  
  this.signal;
  
  this.openCloseTime = new OpenCloseTime(),

  this.qa = [];
  this.curQuestion = 0;
  this.command = {};
}

function OneOpenClose() {
	this.lock_h = 99;
	this.lock_m = 99;
	this.unlock_h = 99;
	this.unlock_m = 99;
}

function OpenCloseTime() {
	this.Monday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Tuesday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Wednesday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Thursday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Friday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Saturday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Sunday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
}

function Hub(hubID,hubName) {
  this.hubID = hubID;
  this.hubName = hubName;
  this.locks = [];
}

function User(userID, amazonUID) {
  this.userID = userID;
  this.amazonUID = amazonUID;
  this.hubs = [];
}

function Time(h,m) {
	this.h = h;
	this.m = m;
	this.n;
}

function cmp(time1,time2) {
	return time1.h == time2.h?time1.m > time2.m:time1.h > time2.h;
}

function dateIn(time, lowTime, highTime) {
	return cmp(time, lowTime) && cmp(highTime, time);
}

let users = [];
let hubs = [];
let locks = [];


app.get('/hub/register', function(req, res) {
	if(!req.query.hubID || !req.query.userID)
	{
		res.send({"error": 9, "msg": "Not enough data"});
		return;
	}
	let user = users.find(us => us.userID == req.query.userID);
	let hub = hubs.find(hub => hub.hubID == req.query.hubID);
	if(!user)
	{
		res.send({"error": 1, "msg": "User not found"});
		return;
	}
	if(hub)
	{
		res.send({"error": 10, "msg": "Hub with this ID already exists"});
		return;
	}

	hub = new Hub(req.query.hubID, "");
	hubs.push(hub);
	user.hubs.push(hub);
	res.send({"error": 0, "msg": "Hub registred successfully"});
});

app.post('/hub/register', function(req, res) {
	if(!req.body.hubID || !req.body.userID)
	{
		res.send({"error": 9, "msg": "Not enough data"});
		return;
	}
	let user = users.find(us => us.userID == req.body.userID);
	let hub = hubs.find(hub => hub.hubID == req.body.hubID);

	if(!user)
	{
		res.send({"error": 1, "msg": "User not found"})
	}
	if(hub)
	{
		res.send({"error": 10, "msg": "Hub with this ID already exists"});
		return;
	}

	hub = new Hub(req.body.hubID, "");

	hubs.push(hub);
	user.hubs.push(hub);
	res.send({"error": 0, "msg": "Hub registred successfully"});
});

app.get('/lock/register', function(req, res) {
	if(!req.query.lockID || !req.query.hubID)
	{
		res.send({"error": 9, "msg": "Not enough data"});
		return;
	}
	let hub = hubs.find(hub => hub.hubID == req.query.hubID);
	let lock = locks.find(lock => lock.lockID == req.query.lockID);

	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	if(lock)
	{
		res.send({"error": 10, "msg": "Lock with this ID already exists"});
		return;
	}

	lock = new Lock(req.query.lockID, "");

	locks.push(lock);
	hub.locks.push(lock);
	res.send({"error": 0, "msg": "Lock registred successfully"});
});

app.post('/lock/register', function(req, res) {
	if(!req.body.lockID || !req.body.hubID)
	{
		res.send({"error": 9, "msg": "Not enough data"});
		return;
	}
	let hub = hubs.find(hub => hub.hubID == req.body.hubID);
	let lock = locks.find(lock => lock.lockID == req.body.lockID);

	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"})
	}
	if(lock)
	{
		res.send({"error": 10, "msg": "Lock with this ID already exists"});
		return;
	}

	lock = new Lock(req.body.lockID, "");

	locks.push(lock);
	hub.locks.push(lock);
	res.send({"error": 0, "msg": "Lock registred successfully"});
});

function checkLengthOpenCloseArr(arr, count) {
	return arr.filter(el => el.lock_h == 99).length >= count;
};

function pushCommand(from, to) {

	from.lockName?(to.command.lockName = from.lockName, to.lockName = from.lockName):1==1;
	from.setOpen?(to.command.setOpen = from.setOpen, to.setOpen = from.setOpen):1==1;
	from.signal?(to.command.signal = from.signal, to.signal = from.signal):1==1;
	from.PIN?(to.command.PIN = from.PIN, to.PIN = from.PIN):1==1;
	from.mode?(to.command.mode = from.mode, to.mode = from.mode):1==1;
	
	from.setTimeN?(lock.setTime.n = parseInt(from.setTimeN), to.command.setTimeN = parseInt(lock.time.n)):1==1;
	if(from.setTimeM && from.setTimeH) {
		to.command.setTimeM = parseInt(from.setTimeM);
		to.setTime.m = parseInt(from.setTimeM);
		to.command.setTimeH = parseInt(from.setTimeH);
		to.setTime.h = parseInt(from.setTimeH);

		let cd = new Date();
		let ms = cd.getTime();
		cd.setHours(to.setTime.h);
		cd.setMinutes(to.setTime.m);
		to.shift = ms - cd.getTime();
	}

	if(from.setCloseTimeH && from.setCloseTimeM && from.setCloseTimeN && from.setOpenTimeH && from.setOpenTimeM && from.setOpenTimeN && (from.setCloseTimeN == from.setOpenTimeN))
	{
		let arr,dest = [];
		if(!to.command.openCloseTime)
			to.command.openCloseTime = {};
		switch(parseInt(from.setCloseTimeN))
		{
			case 1:
				arr = to.openCloseTime.Monday;
				to.command.openCloseTime.Monday = [];
				dest = to.command.openCloseTime.Monday;
				break;
			case 2:
				arr = to.openCloseTime.Tuesday;
				to.command.openCloseTime.Tuesday = [];
				dest = to.command.openCloseTime.Tuesday;
				break;
			case 3:
				arr = to.openCloseTime.Wednesday;
				to.command.openCloseTime.Wednesday = [];
				dest = to.command.openCloseTime.Wednesday;
				break;
			case 4:
				arr = to.openCloseTime.Thursday;
				to.command.openCloseTime.Thursday = [];
				dest = to.command.openCloseTime.Thursday;
				break;
			case 5:
				arr = to.openCloseTime.Friday;
				to.command.openCloseTime.Friday = [];
				dest = to.command.openCloseTime.Friday;
				break;
			case 6:
				arr = to.openCloseTime.Saturday;
				to.command.openCloseTime.Saturday = [];
				dest = to.command.openCloseTime.Saturday;
				break;
			case 7:
				arr = to.openCloseTime.Sunday;
				to.command.openCloseTime.Sunday = [];
				dest = to.command.openCloseTime.Sunday;
				break;
			default:
				arr = undefined;
		}

		if(arr && from.setOpenCloseTimeDel)
		{
			let ind = arr.findIndex(time => (time.lock_h == from.setCloseTimeH && time.lock_m == from.setCloseTimeM && time.unlock_h == from.setOpenTimeH && time.unlock_m == from.setOpenTimeM));
			if(ind >= 0)
			{
				arr.splice(ind,1);
				let atom = new OneOpenClose();
				atom.lock_h = 99;
				atom.lock_m = 99;
				atom.unlock_h = 99;
				atom.unlock_m = 99;
				arr.push(atom);
			}
			
		}

		else if(arr && checkLengthOpenCloseArr(arr,1))
		{
			let atom = new OneOpenClose();
			atom.lock_h = parseInt(from.setCloseTimeH);
			atom.lock_m = parseInt(from.setCloseTimeM);
			atom.unlock_h = parseInt(from.setOpenTimeH);
			atom.unlock_m = parseInt(from.setOpenTimeM);

			arr.splice(arr.findIndex(time => time.lock_h == 99),1);
			arr.push(atom);
		}
		arr.forEach(el => dest.push(el));

	}
	

	from.updateLock?to.command.updateLock = 1:1==1;
};


app.post('/push-command', function(req,res) {
  log += ("/push-command " + JSON.stringify(req.body) + "</br>");
	let hub = hubs.find(hub => hub.hubID == req.body.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	if(!req.body.lockID)
	{
		res.send("Not supported yet");
		return;
	}

	let lock = locks.find(lock => lock.lockID == req.body.lockID);
	if(!lock)
	{
		res.send({"error": 2, "msg": "Lock not found"});
		return;
	}

	if(!hub.locks.find(lock => lock.lockID == req.body.lockID))
	{
		res.send({"error": 3, "msg": "Lock is not assigned to this hub"});
		return;
	}

	lock.command.error = 0;
	lock.command.msg = "Command added";

	pushCommand(JSON.parse(JSON.stringify(req.body)), lock);

	res.send(JSON.stringify(lock.command));
	delete lock.command.error;
	delete lock.command.msg;
});

app.get('/push-command', function(req,res) {
  log += ("/push-command " + JSON.stringify(req.query) + "</br>");
	let hub = hubs.find(hub => hub.hubID == req.query.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	if(!req.query.lockID)
	{
		res.send("Not supported yet");
		return;
	}

	let lock = locks.find(lock => lock.lockID == req.query.lockID);
	if(!lock)
	{
		res.send({"error": 2, "msg": "Lock not found"});
		return;
	}

	if(!hub.locks.find(lock => lock.lockID == req.query.lockID))
	{
		res.send({"error": 3, "msg": "Lock is not assigned to this hub"});
		return;
	}

	lock.command.error = 0;
	lock.command.msg = "Command added";

	pushCommand(JSON.parse(JSON.stringify(req.query)), lock);

	res.send(JSON.stringify(lock.command));
	delete lock.command.error;
	delete lock.command.msg;
});

function updateOpenCloseTime(to, from) {
	from.forEach((el,i) => {
		to[i].lock_h = parseInt(el.substr(0,2));
		to[i].lock_m = parseInt(el.substr(2,2));
		to[i].unlock_h = parseInt(el.substr(4,2));
		to[i].unlock_m = parseInt(el.substr(6,2));
	});
};

function updateLock(from, lock) {
	from.lockName?lock.lockName = from.lockName:lock.lockName;
    from.state?lock.state = from.state:lock.state;
    from.mode?lock.mode = from.mode:lock.mode;
    from.PIN?lock.PIN = from.PIN:lock.PIN;
    from.battery?lock.battery = from.battery:lock.battery;

	from.timeN?lock.time.n = parseInt(from.timeN):1==1;
	if(from.timeH && from.timeM) 
	{
	    lock.time.h = parseInt(from.timeH);
		lock.time.m = parseInt(from.timeM);

		let cd = new Date();
		let ms = cd.getTime();
		cd.setHours(lock.Time.h);
		cd.setMinutes(lock.Time.m);
		lock.shift = cd.getTime() - ms;
	}

	if(from.Monday)
		updateOpenCloseTime(lock.openCloseTime.Monday, from.Monday.split(" "));
	if(from.Tuesday)
		updateOpenCloseTime(lock.openCloseTime.Tuesday, from.Tuesday.split(" "));
	if(from.Wednesday)
		updateOpenCloseTime(lock.openCloseTime.Wednesday, from.Wednesday.split(" "));
	if(from.Thursday)
		updateOpenCloseTime(lock.openCloseTime.Thursday, from.Thursday.split(" "));
	if(from.Friday)
		updateOpenCloseTime(lock.openCloseTime.Friday, from.Friday.split(" "));
	if(from.Saturday)
		updateOpenCloseTime(lock.openCloseTime.Saturday, from.Saturday.split(" "));
	if(from.Sunday)
		updateOpenCloseTime(lock.openCloseTime.Sunday, from.Sunday.split(" "));

};

app.post('/get-command', function(req,res) {
  log += ("/get-command " + JSON.stringify(req.body) + "</br>");
	let hub = hubs.find(hub => hub.hubID == req.body.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	if(!req.body.lockID)
	{
		res.send("Not supported yet");
		return;
	}

	let lock = locks.find(lock => lock.lockID == req.body.lockID);
	if(!lock)
	{
		res.send({"error": 2, "msg": "Lock not found"});
		return;
	}

	if(!hub.locks.find(lock => lock.lockID == req.body.lockID))
	{
		res.send({"error": 3, "msg": "Lock is not assigned to this hub"});
		return;
	}

	updateLock(JSON.parse(JSON.stringify(req.body)), lock);

	res.send(JSON.stringify(lock.command));
	lock.command = {};
});

app.get('/get-command', function(req,res) {
  log += ("/get-command " + JSON.stringify(req.query) + "</br>");
	let hub = hubs.find(hub => hub.hubID == req.query.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	if(!req.query.lockID)
	{
		res.send("Not supported yet");
		return;
	}

	let lock = locks.find(lock => lock.lockID == req.query.lockID);
	if(!lock)
	{
		res.send({"error": 2, "msg": "Lock not found"});
		return;
	}

	if(!hub.locks.find(lock => lock.lockID == req.query.lockID))
	{
		res.send({"error": 3, "msg": "Lock is not assigned to this hub"});
		return;
	}

	updateLock(JSON.parse(JSON.stringify(req.query)), lock);
	
	res.send(JSON.stringify(lock.command));
	lock.command = {};
});

app.get('/update-lock', function(req, res) {
  log += ("/update-lock " + JSON.stringify(req.query) + "</br>");
	let lock = locks.find(lock => lock.lockID == req.query.lockID);
	if(lock)
	{
		updateLock(JSON.parse(JSON.stringify(req.query)), lock);

	    lock.command = {};
	    lock.setTime = new Time(0,0);
	    lock.curQuestion = 0;
	    res.send(JSON.stringify(lock));
	    return;
	}
	res.sendStatus(404);
});

app.post('/update-lock', function(req, res) {
  log += ("/update-lock " + JSON.stringify(req.body) + "</br>");
	let lock = locks.find(lock => lock.lockID == req.body.lockID);
	if(lock)
	{
		updateLock(JSON.parse(JSON.stringify(req.body)), lock);

	    lock.command = {};
	    lock.setTime = new Time(0,0);
	    lock.curQuestion = 0;
	    res.send(JSON.stringify(lock));
	    return;
	}
	res.sendStatus(404);
});


function writeTestData() {
  users = [];
  locks = [];
  hubs = [];

  users.push(new User('1', '1'));
  users.push(new User('2', '2'));
  users.push(new User('3', '3'));
  users.push(new User('4', '4'));

  hubs.push(new Hub('30AEA4199554','First'));
  hubs.push(new Hub('2','Second'));
  hubs.push(new Hub('3','First'));
  hubs.push(new Hub('4','Second'));
  hubs.push(new Hub('5','First'));

  locks.push(new Lock('F0F8F26F772D','First'));
  locks.push(new Lock('B091226945A2','Second'));
  locks.push(new Lock('3','First'));
  locks.push(new Lock('4','First'));
  locks.push(new Lock('5','Second'));
  locks.push(new Lock('6','Third'));
  locks.push(new Lock('7','First'));
  locks.push(new Lock('8','Second'));
  locks.push(new Lock('9','First'));

  users[0].hubs.push(hubs[0]);
  users[0].hubs.push(hubs[1]);
  users[1].hubs.push(hubs[2]);
  users[1].hubs.push(hubs[3]);
  users[2].hubs.push(hubs[4]);

  users[0].hubs[0].locks.push(locks[0]);
  users[0].hubs[0].locks.push(locks[1]);
  users[0].hubs[1].locks.push(locks[2]);
  users[1].hubs[0].locks.push(locks[3]);
  users[1].hubs[0].locks.push(locks[4]);
  users[1].hubs[0].locks.push(locks[5]);
  users[1].hubs[1].locks.push(locks[6]);
  users[1].hubs[1].locks.push(locks[7]);
  users[2].hubs[0].locks.push(locks[8]);
};

app.get('/test-data', function(req,res) {  log += ("/test-data " + JSON.stringify(req.query) + "</br>"); writeTestData();  res.sendStatus(201);
});

app.get('/locks', function(req, res) {	res.send(JSON.stringify(locks));
});

app.get('/hubs', function(req, res) {	res.send(JSON.stringify(hubs));
});

app.get('/users', function(req, res) {	res.send(JSON.stringify(users));
});

app.get('/hub', function(req, res) {
  log += ("/hub " + JSON.stringify(req.query) + "</br>");
  if(req.query.id && hubs[req.query.id])
  {
    req.query.hubName?hubs[req.query.id].hubName = req.query.hubName:hubs[req.query.id].hubName;
    req.query.hubID?hubs[req.query.id].hubID = req.query.hubID:hubs[req.query.id].hubID;
    res.send(JSON.stringify(hubs[req.query.id]));
    return;
  }
  res.sendStatus(404);
});

app.get('/lock', function(req, res) {
  log += ("/lock " + JSON.stringify(req.query) + "</br>");
  if(req.query.id && locks[req.query.id])
  {
    req.query.lockID?locks[req.query.id].lockID = req.query.lockID:locks[req.query.id].lockID;
    req.query.lockName?locks[req.query.id].lockName = req.query.lockName:locks[req.query.id].lockName;
    req.query.state?locks[req.query.id].state = req.query.state:locks[req.query.id].state;
    req.query.setOpen?locks[req.query.id].setOpen = req.query.setOpen:locks[req.query.id].setOpen;
    req.query.mode?locks[req.query.id].mode = req.query.mode:locks[req.query.id].mode;
    req.query.PIN?locks[req.query.id].PIN = req.query.PIN:locks[req.query.id].PIN;
    req.query.shift?locks[req.query.id].shift = req.query.shift:locks[req.query.id].shift

    req.query.timeH?locks[req.query.id].time.h = req.query.timeH:1==1;
    req.query.timeM?locks[req.query.id].time.m = req.query.timeM:1==1;
    req.query.setTimeH?locks[req.query.id].setTime.h = req.query.setTimeH:1==1;
    req.query.setTimeM?locks[req.query.id].setTime.h = req.query.setTimeM:1==1;
    req.query.setCloseTimeH?locks[req.query.id].setCloseTime.h = req.query.setCloseTimeH:1==1;
    req.query.setCloseTimeM?locks[req.query.id].setCloseTime.m = req.query.setCloseTimeM:1==1;
    req.query.setOpenTimeH?locks[req.query.id].setOpenTime.h = req.query.setOpenTimeH:1==1;
    req.query.setOpenTimeM?locks[req.query.id].setOpenTime.m = req.query.setOpenTimeM:1==1;

    req.query.battery?locks[req.query.id].battery = req.query.battery:locks[req.query.id].battery;
    req.query.signal?locks[req.query.id].signal = req.query.signal:locks[req.query.id].signal;
    req.query.curQuestion?locks[req.query.id].curQuestion = req.query.curQuestion:1==1;


    res.send(JSON.stringify(locks[req.query.id]));
    return;
  }
  res.sendStatus(404);
});

app.get('/user', function(req, res) {
  log += ("/user " + JSON.stringify(req.query) + "</br>");
  if(req.query.id && users[req.query.id])
  {
    req.query.userID?users[req.query.id].userID = req.query.userID:users[req.query.id].userID;
    req.query.amazonUID?users[req.query.id].amazonUID = req.query.amazonUID:users[req.query.id].amazonUID;
    res.send(JSON.stringify(users[req.query.id]));
    return;
  }
  res.sendStatus(404);
});

app.post('/hub', function(req,res) {
  log += ("/hub " + JSON.stringify(req.body) + "</br>");
    if(req.body.id && hubs[req.body.id])
    {
      req.body.hubName?hubs[req.body.id].hubName = req.body.hubName:hubs[req.body.id].hubName;
      req.body.hubID?hubs[req.body.id].hubID = req.body.hubID:hubs[req.body.id].hubID;
      res.send(JSON.stringify(hubs[req.body.id]));
      return;
    }
    res.sendStatus(404);
});

app.post('/user', function(req,res) {
  log += ("/user " + JSON.stringify(req.body) + "</br>");
    if(req.body.id && users[req.body.id])
    {
      req.body.amazonUID?users[req.body.id].amazonUID = req.body.amazonUID:users[req.body.id].amazonUID;
      res.send(JSON.stringify(users[req.body.id]));
      return;
    }
    res.sendStatus(404);
});

app.post('/lock', function(req,res) {

	log += ("/lock " + JSON.stringify(req.body) + "</br>");
    if(req.body.id)
    {
      req.body.lockID?locks[req.body.id].lockID = req.body.lockID:locks[req.body.id].lockID;
      req.body.lockName?locks[req.body.id].lockName = req.body.lockName:locks[req.body.id].lockName;
      req.body.state?locks[req.body.id].state = req.body.state:locks[req.body.id].state;
      req.body.setOpen?locks[req.body.id].setOpen = req.body.setOpen:locks[req.body.id].setOpen;
      req.body.mode?locks[req.body.id].mode = req.body.mode:locks[req.body.id].mode;
      req.body.PIN?locks[req.body.id].PIN = req.body.PIN:locks[req.body.id].PIN;
      req.body.shift?locks[req.body.id].shift = req.body.shift:locks[req.body.id].shift

      req.body.timeH?locks[req.body.id].time.h = req.body.timeH:1==1;
	  req.body.timeM?locks[req.body.id].time.m = req.body.timeM:1==1;
	  req.body.setTimeH?locks[req.body.id].setTime.h = req.body.setTimeH:1==1;
	  req.body.setTimeM?locks[req.body.id].setTime.h = req.body.setTimeM:1==1;
	  req.body.setCloseTimeH?locks[req.body.id].setCloseTime.h = req.body.setCloseTimeH:1==1;
	  req.body.setCloseTimeM?locks[req.body.id].setCloseTime.m = req.body.setCloseTimeM:1==1;
	  req.body.setOpenTimeH?locks[req.body.id].setOpenTime.h = req.body.setOpenTimeH:1==1;
	  req.body.setOpenTimeM?locks[req.body.id].setOpenTime.m = req.body.setOpenTimeM:1==1;

      req.body.battery?locks[req.body.id].battery = req.body.battery:locks[req.body.id].battery;
      req.body.signal?locks[req.body.id].signal = req.body.signal:locks[req.body.id].signal;
      req.body.curQuestion?locks[req.body.id].curQuestion = req.body.curQuestion:1==1;

      res.send(JSON.stringify(locks[req.body.id]));
      return;
    }
    res.sendStatus(404);
});


app.get('/test-log', function(req, res) {  req.query.clear?(log = "", res.send("Log cleared.")):res.send("<html><body>" + log + "</body></html>");
});


app.post('/alexa',function(req,res) {
  log += ("/alexa " + JSON.stringify(req.body) + "</br>");
  if(req.body.amazonUID)
  {
    let user = users.find(user => user.amazonUID == req.body.amazonUID);
    if(!user)
    {
      res.send(JSON.stringify({"succ": false, "error": 3,"message": "User not found"}));
      return;
    }

    let hub = user.hubs.find(hub => hub.hubName == req.body.hubName);
    if(!hub)
    {
      res.send(JSON.stringify({"succ": false, "error": 1, "message": "hub not found"}));
      return;
    }

    let lock = hub.locks.find(lock => lock.lockName == req.body.lockName);
    if(!lock)
    {
      res.send(JSON.stringify({"succ": false, "error": 2, "message": "lock not found"}));
      return;
    }

    let cd = new Date();
	cd.setTime() = cd.getTime() + lock.shift;

    if(lock.mode == MODE.fitness)
    {
      
      if(lock.curQuestion < lock.qa.length  && dateIn(new Time(cd.getHours(),cd.getMinutes()), lock.setCloseTime, lock.setOpenTime))
      {
        if(req.body.answer && req.body.answer == lock.qa[lock.curQuestion].val)
        {
          ++lock.curQuestion;
          if(lock.curQuestion < lock.qa.length)
          {
            res.send({"succ":true, "error": 0, "question": lock.qa[lock.curQuestion].key});
            return;
          }
        }
        else if(!req.body.answer)
        {
          res.send({"succ": false, "error": 4, "message": "No answer", "question": lock.qa[lock.curQuestion].key});
          return;
        }
        else if(!(req.body.answer == lock.qa[lock.curQuestion].val))
        {
          res.send({"succ": false, "error": 5, "message": "Wrong answer", "question": lock.qa[lock.curQuestion].key});
          return;
        }
        else
        {
          res.send({"succ": false, "error": 255, "message": "Something wrong. Try again.", "question": lock.qa[lock.curQuestion].key});
          return;
        }
      }
      lock.curQuestion = 0;

      if(req.body.timeH && req.body.timeM)
      {
        lock.time.h = req.body.timeH;
		lock.time.m = req.body.timeM;
        let cd = new Date();
		let ms = cd.getTime();
		cd.setHours(lock.Time.h);
		cd.setMinutes(lock.Time.m);
		lock.shift = cd.getTime() - ms;
      }

      req.body.setCloseTimeH && req.body.setCloseTimeM?(lock.setCloseTime.h = req.body.setCloseTimeH, lock.setCloseTime.m = req.body.setCloseTimeM):1==1;
	  req.body.setOpenTimeH && req.body.setOpenTimeM?(lock.setOpenTime.h = req.body.setOpenTimeH, lock.setOpenTime.m = req.body.setOpenTimeM):1==1;

      req.body.open?lock.setOpen = req.body.open:lock.setOpen;
      req.body.signalFind?lock.signal = req.body.signalFind:lock.signal;

      if(req.body.setMode == MODE.family && req.body.setPIN && req.body.setOpenTimeH && req.body.setOpenTimeM && req.body.setCloseTimeH && req.body.setCloseTimeM)
      {
        lock.mode = req.body.setMode;
        lock.PIN = req.body.setPIN;
        lock.setCloseTime.h = req.body.setCloseTimeH;
        lock.setCloseTime.m = req.body.setCloseTimeM;
        lock.setOpenTime.h = req.body.setOpenTimeH;
        lock.setOpenTime.m = req.body.setOpenTimeM;
      }
      else if(req.body.setMode == MODE.biohack && req.body.setOpenTimeH && req.body.setOpenTimeM && req.body.setCloseTimeH && req.body.setCloseTimeM)
      {
        lock.mode = req.body.setMode;
        lock.setCloseTime.h = req.body.setCloseTimeH;
        lock.setCloseTime.m = req.body.setCloseTimeM;
        lock.setOpenTime.h = req.body.setOpenTimeH;
        lock.setOpenTime.m = req.body.setOpenTimeM;
      }
      else if(req.body.addQuestion && req.body.addAnswer)
        lock.qa.push(new Pair(req.body.addQuestion,req.body.addAnswer));

      res.send(JSON.stringify({"succ": true, "error": 0, "state": lock.state, "curTime": lock.time, "battery": lock.battery}));
      return;
    }
    else if(lock.mode = MODE.family)
    {
      if(dateIn(new Time(cd.getHours(),cd.getMinutes()), lock.setCloseTime, lock.setOpenTime))
      {
        if(!req.body.PIN)
        {
          res.send({"succ": false, "error": 6, "message": "No PIN"});
          return;
        }
        else if(req.body.PIN != lock.PIN)
        {
          res.send({"succ": false, "error": 7, "message": "Wrong PIN"});
          return;
        }
        res.send({"succ": false, "error": 255, "message": "Something wrong."});
        return;
      }
      
      if(req.body.timeH && req.body.timeM)
      {
        lock.time.h = req.body.timeH;
		lock.time.m = req.body.timeM;
        let cd = new Date();
		let ms = cd.getTime();
		cd.setHours(lock.Time.h);
		cd.setMinutes(lock.Time.m);
		lock.shift = cd.getTime() - ms;
      }

      req.body.setCloseTimeH && req.body.setCloseTimeM?(lock.setCloseTime.h = req.body.setCloseTimeH, lock.setCloseTime.m = req.body.setCloseTimeM):1==1;
	  req.body.setOpenTimeH && req.body.setOpenTimeM?(lock.setOpenTime.h = req.body.setOpenTimeH, lock.setOpenTime.m = req.body.setOpenTimeM):1==1;
      req.body.open?lock.setOpen = req.body.open:lock.setOpen;
      req.body.signalFind?lock.signal = req.body.signalFind:lock.signal;
      req.body.setPIN?lock.PIN = req.body.setPIN:lock.PIN;

      if(req.body.setMode == MODE.biohack && req.body.setOpenTimeH && req.body.setOpenTimeM && req.body.setCloseTimeH && req.body.setCloseTimeM)
      {
        lock.mode = req.body.setMode;
        lock.setCloseTime.h = req.body.setCloseTimeH;
        lock.setCloseTime.m = req.body.setCloseTimeM;
        lock.setOpenTime.h = req.body.setOpenTimeH;
        lock.setOpenTime.m = req.body.setOpenTimeM;
      }
      else if(req.body.setMode == MODE.fitness)
      {
        lock.mode = MODE.fitness;
        lock.qa = [];
        lock.curQuestion = 0;
      }

      res.send(JSON.stringify({"succ": true, "error": 0, "state": lock.state, "curTime": lock.time, "battery": lock.battery}));
      return;
    }
    else if(lock.mode = MODE.biohack)
    {
      if(dateIn(new Time(cd.getHours(),cd.getMinutes()), lock.setCloseTime, lock.setOpenTime))
      {
        res.send({"succ": false, "error": 8, "message": "Not in time", "closeTime": JSON.stringify(lock.setCloseTime) , "openTime": JSON.stringify(lock.setOpenTime), "curServTime": JSON.stringify(lock.time)});
        return;
      }

      if(req.body.timeH && req.body.timeM)
      {
        lock.time.h = req.body.timeH;
		lock.time.m = req.body.timeM;
        let cd = new Date();
		let ms = cd.getTime();
		cd.setHours(lock.Time.h);
		cd.setMinutes(lock.Time.m);
		lock.shift = cd.getTime() - ms;
      }

      req.body.setCloseTimeH && req.body.setCloseTimeM?(lock.setCloseTime.h = req.body.setCloseTimeH, lock.setCloseTime.m = req.body.setCloseTimeM):1==1;
	  req.body.setOpenTimeH && req.body.setOpenTimeM?(lock.setOpenTime.h = req.body.setOpenTimeH, lock.setOpenTime.m = req.body.setOpenTimeM):1==1;
      req.body.open?lock.setOpen = req.body.open:lock.setOpen;
      req.body.signalFind?lock.signal = req.body.signalFind:lock.signal;

      if(req.body.setMode == MODE.fitness)
      {
        lock.mode = MODE.fitness;
        lock.qa = [];
        lock.curQuestion = 0;
      }
      else if(req.body.setMode == MODE.family && req.body.setPIN  && req.body.setOpenTimeH && req.body.setOpenTimeM && req.body.setCloseTimeH && req.body.setCloseTimeM)
      {
        lock.mode = req.body.setMode;
        lock.PIN = req.body.setPIN;
        lock.setCloseTime.h = req.body.setCloseTimeH;
        lock.setCloseTime.m = req.body.setCloseTimeM;
        lock.setOpenTime.h = req.body.setOpenTimeH;
        lock.setOpenTime.m = req.body.setOpenTimeM;
      }

      res.send(JSON.stringify({"succ": true, "error": 0, "state": lock.state, "curTime": lock.time, "battery": lock.battery}));
    }
  }
});

app.get('/', function (req, res) {  res.sendFile(path.join(__dirname+'/index.html'));
});

// error handling
app.use(function(err, req, res, next) {  console.error(err.stack);  res.status(500).send('Something bad happened!');
});

writeTestData();

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

module.exports = app ;