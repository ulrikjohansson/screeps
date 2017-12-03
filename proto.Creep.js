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

var priority = {
    DEBUG: 1,
    INFO: 2,
    WARNING: 3,
    ERROR: 4
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
            if(priority[global.logLevel] <= priority["INFO"]) {
                this.log(message, "INFO");
            }
        }

    Creep.prototype.warning =
        function(message) {
            if(priority[global.logLevel] <= priority["WARNING"]) {
                this.log(message, "WARNING");
            }
        }

    Creep.prototype.error =
        function(message) {
            if(priority[global.logLevel] <= priority["ERROR"]) {
                this.log(message, "ERROR");
            }
        }

    Creep.prototype.dump =
        function() {
            console.log(JSON.stringify(this, null, 2));
        };

    Creep.prototype.findResourceStores =
        function() {
	        let targets = this.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE);
                    }
            });
            this.debug("Found " + targets.length + " energy stores");
            return targets;
        };

    Creep.prototype.findNonEmptyEnergyStores =
        function() {
            let targets = _.filter(this.findResourceStores(), function(store) {
                return store.store[RESOURCE_ENERGY] > 0
            });
            this.debug("Found " + targets.length + " non-empty energy stores");

            return targets;
        };

    Creep.prototype.getClosestNonEmptyEnergyStore =
        function() {
            let stores = this.findNonEmptyEnergyStores();
            let target = this.pos.findClosestByPath(stores);
            if(target) {
                this.debug("Found closest energy store: " + target + " @ " + target.pos);
                return target;
            }

            this.info("Found no non empty energy stores");
        };

    Creep.prototype.findConstructionSites =
        function(room = null) {
            if (room == null) {
                room = this.room;
            }
            let targets = room.find(FIND_CONSTRUCTION_SITES);
            //fix the smallest projects first
            targets = _.sortBy(targets, 'progressTotal');
            this.debug("Found " + targets.length + " construction sites");
            return targets;
        };
    Creep.prototype.findSmallestConstructionSite =
        function() {
            let targets = this.findConstructionSites();
            targets = _.sortBy(targets, 'progressTotal');
            if (targets.length > 0) {
                target = targets[0];
                this.debug("Found new construction site: " + target + " @ " + target.pos);
                return target;
            } else {
                this.info("No construction sites found");
            }
        };

    Creep.prototype.findAllDroppedEnergy =
        function() {
            self = this;
    	    const targets = this.room.find(FIND_DROPPED_RESOURCES, {filter: function(resource) {
                return resource.resourceType == RESOURCE_ENERGY && resource.amount >= self.carryCapacity * 0.75 && resource.pos.findInRange(FIND_FLAGS, 1).length == 0;
	        }});

	        return targets;
        }

    Creep.prototype.findAnyEnergy =
        function() {
            let dropped_energy = this.findAllDroppedEnergy();
            let stored_energy = this.findNonEmptyEnergyStores();
            return _.union(dropped_energy, stored_energy);
        }
};
