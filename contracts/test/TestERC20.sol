// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @author Philippe Dumonet
contract TestERC20 is ERC20 {
    constructor() ERC20("Test token", "TT") { }

    function mint(address _recipient, uint256 _amount) external {
        _mint(_recipient, _amount);
    }
}
