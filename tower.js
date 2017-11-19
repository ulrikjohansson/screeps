/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('tower');
 * mod.thing == 'a thing'; // true
 */
var structureTower = {
    
    run: function (tower) {

        var damagedStructures = tower.pos.findInRange(FIND_STRUCTURES, 10, {
            filter: (structure) => structure.hits < structure.hitsMax
        });
        
        let sortedDamagedStructures = _.sortBy(damagedStructures, 'hits');
        let mostDamagedStructure = sortedDamagedStructures[0];
        if(mostDamagedStructure) {
            tower.repair(mostDamagedStructure);
        }

        var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if(closestHostile) {
            tower.attack(closestHostile);
        }
    }
}
module.exports = structureTower;