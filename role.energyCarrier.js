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
        if (creep.memory.debug) {
            console.log("\n");
            console.log("--------------"+ Game.time + "----------------");
            console.log("Harvester " + creep.name + " Mem BEFORE run: " + JSON.stringify(creep.memory));
        }
        
        if (creep.memory.debug) {
            console.log("Harvester " + creep.name + " id: " + creep.id);
            console.log("Harvester " + creep.name + " TTL: " + creep.ticksToLive);
            console.log("Harvester " + creep.name + " pos: " + JSON.stringify(creep.pos));
            console.log("Harvester " + creep.name + " fatigue: " + creep.fatigue);
            console.log("Harvester " + creep.name + " body: " + JSON.stringify(creep.body));
            console.log("Harvester " + creep.name + " carry: " + JSON.stringify(creep.carry));
            console.log("Harvester " + creep.name + " hits: " + creep.hits);
            
        }
        
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
        if (creep.memory.debug) {
            console.log("Harvester " + creep.name + " Mem AFTER run: " + JSON.stringify(creep.memory));
        }

	},
	runSpawning: function (creep) {
	    if(!creep.spawning) {
	        creep.memory.state = STATE_MOVING_TO_SOURCE;
	        if(creep.memory.debug) {
                console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
	        }
	    }
	},
	runMoveToSource: function(creep) {
	    var target = null;
	    if(creep.memory.source_target_pos) {
	        let mempos = creep.memory.source_target_pos;
	        if(creep.memory.debug) {
	            console.log("mempos: " + JSON.stringify(mempos));
	            console.log("x:" + mempos["x"] + " y:" + mempos["y"] + " roomName:" + mempos["roomName"]);
	        }
	        //target = creep.room.lookForAt(LOOK_ENERGY, new RoomPosition(mempos["x"], mempos["y"], mempos["roomName"]));
	        let target_list = creep.room.lookForAt(LOOK_ENERGY, new RoomPosition(34, 20, "sim"));
	        if (target_list.length > 0) {
	            target = target_list[0];
	        }
	        
	    }

	    if(!target) {
    	    const targets = creep.room.find(FIND_DROPPED_ENERGY, {filter: function(resource) {
    	        return resource.amount >= creep.carryCapacity && resource.pos.findInRange(FIND_FLAGS, 1).length == 0;
    	        
    	    }});
    
            if(creep.memory.debug) {
                console.log("Harvester " + creep.name + ": found "+targets.length+" energy targets");
            }
    
    
            let queue = tinyqueue([], function(a,b) {
                return (a.cost - b.cost);
            });
            for (let i in targets) {
                let target = targets[i];
                let cost = _.max[(creep.pos.getRangeTo(target) - (target.amount / 2)), creep.carryCapacity * 2];
                let object = {cost: cost, target: target};
                queue.push(object);
            }
            
            let target_object = queue.peek();
            target = target_object.target;
            creep.memory.source_target_pos = target.pos;
	    }

        if(creep.memory.debug) {
            console.log("Harvester " + creep.name + ": Best energy target is "+ JSON.stringify(target));
        }
        
	    
	    //const target = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
        if(target) {
            if(creep.pos.inRangeTo(target, 1)) {
                creep.memory.state = STATE_HARVESTING;
                this.runHarvest(creep, target);
                return;
            }
            if(creep.memory.debug) {
                console.log("Harvester " + creep.name + ": Target pos > " + JSON.stringify(target.pos));
            }
            let result = creep.moveTo(target);
            if(creep.memory.debug) {
                console.log("Harvester " + creep.name + ": Move result > "+ result);
            }
            
        }
	},
	runHarvest: function(creep, target) {
	    if (!target) {
            const target = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
	    }
        
        if(!target) {
            console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "}");
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
    	        if(creep.memory.debug) {
                    console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
    	        }
                return;
        }
        
        if(_.sum(creep.carry) >= creep.carryCapacity * 0.5 && creep.pos.getRangeTo(target) > 10) {
            creep.memory.state = STATE_MOVING_TO_DEPOSIT;
	        if(creep.memory.debug) {
                console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
	        }
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
            console.log("No regular deposit targets for carrier!");
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
            target = Game.getObjectById(creep.memory.target_id);
	    }
	    
	    if(
	        !target ||
	        (target && !this.depositTargetUseful(target))
	    ){
	        target = this.findDepositTarget(creep);
	        if(creep.memory.debug) {console.log("target returned from findDepositTarget: " + JSON.stringify(target));}
	        if(!target) {
	            let flag = this.findDropFlag(creep);
	            if(creep.memory.debug) {console.log("found flag: " + JSON.stringify(flag));}
	            if (flag) {
	                target = flag;
	                if(creep.memory.debug) {console.log("setting target_id to: " + JSON.stringify(target.name));}
	                creep.memory.target_id = target.name;
	            } else {
                console.log("No target found!");
                return;
	            }
	        } else {
            creep.memory.target_id = target.id;
	        }
        }

        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
    
        //stop moving if we're in range
        if(creep.memory.debug) {console.log("In range to "+target.name+"?: " + JSON.stringify(creep.pos.inRangeTo(target, 1)));}
        if(creep.pos.inRangeTo(target, 1)) {
            creep.memory.state = STATE_DEPOSITING;
	        if(creep.memory.debug) {
                console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
	        }
	        this.runDeposit(creep);
        }
	},
	runDeposit: function (creep) {
        let target = null;
        let result = null;
        try {
            if (creep.memory.debug) {console.log("Harvester " + creep.name + ": trying to deserialize to structure");}
            target = Game.getObjectById(creep.memory.target_id);
            if (creep.memory.debug) {console.log("Harvester " + creep.name + ": Dropping energy near " + target.name);}
            result = creep.transfer(target, RESOURCE_ENERGY);
        } catch (e) {
            if (creep.memory.debug) {console.log("Harvester " + creep.name + ": Not structure, trying to deserialize to flag");}
            target = Game.flags[creep.memory.target_id];
            if (creep.memory.debug) {console.log("Harvester " + creep.name + ": Dropping energy near " + target.name);}
            result = creep.drop(RESOURCE_ENERGY);
        }
        
        if (creep.memory.debug) {console.log("Harvester " + creep.name + ": Offload result " + result);}

        switch (result) {
            case ERR_NOT_IN_RANGE:
                creep.memory.state = STATE_MOVING_TO_DEPOSIT;
    	        if(creep.memory.debug) {
                    console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
    	        }
                return;
            case ERR_INVALID_TARGET:
            case ERR_FULL:
                creep.memory.target_id = null;
                creep.memory.state = STATE_MOVING_TO_DEPOSIT;
    	        if(creep.memory.debug) {
                    console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
    	        }
                return;
            case ERR_NOT_ENOUGH_RESOURCES:
                creep.memory.state = STATE_MOVING_TO_SOURCE;
                creep.memory.target_id = null;
    	        if(creep.memory.debug) {
                    console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
    	        }
                return;
        }
        
        if(creep.carry[RESOURCE_ENERGY] == 0) {
            creep.memory.state = STATE_MOVING_TO_SOURCE;
            creep.memory.target_id = null;
	        if(creep.memory.debug) {
                console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
	        }
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
