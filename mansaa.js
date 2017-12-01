var util = require('util');
var NobleDevice = require('noble-device');

module.exports = function(customMixin) {
    var SERVICE_UUID = 'ffb0';
    var CONTROL_UUID = 'ffb2';
    var EFFECT_UUID = 'ffb2';

    var MansaaLed = function(peripheral) {
        NobleDevice.call(this, peripheral);
    };

    MansaaLed.SCAN_UUIDS = [SERVICE_UUID];

    MansaaLed.prototype.RGBtoBuffer = function(rgbString, brightness) {
        rgbString = rgbString || '000000';
        brightness = brightness || 'd1';
        var fromString = brightness + rgbString;
        return Buffer.from(fromString, 'hex');
    };

    MansaaLed.is = function(peripheral) {
        /* This is a big nono , return correct info */
        var localName = peripheral.advertisement.localName;
        console.log(localName);
        return true;
        // return ((localName === undefined) || (localName === 'Cnlight') );
    };

    NobleDevice.Util.inherits(MansaaLed, NobleDevice);
    if (customMixin) {
        NobleDevice.Util.mixin(MansaaLed, customMixin);
    }

    MansaaLed.prototype.connectAndSetUp = function(callback) {
        NobleDevice.prototype.connectAndSetUp.call(this, function(error) {
            // Read the initial value of the light
            let that = this;
            this.readDataCharacteristic(SERVICE_UUID, CONTROL_UUID, function(err, data) {
                if (err == null || err == undefined) {
                    that.colors = {};
                    that.colors.red = data[1];
                    that.colors.green = data[2];
                    that.colors.blue = data[3];
                }
                else {
                    that.colors = {};
                    that.colors.red = 255;
                    that.colors.green = 255;
                    that.colors.blue = 255;
                }
                callback(err);
            });
        }.bind(this));
    };

    MansaaLed.prototype.writeServiceStringCharacteristic = function(
        uuid,
        string,
        callback
    ) {
        this.writeStringCharacteristic(SERVICE_UUID, uuid, string, callback);
    };

    MansaaLed.prototype.writeControlCharateristic = function(
        red,
        green,
        blue,
        brightness,
        callback
    ) {
        var rgbString = red + green + blue;
        var brightNess = brightness;
        var command = this.RGBtoBuffer(rgbString, brightNess);
        this.writeServiceStringCharacteristic(CONTROL_UUID, command, callback);
    };

    MansaaLed.prototype.turnOn = function(callback) {
        this.writeControlCharateristic('FF', 'FF', 'FF', 'FF', callback);
    };

    MansaaLed.prototype.turnOff = function(callback) {
        this.writeControlCharateristic('00', '00', '00', '00', callback);
    };

    MansaaLed.prototype.setGradualMode = function(on, callback) {
        this.writeServiceStringCharacteristic(
            EFFECT_UUID,
            on ? 'TS' : 'TE',
            callback
        );
    };

    MansaaLed.prototype.setColorAndBrightness = function(
        red,
        green,
        blue,
        duration,
        callback
    ) {
        function convert(integer) {
            var str = Number(integer).toString(16);
            return str.length == 1 ? '0' + str : str;
        }

        function setCurrentColors(err) {
            if (err == null || err == undefined) {
                self.colors.red = red;
                self.colors.green = green;
                self.colors.blue = blue;
            }
        }

        var self = this;
        brightness = '00';

        if (duration == 0) {
            strRed = convert(red);
            strGreen = convert(green);
            strBlue = convert(blue);
            self.writeControlCharateristic(strRed, strGreen, strBlue, brightness, setCurrentColors);
        }
        else {
            let updateInterval = 100;
            let steps = duration / updateInterval;
            let count = 0;
            let colorIntervals = {
                red: Number.parseInt((red - self.colors.red)/steps),
                green: Number.parseInt((green - self.colors.green)/steps),
                blue: Number.parseInt((blue - self.colors.blue)/steps),
            }
            let finalColors = {
                red: red,
                green: green,
                blue: blue
            }
            let intervalId = setInterval(function() {
                if (count == steps) {
                    clearInterval(intervalId);

                    red = finalColors.red;
                    green = finalColors.green;
                    blue = finalColors.blue;
                    strRed = convert(red);
                    strGreen = convert(green);
                    strBlue = convert(blue);
                    self.writeControlCharateristic(strRed, strGreen, strBlue, brightness, setCurrentColors);

                    return;
                }

                red = self.colors.red + colorIntervals.red;
                green = self.colors.green + colorIntervals.green;
                blue = self.colors.blue + colorIntervals.blue;

                strRed = convert(red);
                strGreen = convert(green);
                strBlue = convert(blue);

                self.writeControlCharateristic(strRed, strGreen, strBlue, brightness, setCurrentColors);

                count++;
            }, updateInterval);
        }
    };

    return MansaaLed;
};

