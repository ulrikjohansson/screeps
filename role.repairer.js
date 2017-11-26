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
	        creep.debug("Clearing target & fetching more energy");
            creep.memory.repairing = false;
            delete creep.memory.target_id;
            creep.say('harvest');
	    }
	    if(!creep.memory.repairing && creep.carry.energy == creep.carryCapacity) {
	        creep.debug("Energy full, starting repairs");
	        creep.memory.repairing = true;
	        creep.say('repair');
	    }

	    if(creep.memory.repairing) {
            var target = null;
            if(creep.memory.target_id) {
                creep.debug("Found target from memory: " + creep.memory.target_id);
                target = Game.getObjectById(creep.memory.target_id);
            } else {
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
                creep.debug("Found " + targets.length + " targets in first round.");

                //if there are no other structures requiring repair, build on the walls and ramparts
                if(targets.length == 0) {
                    var targets = creep.room.find(FIND_STRUCTURES, {
                            filter: (structure) => {
                                return structure.hits < structure.hitsMax;
                            }
                    });
                    creep.debug("Found "+ targets.length + " targets in second round");
                }
                if(targets.length > 0) {
                    targets = _.sortBy(targets, 'hits');
                    target = targets[0];
                    creep.debug("Setting memory to target: "+ target.id);
                    creep.memory.target_id = target.id;
                }
            }
            if(target) {
                creep.debug("Trying to repair target: " + target.id);
                let result = creep.repair(target);
                creep.debug("Repair result: " + result);
                if(result == ERR_NOT_IN_RANGE) {
                    creep.debug("Not in repair range, moving closer to target: "+ target.id);
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                } else if (result == ERR_NOT_ENOUGH_RESOURCES) {
                    creep.debug("Repair OK. Deleting target from memory, and searching from scratch");
                    delete creep.memory.target_id;
                }
            }
	    }
	    else {
	        creep.debug("Finding containers and storages to get energy from");
	        var targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE) && structure.store[RESOURCE_ENERGY] > 0;
                    }
            });
            creep.debug("Found " + targets.length + " structures to get energy from");
            creep.debug("Trying to withdraw energy from target: " + targets[targets.length -1]);
            if(targets.length == 0) {
                creep.warning("No targets to withdraw energy from.");
                return;
            }
            var results = creep.withdraw(targets[targets.length -1], RESOURCE_ENERGY);
            creep.debug("Withdraw result: " + results);
            if (results == ERR_NOT_IN_RANGE) {
                creep.debug("Not in range, moving closer to target");
                creep.moveTo(targets[targets.length -1], {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
	}
};

module.exports = roleRepairer;
