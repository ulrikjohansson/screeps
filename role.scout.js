const STATE_SPAWNING = 0;
const STATE_FINDING_TARGET = 1;
const STATE_MOVING_TO_TARGET = 2;
const STATE_AT_TARGET = 3;

var state_lookup = function (state) {
    let state_dict = {
        0: "spawning",
        1: "finding target",
        2: "moving to target",
        3: "at target"
    }
    return state_dict[state];
}

var roleScout = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(!creep.memory.state) {
            creep.memory.state = STATE_SPAWNING;
        }

        creep.debug("State: " + state_lookup(creep.memory.state));

        switch(creep.memory.state) {
            case STATE_SPAWNING:
                this.runSpawning(creep);
                break;
            case STATE_FINDING_TARGET:
                this.runFindTarget(creep);
                break;
            case STATE_MOVING_TO_TARGET:
                this.runMove(creep);
                break;
            case STATE_AT_TARGET:
                this.runStayAtTarget(creep);
                break;
            default:
                creep.memory.state = STATE_SPAWNING;
                break;
        }
    },
    runSpawning: function (creep) {
        if(!creep.spawning) {
            creep.memory.state = STATE_FINDING_TARGET;
            creep.debug("new state {" + state_lookup(creep.memory.state) + "}");
            this.run(creep);
        }
    },
    runFindTarget: function(creep) {
        let flag = creep.getUnclaimedExpansionFlag();
        
        if(flag) {
            creep.memory.state = STATE_MOVING_TO_TARGET;
            creep.debug("new state {" + state_lookup(creep.memory.state) + "}");
            this.run(creep);
        }
    },
    runMove: function(creep) {
        let target = null;
        if(creep.memory.claimedFlag) {
            target = this.loadClaimedFlag(creep);
            if (!target) {
                creep.debug("Invalid target, clearing memory");
                delete creep.memory.claimedFlag;
                creep.memory.state = STATE_FINDING_TARGET;
                return;
            }
        } else {
            creep.memory.state = STATE_FINDING_TARGET;
            creep.debug("new state {" + state_lookup(creep.memory.state) + "}");
            this.run(creep);
            return;
        }

        if(creep.pos.inRangeTo(target, 0)) {
            creep.memory.state = STATE_AT_TARGET;
            creep.debug("new state {" + state_lookup(creep.memory.state) + "}");
            return;
        } else {
            creep.debug("Moving towards " + target + " @ " + target.pos);
            let result = creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
            creep.debug("moveTo result: " + result);
        }
    },
    runStayAtTarget: function(creep) {
        return;
    },
    loadClaimedFlag: function(creep) {
        let flag = Game.flags[creep.memory.claimedFlag];
        if (flag) {
            return flag;
        } else  {
            creep.warning("Unable to load flag from memory!");
        }
    }
};

module.exports = roleScout;
