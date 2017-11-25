var tinyqueue = require('tinyqueue');

const STATE_SPAWNING = 0;
const STATE_MOVING_TO_SOURCE = 1;
const STATE_HARVESTING = 2;
const STATE_MOVING_TO_DEPOSIT = 3;
const STATE_DEPOSITING = 4;

var state_lookup = function (state) {
    let state_dict = {
        0: "spawning",
        1: "moving to source",
        2: "harvesting",
        3: "moving to deposit",
        4: "depositing"
    }
    return state_dict[state];
}

var roleHarvester = {

    creep: null,

    /** @param {Creep} creep **/
    run: function(creep) {
        creep.debug("Mem BEFORE run: " + JSON.stringify(creep.memory));
        creep.debug(JSON.stringify(
            {
                "id": creep.id,
                "ticksToLive": creep.ticksToLive,
                "pos": "x:" + creep.pos.x + " y:" + creep.pos.y + " room: " + creep.pos.roomName,
                "fatigue": creep.fatigue,
                "body": _.countBy(creep.body, "type"),
                "carry": creep.carry,
                "capacity": creep.carryCapacity,
                "hits": creep.hits
            }, null, 2)
        );

        this.creep = creep;
        
        if(!creep.memory.state) {
            creep.memory.state = STATE_SPAWNING;
        }
        
        switch(creep.memory.state) {
            case STATE_SPAWNING:
                this.runSpawning(creep);
                break;
            case STATE_MOVING_TO_SOURCE:
                this.runMoveToSource(creep);
                break;
            case STATE_HARVESTING:
                this.runHarvest(creep);
                break;
            case STATE_MOVING_TO_DEPOSIT:
                this.runMoveToDeposit(creep);
                break;
            case STATE_DEPOSITING:
                this.runDeposit(creep);
                break;
        }
        creep.debug("Mem AFTER run: " + JSON.stringify(creep.memory));

	},
	runSpawning: function (creep) {
	    if(!creep.spawning) {
	        creep.memory.state = STATE_MOVING_TO_SOURCE;
            creep.debug("new state {" + state_lookup(creep.memory.state) + "]");
	    }
	},
	runMoveToSource: function(creep) {
	    var target = null;
	    if(creep.memory.source_target_pos) {
	        let mempos = creep.memory.source_target_pos;
            creep.debug("mempos: " + JSON.stringify(mempos));
            creep.debug("x:" + mempos["x"] + " y:" + mempos["y"] + " roomName:" + mempos["roomName"]);

	        let target_list = creep.room.lookForAt(LOOK_ENERGY, new RoomPosition(mempos.x, mempos.y, mempos.roomName));
            creep.debug("Target list from mem pos " + JSON.stringify(target_list, ["pos", "x", "y", "energy"]));

	        if (target_list.length > 0) {
	            target = target_list[0];
	            creep.debug("Harvester " + creep.name + ": using target " + JSON.stringify(target, ["pos", "x", "y", "energy"]));
	        } else {
	            creep.debug("Harvester " + creep.name + ": no target found from mempos");
	        }
	    }

	    if(!target) {
    	    const targets = creep.room.find(FIND_DROPPED_ENERGY, {filter: function(resource) {
    	        return resource.amount >= creep.carryCapacity && resource.pos.findInRange(FIND_FLAGS, 1).length == 0;
    	        
    	    }});
    
            creep.debug("Harvester " + creep.name + ": found "+targets.length+" energy targets");

    
            let queue = tinyqueue([], function(a,b) {
                return (a.cost - b.cost);
            });
            for (let i in targets) {
                let target = targets[i];
                let cost = (creep.pos.getRangeTo(target) - _.max([target.amount / 2, creep.carryCapacity]));
                let object = {cost: cost, target: target};
                queue.push(object);
            }
            
            let target_object = queue.peek();
            creep.debug("Target list:\n" + JSON.stringify(queue.data, ["target", "pos", "x", "y", "energy"], 2));
            target = target_object.target;
            creep.debug("Using target " + JSON.stringify(target, ["pos", "x", "y", "energy"]));
            creep.memory.source_target_pos = target.pos;
	    }

	    //const target = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
        if(target) {
            if(creep.pos.inRangeTo(target, 1)) {
                creep.memory.state = STATE_HARVESTING;
                this.runHarvest(creep, target);
                return;
            }
            creep.debug("Target pos > " + JSON.stringify(target.pos));
            let result = creep.moveTo(target);
            creep.debug("Move result > "+ result);

        } else {
            creep.debug("No energy source to target!");
        }
	},
	runHarvest: function(creep, target) {
	    if (!target) {
            const target = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
	    }
        
        if(!target) {
            creep.info("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "}");
            creep.memory.state = STATE_MOVING_TO_SOURCE;
            this.runMoveToSource(creep);
            return;
        }

        let result = creep.pickup(target);
        
        switch (result) {
            case OK:
            case ERR_INVALID_TARGET:
            case ERR_NOT_IN_RANGE:
                creep.memory.state = STATE_MOVING_TO_SOURCE;
                creep.debug("New state {" + state_lookup(creep.memory.state) + "]");
                return;
        }
        
        if(_.sum(creep.carry) >= creep.carryCapacity * 0.75 ) {
            creep.memory.state = STATE_MOVING_TO_DEPOSIT;
            creep.debug("New state {" + state_lookup(creep.memory.state) + "]");
        }
        
	},
	findDepositTarget: function (creep) {
        var targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return ((structure.structureType == STRUCTURE_SPAWN || structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_TOWER) &&
                        (structure.energy < structure.energyCapacity) || ((structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE) && structure.store[RESOURCE_ENERGY] < structure.storeCapacity));
                }
        });

        if(targets.length > 0) {
            //give priority to spawns & extensions
            const priorities = {
                spawn: 1,
                extension: 1,
                tower: 1,
                container: 10,
                storage: 10,
            };
            let queue = tinyqueue([], function(a,b) {
                return (Math.floor(priorities[a.structureType] + Math.random() * 8)) - (Math.floor(priorities[b.structureType] + Math.random() * 8));
            });
            for (let i in targets) {
                queue.push(targets[i]);
            }
            
            var target = queue.peek();
        } else {
            creep.warning("No regular deposit targets for carrier!");
            var target = null;
            return;
        }
        
        return target;
	},
	depositTargetUseful: function(target) {
	    let target_type = target.structureType;
	    switch(target_type) {
	        case STRUCTURE_SPAWN:
	        case STRUCTURE_EXTENSION:
	        case STRUCTURE_TOWER:
	            return (target.energy < target.energyCapacity);
	        case STRUCTURE_CONTAINER:
	        case STRUCTURE_STORAGE:
	            return (_.sum(target.store) < target.storeCapacity);
	    }
	},
	runMoveToDeposit: function (creep) {
	    
	    let target = null;
	    if(creep.memory.target_id) {
            try {
                creep.debug("Trying to deserialize target_id="+creep.memory.target_id+" to structure");
                target = Game.getObjectById(creep.memory.target_id);
            } catch (e) {
                creep.debug("Trying to deserialize target_id="+creep.memory.target_id+" to flag");
                target = Game.flags[creep.memory.target_id];
            }
            creep.debug("Got target from memory target_id="+creep.memory.target_id+": " + JSON.stringify(target));
	    }
	    
	    if(
	        !target ||
	        (target && !this.depositTargetUseful(target))
	    ){
	        target = this.findDepositTarget(creep);
	        creep.debug("target returned from findDepositTarget: " + JSON.stringify(target));
	        if(!target) {
	            let flag = this.findDropFlag(creep);
	            creep.debug("found flag: " + JSON.stringify(flag));
	            if (flag) {
	                target = flag;
	                creep.debug("setting target_id to: " + JSON.stringify(target.name));
	                creep.memory.target_id = target.name;
	            } else {
                creep.warning("No target found!");
                return;
	            }
	        } else {
            creep.memory.target_id = target.id;
	        }
        }

        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
    
        //stop moving if we're in range
        creep.debug("In range to "+target.pos+"?: " + JSON.stringify(creep.pos.inRangeTo(target, 1)));
        if(creep.pos.inRangeTo(target, 1)) {
            creep.memory.state = STATE_DEPOSITING;
            creep.debug("New state {" + state_lookup(creep.memory.state) + "]");
	        this.runDeposit(creep);
        }
	},
	runDeposit: function (creep) {
        let target = null;
        let result = null;
        try {
            creep.debug("Trying to deserialize to structure");
            target = Game.getObjectById(creep.memory.target_id);
            creep.debug("Dropping energy near " + target.name);
            result = creep.transfer(target, RESOURCE_ENERGY);
        } catch (e) {
            creep.debug("Not structure, trying to deserialize to flag");
            target = Game.flags[creep.memory.target_id];
            creep.debug("Dropping energy near " + target.name);
            result = creep.drop(RESOURCE_ENERGY);
        }
        
        creep.debug("Offload result: " + result);

        switch (result) {
            case ERR_NOT_IN_RANGE:
                creep.memory.state = STATE_MOVING_TO_DEPOSIT;
                creep.debug("New state {" + state_lookup(creep.memory.state) + "]");
                return;
            case ERR_INVALID_TARGET:
            case ERR_FULL:
                creep.memory.target_id = null;
                creep.memory.state = STATE_MOVING_TO_DEPOSIT;
                creep.debug("New state {" + state_lookup(creep.memory.state) + "]");
                return;
            case ERR_NOT_ENOUGH_RESOURCES:
                creep.memory.state = STATE_MOVING_TO_SOURCE;
                creep.memory.target_id = null;
                creep.debug("New state {" + state_lookup(creep.memory.state) + "]");
                return;
        }
        
        if(creep.carry[RESOURCE_ENERGY] == 0) {
            creep.memory.state = STATE_MOVING_TO_SOURCE;
            creep.memory.target_id = null;
            creep.debug("New state {" + state_lookup(creep.memory.state) + "]");
        }
	},
	findDropFlag: function(creep) {
	    //first check if we have a cached flag
	    let flag = null;
	    let flag_id = creep.room.memory.dropflag;
	    if (flag_id) {
	        flag = Game.getObjectById(flag_id);
	        if (!flag) {
	            return;
	        } else {
	            creep.room.memory.dropflag = flag.id;
	        }
	    } else {
	        flag = creep.room.find(FIND_FLAGS, { filter: { name: "Drop"}});
	        if (flag.length == 0) {
	            return;
	        }
	    }
	    
	    return flag[0];
	}
};

module.exports = roleHarvester;
