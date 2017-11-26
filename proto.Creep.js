/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('proto.Creep');
 * mod.thing == 'a thing'; // true
 */

var levels = {
    "DEBUG": "#66a0ff",
    "INFO": "#33ff33",
    "WARNING": "#ffff00",
    "ERROR": "#ff3333"
}


module.exports = function () {
    
    Creep.prototype.log =
        function(message, level="INFO") {
            console.log("<span style='color:" + levels[level] + "'>" + level + "</span>: " + this.name + ": " + message);
        };
        
    Creep.prototype.debug =
        function(message) {
            if(this.memory.debug || global.logLevel == "DEBUG") {
                this.log(message, "DEBUG");
            }
        };
    
    Creep.prototype.info =
        function(message) {
            this.log(message, "INFO");
        }
    
    Creep.prototype.warning =
        function(message) {
            this.log(message, "WARNING");
        }

    Creep.prototype.error =
        function(message) {
            this.log(message, "ERROR");
        }

    Creep.prototype.dump =
        function() {
            console.log(JSON.stringify(this, null, 2));
        };
};