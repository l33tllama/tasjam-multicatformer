const tile_types = {
    PLAYER_START: "**",
    BUILDING: "[]",
    ROAD_STRAIGHT: "||",
    ROAD_STRAIGHT_ROT: "==",
    ROAD_INTERSECTION: "##",
    EXIT: "XX"
}

const level_1_start_pos = [7, 5];
const level_1_end_pos = [0, 1];

const building_heights = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
];

const level_1 = [
    ["[]", "||", "[]", "[]", "[]", "[]", "[]", "[]"],
    ["[]", "##", "==", "==", "==", "==", "##", "[]"],
    ["[]", "[]", "[]", "[]", "[]", "[]", "||", "[]"],
    ["[]", "##", "==", "==", "==", "==", "##", "[]"],
    ["[]", "||", "[]", "[]", "[]", "[]", "[]", "[]"],
    ["[]", "##", "==", "==", "==", "##", "[]", "[]"],
    ["[]", "[]", "[]", "[]", "[]", "||", "[]", "[]"],
    ["[]", "[]", "[]", "[]", "[]", "||", "[]", "[]"],
];

// Test level
const level_obstacle_types_str = [
    ["    ", "   |", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "   ^", "^^^^", "^^^^", "^^^^", "^^^^", "^^^|", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "   |", "    "],
    ["    ", "   _", "____", "____", "____", "____", "___|", "    "],
    ["    ", "   |", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "   ^", "^^^^", "^^^^", "^||_", "_   ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "^--_", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
];

/* obstacle types (str)
// --- LEVEL TRANSITIONS ----
1 - starting to mid (right)             / "   -"
11 - starting to mid (left)             / "-   "
19 - starting to mid (bot)              / " __ "
20 - starting to mid (top)              / " ^^ "
// -- CORNER CURVES --
2 - ccw intersection path (rot + right) / "___|"
10 - ccw intersection (right)           / "^^^|"
14 - ccw intersection (r to l)          / "|___"
15 - ccw intersection (l to r)          / "|^^^"
// -- CORNER BITS --
3 - cw intersection path (rot + right)  / "   ^"
16 - corner path top right              / "^   "
7 - ccw intersection path (left)        / "_   "
9 - cw intersection (right)             / "   _"
// -- STRAIGHT LINES --
4 - basic level jump (right)            / "^^^^"
5 - basic level jump (left)             / "____"
17 - Left path                          / "|   "
18 - Right path                         / "   |"
// -- CROSSING PATHS --
6 - crossing path R to L                / "^||_"
8 - crossing path L to R                / "_||^"
12 - bot to top path (r to l)           / "^--_"
13 - bot to top path (l to r)           / "_--^"

*/


// Bottom level (1)
const level_obstacle_types_1_str = [
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "_   ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "^--_", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
]

// Second Level (2)
const level_obstacle_types_2_str = [
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "   _", "____", "    ", "    ", "    ", "    ", "    "],
    ["    ", "   |", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "   ^", "^||_", "____", " __.", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
];

// Thrid level (3)
const level_obstacle_types_3_str = [
    ["    ", "   |", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "   ^", "^||_", "____", "____", "____", "_   ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "|   ", "    "],
    ["    ", "    ", "    ", ".__ ", "____", "_||^", "^   ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
    ["    ", "    ", "    ", "    ", "    ", "    ", "    ", "    "],
];

const level_obstacle_types_1 = [
    [0, 4, 0, 0, 0, 0, 0, 0],
    [0, 3, 4, 4, 4, 4, 10,0],
    [0, 0, 0, 0, 0, 0, 4, 0],
    [0, 9, 5, 5, 5, 5, 2, 0],
    [0, 4, 0, 0, 0, 0, 0, 0],
    [0, 3, 4, 8, 5, 7, 0, 0],
    [0, 0, 0, 0, 0, 6, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
];

const level_obstacle_types_2 = [
    
]


/* obstacle types (str)
1 - starting to mid (right)             / "   -"
2 - ccw intersection path (rot + right) / " "
3 - cw intersection path (rot + right)  / "   ^"
4 - basic level jump (right)            / "^^^^"
5 - basic level jump (left)             / "____"
6 - crossing path R to L                / "^--_"
7 - ccw intersection path (left)        / ".   "
8 - crossing path L to R                / "^||_"
9 - cw intersection (right)             / 
10 - ccw intersection (right)
11 - starting to mid (left)
*/
/* Old number-based level */
const level_1_old_2 = [
    [02, 36, 02, 02, 02, 02, 02, 02],
    [02, 16, 08, 08, 08, 08, 16, 02],
    [02, 02, 02, 02, 02, 02, 04, 02],
    [02, 16, 08, 08, 08, 08, 16, 02],
    [02, 04, 02, 02, 02, 02, 02, 02],
    [02, 16, 08, 08, 08, 16, 02, 00],
    [02, 02, 02, 02, 02, 04, 02, 00],
    [00, 00, 00, 00, 02, 05, 02, 00],
];


const level_1_old = [
    [02, 36, 02, 02, 02, 02, 02, 02],
    [02, 16, 08, 08, 08, 08, 16, 02],
    [02, 02, 02, 02, 02, 02, 04, 02],
    [02, 16, 08, 08, 08, 08, 16, 02],
    [02, 04, 02, 02, 02, 02, 02, 02],
    [02, 16, 08, 08, 08, 16, 02, 00],
    [02, 02, 02, 02, 02, 04, 02, 00],
    [00, 00, 00, 00, 02, 05, 02, 00],
];

const tile_types_old = {
    PLAYER_START: 1, /* ** */
    BUILDING: 2, /* [] */
    ROAD_STRAIGHT: 4, /* || */
    ROAD_STRAIGHT_ROT: 8, /* == */
    ROAD_INTERSECTION: 16, /* ## */
    EXIT: 32 /* XX */
};


// X Win condition
// X background noise
// X fix buildings
// cat pain