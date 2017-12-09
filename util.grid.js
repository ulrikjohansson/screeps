/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('util.grid');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    createStarGridMiddleAndPoints: function(room, middle_pos, max_points) {
        console.log("max_points: " + max_points);
        //calculate extents from middle_pos and max_points
        let min_area = max_points * 1.6;
        console.log("min_area: " + min_area);
        let side_size = _.ceil(Math.sqrt(min_area));
        console.log("side_size: " + side_size);
        let x_start = middle_pos.x - _.ceil(side_size / 2);
        console.log("x_start: " + x_start);
        let y_start = middle_pos.y - _.ceil(side_size / 2);
        console.log("y_start: " + y_start);
        
        return this.createStarGrid(room, x_start, side_size, y_start, side_size, 0, 0, max_points);
    },
    createStarGrid: function(room, x_start = 0, x_size = 50, y_start = 0, y_size = 50, x_offset = 0, y_offset = 0, max_points = 0) {
        let x_end = x_start + x_size -1;
        console.log("x_end: " + x_end);
        let y_end = y_start + y_size -1;
        console.log("y_end: " + y_end);
        var grid = {};
        _.forEach(_.range(x_start, x_end +1), function(x) {
            console.log("x is: " + x);
            var x_is_even = x % 2 == 0;
            _.forEach(_.range(y_start, y_end +1), function(y) {
                console.log("y is: " + x);
                console.log("grid length: " + _.size(grid));
                var y_is_even = y % 2 == 0;
                if(x_is_even) {
                    if(!y_is_even) {
                        if(max_points != 0 && _.size(grid) > max_points) {
                            return false;
                        }
                        let pos = room.getPositionAt(x + x_offset, y + y_offset);
                        let posString = pos.x + "," + pos.y;
                        _.set(grid, posString, null);
                    }
                } else if (!x_is_even) {
                    if((x -1) % 4 == 0) {
                        if((y +1) % 4 != 0) {
                            if(max_points != 0 && _.size(grid) > max_points) {
                                return false;
                            }
                            let pos = room.getPositionAt(x + x_offset, y + y_offset);
                            let posString = pos.x + "," + pos.y;
                            _.set(grid, posString, null);
                        }
                    } else if ((x+1) % 4 == 0) {
                        if((y -1) % 4 != 0) {
                            if(max_points != 0 && _.size(grid) > max_points) {
                                return false;
                            }
                            let pos = room.getPositionAt(x + x_offset, y + y_offset);
                            let posString = pos.x + "," + pos.y;
                            _.set(grid, posString, null);
                        }
                    }
                }
                if(max_points != 0 && _.size(grid) > max_points) {
                    return false;
                }
            });
        });
        console.log("GRID:\n" + JSON.stringify(grid, null, 2));
        return grid;
    }
};