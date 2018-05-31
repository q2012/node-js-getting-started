const PORT = process.env.PORT || 5000;

let express = require('express');
let app     = express();
const bodyParser = require("body-parser");
let path    = require("path");

let first = true;

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json());

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
  
  this.qa = [];
  this.curQuestion = 0;
  this.command = {};
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
}

function cmp(time1,time2) {
	return time1.h == time2.h?time1.m > time2.m:time1.h > time2.h;
}

let users = [];
let hubs = [];
let locks = [];

app.post('/push-command', function(req,res) {
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

	req.body.lockName?(lock.command.lockName = req.body.lockName, lock.lockName = req.body.lockName):1==1;
	req.body.setOpen?(lock.command.setOpen = req.body.setOpen, lock.setOpen = req.body.setOpen):1==1;
	req.body.signal?(lock.command.signal = req.body.signal, lock.signal = req.body.signal):1==1;
	req.body.PIN?(lock.command.PIN = req.body.PIN, lock.PIN = req.body.PIN):1==1;
	req.body.mode?(lock.command.mode = req.body.mode, lock.mode = req.body.mode):1==1;
	
	if(req.body.setTimeM && req.body.setTimeH) {
		lock.command.setTimeM = req.body.setTimeM;
		lock.setTime.m = req.body.setTimeM;
		lock.command.setTimeH = req.body.setTimeH;
		lock.setTime.h = req.body.setTimeH;

		let cd = new Date();
		let ms = cd.getTime();
		cd.setHours(lock.setTime.h);
		cd.setMinutes(lock.setTime.m);
		lock.shift = ms - cd.getTime();
	}

	req.body.setCloseTimeM?(lock.command.setCloseTimeM = req.body.setCloseTimeM, lock.setCloseTime.m = req.body.setCloseTimeM):1==1;
	req.body.setCloseTimeH?(lock.command.setCloseTimeH = req.body.setCloseTimeH, lock.setCloseTime.h = req.body.setCloseTimeH):1==1;
	req.body.setOpenTimeM?(lock.command.setOpenTimeM = req.body.setOpenTimeM, lock.setOpenTime.m = req.body.setOpenTimeM):1==1;
	req.body.setOpenTimeH?(lock.command.setOpenTimeH = req.body.setOpenTimeH, lock.setOpenTime.h = req.body.setOpenTimeH):1==1;

	res.send(JSON.stringify(lock.command));
	delete lock.command.error;
	delete lock.command.msg;
});

app.get('/push-command', function(req,res) {
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

	req.query.lockName?(lock.command.lockName = req.query.lockName, lock.lockName = req.query.lockName):1==1;
	req.query.setOpen?(lock.command.setOpen = req.query.setOpen, lock.setOpen = req.query.setOpen):1==1;
	req.query.signal?(lock.command.signal = req.query.signal, lock.signal = req.query.signal):1==1;
	req.query.PIN?(lock.command.PIN = req.query.PIN, lock.PIN = req.query.PIN):1==1;
	req.query.mode?(lock.command.mode = req.query.mode, lock.mode = req.query.mode):1==1;

	if(req.query.setTimeM && req.query.setTimeH) {
		lock.command.setTimeM = req.query.setTimeM;
		lock.setTime.m = req.query.setTimeM;
		lock.command.setTimeH = req.query.setTimeH;
		lock.setTime.h = req.query.setTimeH;

		let cd = new Date();
		let ms = cd.getTime();
		cd.setHours(lock.setTime.h);
		cd.setMinutes(lock.setTime.m);
		lock.shift = cd.getTime() - ms;
	}	

	req.query.setCloseTimeM?(lock.command.setCloseTimeM = req.query.setCloseTimeM, lock.setCloseTime.m = req.query.setCloseTimeM):1==1;
	req.query.setCloseTimeH?(lock.command.setCloseTimeH = req.query.setCloseTimeH, lock.setCloseTime.h = req.query.setCloseTimeH):1==1;
	req.query.setOpenTimeM?(lock.command.setOpenTimeM = req.query.setOpenTimeM, lock.setOpenTime.m = req.query.setOpenTimeM):1==1;
	req.query.setOpenTimeH?(lock.command.setOpenTimeH = req.query.setOpenTimeH, lock.setOpenTime.h = req.query.setOpenTimeH):1==1;

	res.send(JSON.stringify(lock.command));
	delete lock.command.error;
	delete lock.command.msg;
});

app.post('/get-command', function(req,res) {
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

	req.query.lockName?(lock.command.lockName = req.query.lockName, lock.lockName = req.query.lockName):1==1;
	req.query.lockName?(lock.command.lockName = req.query.lockName, lock.lockName = req.query.lockName):1==1;
	req.query.lockName?(lock.command.lockName = req.query.lockName, lock.lockName = req.query.lockName):1==1;
	req.query.lockName?(lock.command.lockName = req.query.lockName, lock.lockName = req.query.lockName):1==1;

	res.send(JSON.stringify(lock.command));
	lock.command = {};
});

app.get('/get-command', function(req,res) {
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

	req.query.battery?lock.battery = req.query.battery:1==1;
	req.query.state?lock.state = req.query.state:1==1;
	req.query.timeM?lock.time.m = req.query.timeM:1==1;
	req.query.timeH?lock.time.h = req.query.timeH:1==1;
	
	res.send(JSON.stringify(lock.command));
	lock.command = {};
});

app.get('/update-lock', function(req, res) {
	let lock = locks.find(lock => lock.lockID == req.query.lockID);
	if(lock)
	{
		req.query.lockName?lock.lockName = req.query.lockName:lock.lockName;
    	req.query.state?lock.state = req.query.state:lock.state;
    	req.query.mode?lock.mode = req.query.mode:lock.mode;
    	req.query.PIN?lock.PIN = req.query.PIN:lock.PIN;
    	req.query.battery?lock.battery = req.query.battery:lock.battery;

    	req.query.setCloseTimeH && req.query.setCloseTimeM?(lock.setCloseTime.h = req.query.setCloseTimeH, lock.setCloseTime.m = req.query.setCloseTimeM):1==1;
	    req.query.setOpenTimeH && req.query.setOpenTimeM?(lock.setOpenTime.h = req.query.setOpenTimeH, lock.setOpenTime.m = req.query.setOpenTimeM):1==1;

	    if(req.query.timeH && req.query.timeM) 
	    {
		    locks.time.h = req.query.timeH;
	    	lock.time.m = req.query.timeM;

	    	let cd = new Date();
			let ms = cd.getTime();
			cd.setHours(lock.Time.h);
			cd.setMinutes(lock.Time.m);
			lock.shift = cd.getTime() - ms;
	    }

	    lock.command = {};
	    lock.setTime = new Time(0,0);
	    lock.curQuestion = 0;

	}
});


app.get('/test-data', function(req,res) {
  users = [];
  locks = [];
  hubs = [];

  users.push(new User('1', '1'));
  users.push(new User('2', '2'));
  users.push(new User('3', '3'));
  users.push(new User('4', '4'));

  hubs.push(new Hub('1','First'));
  hubs.push(new Hub('2','Second'));
  hubs.push(new Hub('3','First'));
  hubs.push(new Hub('4','Second'));
  hubs.push(new Hub('5','First'));

  locks.push(new Lock('1','First'));
  locks.push(new Lock('2','Second'));
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

 // console.log(JSON.stringify(users));
 // first = false;

  res.sendStatus(201);
});

app.get('/locks', function(req, res) {
	res.send(JSON.stringify(locks));
});

app.get('/hubs', function(req, res) {
	res.send(JSON.stringify(hubs));
});

app.get('/users', function(req, res) {
	res.send(JSON.stringify(users));
});

app.get('/hub', function(req, res) {
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
  console.log(req.body.id + " " + users[req.body.id]);
    if(req.body.id && users[req.body.id])
    {
      req.body.amazonUID?users[req.body.id].amazonUID = req.body.amazonUID:users[req.body.id].amazonUID;
      res.send(JSON.stringify(users[req.body.id]));
      return;
    }
    res.sendStatus(404);
});

app.post('/lock', function(req,res) {
  console.log(JSON.stringify(req.body));
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





app.post('/alexa',function(req,res) {
  if(req.body.amazonUID)
  {
    let user = users.find(user => user.amazonUID == req.body.amazonUID);
    if(!user)
    {
      res.send(JSON.stringify({"succ": false, "message": "user not found"}));
      return;
    }

    let hub = user.hubs.find(hub => hub.hubName == req.body.hubName);
    if(!hub)
    {
      res.send(JSON.stringify({"succ": false, "message": "hub not found"}));
      return;
    }

    let lock = hub.locks.find(lock => lock.lockName == req.body.deviceName);
    if(!lock)
    {
      res.send(JSON.stringify({"succ": false, "message": "lock not found"}));
      return;
    }

    if(lock.mode == MODE.fitness)
    {
      if(lock.curQuestion < lock.qa.length)
      {
        if(req.body.answer && req.body.answer == lock.qa[lock.curQuestion].val)
        {
          ++lock.curQuestion;
          if(lock.curQuestion < lock.qa.length)
          {
            res.send({"succ":true,"question": lock.qa[lock.curQuestion].key});
            return;
          }
        }
        else if(!req.body.answer)
        {
          res.send({"succ": false, "message": "No answer", "question": lock.qa[lock.curQuestion].key});
          return;
        }
        else if(!(req.body.answer == lock.qa[lock.curQuestion].val))
        {
          res.send({"succ": false, "message": "Wrong answer", "question": lock.qa[lock.curQuestion].key});
          return;
        }
        else
        {
          res.send({"succ": false, "message": "Something wrong. Try again.", "question": lock.qa[lock.curQuestion].key});
          return;
        }
      }
      lock.curQuestion = 0;

      if(req.body.time)
      {
        lock.setTime.setTime(req.body.time);
        lock.shift = (new Date()).getTime()-req.body.time;
      }
      req.body.setOpenTime?lock.setOpenTime.setTime(req.body.setOpenTime):lock.setOpenTime;
      req.body.setCloseTime?lock.setCloseTime.setTime(req.body.setCloseTime):lock.setCloseTime;
      req.body.open?lock.setOpen = req.body.open:lock.setOpen;
      req.body.signalFind?lock.signal = req.body.signalFind:lock.signal;

      if(req.body.setMode == MODE.family && req.body.setPIN && req.body.setOpenTime && req.body.setCloseTime)
      {
        lock.mode = req.body.setMode;
        lock.PIN = req.body.setPIN;
        lock.setOpenTime.setTime(req.body.setOpenTime);
        lock.setCloseTime.setTime(req.body.setCloseTime);
      }
      else if(req.body.setMode == MODE.biohack && req.body.setOpenTime && req.body.setCloseTime)
      {
        lock.mode = req.body.setMode;
        lock.setOpenTime.setTime(req.body.setOpenTime);
        lock.setCloseTime.setTime(req.body.setCloseTime);
      }
      else if(req.body.addQuestion && req.body.addAnswer)
        lock.qa.push(new Pair(req.body.addQuestion,req.body.addAnswer));

      res.send(JSON.stringify({"succ": true, "state": lock.state, "curTime": lock.time, "battery": lock.battery}));
      return;
    }
    else if(lock.mode = MODE.family)
    {
      if((new Date().getTime() - lock.shift) > lock.setCloseTime.getTime() || (new Date().getTime() - lock.shift) < lock.setOpenTime.getTime())
      {
        if(!req.body.PIN)
        {
          res.send({"succ": false, "message": "No PIN"});
          return;
        }
        else if(req.body.PIN != lock.PIN)
        {
          res.send({"succ": false, "message": "Wrong PIN"});
          return;
        }
        res.send({"succ": false, "message": "Something wrong."});
        return;
      }
      
      if(req.body.time)
      {
        lock.setTime.setTime(req.body.time);
        lock.shift = (new Date()).getTime()-req.body.time;
      }

      req.body.setOpenTime?lock.setOpenTime.setTime(req.body.setOpenTime):lock.setOpenTime;
      req.body.setCloseTime?lock.setCloseTime.setTime(req.body.setCloseTime):lock.setCloseTime;
      req.body.open?lock.setOpen = req.body.open:lock.setOpen;
      req.body.signalFind?lock.signal = req.body.signalFind:lock.signal;
      req.body.setPIN?lock.PIN = req.body.setPIN:lock.PIN;

      if(req.body.setMode == MODE.biohack && req.body.setOpenTime && req.body.setCloseTime)
      {
        lock.mode = req.body.setMode;
        lock.setOpenTime.setTime(req.body.setOpenTime);
        lock.setCloseTime.setTime(req.body.setCloseTime);
      }
      else if(req.body.setMode == MODE.fitness)
      {
        lock.mode = MODE.fitness;
        lock.qa = [];
        lock.curQuestion = 0;
      }

      res.send(JSON.stringify({"succ": true, "state": lock.state, "curTime": lock.time, "battery": lock.battery}));
      return;
    }
    else if(lock.mode = MODE.biohack)
    {
      let curTime = new Date().getTime();
      if((curTime - lock.shift) > lock.setCloseTime.getTime() || (curTime - lock.shift) < lock.setOpenTime.getTime())
      {
        res.send({"succ": false, "message": "Not in time", "closeTime": lock.setCloseTime.getTime(), "openTime": lock.setOpenTime.getTime(), "curServTime": new Date().get});
        return;
      }

      if(req.body.time)
      {
        lock.setTime.setTime(req.body.time);
        lock.shift = (new Date()).getTime()-req.body.time;
      }

      req.body.setOpenTime?lock.setOpenTime.setTime(req.body.setOpenTime):lock.setOpenTime;
      req.body.setCloseTime?lock.setCloseTime.setTime(req.body.setCloseTime):lock.setCloseTime;
      req.body.open?lock.setOpen = req.body.open:lock.setOpen;
      req.body.signalFind?lock.signal = req.body.signalFind:lock.signal;

      if(req.body.setMode == MODE.fitness)
      {
        lock.mode = MODE.fitness;
        lock.qa = [];
        lock.curQuestion = 0;
      }
      else if(req.body.setMode == MODE.family && req.body.setPIN && req.body.setOpenTime && req.body.setCloseTime)
      {
        lock.mode = req.body.setMode;
        lock.PIN = req.body.setPIN;
        lock.setOpenTime.setTime(req.body.setOpenTime);
        lock.setCloseTime.setTime(req.body.setCloseTime);
      }

      res.send(JSON.stringify({"succ": true, "state": lock.state, "curTime": lock.time, "battery": lock.battery}));
    }

  }
});

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname+'/index.html'));

  //console.log(resp);
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});



  users.push(new User('1', '1'));
  users.push(new User('2', '2'));
  users.push(new User('3', '3'));
  users.push(new User('4', '4'));

  hubs.push(new Hub('1','First'));
  hubs.push(new Hub('2','Second'));
  hubs.push(new Hub('3','First'));
  hubs.push(new Hub('4','Second'));
  hubs.push(new Hub('5','First'));

  locks.push(new Lock('1','First'));
  locks.push(new Lock('2','Second'));
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

 // console.log(JSON.stringify(users));
 // first = false;

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

module.exports = app ;

/*
express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
*/