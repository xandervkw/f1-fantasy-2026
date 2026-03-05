// Latin square driver rotation logic
// TODO: Implement full algorithm
//
// Input: array of player IDs, array of 22 driver IDs, number of rounds (22)
// Output: a matrix [round][player] = driverID
//
// Algorithm: generate a random Latin square where each driver appears exactly
// once per player across 22 rounds, and exactly once per round across players
// (for ≤22 players). Shuffle rows and columns for randomness.
// For <22 players: use the first N columns of the Latin square.
