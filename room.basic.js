/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('room.basic');
 * mod.thing == 'a thing'; // true
 */

var gridUtils = require('util.grid');

module.exports = {
    run: function(room) {

        //only run every 10th tick.
        if(Game.time % 10 != 0) {
            return;
        }
        console.log("Running construction stuff");
        var num_containers = _.filter(room.find(FIND_STRUCTURES), function(structure) {return structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE}).length;
        var num_sites = _.filter(room.find(FIND_MY_CONSTRUCTION_SITES), function(site) {return site.structureType == STRUCTURE_CONTAINER || site.structureType == STRUCTURE_STORAGE}).length;

        /**
        if(num_containers == 0 && num_sites == 0) {
            let containerPos = this.findBuildablePositionNear(room, room.find(FIND_MY_SPAWNS)[0].pos, 2);
            let result = room.createConstructionSite(containerPos.x, containerPos.y, STRUCTURE_CONTAINER);
            console.log("Create container construction site result: " + result);
        }
        */
        
        console.log("No extension constr sites: " + _.filter(room.find(FIND_CONSTRUCTION_SITES), function(constr) { return constr.structureType == STRUCTURE_EXTENSION}).length);
        
        let max_concurrent_extension_constructions = 2;
        let available_extension_construction_slots = CONTROLLER_STRUCTURES.extension[room.controller.level] - 
            _.filter(room.find(FIND_MY_STRUCTURES), function(struct) {return struct.structureType == STRUCTURE_EXTENSION}).length -
            _.filter(room.find(FIND_MY_CONSTRUCTION_SITES), function(constr) { return constr.structureType == STRUCTURE_EXTENSION}).length;
        console.log("available_extension_constr_slots: " + available_extension_construction_slots);
        
        if(_.min([max_concurrent_extension_constructions, available_extension_construction_slots]) > 0) {
            let grid = gridUtils.createStarGridMiddleAndPoints(room, room.find(FIND_MY_SPAWNS)[0].pos, _.min([max_concurrent_extension_constructions, available_extension_construction_slots]));
            _.forOwn(grid, function(value, posString) {
                let posBits = _.words(posString);
                console.log("posBits: " + JSON.stringify(posBits));
                let result = room.createConstructionSite(parseInt(posBits[0]), parseInt(posBits[1]), STRUCTURE_EXTENSION);
                console.log("Create extension result: " + result);
            });
        }
    
        if(_.filter(Game.constructionSites, function(site) {
            return site.structureType != STRUCTURE_ROAD;
        }).length == 0) {
            this.buildRoadWhereCreepsAre(room);
        }

        return;
    },
    buildRoadWhereCreepsAre: function(room) {
        self = this;
        //firstly keep the total road constructions to a sane level
        var maxRoadConstructions = 1;
        
        //then find out how many road constructions we currently have in this room
        var roadConstructions = _.filter(Game.constructionSites, function(site, siteId) {
            return _.has(site, 'room') && site.room.name == room.name;
        }).length;
        console.log("Found " + roadConstructions + " road constructions");
        
        //if still not at max, create some construction sites under creeps
        if(roadConstructions < maxRoadConstructions) {
            console.log("Trying to build some more roads");
            //firstly find all creeps in the room
            let creeps = _.filter(Game.creeps, function(creep, creepName) {
                console.log("creep room name: " + creep.room.name + ", room name: " + room.name);
                return creep.room.name == room.name && creep.memory.role != "builder";
            });
            
            console.log("Found " + creeps.length + " creeps");
            
            _.forEach(_.shuffle(creeps), function(creep) {
                let result = self.buildRoad(room, creep.pos);
                console.log("Road build result: " + result);
                if(result == OK) {
                    roadConstructions = roadConstructions + 1;
                }
                if(roadConstructions >= maxRoadConstructions) {
                    console.log("Reached max road construction limit");
                    return false;
                }
            });
        }
    },
    findAndBuildExtensionStarMiddle: function(room) {
        //try to build close to any existing extensions, then close to storage in the room, otherwise build close to spawner
        let closeTo = null;
        
        let storage = room.storage;
        let spawns = room.find(FIND_MY_SPAWNS);
        
        if(storage) {
            closeTo = storage.pos;
        } else if (spawns) {
            closeTo = spawns[0].pos;
        } else {
            return false;
        }
        
        let pos = this.findBuildablePositionNear(room, closeTo, 3);
        if (pos) {
            this.buildExtensionStar(room, pos);
        }
        
    },
    buildExtensionStar: function(room, position) {
        //First build middle. If not suitable, just skip everything
        if(this.isPositionBuildable(room.lookAt(position))) {
            room.createConstructionSite(position, STRUCTURE_EXTENSION);
        } else {
            room.memory.buildable.pos[position.pos] = false;
            return;
        }
        
        //middle is not available, try to build an arm.
        let up = room.getPositionAt(pos.x, pos.y-1);
        let down = room.getPositionAt(pos.x, pos.y +1);
        let left = room.getPositionAt(pos.x -1, pos.y);
        let right = room.getPositionAt(pos.x +1, pos.y);
        let searchPositions = {
            "up": {
                "pos": up,
                "contents": room.lookAt(up)
            },
            "down": {
                "pos": down,
                "contents": room.lookAt(down)
            },
            "left": {
                "pos": left,
                "contents": room.lookAt(left)
            },
            "right": {
                "pos": right,
                "contents": room.lookAt(right)
            },
        };
        
        let target = null;
        
        _.forEach(searchPositions, function(position) {
            if(this.isPositionBuildable(position.contents)) {
                room.createConstructionSite(position.pos, STRUCTURE_EXTENSION);
            } else {
                room.memory.buildable.pos[position.pos] = false;
            }
        }, this);
        
    },
    buildRoad: function(room, position) {
        return room.createConstructionSite(position, STRUCTURE_ROAD);
    },
    canBuildRoad: function(room, position) {
        
    },
    needsSpawner: function(room) {
        return _.get(Game.spawns, room.name, false) == false;
    },
    canBuildSpawner: function(room) {
        return room.controller.level > 0 && this.needsSpawner == true;
    },
    calculateSpawnerPosition: function(room) {
        var sources = room.find(FIND_SOURCES);
        var x = _.floor(_.sum(sources, 'pos.x') / sources.length);
        var y = _.floor(_.sum(sources, 'pos.y') / sources.length);
        var pos = this.findBuildablePositionNear(room, new RoomPosition(x, y, room.name));

        return pos;
    },
    findBuildablePositionNear: function(room, pos, range=1) {
        var self = this;
        //start by checking the actual position we want
        let items = room.lookAt(pos.x, pos.y);
        if (self.isPositionBuildable(items)) {
            return pos;
        }

        //if we can't use the ideal position, let's look around a bit        
        var area = room.lookAtArea(pos.y-range, pos.x-range, pos.y+range, pos.x+range);
        var buildablePos = null;
        _.forEach(area, function(row, rowNum) {
            _.forEach(row, function(column, colNum) {
                if(self.isPositionBuildable(column)) {
                    buildablePos = room.getPositionAt(colNum, rowNum);
                    return false;
                }
            })
        });
        
        return buildablePos || false;
        
    },
    isPositionBuildable: function(itemArray) {
        //if not wall terrain and not another structure except

        if(_.contains(['plain', 'swamp'], _.last(itemArray).terrain)) {
            var illegalStructures = _.filter(itemArray, function(item) {
                return item.type == "structure" && item.structure.structureType != STRUCTURE_ROAD;
            });
            if(illegalStructures.length == 0) {
                return true;
            }
        }
        
        return false;
    }
};