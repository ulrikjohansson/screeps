/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.repairer');
 * mod.thing == 'a thing'; // true
 */
var roleRepairer = {

    /** @param {Creep} creep **/
    run: function(creep) {

	    if(creep.memory.repairing && creep.carry.energy == 0) {
            creep.memory.repairing = false;
            creep.say('harvest');
	    }
	    if(!creep.memory.repairing && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.repairing = true;
	        creep.say('repair');
	    }

	    if(creep.memory.repairing) {

            //find structures other than walls with high hits to repair
            var targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (
                            structure.hits < structure.hitsMax && 
                            (
                                !_.some([STRUCTURE_WALL, STRUCTURE_RAMPART], structure.structureType) ||
                                (_.some([STRUCTURE_WALL, STRUCTURE_RAMPART], structure.structureType) && structure.hits < 10000)
                            )
                        );
                    }
            });
            
            //if there are no other structures requiring repair, build on the walls and ramparts
            if(targets.length == 0) {
                var targets = creep.room.find(FIND_STRUCTURES, {
                        filter: (structure) => {
                            return structure.hits < structure.hitsMax;
                        }
                });
            }
            
            if(targets.length > 0) {
                if(creep.repair(targets[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(_.shuffle(targets)[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
	    }
	    else {
	        var targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE);
                    }
            });
            if (targets.length == 0) { // no containers around
                var sources = creep.room.find(FIND_SOURCES);
                if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return;
            }
            var results = creep.withdraw(targets[targets.length -1], RESOURCE_ENERGY);
            if (results == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[targets.length -1], {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
	}
};

module.exports = roleRepairer;