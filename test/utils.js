const { expect } = require('chai')
const { ethers } = require('hardhat')

async function changeTokensBalances(callback, tokens, accounts, expectedChanges) {
  const balancesBefore = await Promise.all(
    tokens.map((token, i) => token.balanceOf(accounts[i].address))
  )
  await callback()
  await Promise.all(
    tokens.map(async (token, i) => {
      const address = accounts[i].address
      const realChange = (await token.balanceOf(address)).sub(balancesBefore[i])
      expect(realChange).to.equal(expectedChanges[i])
    })
  )
}

const parseUnit = (amount, unit) => ethers.utils.parseUnits(amount.toString(), unit)

module.exports = { changeTokensBalances, parseUnit }
