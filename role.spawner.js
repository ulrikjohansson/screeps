var level1Generic = {"price": 200, "parts": [WORK, MOVE, CARRY]};
var level2Generic = {"price": 300,"parts": [WORK, WORK, CARRY, MOVE]};
var level3Generic = {"price": 350, "parts": [WORK, WORK, CARRY, MOVE, MOVE]};
var level4Generic = {"price": 400, "parts": [WORK, WORK, CARRY, CARRY, MOVE, MOVE]};
var level5Generic = {"price": 450, "parts": [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE]};
var level6Generic = {"price": 500, "parts": [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE]};
var level7Generic = {"price": 550, "parts": [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE]};

// TODO: Create different levels of workers dynamically depending on available energy
var roleSpawner = {
    spawnBiggestPossible: function(spawn, creep_type) {
        var blueprints = {
            "generic": [
                level1Generic,
                level2Generic,
                level3Generic,
                level4Generic,
                level5Generic,
                level6Generic,
                level7Generic,
                ]
        };
        //get available energy
        var available_energy = spawn.room.energyAvailable;

        //get highest blueprint possible to make
        var possible_blueprints = _.filter(blueprints["generic"], function (bp) { return bp.price <= available_energy });

        if(possible_blueprints.length > 0) {
            var body = possible_blueprints[possible_blueprints.length - 1].parts;
            var result = spawn.spawnCreep(body, creep_type + " " + Game.time.toString(), {memory: {role: creep_type}});
            console.log(creep_type + " spawn result: " + result + " using plan: " + JSON.stringify(body));
            return result;
        }
        
        return ERR_NOT_ENOUGH_ENERGY;
        
    },
    run: function(spawn) {
        
        var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
        var builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'builder');
        var upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
        var repairers = _.filter(Game.creeps, (creep) => creep.memory.role == 'repairer');
        Memory.stats = {
            "harvesters": harvesters.length,
            "builders": builders.length,
            "upgraders": upgraders.length,
            "repairers": repairers.length
        };

        //create simple harvester creeps
        if (harvesters.length < 4) {
            this.spawnBiggestPossible(spawn, 'harvester');
        }
        //create simple upgrader creeps
        else if (upgraders.length < 3) {
            this.spawnBiggestPossible(spawn, 'upgrader');
        }
        //create simple builder creeps
        else if (builders.length < 4) {
            this.spawnBiggestPossible(spawn, 'builder');
        }
        //create simple repairer creeps
        else if (repairers.length < 2) {
            this.spawnBiggestPossible(spawn, 'repairer');
        }
    }
};

module.exports = roleSpawner;