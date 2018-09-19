let curErr = 10;

const PORT = process.env.PORT || 5000;
const mongoURL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';

let express = require('express');
let app     = express();
const bodyParser = require("body-parser");
let path    = require("path");

let mongoose = require('mongoose');
let fs = require('fs');
let multer = require('multer');
let upload = multer({ dest: 'upload/'});

(async () =>{ 

mongoose.connect(mongoURL);
app.use(bodyParser.urlencoded({  extended: true}));

app.use(bodyParser.json()); 
app.use(bodyParser.text()); 


app.use((req, res, next) => {
  if ((req.url == '/auth/google' && req.header('x-forwarded-proto') !== 'https'))
	res.send(400);
  else
    next();
});

let fileShema = mongoose.Schema({
	file: Buffer
});

let lockShema = mongoose.Schema({
	lockID: String,
	lockName: String,
	state: String,
	setOpen: String,
	time: {
		h: Number,
		m: Number,
		n: Number
	},
	setTime: {
		h: Number,
		m: Number,
		n: Number
	},
	shift: Number,
	mode: String,
	PIN: String,
	battery: String,
	signal: String,
	openCloseTime: [
		{
			day: String,
			openCloseTime: [{lock_h: Number,lock_m: Number,unlock_h: Number,unlock_m: Number}]
		}
	],
	qa: [{val: String, key: String}],
	curQuestion: Number,
	command: String
});

let hubShema = mongoose.Schema({
	hubID: String,
	hubName: String,
	locks: [{ type: mongoose.Schema.ObjectId, ref: 'Lock' }],
	command: String,
	tempLocks: [String],
	weather: {
		temperature: String,
		pressure: String,
		height: String,
		humidity: String,
		lastUpdate: Number
	},
	recievedCommand: String,
	commandProcessed: String
});

let userShema = mongoose.Schema({
	userID: String,
	amazonUID: String,
	hubs: [{ type: mongoose.Schema.ObjectId, ref: 'Hub' }]
});

let File = mongoose.model('File', fileShema);
let DBUser = mongoose.model('User', userShema);
let DBHub = mongoose.model('Hub', hubShema);
let DBLock = mongoose.model('Lock', lockShema);

function Pair(key, val) {
  this.key = key;
  this.val = val;
};

function createOpenCloseTime() {
	let arr = [];
	arr.push({day: "Monday", openCloseTime: [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()]});
	arr.push({day: "Tuesday", openCloseTime: [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()]});
	arr.push({day: "Wednesday", openCloseTime: [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()]});
	arr.push({day: "Thursday", openCloseTime: [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()]});
	arr.push({day: "Friday", openCloseTime: [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()]});
	arr.push({day: "Saturday", openCloseTime: [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()]});
	arr.push({day: "Sunday", openCloseTime: [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()]});
	return arr;
};

function Lock(lockID, lockName) {
  this.lockID = lockID;
  this.lockName = lockName;
  this.state = 'close';
  this.setOpen;
  this.time = new Time(0,0);
  this.tempTime = new Time(0,0);
  this.setTime = new Time(0,0);
  this.shift = 0;
  this.mode = MODE.fitness;
  this.PIN;
  this.battery;  
  this.signal;
  
  this.openCloseTime = createOpenCloseTime(),

  this.qa = [];
  this.curQuestion = 0;
  this.command = "{}";
};

function OneOpenClose() {
	this.lock_h = 99;
	this.lock_m = 99;
	this.unlock_h = 99;
	this.unlock_m = 99;
};

function OpenCloseTime() {
	this.Monday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Tuesday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Wednesday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Thursday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Friday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Saturday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.Sunday = [new OneOpenClose(), new OneOpenClose(), new OneOpenClose(), new OneOpenClose()];
	this.length = 4;
};

function Hub(hubID,hubName) {
  this.hubID = hubID;
  this.hubName = hubName;
  this.locks = [];
  this.command = "{}";
  this.commandProcessed = "{}";
  this.recievedCommand = "{}";
  this.tempLocks = [];
};

function User(userID, amazonUID) {
  this.userID = userID;
  this.amazonUID = amazonUID;
  this.hubs = [];
};

function Time(h,m) {
	this.h = h;
	this.m = m;
	this.n;
};

let users = [];
let hubs = [];
let locks = [];

if((await File.find({})).length < 1) {
	let file = new File({});
	file.save(function(err) {
		if(err)
			throw err;
	});
}

let log = "";
let MODE = Object.freeze({fitness:"fitness", family:"family", biohack:"biohack"});

async function clearDatabase() {
	users = [];
    locks = [];
    hubs = [];

    await DBUser.remove({}).exec();
    await DBHub.remove({}).exec();
    await DBLock.remove({}).exec();
};

async function writeTestData() {
	if((await DBUser.find({})).length < 1 && (await DBHub.find({})).length < 1 && (await DBLock.find({})).length < 1)
	{
		await (new DBUser(new User('1', '1'))).save();
		await (new DBUser(new User('2', '2'))).save();
		await (new DBUser(new User('3', '3'))).save();
		await (new DBUser(new User('4', '4'))).save();

		await (new DBHub(new Hub('1','First'))).save();
		await (new DBHub(new Hub('2','Second'))).save();
		await (new DBHub(new Hub('3','First'))).save();
		await (new DBHub(new Hub('4','Second'))).save();
		await (new DBHub(new Hub('5','First'))).save();

		await (new DBLock(new Lock('1','First'))).save();
		await (new DBLock(new Lock('2','Second'))).save();
		await (new DBLock(new Lock('3','First'))).save();
		await (new DBLock(new Lock('4','First'))).save();
		await (new DBLock(new Lock('5','Second'))).save();
		await (new DBLock(new Lock('6','Third'))).save();
		await (new DBLock(new Lock('7','First'))).save();
		await (new DBLock(new Lock('8','Second'))).save();
		await (new DBLock(new Lock('9','First'))).save();
		await (new DBLock(new Lock('10','Second'))).save();

		let instance = await DBHub.findOne({"hubID": '1'}).exec();
		await DBUser.findOneAndUpdate({"userID": '1'}, {$push: {hubs: instance}}).exec();
		instance = await DBHub.findOne({"hubID": '2'}).exec();
		await DBUser.findOneAndUpdate({"userID": '1'}, {$push: {hubs: instance}}).exec();
		instance = await DBHub.findOne({"hubID": '3'}).exec();
		await DBUser.findOneAndUpdate({"userID": '2'}, {$push: {hubs: instance}}).exec();
		instance = await DBHub.findOne({"hubID": '4'}).exec();
		await DBUser.findOneAndUpdate({"userID": '2'}, {$push: {hubs: instance}}).exec();
		instance = await DBHub.findOne({"hubID": '5'}).exec();
		await DBUser.findOneAndUpdate({"userID": '3'}, {$push: {hubs: instance}}).exec();

		instance = await DBLock.findOne({"lockID": '1'}).exec();
		await DBHub.findOneAndUpdate({"hubID": '1'}, {$push: {locks: instance}}).exec();
		instance = await DBLock.findOne({"lockID": '2'}).exec();
		await DBHub.findOneAndUpdate({"hubID": '1'}, {$push: {locks: instance}}).exec();
		instance = await DBLock.findOne({"lockID": '3'}).exec();
		await DBHub.findOneAndUpdate({"hubID": '2'}, {$push: {locks: instance}}).exec();
		instance = await DBLock.findOne({"lockID": '4'}).exec();
		await DBHub.findOneAndUpdate({"hubID": '3'}, {$push: {locks: instance}}).exec();
		instance = await DBLock.findOne({"lockID": '5'}).exec();
		await DBHub.findOneAndUpdate({"hubID": '3'}, {$push: {locks: instance}}).exec();
		instance = await DBLock.findOne({"lockID": '6'}).exec();
		await DBHub.findOneAndUpdate({"hubID": '3'}, {$push: {locks: instance}}).exec();
		instance = await DBLock.findOne({"lockID": '7'}).exec();
		await DBHub.findOneAndUpdate({"hubID": '4'}, {$push: {locks: instance}}).exec();
		instance = await DBLock.findOne({"lockID": '8'}).exec();
		await DBHub.findOneAndUpdate({"hubID": '4'}, {$push: {locks: instance}}).exec();
		instance = await DBLock.findOne({"lockID": '9'}).exec();
		await DBHub.findOneAndUpdate({"hubID": '5'}, {$push: {locks: instance}}).exec();
		instance = await DBLock.findOne({"lockID": '10'}).exec();
		await DBHub.findOneAndUpdate({"hubID": '5'}, {$push: {locks: instance}}).exec();
	}

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
  locks.push(new Lock('10','Second'));

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
  users[2].hubs[0].locks.push(locks[9]);
};

app.get('/clear-data', async function(req,res) {  
	log += ("/clear-data " + JSON.stringify(req.query) + "</br>"); 
	await clearDatabase();  
	res.send({"error": 0, "msg": "Data cleared"});
});

app.get('/revert-data', async function(req, res) { 
	log += ("/revert-data" + JSON.stringify(req.query) + "</br>"); 
	await clearDatabase(); 
	await writeTestData(); 
	res.send({"error": 0, "msg": "Data reverted to test"});
});

app.get('/write-test-data', async function(req,res) {  
	log += ("/test-data " + JSON.stringify(req.query) + "</br>"); 
	await writeTestData();  
	res.send({"error": 0, "msg": "Test data added"});
});

app.get('/command-done', async function(req, res) {
	log += ("/command-done " + JSON.stringify(req.query) + "</br>");
	/*
	let hub = hubs.find(hub => hub.hubID == req.query.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
	}
	res.send(hub.commandProcessed);
	if(hub.commandProcessed.end)
		hub.commandProcessed = {};
	*/

	let hub = await DBHub.findOne({"hubID": req.query.hubID}).exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}	
	let command = JSON.parse(hub.commandProcessed);
	res.send(command);
	//if(command.end)
		await DBHub.findOneAndUpdate({"hubID": req.query.hubID}, {$set: {"commandProcessed": JSON.stringify({})}});
});

app.post('/command-done', async function(req, res) {
	let hub = await DBHub.findOne({"hubID": req.body.hubID}).exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	if(!req.body.command)
	{
		res.send({"error": 9, "msg": "Not enough data. Command is not provided."});
		return;
	}
	let command = JSON.parse(hub.commandProcessed);
	let set = {};
	if(req.body.command.success)
	{
		command.success?1==1:command.success = [];
		req.body.command.success.forEach(comm => command.success.push(comm));
		await Promise.all(command.success.map(async (lock) => {
			set = {};
			if(lock.UUID == "hub")
			{
				lock.hubName?await DBHub.findOneAndUpdate({"hubID": req.body.hubID}, {$set: {"hubName": lock.hubName}}):1==1;
				return;
			}
			let UUID = lock.UUID;
			delete lock.UUID;
			Object.getOwnPropertyNames(lock).forEach(a => set[a] = lock[a]);
			if(set.openCloseTime)
			{
				let arr = [];
				let originalLock = await DBLock.findOne({"lockID": UUID}).exec();
				originalLock.openCloseTime.forEach(time => {
					if(set.openCloseTime[time.day])
					{
						let k = {};
						k.day = time.day;
						k.openCloseTime = [];
						updateOpenCloseTime(set.openCloseTime[time.day].split(' '), k.openCloseTime);
						arr.push(k);
					}
					else
						arr.push(time);
				});
				set.openCloseTime = arr;
			}

			if(set.timeH || set.timeN || set.timeM)
			{
				if(lock.time.m != 99 && lock.time.h != 99 && lock.time.n != 99)
				{
					lock.time.h = 99;
					lock.time.m = 99;
					lock.time.n = 99;
					lock.tempTime.h = 99;
					lock.tempTime.m = 99;
					lock.tempTime.n = 99;
				}
				set.timeH?lock.tempTime.h = set.timeH:1==1;
				set.timeN?lock.tempTime.n = set.timeN:1==1;
				set.timeM?lock.tempTime.m = set.timeM:1==1;
				if(lock.tempTime.h != 99 && lock.tempTime.n != 99 && lock.tempTime.m != 99)
				{
					set.time = {};
					set.time.m = parseInt(lock.tempTime.m);
					set.time.h = parseInt(lock.tempTime.h);
					set.time.n = parseInt(lock.tempTime.n);
					let day = set.time.n == 7?0:set.time.n;

					let cd = new Date();
					let ms = cd.getTime();
					cd.setUTCHours(set.time.h);
					cd.setUTCMinutes(set.time.m);
					cd.setUTCDate(cd.getUTCDate() - (cd.getUTCDay()-day));
					set.shift = ms - cd.getTime();
				}
				delete set.timeH;
				delete set.timeM;
				delete set.timeN;
			}
			await DBLock.findOneAndUpdate({"lockID": UUID}, {$set: set}).exec();
			lock.UUID = UUID;
		}));
	}
	if(req.body.command.fail)
	{
		command.fail?1==1:command.fail = [];
		req.body.command.fail.forEach(comm => command.fail.push(comm));
	}

	set = {};
	set.commandProcessed = JSON.stringify(command);
	await DBHub.findOneAndUpdate({"hubID": req.body.hubID}, {$set: set});
	res.send({"error": 0, "msg": "Command added"});
});

app.post('/command-done-old', async function(req, res) {
	log += ("/command-done-old " + JSON.stringify(req.body) + "</br>");
	/*
	let hub = hubs.find(hub => hub.hubID == req.body.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
	}
	if(!req.body.command)
	{
		res.send({"error": 9, "msg": "Not enough data. Command is not provided."});
	}
	if(hub.commandProcessed.end)
		hub.commandProcessed = {};
	Object.getOwnPropertyNames(req.body.command).forEach(a => hub.commandProcessed[a] = req.body.command[a]);
	res.send({"error": 0, "msg": "Command added"});
	*/

	let hub = await DBHub.findOne({"hubID": req.body.hubID}).exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	if(!req.body.command)
	{
		res.send({"error": 9, "msg": "Not enough data. Command is not provided."});
		return;
	}
	let command = JSON.parse(hub.commandProcessed);
	if(command.end)
		command = {};

	if(req.body.command.success)
	{
		command.success?1==1:command.success = {};
		if(req.body.command.success.hub)
		{
			command.success.hub?1==1:command.success.hub = {};
			Object.getOwnPropertyNames(req.body.command.success.hub).forEach(a => command.success.hub[a] = req.body.command.success.hub[a]);
		}
		if(req.body.command.success.locks)
		{
			command.success.locks?1==1:command.success.locks = [];
			req.body.command.success.locks.forEach(lock => {
				let lk = command.success.locks.find(l => l.UUID == lock.UUID);
				lk?Object.getOwnPropertyNames(lock).forEach(a => lk[a] = lock[a]):command.success.locks.push(lock);
			});
		}
	}
	if(req.body.command.fail)
	{
		command.fail?1==1:command.fail = {}; 
		if(req.body.command.fail.hub)
		{
			command.fail.hub?1==1:command.fail.hub = {};
			Object.getOwnPropertyNames(req.body.command.fail.hub).forEach(a => command.fail.hub[a] = req.body.command.fail.hub[a]);
		}
		if(req.body.command.fail.locks)
		{
			command.fail.locks?1==1:command.fail.locks = [];
			req.body.command.fail.locks.forEach(lock => {
				let lk = command.fail.locks.find(l => l.UUID == lock.UUID);
				lk?Object.getOwnPropertyNames(lock).forEach(a => lk[a] = lock[a]):command.fail.locks.push(lock);
			});
		}
	}
	command.end = req.body.command.end?req.body.command.end:false;
	let set = {};
	if(command.success && command.success.locks)
	{
		await Promise.all(command.success.locks.map(async (lock) => {
			set = {};
			let UUID = lock.UUID;
			delete lock.UUID;
			Object.getOwnPropertyNames(lock).forEach(a => set[a] = lock[a]);
			if(set.timeH || set.timeN || set.timeM)
			{
				if(lock.time.m != 99 && lock.time.h != 99 && lock.time.n != 99)
				{
					lock.time.h = 99;
					lock.time.m = 99;
					lock.time.n = 99;
					lock.tempTime.h = 99;
					lock.tempTime.m = 99;
					lock.tempTime.n = 99;
				}
				set.timeH?lock.tempTime.h = set.timeH:1==1;
				set.timeN?lock.tempTime.n = set.timeN:1==1;
				set.timeM?lock.tempTime.m = set.timeM:1==1;
				if(lock.tempTime.h != 99 && lock.tempTime.n != 99 && lock.tempTime.m != 99)
				{
					set.time = {};
					set.time.m = parseInt(lock.tempTime.m);
					set.time.h = parseInt(lock.tempTime.h);
					set.time.n = parseInt(lock.tempTime.n);
					let day = set.time.n == 7?0:set.time.n;

					let cd = new Date();
					let ms = cd.getTime();
					cd.setUTCHours(set.time.h);
					cd.setUTCMinutes(set.time.m);
					cd.setUTCDate(cd.getUTCDate() - (cd.getUTCDay()-day));
					set.shift = ms - cd.getTime();
				}
				delete set.timeH;
				delete set.timeM;
				delete set.timeN;
			}
			await DBLock.findOneAndUpdate({"lockID": UUID}, {$set: set}).exec();
			lock.UUID = UUID;
		}));
	}
	set = {};
	set.commandProcessed = JSON.stringify(command);
	if(command.success && command.success.hub)
		command.success.hub.hubName?set.hubName = command.success.hub.hubName:1==1;
		//Object.getOwnPropertyNames(hub).forEach(a => set[a] = command.success.hub[a]);
	await DBHub.findOneAndUpdate({"hubID": req.body.hubID}, {$set: set});

	res.send({"error": 0, "msg": "Command added"});
});

app.get('/received-command', async function(req, res) {
	log += ("/received-command " + JSON.stringify(req.query) + "</br>");
	/*
	let hub = hubs.find(hub => hub.hubID == req.query.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	res.send(hub.recievedCommand);
	hub.recievedCommand = {};
	*/

	let hub = await DBHub.findOne({"hubID": req.query.hubID}).exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	res.send(hub.recievedCommand);
	await DBHub.findOneAndUpdate({"hubID": req.query.hubID}, {$set: {"recievedCommand": JSON.stringify({})}});
});

app.post('/received-command', async function(req, res) {
	log += ("/received-command " + JSON.stringify(req.body) + "</br>");
	/*
	let hub = hubs.find(hub => hub.hubID == req.body.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	hub.recievedCommand = req.body.command;
	res.send({"error": 0, "msg": "Recieved command saved"});
	*/

	let hub = await DBHub.findOne({"hubID": req.body.hubID}).exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	await DBHub.findOneAndUpdate({"hubID": req.body.hubID}, {$set: {"recievedCommand": JSON.stringify(req.body.command)}});
	res.send({"error": 0, "msg": "Recieved command saved"});
});

app.post('/upload', upload.single('file'), async function(req, res) {
	log += ("/upload</br>");
	let file = (await File.find({}))[0];
	file.file = fs.readFileSync(req.file.destination + req.file.filename);
	await File.findOneAndUpdate({"_id": file._id}, {$set: {"file": file.file}}, function(err,doc,res) {});
	hubs.forEach(hub => hub.command.firmwareUpdate = true);
	res.send("File uploaded");
});

app.get('/firmware.bin', async function(req, res) {
	log += ("/firmware.bin</br>");
	res.send((await File.find({}))[0].file);
});

function oneDateIn(date,openClose) {

	let dateLock = new Date(date);
	dateLock.setUTCHours(openClose.lock_h);
	dateLock.setUTCMinutes(openClose.lock_m);

	let dateUnlock = new Date(date);
	dateUnlock.setUTCHours(openClose.unlock_h);
	dateUnlock.setUTCMinutes(openClose.unlock_m);

	return date.getTime() > dateLock.getTime() && date.getTime() < dateUnlock.getTime();
};

function dateIn(cd, lock) {
	let arr = undefined;
	switch(cd.getDay())
	{
		case 1: 
			arr = lock.openCloseTime.Monday;
			break;
		case 2: 
			arr = lock.openCloseTime.Tuesday;
			break;
		case 3: 
			arr = lock.openCloseTime.Wednesday;
			break;
		case 4: 
			arr = lock.openCloseTime.Thursday;
			break;
		case 5: 
			arr = lock.openCloseTime.Friday;
			break;
		case 6: 
			arr = lock.openCloseTime.Saturday;
			break;
		case 0: 
			arr = lock.openCloseTime.Sunday;
			break;
		default:
			arr = undefined;
	}

	return arr.every(openClose => oneDateIn(cd, openClose));
};

async function deleteUser(from) {
	/*if(!from.userID)
		return {"error": 9, "msg": "Not enough data"}

	let user = users.findIndex(us => us.userID == from.userID);

	if(user == -1)
		return {"error": 1, "msg": "User not found"};

	users.find(user => user.userID == from.userID).hubs.forEach(hub => {
		hub.locks.forEach(lock => locks.splice(locks.findIndex(test => lock.lockID == test.lockID)));
		hub.locks = [];
		hubs.splice(hubs.findIndex(hubsad => hubsad.hubID == hub.hubID),1);
	});
	user.hubs = [];

	users.splice(user,1);
	return {"error": 0, "msg": "User deleted"};
	*/

	if(!from.userID)
		return {"error": 9, "msg": "Not enough data"};

	let user = await DBUser.findOne({"userID": from.userID}).populate({path: 'hubs', populate: {path: 'locks'}}).exec();
	if(!user)
		return {"error": 1, "msg": "User not found"};
	user.hubs.forEach(async (hub) => {
		await DBLock.deleteMany({"lockID": {$in: hub.locks.map(el => el.lockID)}}).exec();
	});
	await DBHub.deleteMany({"hubID": {$in: user.hubs.map(el => el.hubID)}}).exec();
	await DBUser.deleteOne({"userID": from.userID}).exec();
	return {"error": 0, "msg": "User deleted"};
};

app.get('/user/delete', async function(req, res) {	
	log += ("/user/delete " + JSON.stringify(req.query) + "</br>");
	res.send(await deleteUser(req.query));
});

app.post('/user/delete', async function(req,res) {	
	log += ("/user/delete " + JSON.stringify(req.body) + "</br>"); 
	res.send(await deleteUser(req.body));
});

async function deleteHub(from) {
	/*
	if(!from.hubID || !from.userID)
		return {"error": 9, "msg": "Not enough data"}

	let user = users.find(us => us.userID == from.userID);

	if(!user)
		return {"error": 1, "msg": "User not found"};

	let hub = user.hubs.findIndex(hub => hub.hubID == from.hubID);
	if(hub == -1)
		return {"error": 2, "msg": "Hub is not assigned to this user"};

	let userHub = user.hubs.find(hub => hub.hubID == from.hubID);
	userHub.locks.forEach(lock => locks.splice(locks.findIndex(test => lock.lockID == test.lockID)));

	user.hubs.splice(hub,1);
	hubs.splice(hubs.findIndex(hubs => hubs.hubID == userHub.hubID),1);
	return {"error": 0, "msg": "Hub deleted"};
	*/
	if(!from.hubID || !from.userID)
		return {"error": 9, "msg": "Not enough data"}

	let user = await DBUser.findOne({"userID": from.userID}).populate({path: 'hubs', populate: {path: 'locks'}}).exec();

	if(!user)
		return {"error": 1, "msg": "User not found"};

	let hub = user.hubs.findIndex(hub => hub.hubID == from.hubID);


	if(hub == -1)
		return {"error": 2, "msg": "Hub is not assigned to this user"};

	await DBLock.deleteMany({"lockID": {$in: user.hubs[hub].locks.map(el => el.lockID)}}).exec();
	user = await DBUser.findOne({"userID": from.userID}).exec();
	await DBUser.findOneAndUpdate({"userID": from.userID}, {$pull: {"hubs": user.hubs[hub]}}).exec();
	await DBHub.deleteOne({"hubID": from.hubID}).exec();
	return {"error": 0, "msg": "Hub deleted"};
};

app.get('/hub/delete', async function(req, res) {	
	log += ("/hub/delete " + JSON.stringify(req.query) + "</br>"); 
	res.send(await deleteHub(req.query));
});

app.post('/hub/delete', async function(req, res) {	
	log += ("/hub/delete " + JSON.stringify(req.body) + "</br>"); 
	res.send(await deleteHub(req.body));
});

async function deleteLock(from) {
	/*
	if(!from.hubID || !from.lockID)
		return {"error": 9, "msg": "Not enough data"}

	let hub = hubs.find(us => us.hubID == from.hubID);

	if(!hub)
		return {"error": 1, "msg": "Hub not found"};

	let lock = hub.locks.findIndex(hub => hub.lockID == from.lockID);
	if(lock == -1)
		return {"error": 2, "msg": "Lock is not assigned to this hub"};

	hub.locks.splice(lock,1);
	locks.splice(locks.findIndex(locks => locks.lockID == from.lockID),1);
	return {"error": 0, "msg": "Lock deleted"};
	*/

	if(!from.hubID || !from.lockID)
		return {"error": 9, "msg": "Not enough data"};

	let hub = await DBHub.findOne({"hubID": from.hubID}).populate([{path: 'locks'}, {path: 'tempLocks'}]).exec();

	if(!hub)
		return {"error": 1, "msg": "Hub not found"};

	let lock = hub.locks.findIndex(hub => hub.lockID == from.lockID);
	if(lock == -1)
		return {"error": 2, "msg": "Lock is not assigned to this hub"};
	await DBHub.findOneAndUpdate({"hubID": from.hubID}, {$pull: {"locks": hub.locks[lock]}}).exec();
	await DBLock.deleteOne({"lockID": from.lockID}).exec();
	return {"error": 0, "msg": "Lock deleted"};
};

app.get('/lock/delete', async function(req, res) {	
	log += ("/lock/delete " + JSON.stringify(req.query) + "</br>"); 
	res.send(await deleteLock(req.query));
});

app.post('/lock/delete', async function(req, res) {	
	log += ("/lock/delete " + JSON.stringify(req.body) + "</br>"); 
	res.send(await deleteLock(req.body));
});

async function registerUser(from) {
	/*
	if(!from.userID)
		return {"error": 9, "msg": "Not enough data"};

	if(users.find(us => us.userID == from.userID))
		return {"error": 1, "msg": "User already exists"};

	let user = new User(from.userID, from.amazonUID?user.amazonUID = from.amazonUID:"");
	users.push(user);
	return {"error": 0, "msg": "User created"};
	*/

	if(!from.userID)
		return {"error": 9, "msg": "Not enough data"};
	
	let user = await DBUser.findOne({"userID": from.userID}).exec();
	if(user)
		return {"error": 1, "msg": "User already exists"};

	await (new DBUser(new User(from.userID, from.amazonUID?from.amazonUID:""))).save();
	return {"error": 0, "msg": "User created"};
};

app.get('/user/register', async function(req, res) {	
	log += ("/user/register " + JSON.stringify(req.query) + "</br>"); 
	res.send(await registerUser(req.query));
});

app.post('/user/register', async function(req, res) {	
	log += ("/user/register " + JSON.stringify(req.body) + "</br>"); 
	res.send(await registerUser(req.body));
});

async function registerHub(from) {
	/*
	if(!from.hubID || !from.userID)
		return {"error": 9, "msg": "Not enough data"};

	let user = users.find(us => us.userID == from.userID);
	let hub = hubs.find(hub => hub.hubID == from.hubID);
	if(!user)
		return {"error": 1, "msg": "User not found"};
	if(hub)
		return {"error": 10, "msg": "Hub with this ID already exists"};

	hub = new Hub(from.hubID, "");
	hubs.push(hub);
	user.hubs.push(hub);
	return {"error": 0, "msg": "Hub registred successfully"};
	*/
	if(!from.hubID || !from.userID)
		return {"error": 9, "msg": "Not enough data"};

	let user = await DBUser.findOne({"userID": from.userID}).exec();
	let hub = await DBHub.findOne({"hubID": from.hubID}).exec();
	if(!user)
		return {"error": 1, "msg": "User not found"};
	if(hub)
		return {"error": 10, "msg": "Hub with this ID already exists"};

	hub = await (new DBHub(new Hub(from.hubID,from.hubName?from.hubName:""))).save();
	console.log(hub);
	await DBUser.findOneAndUpdate({"userID": from.userID}, {$push: {hubs: hub}}).exec();
	return {"error": 0, "msg": "Hub registred successfully"};
};

app.get('/hub/register', async function(req, res) {	
	log += ("/hub/register " + JSON.stringify(req.query) + "</br>"); 
	res.send(await registerHub(req.query));
});

app.post('/hub/register', async function(req, res) {	
	log += ("/hub/register " + JSON.stringify(req.body) + "</br>"); 
	res.send(await registerHub(req.body));
});

async function registerLock(from) {
	/*
	if(!from.lockID || !from.hubID)
	{
		return {"error": 9, "msg": "Not enough data"};
	}
	let hub = hubs.find(hub => hub.hubID == from.hubID);
	let lock = locks.find(lock => lock.lockID == from.lockID);

	if(!hub)
		return {"error": 1, "msg": "Hub not found"};
	if(lock)
		return {"error": 10, "msg": "Lock with this ID already exists"};

	lock = new Lock(from.lockID, "");

	locks.push(lock);
	hub.locks.push(lock);
	return {"error": 0, "msg": "Lock registred successfully"};
	*/

	if(!from.lockID || !from.hubID)
		return {"error": 9, "msg": "Not enough data"};

	let hub = await DBHub.findOne({"hubID": from.hubID}).exec();
	let lock = await DBLock.findOne({"lockID": from.lockID}).exec();

	if(!hub)
		return {"error": 1, "msg": "Hub not found"};
	if(lock)
		return {"error": 10, "msg": "Lock with this ID already exists"};

	lock = await (new DBLock(new Lock(from.lockID,from.lockName?from.lockName:""))).save();
	await DBHub.findOneAndUpdate({"hubID": from.hubID}, {$push: {locks: lock}}).exec();
	return {"error": 0, "msg": "Lock registred successfully"};
};

app.get('/lock/register', async function(req, res) {	
	log += ("/lock/register " + JSON.stringify(req.query) + "</br>"); 
	res.send(await registerLock(req.query));
});

app.post('/lock/register', async function(req, res) {	
	log += ("/lock/register " + JSON.stringify(req.body) + "</br>"); 
	res.send(await registerLock(req.body));
});

app.post('/add-temp-locks', async function(req, res) {
	log += ("/add-temp-locks " + JSON.stringify(req.body) + "</br>");
	/*let hub = hubs.find(hub => hub.hubID == req.body.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	if(!req.body.tempLocks)
	{
		res.send({"error": 2, "msg": "Locks not found"});
		return;
	}

	hub.tempLocks = req.body.tempLocks;

	res.send({"error": 0, "msg": "Locks successfully added", "locks": hub.tempLocks});
	*/

	let hub = await DBHub.findOne({"hubID": req.body.hubID}).exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	if(!req.body.tempLocks)
	{
		res.send({"error": 2, "msg": "Locks not found"});
		return;
	}

	await DBHub.findOneAndUpdate({"hubID": req.body.hubID}, {$set: {"tempLocks": req.body.tempLocks}}).exec();
	res.send({"error": 0, "msg": "Locks successfully added", "locks": req.body.tempLocks});
});

app.post('/register-temp-locks', async function(req, res) {
	log += ('/register-temp-locks' + JSON.stringify(req.body) + '</br>');
	/*
	let hub = hubs.find(hub => hub.hubID == req.body.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	if(!req.body.tempLocks)
	{
		res.send({"error": 2, "msg": "Locks not found"});
		return;
	}
	hub.command.error = 0;
	hub.command.msg = "Locks array to add added";
	hub.command.tempLocks = req.body.tempLocks;
	hub.tempLocks = req.body.tempLocks;

	res.send(hub.command);

	delete hub.command.error;
	delete hub.command.msg;
	*/
	let hub = await DBHub.findOne({"hubID": req.body.hubID}).exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	if(!req.body.tempLocks)
	{
		res.send({"error": 2, "msg": "Locks not found"});
		return;
	}

	let command = {};
	let parsed = JSON.parse(hub.command);
	Object.getOwnPropertyNames(parsed).forEach(prop => command[prop] = parsed[prop]);
	command.tempLocks = req.body.tempLocks;
	//await DBHub.findOneAndUpdate({"hubID": req.body.hubID}, {$set: {"tempLocks": req.body.tempLocks, "command": JSON.stringify(hub.command)}}).exec();
	await DBHub.findOneAndUpdate({"hubID": req.body.hubID}, {$set: {"tempLocks": [], "command": JSON.stringify(command)}}).exec();
	command.error = 0;
	command.msg = "Locks array to add added";
	res.send(command);
}); 

function checkLengthOpenCloseArr(arr, count) {	return arr.filter(el => el.lock_h == 99).length >= count;
};

function checkOpenCloseTime(openCloseTime, original) {
	let arr = [];
	openCloseTime.forEach(fromDay => {
		let day = original.find(day => fromDay.day == day.day);
		if(!fromDay.openCloseTime.every(time => {

			let n = day.openCloseTime.find(time2 => {
				return time.lock_h == time2.lock_h &&
					time.lock_m == time2.lock_m &&
					time.unlock_h == time2.unlock_h &&
					time.unlock_m == time2.unlock_m;
			});
			return n;
		}))
		{
			arr.push(fromDay);
		}
	});
	return arr;
};

function pushCommand(from, to) {
/*
	from.hubName?(to.command.hubName = from.hubName, to.hubName = from.hubName):1==1;
	from.signalLock?to.command.signalLock = from.signalLock:1==1;
	from.findLocks?to.command.findLocks = from.findLocks:1==1;
	from.connect?to.command.connect = from.connect:1==1;
	from.disconnect?to.command.disconnect = from.disconnect:1==1;

	from.lockName?(to.command.lockName = from.lockName, to.lockName = from.lockName):1==1;
	from.setOpen?(to.command.setOpen = from.setOpen, to.setOpen = from.setOpen):1==1;
	from.signal?(to.command.signal = from.signal, to.signal = from.signal):1==1;
	from.PIN?(to.command.PIN = from.PIN, to.PIN = from.PIN):1==1;
	from.mode?(to.command.mode = from.mode, to.mode = from.mode):1==1;
	
	from.setTimeN?(to.setTime.n = parseInt(from.setTimeN), to.command.setTimeN = parseInt(from.setTimeN)):1==1;
	if(from.setTimeM && from.setTimeH) {
		to.command.setTimeM = parseInt(from.setTimeM);
		to.setTime.m = parseInt(from.setTimeM);
		to.command.setTimeH = parseInt(from.setTimeH);
		to.setTime.h = parseInt(from.setTimeH);

		let cd = new Date();
		let ms = cd.getTime();
		cd.setUTCHours(to.setTime.h);
		cd.setUTCMinutes(to.setTime.m);
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
*/
	let command = {};
	let parsed = JSON.parse(to.command);
	Object.getOwnPropertyNames(parsed).forEach(prop => command[prop] = parsed[prop]);

	from.hubName?command.hubName = from.hubName:1==1;
	from.signalLock?command.signalLock = from.signalLock:1==1;
	from.findLocks?command.findLocks = from.findLocks:1==1;
	from.connect?command.connect = from.connect:1==1;
	from.disconnect?command.disconnect = from.disconnect:1==1;

	from.lockName?command.lockName = from.lockName:1==1;
	from.setOpen?command.setOpen = from.setOpen:1==1;
	from.signal?command.signal = from.signal:1==1;
	from.PIN?command.PIN = from.PIN:1==1;
	from.mode?command.mode = from.mode:1==1;
	from.updateLock?command.updateLock = 1:1==1;
	(from.setTimeN && from.setTimeM && from.setTimeH)?(command.setTimeN = parseInt(from.setTimeN), command.setTimeM = parseInt(from.setTimeM), command.setTimeH = parseInt(from.setTimeH)):1==1;

	if(from.setOpenCloseTime)
	{
		let arr = checkOpenCloseTime(from.setOpenCloseTime, to.openCloseTime);
		if(arr.length > 0)
		{
			command.openCloseTime = {};
			arr.forEach( day => {
				let str = "";
				day.openCloseTime.forEach(time => {
					str += (time.lock_h > 10?time.lock_h:'0' + time.lock_h);
					str += (time.lock_m > 10?time.lock_m:'0' + time.lock_m);
					str += (time.unlock_h > 10?time.unlock_h:'0' + time.unlock_h);
					str += (time.unlock_m > 10?time.unlock_m:'0' + time.unlock_m);
					str += ' ';
				});
				command.openCloseTime[day.day] = str.substr(0, str.length-1);
			});
		}
	}

	return JSON.stringify(command);
};

app.post('/push-command', async function(req,res) {
  log += ("/push-command " + JSON.stringify(req.body) + "</br>");
	/*
	let hub = hubs.find(hub => hub.hubID == req.body.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	if(!req.body.lockID)
	{
		hub.command.error = 0;
		hub.command.msg = "Command added";
		pushCommand(req.body, hub);

		res.send(hub.command);

		delete hub.command.error;
		delete hub.command.msg;
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
	*/

	let hub = await DBHub.findOne({"hubID": req.body.hubID}).populate({path: "locks"}).exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	if(!req.body.lockID)
	{
		let command = pushCommand(req.body, hub);
		await DBHub.findOneAndUpdate({"hubID": req.body.hubID}, {$set: {"command": command}}).exec();

		res.send({"error": 0, "msg": "Command added", "command": command});
		return;
	}

	let lock = await DBLock.findOne({"lockID": req.body.lockID}).exec();
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

	let command = pushCommand(req.body, lock);
	await DBLock.findOneAndUpdate({"lockID": req.body.lockID}, {$set: {"command": command}}).exec();
	res.send({"error": 0, "msg": "Command added", "command": command});
});

app.get('/push-command', async function(req,res) {
  log += ("/push-command " + JSON.stringify(req.query) + "</br>");
	/*
	let hub = hubs.find(hub => hub.hubID == req.query.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	if(!req.query.lockID)
	{
		hub.command.error = 0;
		hub.command.msg = "Command added";
		pushCommand(req.query, hub);

		res.send(hub.command);

		delete hub.command.error;
		delete hub.command.msg;
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
	*/
	let hub = await DBHub.findOne({"hubID": req.query.hubID}).populate({path: "locks"}).exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	if(!req.query.lockID)
	{
		let command = pushCommand(req.query, hub);
		await DBHub.findOneAndUpdate({"hubID": req.query.hubID}, {$set: {"command": command}}).exec();
		res.send({"error": 0, "msg": "Command added", "command": command});
		return;
	}

	let lock = await DBLock.findOne({"lockID": req.query.lockID}).exec();
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

	let command = pushCommand(req.query, lock);
	await DBLock.findOneAndUpdate({"lockID": req.query.lockID}, {$set: {"command": command}}).exec();
	res.send({"error": 0, "msg": "Command added", "command": command});
});

async function updateHub(from, hub) {

	let cd;
	from.humidity?cd = new Date().getTime():1==1;
	from.pressure?cd = new Date().getTime():1==1;
	from.temperature?cd = new Date().getTime():1==1;
	from.height?cd = new Date().getTime():1==1;

	await DBHub.findOneAndUpdate({"hubID": hub.hubID}, {$set: {
		"weather": {
			"humidity": from.humidity?from.humidity:hub.weather.humidity, 
			"pressure": from.pressure?from.pressure:hub.weather.pressure, 
			"temperature": from.temperature?from.temperature:hub.weather.temperature, 
			"height": from.height?from.height:hub.weather.height, 
			"lastUpdate": cd?cd:hub.weather.lastUpdate
		}
	}}).exec();
};

async function getCommand(hub) {
	let resp = {};
	let command = JSON.parse(hub.command);
	resp.hub = (Object.getOwnPropertyNames(command).length === 0)?undefined:command;
	await DBHub.findOneAndUpdate({"hubID": hub.hubID}, {$set: {"command": JSON.stringify({})}}).exec();
	resp.locks = [];
	hub.locks.forEach(async (lock) => {
		command = JSON.parse(lock.command); 
		if(Object.getOwnPropertyNames(command).length > 0) {
			command.UUID = lock.lockID; 
			resp.locks.push(command);
			await DBLock.findOneAndUpdate({"lockID": lock.lockID}, {$set: {"command": JSON.stringify({})}}).exec();
		}

	});
	resp.locks.length == 0?resp.locks = undefined:1==1;
	return resp;
};

app.post('/get-full-command', async function(req, res) {
	log += ("/get-full-command " + JSON.stringify(req.body) + "</br>");
	/*
	let hub = hubs.find(hub => hub.hubID == req.body.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	updateHub(req.body, hub);
	let resp = getCommand(hub);
	res.send(resp);
	hub.command = {};
	hub.locks.forEach(lock => lock.command = {});
	*/
	let hub = await DBHub.findOne({"hubID": req.body.hubID}).populate('locks').exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	await updateHub(req.body, hub);
	res.send(await getCommand(hub));
});

app.get('/get-full-command', async function(req, res) {
	log += ("/get-command " + JSON.stringify(req.query) + "</br>");
	/*
	let hub = hubs.find(hub => hub.hubID == req.query.hubID);
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}

	updateHub(req.query, hub);
	let resp = getCommand(hub);
	res.send(resp);
	hub.command = {};
	hub.locks.forEach(lock => lock.command = {});
	*/
	let hub = await DBHub.findOne({"hubID": req.query.hubID}).populate('locks').exec();
	if(!hub)
	{
		res.send({"error": 1, "msg": "Hub not found"});
		return;
	}
	await updateHub(req.query, hub);
	res.send(await getCommand(hub));
});


function updateOpenCloseTime(from, to) {
	from.forEach((el,i) => {
		let k = {};
		k.lock_h = parseInt(el.substr(0,2));
		k.lock_m = parseInt(el.substr(2,2));
		k.unlock_h = parseInt(el.substr(4,2));
		k.unlock_m = parseInt(el.substr(6,2));
		to.push(k);
	});
};

async function updateLock(from, lock) {
	/*
	from.lockName?lock.lockName = from.lockName:lock.lockName;
    from.state?lock.state = from.state:lock.state;
    from.mode?lock.mode = from.mode:lock.mode;
    from.PIN?lock.PIN = from.PIN:lock.PIN;
    from.battery?lock.battery = from.battery:lock.battery;

	if(from.timeN && from.timeH && from.timeM) {
		lock.time.m = parseInt(from.timeM);
		lock.time.h = parseInt(from.timeH);
		lock.time.n = parseInt(from.timeN);
		let day = lock.time.n == 7?0:lock.time.n;

		let cd = new Date();
		let ms = cd.getTime();
		cd.setUTCHours(lock.time.h);
		cd.setUTCMinutes(lock.time.m);
		cd.setUTCDate(cd.getUTCDate() - (cd.getUTCDay()-day));
		lock.shift = ms - cd.getTime();
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
	*/
	let cd = new Date();
	let ms = cd.getTime();

	let set = {};

	from.lockName?set.lockName = from.lockName:lock.lockName;
    from.state?set.state = from.state:lock.state;
    from.mode?set.mode = from.mode:lock.mode;
    from.PIN?set.PIN = from.PIN:lock.PIN;
    from.battery?set.battery = from.battery:lock.battery;

    if(from.timeN && from.timeH && from.timeM) {
    	set.time = {};
		set.time.m = parseInt(from.timeM);
		set.time.h = parseInt(from.timeH);
		set.time.n = parseInt(from.timeN);
		let day = set.time.n == 7?0:set.time.n;

		let cd = new Date();
		let ms = cd.getTime();
		cd.setUTCHours(set.time.h);
		cd.setUTCMinutes(set.time.m);
		cd.setUTCDate(cd.getUTCDate() - (cd.getUTCDay()-day));
		set.shift = ms - cd.getTime();
	}

	
	if(from.openCloseTime)
	{
		set.openCloseTime = [];
		from.openCloseTime.forEach(fromDay => {
			let obj = {day: fromDay.day, openCloseTime: []};
			updateOpenCloseTime(fromDay.openCloseTime.split(' '), obj.openCloseTime);
			set.openCloseTime.push(obj);
		});
	}
	await DBLock.findOneAndUpdate({"lockID": lock.lockID}, {$set: set}).exec();
	return {"error": 0, "msg": "Lock updated"};
};
/*
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
		res.send(JSON.stringify(hub.command));
		hub.command = {};
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
		res.send(JSON.stringify(hub.command));
		hub.command = {};
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
*/

app.get('/update-lock', async function(req, res) {
  log += ("/update-lock " + JSON.stringify(req.query) + "</br>");
  /*
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
	*/

	let lock = await DBLock.findOne({"lockID": req.query.lockID}).exec();
	if(!lock)
	{
		res.send({"error": 1, "msg": "Lock not found"});
		return;
	}
	res.send(await updateLock(req.query, lock));
});

app.post('/update-lock', async function(req, res) {
  log += ("/update-lock " + JSON.stringify(req.body) + "</br>");
  /*
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
	*/

	let lock = await DBLock.findOne({"lockID": req.body.lockID}).exec();
	if(!lock)
	{
		res.send({"error": 1, "msg": "Lock not found"});
		return;
	}
	res.send(await updateLock(req.body, lock));
});

async function getUser(ID, AUID) {
	if(ID)
		return await DBUser.findOne({"userID": ID}).populate({path: "hubs", populate: {path: "locks"}}).exec();
	if(AUID)
		return await DBUser.findOne({"amazonUID": AUID}).populate({path: "hubs", populate: {path: "locks"}}).exec();
	return await DBUser.find({}).populate({path: "hubs", populate: {path: "locks"}}).exec();
};

async function getHub(ID, Name) {
	if(ID)
		return await DBHub.findOne({"hubID": ID}).populate("locks").exec();
	if(Name)
		return await DBHub.findOne({"hubName": Name}).populate("locks").exec();
	return await DBHub.find({}).populate("locks").exec();
};

async function getLock(ID, Name) {
	if(ID)
		return await DBLock.findOne({"lockID": ID}).exec();
	if(Name)
		return await DBLock.findOne({"lockName": Name}).exec();
	return await DBLock.find({}).exec();
};

app.get('/locks', async function(req, res) {	
	log += ("/locks " + JSON.stringify(req.query) + "</br>");
	//res.send(locks);
	res.send(await getLock(req.query.lockID, req.query.lockName));
});

app.post('/locks', async function(req, res) {	
	log += ("/locks " + JSON.stringify(req.body) + "</br>"); 
	//res.send(locks);
	res.send(await getLock(req.body.lockID, req.body.lockName));
});

app.get('/hubs', async function(req, res) {	
	log += ("/hubs " + JSON.stringify(req.query) + "</br>");
	//res.send(hubs);
	res.send(await getHub(req.query.hubID, req.query.hubName));
});

app.post('/hubs', async function(req, res) {	
	log += ("/hubs " + JSON.stringify(req.body) + "</br>"); 
	//res.send(hubs);
	res.send(await getHub(req.body.hubID, req.body.hubName));
});

app.get('/users', async function(req, res) {	
	log += ("/users " + JSON.stringify(req.query) + "</br>"); 
	//res.send(users);
	res.send(await getUser(req.query.userID, req.query.amazonUID));
});

app.post('/users', async function(req, res) {	
	log += ("/users " + JSON.stringify(req.body) + "</br>"); 
	//res.send(users);
	res.send(await getUser(req.body.userID, req.body.amazonUID));
});
/*
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

app.get('/lock', function(req, res) {
  log += ("/lock " + JSON.stringify(req.query) + "</br>");
  if(req.query.id && locks[req.query.id])
  {
  	req.query.qaremove?locks[req.query.id].qa = []:1==1;
  	(req.query.question && req.query.answer)?(locks[req.query.id].qa.push(new Pair(req.query.question, req.query.answer))):1==1;

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

app.post('/lock', function(req,res) {

	log += ("/lock " + JSON.stringify(req.body) + "</br>");
    if(req.body.id)
    {
      req.body.qaremove?locks[req.body.id].qa = []:1==1;
      (req.body.question && req.body.answer)?(locks[req.body.id].qa.push(new Pair(req.body.question, req.body.answer))):1==1;

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
*/
app.get('/test-log', function(req, res) {  req.query.clear?(log = "", res.send("Log cleared.")):res.send("<html><body>" + log + "</body></html>");
});
/*
app.get('/alexa-user', function(req, res) {
	log += ("/alexa-user " + JSON.stringify(req.query) + "</br>");
	let user = users.find(user => user.amazonUID == req.query.aUID);

	if(user)
	{
		user.cd = new Date();
		user.cd = user.cd.getTime();
		res.send(user);
	}
	else 
		res.send({"succ": false, "error": 3, "message": "User not found"});
});

app.post('/alexa-user', function(req, res) {
	log += ("/alexa-user " + JSON.stringify(req.body) + "</br>");
	let user = users.find(user => user.amazonUID == req.body.aUID);

	if(user)
	{
		user.cd = new Date();
		user.cd = user.cd.getTime();
		res.send(user);
	}
	else 
		res.send({"succ": false, "error": 3, "message": "User not found"});
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

    let hub = user.hubs.find(hub => hub.hubName.toUpperCase() === req.body.hubName.toUpperCase());
    if(!hub)
    {
      res.send(JSON.stringify({"succ": false, "error": 1, "message": "hub not found"}));
      return;
    }

    let lock = hub.locks.find(lock => lock.lockName.toUpperCase() === req.body.lockName.toUpperCase());
    if(!lock)
    {
      res.send(JSON.stringify({"succ": false, "error": 2, "message": "lock not found"}));
      return;
    }

    let cd = new Date();
	cd.setTime(cd.getTime() - lock.shift);

    if(lock.mode == MODE.fitness)
    {
      lock.curQuestion = 0;

      req.body.setTimeN?(lock.setTime.n = parseInt(req.body.setTimeN), lock.command.setTimeN = parseInt(req.body.setTimeN)):1==1;
	  if(req.body.setTimeM && req.body.setTimeH) {
		to.command.setTimeM = parseInt(req.body.setTimeM);
		to.setTime.m = parseInt(req.body.setTimeM);
		to.command.setTimeH = parseInt(req.body.setTimeH);
		to.setTime.h = parseInt(req.body.setTimeH);

		let cd = new Date();
		let ms = cd.getTime();
		cd.setUTCHours(to.setTime.h);
		cd.setUTCMinutes(to.setTime.m);
		to.shift = ms - cd.getTime();
	  }

      req.body.setOpen?(lock.setOpen = req.body.setOpen, lock.command.setOpen = req.body.setOpen):lock.setOpen;
      req.body.signalFind?(lock.signal = req.body.signalFind, lock.command.signal = req.body.signalFind):lock.signal;

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
    else if(lock.mode == MODE.family)
    {
      if(dateIn(cd,lock))
      {
        if(!req.body.PIN)
        {
          res.send({"succ": false, "error": 6, "message": "No PIN"});
          return;
        }
        else if(req.body.PIN && req.body.PIN != lock.PIN)
        {
          res.send({"succ": false, "error": 7, "message": "Wrong PIN"});
          return;
        }
      }
      
      req.body.setTimeN?(lock.setTime.n = parseInt(req.body.setTimeN), lock.command.setTimeN = parseInt(req.body.setTimeN)):1==1;
	  if(req.body.setTimeM && req.body.setTimeH) {
		to.command.setTimeM = parseInt(req.body.setTimeM);
		to.setTime.m = parseInt(req.body.setTimeM);
		to.command.setTimeH = parseInt(req.body.setTimeH);
		to.setTime.h = parseInt(req.body.setTimeH);

		let cd = new Date();
		let ms = cd.getTime();
		cd.setUTCHours(to.setTime.h);
		cd.setUTCMinutes(to.setTime.m);
		to.shift = ms - cd.getTime();
	  }

      req.body.setOpen?(lock.setOpen = req.body.setOpen, lock.command.setOpen = req.body.setOpen):lock.setOpen;
      req.body.signalFind?(lock.signal = req.body.signalFind, lock.command.signal = req.body.signalFind):lock.signal;
      req.body.setPIN?(lock.PIN = req.body.setPIN, lock.command.PIN = req.body.setPIN):lock.PIN;

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
    else if(lock.mode == MODE.biohack)
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
*/
app.get('/', function (req, res) {  res.sendFile(path.join(__dirname+'/index.html'));
});
app.get('/inDev.jpg', function(req, res) { res.sendFile(path.join(__dirname + '/inDev.jpg'))})
// error handling
app.use(function(err, req, res, next) {  
	console.error(err.stack);  
	res.status(500).send('Something bad happened!');
});

//writeTestData();

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

})();

module.exports = app ;