// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Arrays.sol";

/// @author Philippe Dumonet
library Snapshots {
    using Arrays for uint256[];

    struct Uint256Snapshots {
        uint256[] ids;
        uint256[] values;
    }

    function getValueAt(
        Uint256Snapshots storage _snapshots,
        uint256 _snapshotId,
        uint256 _currentSnapshotId
    ) internal view returns (bool, uint256) {
        require(_snapshotId > 0, "Snapshots: id is 0");
        require(_snapshotId <= _currentSnapshotId, "Snapshots: nonexistent id");

        uint256 index = _snapshots.ids.findUpperBound(_snapshotId);

        if (index == _snapshots.ids.length) {
            return (false, 0);
        } else {
            return (true, _snapshots.values[index]);
        }
    }

    function update(
        Uint256Snapshots storage _snapshots,
        uint256 _currentValue,
        uint256 _currentSnapshotId
    ) internal {
        if(lastSnapshotId(_snapshots) < _currentSnapshotId) {
            _snapshots.ids.push(_currentSnapshotId);
            _snapshots.values.push(_currentValue);
        }
    }

    function lastSnapshotId(Uint256Snapshots storage _snapshots)
        internal view returns (uint256)
    {
        uint256[] storage ids = _snapshots.ids;
        return ids.length > 0 ? ids[ids.length - 1] : 0;
    }
}
