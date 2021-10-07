// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../ISnapper.sol";

/// @author Philippe Dumonet
contract Snapshotter  {
    ISnapper internal immutable snapper;
    uint256 public lastSnapshotId;

    constructor(ISnapper _snapper) {
        snapper = _snapper;
    }

    function takeSnapshot() external {
        lastSnapshotId = snapper.snapshot();
    }
}
