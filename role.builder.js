const STATE_SPAWNING = 0;
const STATE_MOVING_TO_ENERGY_STORE = 1;
const STATE_FILLING_UP_ENERGY = 2;
const STATE_MOVING_TO_CONSTRUCTION_SITE = 3;
const STATE_CONSTRUCTING = 4;

var state_lookup = function (state) {
    let state_dict = {
        0: "spawning",
        1: "moving to energy store",
        2: "filling up energy",
        3: "moving to construction site",
        4: "constructing"
    }
    return state_dict[state];
}

var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(!creep.memory.state) {
            creep.memory.state = STATE_SPAWNING;
        }

        switch(creep.memory.state) {
            case STATE_SPAWNING:
                this.runSpawning(creep);
                break;
            case STATE_MOVING_TO_ENERGY_STORE:
                this.runMoveToEnergyStore(creep);
                break;
            case STATE_FILLING_UP_ENERGY:
                this.runPickup(creep);
                break;
            case STATE_MOVING_TO_CONSTRUCTION_SITE:
                this.runMoveToConstructionSite(creep);
                break;
            case STATE_CONSTRUCTING:
                this.runConstruct(creep);
                break;
            default:
                creep.memory.state = STATE_SPAWNING;
                break;
        }
    },
    runSpawning: function (creep) {
        if(!creep.spawning) {
            creep.memory.state = STATE_MOVING_TO_ENERGY_STORE;
            creep.debug("new state {" + state_lookup(creep.memory.state) + "}");
        }
    },
    runMoveToEnergyStore: function(creep) {
        let target = creep.getClosestNonEmptyEnergyStore();
        if (target) {
            let results = creep.withdraw(target, RESOURCE_ENERGY);
            if (results == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        } else {
            target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
            if(target) {
                if(creep.pos.inRangeTo(target, 1)) {
                    creep.memory.state = STATE_FILLING_UP_ENERGY;
                    creep.debug("new state {" + state_lookup(creep.memory.state) + "}");
                    this.runPickup(creep, target);
                    return;
                }
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
        if (creep.carry.energy == creep.carryCapacity) {
            creep.memory.state = STATE_MOVING_TO_CONSTRUCTION_SITE;
            creep.debug("new state {" + state_lookup(creep.memory.state) + "}");
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

        if(creep.carry.energy == creep.carryCapacity) {
            creep.memory.state = STATE_MOVING_TO_CONSTRUCTION_SITE;
            creep.debug("new state {" + state_lookup(creep.memory.state) + "}");
        }
    },
    runMoveToConstructionSite: function(creep) {
        let target = null;
        if(creep.memory.target_id) {
            target = Game.getObjectById(creep.memory.target_id);
            if (!target) {
                creep.debug("Invalid construction target, clearing memory");
                delete creep.memory.target_id;
            }
        } else {
            let target = creep.findSmallestConstructionSite();
            if (target) {
                creep.memory.target_id = target.id;
                creep.debug("Found new construction site: " + target + " @ " + target.pos);
            } else {
                creep.info("No construction sites found. Waiting...");
                return;
            }
        }

        if(target) {
            if(creep.pos.inRangeTo(target, 1)) {
                creep.memory.state = STATE_CONSTRUCTING;
                creep.debug("new state {" + state_lookup(creep.memory.state) + "}");
                this.runConstruct(creep);
                return;
            } else {
                creep.debug("Moving towards " + target + " @ " + target.pos);
                let result = creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                creep.debug("moveTo result: " + result);
            }
        } else {
            creep.info("No target construction site found");
        }
    },
    runConstruct: function(creep) {
        let target = Game.getObjectById(creep.memory.target_id);
        let result = creep.build(target);
        creep.debug("Build result: " + result);
        if (result == ERR_INVALID_TARGET) {
            creep.debug("Invalid target, deleting from memory: " + target);
            delete creep.memory.target_id;
            creep.memory.state = STATE_MOVING_TO_CONSTRUCTION_SITE;
        }
        if (result == ERR_NOT_ENOUGH_RESOURCES) {
            creep.debug("Out of energy, going to get more. Resetting target as well");
            delete creep.memory.target_id;
            creep.memory.state = STATE_MOVING_TO_ENERGY_STORE;
        }
    }
};

module.exports = roleBuilder;
