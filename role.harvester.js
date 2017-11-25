var tinyqueue = require('tinyqueue');

const STATE_SPAWNING = 0;
const STATE_MOVING_TO_SOURCE = 1;
const STATE_HARVESTING = 2;

var state_lookup = function (state) {
    let state_dict = {
        0: "spawning",
        1: "moving to source",
        2: "harvesting",
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
        let target = Game.getObjectById(creep.memory.target_id);
        if(!target) {
            console.log("<span style='color:red'>No target for "+creep.name+". Clearing memory</span>");
            delete creep.memory.target_id;
            return;
        }
        if(creep.memory.debug) {
            console.log("Harvester " + creep.name + ": moving to target > " + JSON.stringify(target));
        }

        let result = creep.moveTo(target);
        if(creep.memory.debug) {
            console.log("Harvester " + creep.name + " move result: " + result);
        }

        if (result == ERR_NOT_FOUND) {
            console.error("<span style='color:red'>Target "+creep.memory.target_id+" not found!</span>");
            return;
        }

        //stop moving if we're in range
        if(creep.pos.inRangeTo(target, 1)) {
            creep.memory.state = STATE_HARVESTING;
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
	}
};

module.exports = roleHarvester;
