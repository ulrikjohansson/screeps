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
	    if(!creep.memory.target_id) {
	        closest_source = creep.pos.findClosestByRange(FIND_SOURCES);
	        creep.memory.target_id = closest_source.id;
	        target = closest_source;
	        creep.say("Moving");
	        if(creep.memory.debug) {
	            console.log("Moving to source at x:" + target.pos.x + " y:" + target.pos.y);
	        }
	    } else {
	        target = Game.getObjectById(creep.memory.target_id);
	    }

        creep.moveTo(target);

        //stop moving if we're in range
        if(creep.pos.inRangeTo(target, 1)) {
            creep.memory.state = STATE_HARVESTING;
	        if(creep.memory.debug) {
                console.log("Harvester " + creep.name + ": new state {" + state_lookup(creep.memory.state) + "]");
	        }
        }

	},
    findSourcePath: function(creep) {
		let goals = _.map(creep.room.find(FIND_SOURCES), function(source) {
			// We can't actually walk on sources-- set `range` to 1 
			// so we path next to it.
			return { pos: source.pos, range: 1 };
		  });
		  console.log("Goals");
		  console.log(JSON.stringify(goals, null, 2));

		  let ret = PathFinder.search(
			creep.pos, goals,
			{
			  // We need to set the defaults costs higher so that we
			  // can set the road cost lower in `roomCallback`
			  plainCost: 2,
			  swampCost: 10,

			  roomCallback: function(roomName) {

				let room = Game.rooms[roomName];
				console.log("FindSource room: " + JSON.stringify(room, null, 2));
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
				  costs.set(creep.pos.x, creep.pos.y, 0xff);
				});

				return costs;
			  },
			}
		  );

          console.log("Path result:\n" + JSON.stringify(ret, null, 2));
		  return ret.path;
    },
	runHarvest: function(creep) {
        target = Game.getObjectById(creep.memory.target_id);

        result = creep.harvest(target);
        
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
	runMoveToDeposit: function (creep) {
	    let debugFilterProps = ['id', 'structureType'];
	    
	    if(!creep.memory.target_id) {
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
                    extension: 2,
                    tower: 3,
                    container: 5,
                    storage: 5,
                };
                let queue = tinyqueue([], function(a,b) {
                    return priorities[a.structureType] - priorities[b.structureType];
                });
                for (let i in targets) {
                    if(creep.memory.debug) {
                        console.log("Debug: Harvester " + creep.name + ": Adding target to queue:\n" + JSON.stringify(targets[i], debugFilterProps, 2));
                    }
                    queue.push(targets[i]);
                    if(creep.memory.debug) {
                        console.log("Debug: Harvester " + creep.name + ": Top queue object is now\n" + JSON.stringify(queue.peek(), debugFilterProps, 2));
                    }
                }
                
                var target = queue.peek();
                
                if(creep.memory.debug) {
                    console.log("Debug: Harvester " + creep.name + ": New target object from top of queue is\n" + JSON.stringify(target, debugFilterProps, 2));
                }
                
                creep.memory.target_id = target.id;
                creep.say("Moving");
                //console.log("Moving to deposit " + target.structureType + " at x:" + target.pos.x + " y:" + target.pos.y);
            } else {
                console.log("No targets for harvester!");
                var target = null;
                return;
            }
	    } else {
	        var target = Game.getObjectById(creep.memory.target_id);
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
        target = Game.getObjectById(creep.memory.target_id);

        result = creep.transfer(target, RESOURCE_ENERGY);
        
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
