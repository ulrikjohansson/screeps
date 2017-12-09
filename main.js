global.logLevel = "INFO";

require('proto.Creep')();

var roleHarvester = require('role.harvester');
var roleCarrier = require('role.energyCarrier');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleRepairer = require('role.repairer');
var roleSpawner = require('role.spawner');
var roleScout = require('role.scout');
var roleClaimer = require('role.claimer');
var structureTower = require('tower');
var roomStuff = require('room.basic');


module.exports.loop = function () {
    
    console.log("----------------- NEW TICK "+Game.time+"--------------------");
    for(let roomObj in Game.rooms) {
        roomStuff.run(Game.rooms[roomObj]);
    }

    for(let name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            if(global.logLevel == "DEBUG") {
                console.log('Clearing non-existing creep memory:', name);
            }
        }
    }

    for(let structure in Game.structures) {
        if(Game.structures[structure].structureType == STRUCTURE_TOWER) {
            structureTower.run(Game.structures[structure]);
        }
    }
    
    for(let spawner in Game.spawns) {
        roleSpawner.run(Game.spawns[spawner]);
    }

    for(let name in Game.creeps) {
        let creep = Game.creeps[name];
        if(creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        }
        if(creep.memory.role == 'carrier') {
            roleCarrier.run(creep);
        }
        if(creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
        if(creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        }
        if(creep.memory.role == 'repairer') {
            roleRepairer.run(creep);
        }
        if(creep.memory.role == 'scout') {
            roleScout.run(creep);
        }
        if(creep.memory.role == 'claimer') {
            roleClaimer.run(creep);
        }
    }
}