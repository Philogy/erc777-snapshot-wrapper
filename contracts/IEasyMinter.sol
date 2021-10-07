// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC777/IERC777.sol";

interface IEasyMinter is IERC777 {
    function depositFor(address _recipient, uint256 _amount) external;
    function mintTo(address _recipient, uint256 _amount) external;
    function withdrawTo(address _recipient, uint256 _amount) external;
}
