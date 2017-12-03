var roleUpgrader = {

    /** @param {Creep} creep **/
    run: function(creep) {

        if(creep.memory.upgrading && creep.carry.energy == 0) {
            creep.memory.upgrading = false;
            creep.say('🔄 harvest');
	    }
	    if(!creep.memory.upgrading && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.upgrading = true;
	        creep.say('⚡ upgrade');
	    }

	    if(creep.memory.upgrading) {
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
        else {
	        var targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE) && structure.store[RESOURCE_ENERGY] > 0;
                    }
            });
            if (targets.length > 0) {
                var results = creep.withdraw(targets[targets.length -1], RESOURCE_ENERGY);
                if (results == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[targets.length -1], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            } else {
        	    const target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
                if(target) {
                    if(creep.pos.inRangeTo(target, 1)) {
                        this.runPickup(creep, target);
                        return;
                    }
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});

                }

            }
        }
	},
	runPickup: function(creep, target) {
	    if (!target) {
            const target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
	    }

        if(!target) {
            return;
        }

        let result = creep.pickup(target);
	}
};

module.exports = roleUpgrader;
