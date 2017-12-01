const Mansaa = require('./node_modules/mansaa-smartshine/mansaa')
const http = require('http')
const port = 6000

const mansaa = Mansaa();

devices = [];

mansaa.discoverAll(function(dev) {
	devices.push(dev);
	dev.connectAndSetUp(function(err) {
		console.log("Connected to " + dev._peripheral.advertisement.localName);
		console.log(dev);
	});
});

const requestHandler = (request, response) => {
	var body = [];
	request.on('data', function(chunk) {
		body.push(chunk)
	}).on('end', function() {
		let urlRegex = /\/(.*)/;
		if (urlRegex.test(request.url)) {
			console.log("matched");
			let devId = urlRegex.exec(request.url)[1];
			let dev_idx = -1;
			for(let i = 0; i < devices.length; i++) {
				if (devices[i].id == devId) {
					dev_idx = i;
					break;
				}
			}

			if (dev_idx == -1) {
				response.writeHead(404);
				response.end(JSON.stringify({"error": "Invalid device id!"}));
			}
			else {
				if (request.method == "POST") {
					data = Buffer.concat(body).toString('utf-8');
					if (data == "ON") {
						devices[dev_idx].turnOn(function() {});
					}
					else if (data == "OFF") {
						devices[dev_idx].turnOff(function() {});
					}
					response.writeHead(200);
					response.end(JSON.stringify({"status": "ok"}));
				}
				else {

				}
			}


		}
		console.log(request.method, request.url)
	});
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
	if (err) {
		return console.log('something bad happened', err)
	}

	console.log(`server is listening on ${port}`)
})
