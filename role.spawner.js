var tinyqueue = require('tinyqueue');

var level2Generic = {"price": 300,"parts": [WORK, CARRY, CARRY, MOVE, MOVE]};
var level4Generic = {"price": 400, "parts": [WORK, WORK, CARRY, CARRY, MOVE, MOVE]};
var level5Generic = {"price": 450, "parts": [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE]};
var level6Generic = {"price": 500, "parts": [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE]};
var level7Generic = {"price": 550, "parts": [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE]};
var level8Generic = {"price": 650, "parts": [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]};
var level9Generic = {"price": 700, "parts": [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]};
var level10Generic = {"price": 750, "parts": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]};
var level11Generic = {"price": 800, "parts": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]};
var level12Generic = {"price": 850, "parts": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]};
var level13Generic = {"price": 900, "parts": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]};

var level1Carrier = {"price": 300,"parts": [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]};
var level2Carrier = {"price": 350,"parts": [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]};
var level3Carrier = {"price": 550,"parts": [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]};

var level1Harvester = {"price": 300,"parts": [WORK, WORK, MOVE, MOVE]};
var level2Harvester = {"price": 350,"parts": [WORK, WORK, WORK, MOVE]};
var level3Harvester = {"price": 450,"parts": [WORK, WORK, WORK, WORK, MOVE]};
var level4Harvester = {"price": 600,"parts": [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE]};

function extend(obj, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) obj[key] = src[key];
    }
    return obj;
}


// TODO: Create different levels of workers dynamically depending on available energy
var roleSpawner = {
    spawnBiggestPossible: function(spawn, creep_type, extra_memory = {}) {
        var blueprints = {
            "generic": [
                level2Generic,
                level4Generic,
                level5Generic,
                level6Generic,
                level7Generic,
                level8Generic,
                level9Generic,
                level10Generic,
                level11Generic,
                level12Generic,
                level13Generic
            ],
            "carrier": [
                level1Carrier,
                level2Carrier,
                level3Carrier
            ],
            "harvester": [
                level1Harvester,
                level2Harvester,
                level3Harvester,
                level4Harvester,
            ]
        };
        //get available energy
        var available_energy = spawn.room.energyAvailable;
        var possible_energy = spawn.room.energyCapacityAvailable;


        //get highest blueprint possible to make with current total capacity
        let blueprint_list = [];
        if (creep_type in blueprints) {
            blueprint_list = blueprints[creep_type];
        } else {
            blueprint_list = blueprints["generic"];
        }
        var enough_energy = (available_energy == possible_energy || available_energy >= _.last(blueprint_list).price);
        if(enough_energy || Memory.stats[creep_type] < 1) {
            var possible_blueprints = _.filter(blueprint_list, function (bp) { return bp.price <= available_energy });

            if(possible_blueprints.length > 0) {
                let blueprint = possible_blueprints[possible_blueprints.length - 1];
                let body = blueprint.parts;
                let name = creep_type + "_" + Game.time.toString();
                let memory = extend({role: creep_type, creationCost: blueprint.price}, extra_memory);
                let result = spawn.spawnCreep(body, name, {"memory": memory});
                console.log(creep_type + " spawn result: " + result + " using plan: " + JSON.stringify(body));
                return name;
            } else {
                console.log("No possible blueprints for " + creep_type);
            }
        }
    },
    needForBuilder: function (spawn) {
        var targets = spawn.room.find(FIND_CONSTRUCTION_SITES);
        return targets.length > 0;
    },
    findRelevantSources: function (spawn) {
        var sources =  spawn.room.find(FIND_SOURCES, {filter: function(object) {
            let flags = object.pos.lookFor(LOOK_FLAGS);
            if(flags.length == 1 && flags[0].color == COLOR_RED) {
                return false;
            }
            return true;
        }});
        //console.log(JSON.stringify(sources, null, 2));
        if(!spawn.room.memory.sources) {
            spawn.room.memory.sources = {};
        }
        _.forEach(sources, function(source) {
            //console.log(JSON.stringify(source, null, 2));
            if (!spawn.room.memory.sources[source.id]) {
                spawn.room.memory.sources[source.id] = {};
            }
        });

        //cleanup irrelevant sources from memory (TODO: do we need to scrub the harvesters memory of this source as well?)
        let list_of_source_ids = _.pluck(sources, 'id');
        _.forEach(spawn.room.memory.sources, function(source_in_mem, key) {
            if(!_.includes(list_of_source_ids, key)) {
                console.log("deleting: " + key);
                delete spawn.room.memory.sources[key];
            }
        });


        return sources;
    },
    findVacantSource: function (spawn) {
        let mem_sources =  spawn.room.memory.sources;
        //console.log("mem_sources: " + JSON.stringify(mem_sources));
        let vacantSource =_.findKey(mem_sources, function(source) {
            //console.log("mem source: " + JSON.stringify(source));
            return (
                !source.harvester ||
                (source.harvester && !Game.creeps[source.harvester])
            );
        });
        //console.log("vacant_source: " + JSON.stringify(vacantSource, null, 2));
        return Game.getObjectById(vacantSource);
    },
    run: function(spawn) {

        var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
        var carriers = _.filter(Game.creeps, (creep) => creep.memory.role == 'carrier');
        var builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'builder');
        var upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
        var repairers = _.filter(Game.creeps, (creep) => creep.memory.role == 'repairer');
        Memory.stats = {
            "harvester": harvesters.length,
            "carrier": carriers.length,
            "builder": builders.length,
            "upgrader": upgraders.length,
            "repairer": repairers.length
        };

        //Find and update source in memory
        let sources = this.findRelevantSources(spawn);
        let num_sources = sources.length;


        let vacant_source = this.findVacantSource(spawn);

        //create simple harvester creeps



        if (carriers.length < harvesters.length) {
            this.spawnBiggestPossible(spawn, 'carrier');
        }
        else if (vacant_source) {
            let creep_name = this.spawnBiggestPossible(spawn, 'harvester', {target_id: vacant_source.id});
            if (creep_name) {
                //console.log("name: " + creep_name);
                let creep = Game.creeps[creep_name];
                //console.log("vacant_source:");
                //console.log(JSON.stringify(vacant_source, null, 2));
                spawn.room.memory.sources[vacant_source.id] = {"harvester": creep_name};
                //console.log(JSON.stringify(spawn.room.memory.sources[vacant_source.id], null, 2));
            }
        }
        else if (carriers.length < 3 && spawn.room.energyAvailable > 600) {
            this.spawnBiggestPossible(spawn, 'carrier');
        }
        //create simple upgrader creeps
        else if (upgraders.length < 1 || (upgraders.length < 1 && spawn.room.energyAvailable > 500)) {
            this.spawnBiggestPossible(spawn, 'upgrader');
        }
        //create simple builder creeps
        else if (
            (builders.length < 1 || (builders.length < 1 && spawn.room.energyAvailable > 500)) && this.needForBuilder(spawn)
            && Game.time % 20 == 0) {
            this.spawnBiggestPossible(spawn, 'builder');
        }
        //create simple repairer creeps
        else if (repairers.length < 1) {
            this.spawnBiggestPossible(spawn, 'repairer');
        }
    }
};

module.exports = roleSpawner;
