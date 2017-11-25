var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {

	    if(creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
            creep.say('🔄 harvest');
	    }
	    if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.building = true;
	        creep.say('🚧 build');
	    }

	    if(creep.memory.building) {
	        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if(targets.length) {
                if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
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
        	    const target = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
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
            const target = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
	    }
        
        if(!target) {
            console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "}");
            return;
        }

        let result = creep.pickup(target);
	}
};

module.exports = roleBuilder;