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

var roleEnergyCarrier = {

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
            })
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
                this.runMoveToPickup(creep);
                break;
            case STATE_HARVESTING:
                this.runPickup(creep);
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
	runMoveToPickup: function(creep, target = null) {
	    //override default target or memorized target
	    if(target) {
	        if(target instanceof Resource) {
	            creep.debug("Have Resource target");
	            creep.memory.target_id = target.id;
	            delete creep.memory.source_target_pos;
	        }
	        if(target instanceof Structure || target instanceof Source) {
	            creep.memory.target_id = target.id;
	            delete creep.memory.source_target_pos;
	        }
	    } else if (creep.memory.target_id || creep.memory.source_target_pos){
	        if(creep.memory.target_id) {
	            target = Game.getObjectById(creep.memory.target_id);
	            if(!target) {
	                creep.error("Failed to deserialize target from memory! Clearing memory");
	                delete creep.memory.target_id;
	            }
	        }
	        // Remove, not needed anymore?
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
	    } else {
	        target = this.getDefaultPickupTarget(creep);
	    }

        if(target) {
            if(creep.pos.inRangeTo(target, 1)) {
                creep.memory.state = STATE_HARVESTING;
                this.runPickup(creep, target);
                return;
            }
            creep.debug("Target pos > " + JSON.stringify(target.pos));
            let pathStyle = {};
            if (creep.getLogLevel() == "DEBUG") {
                pathStyle = {stroke: '#7ff', opacity:0.75};
            }

            let result = creep.moveTo(target, {visualizePathStyle: pathStyle});
            creep.debug("Move result > "+ result);

        } else {
            creep.debug("No energy source to target!");
        }
	},
	runPickup: function(creep, target) {
	    if (creep.memory.target_id) {
	        const target = Game.getObjectById(creep.memory.target_id);
	    }
	    if (!target) {
            const target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
	    }

        if(!target) {
            creep.info("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "}");
            creep.memory.state = STATE_MOVING_TO_SOURCE;
            this.runMoveToPickup(creep);
            return;
        }

        //Do whats reasonable for the target
        let result = null;
        if(_.get(target, 'structureType', null)) {
            result = creep.withdraw(target, RESOURCE_ENERGY);
        } else if (_.get(target, 'resourceType', null)) {
            result = creep.pickup(target);
        }

        switch (result) {
            case ERR_TIRED:
                creep.say("Fatigue");
                break;
            case OK:
            case ERR_INVALID_TARGET:
            case ERR_NOT_IN_RANGE:
                creep.memory.state = STATE_MOVING_TO_SOURCE;
                creep.debug("New state {" + state_lookup(creep.memory.state) + "]");
                return;
        }

        if(_.sum(creep.carry) >= creep.carryCapacity * 0.75 ) {
            creep.memory.state = STATE_MOVING_TO_DEPOSIT;
            delete creep.memory.target_id;
            creep.debug("New state {" + state_lookup(creep.memory.state) + "]");
        }

	},
	//TODO: This isn't working for extension targets. All carriers try to deposit at the same target all the time.
	findDepositTarget: function (creep) {
        var targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return ((structure.structureType == STRUCTURE_SPAWN || structure.structureType == STRUCTURE_EXTENSION || (structure.structureType == STRUCTURE_TOWER && structure.energy / structure.energyCapacity < 0.85)) &&
                        (structure.energy < structure.energyCapacity) || ((structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE) && structure.store[RESOURCE_ENERGY] < structure.storeCapacity));
                }
        });

        //Prioritise first by structureType and then by distance to it.
        if(targets.length > 0) {
            //give priority to spawns & extensions. Lower prio is more important
            const priorities = {
                'spawn': 2,
                'extension': 3,
                'tower': 1,
                'container': 10,
                'storage': 10,
            };

            let queue = tinyqueue([], function(a,b) {
                return (creep.pos.getRangeTo(a) + priorities[a.structureType] * 100) - (creep.pos.getRangeTo(b) +  + priorities[b.structureType] * 100);
            });
            for (let i in targets) {
                queue.push(targets[i]);
            }

            var target = queue.peek();
            
            creep.debug("prio queue:\n" + JSON.stringify(queue.data, null, 2));
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

        let pathStyle = {};
        if (creep.getLogLevel() == "DEBUG") {
            pathStyle = {stroke: '#ff7', opacity:0.75};
        }
        creep.moveTo(target, {visualizePathStyle: pathStyle});

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
	},
	getDefaultPickupTarget: function(creep) {
	    const goal_target = this.findDepositTarget(creep);
	    const targets = creep.findAnyEnergy();
	    let target = this.filterBestEnergyTarget(creep, goal_target, targets);

        if(target) {
            creep.debug("Using target " + target + " @ " + target.pos);
            creep.memory.target_id = target.id;
            delete creep.memory.source_target_pos;
            return target;
        } else {
            creep.info("No pickup targets found.");
        }
	},
	filterBestEnergyTarget: function(creep, goal, targets) {
	    if(targets.length == 0) {
	        creep.warning("No dropped energy targets found!");
	        return;
	    }

        creep.debug("Harvester " + creep.name + ": found "+targets.length+" energy targets");


        let queue = tinyqueue([], function(a,b) {
            return (a.cost - b.cost);
        });
        for (let i in targets) {
            if (targets[i].id == goal.id) {
                continue; //no sense in goal and target being the same object
            }

            let target = targets[i];
            let t_range = goal.pos.getRangeTo(target);
            let cost = (t_range - _.min([target.amount, creep.carryCapacity]));
            let object = {cost: cost, target: target, range: t_range};
            queue.push(object);
        }

        creep.debug("Target list:\n" + JSON.stringify(queue.data, ["target", "pos", "x", "y", "energy", "cost", "range"], 2));
        let target_object = queue.peek();
        if (target_object) {
            return target_object.target;
        }
        
        creep.warning("No target found!");
	}
};

module.exports = roleEnergyCarrier;
