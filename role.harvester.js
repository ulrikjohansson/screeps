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
	    //set a target if we don't have one
	    let source_path = null;
	    let target = null;
	    if(true/**!creep.memory.path*/) {
	        source_path = this.findSourcePath(creep);
	        if (source_path.length == 0) {
	            //in range or no path to any target?
	            let sources = creep.pos.findInRange(FIND_SOURCES, 1);
	            if(sources.length > 0) {
	                creep.memory.target_id = sources[0].id;
	            }
	            creep.memory.state = STATE_HARVESTING;
	            creep.memory.path = null;
    	        if(creep.memory.debug) {
                    console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
    	        }
    	        return;
	        } else {
	            target = creep.room.lookForAt(LOOK_SOURCES,_.last(source_path).x, _.last(source_path).y);
	            if(creep.memory.debug) {
	                console.log("Harvester " + creep.name + ": found target > " + JSON.stringify(target));
	            }
	            creep.memory.target_id = target.id;
    	        creep.memory.path = JSON.stringify(source_path);
	        }
	    } else {
	        console.log(creep.name);
	        source_path = JSON.parse(creep.memory.path);
	    }

        if(creep.memory.debug) {
            console.log("Harvester " + creep.name + ": Source path:\n" + JSON.stringify(source_path, null, 2));
        }
        let result = creep.moveByPath(source_path);
        if(creep.memory.debug) {
            console.log("Harvester " + creep.name + " moveByPath result: " + result);
        }

        if (result == ERR_NOT_FOUND) {
            creep.memory.path = null;
            //creep.memory.target_id = null;
            return;
        }
        creep.memory.path = JSON.stringify(_.drop(source_path));
        //creep.moveTo(target);

        //stop moving if we're in range
        if(creep.pos.inRangeTo(source_path[source_path.length -1], 1)) {
            creep.memory.state = STATE_HARVESTING;
            creep.memory.path = null;
            creep.memory.target_id = null;
	        if(creep.memory.debug) {
                console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
	        }
        }

	},
    findSourcePath: function(creep) {
        let goals = creep.room.find(FIND_SOURCES);
        if(creep.memory.debug) {
            console.log("Harvester " + creep.name + ": Goals \n" + JSON.stringify(goals, null, 2));
        }
		goals = _.map(goals, function(source) {
			// We can't actually walk on sources-- set `range` to 1 
			// so we path next to it.
			return { pos: source.pos, range: 1 };
		  });
		  //console.log("Goals");
		  //console.log(JSON.stringify(goals, null, 2));

		  let ret = PathFinder.search(
			creep.pos, goals,
			{
			  // We need to set the defaults costs higher so that we
			  // can set the road cost lower in `roomCallback`
			  plainCost: 2,
			  swampCost: 10,

			  roomCallback: function(roomName) {

				let room = Game.rooms[roomName];
				// In this example `room` will always exist, but since 
				// PathFinder supports searches which span multiple rooms 
				// you should be careful!
				if (!room) return;
				let costs = new PathFinder.CostMatrix;

				room.find(FIND_STRUCTURES).forEach(function(struct) {
				  if (struct.structureType === STRUCTURE_ROAD) {
					// Favor roads over plain tiles
					costs.set(struct.pos.x, struct.pos.y, 1);
				  } else if (struct.structureType !== STRUCTURE_CONTAINER &&
							 (struct.structureType !== STRUCTURE_RAMPART ||
							  !struct.my)) {
					// Can't walk through non-walkable buildings
					costs.set(struct.pos.x, struct.pos.y, 0xff);
				  }
				});

				// Avoid creeps in the room
				room.find(FIND_CREEPS).forEach(function(creep) {
				  costs.set(creep.pos.x, creep.pos.y, 25);
				});

				return costs;
			  },
			}
		  );

          if(creep.memory.debug) {
            console.log("Harvester " + creep.name + " Path result:\n" + JSON.stringify(ret, null));
          }
		  return ret.path;
    },
	runHarvest: function(creep) {
        let target = Game.getObjectById(creep.memory.target_id);
        
        if(!target) {
            target = creep.pos.findInRange(FIND_SOURCES, 1)[0];
            if(!target) {
                console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "}");
                creep.memory.state = STATE_MOVING_TO_SOURCE;
                return;
            }
        }

        let result = creep.harvest(target);
        
        switch (result) {
            case ERR_NOT_IN_RANGE:
                creep.memory.state = STATE_MOVING_TO_SOURCE;
    	        if(creep.memory.debug) {
                    console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
    	        }
                return;
            case ERR_NOT_ENOUGH_RESOURCES:
            case ERR_INVALID_TARGET:
                creep.memory.target_id = null;
                creep.memory.state = STATE_MOVING_TO_SOURCE;
    	        if(creep.memory.debug) {
                    console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
    	        }
                return;
        }
        
        if(_.sum(creep.carry) == creep.carryCapacity) {
            creep.memory.state = STATE_MOVING_TO_DEPOSIT;
            creep.memory.target_id = null;
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
            console.log("No targets for harvester!");
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
	        if(!target) {
                console.log("No target found!");
                return;
	        }
            creep.memory.target_id = target.id;
        }

        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
    
        //stop moving if we're in range
        if(creep.pos.inRangeTo(target, 1)) {
            creep.memory.state = STATE_DEPOSITING;
	        if(creep.memory.debug) {
                console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
	        }
        }
	},
	runDeposit: function (creep) {
        let target = Game.getObjectById(creep.memory.target_id);

        let result = creep.transfer(target, RESOURCE_ENERGY);
        
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
	}
};

module.exports = roleHarvester;
