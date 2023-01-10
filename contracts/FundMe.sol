// SPDX-License-Identifier: SEE LICENSE IN LICENSE
// Pragna
pragma solidity ^0.8.7;
// Imports
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";
// Error Codes
error FundMe__NotOwner();

// Interfaces, Libraries, Contracts

/** @title A contract for crow funnding
 * @author Steven Chen
 * @notice This contract is to demo a sample funding contract
 * @dev This implements price feeds as our library
 */
contract FundMe {
    // Type Declarations
    using PriceCoverter for uint256;

    // State Variables!
    uint256 public constant MINIMUM_USD = 50 * 1e18;
    AggregatorV3Interface internal s_priceFeed;
    address[] public funders;
    mapping(address => uint256) public addressToAmountFunded;
    address public immutable owner;
    address public priceFeed;

    // Modifier = Run before everything else
    modifier onlyOwner() {
        // require(msg.sender == owner, "Sender is not owner");
        if (msg.sender != owner) revert FundMe__NotOwner();
        _; // Run rest of the code
    }

    // Constructor
    constructor(address chainLinkPriceFeed) {
        owner = msg.sender;
        priceFeed = chainLinkPriceFeed;
        s_priceFeed = AggregatorV3Interface(chainLinkPriceFeed);
    }

    // Fallback
    fallback() external payable {
        fund();
    }

    // Receive
    receive() external payable {
        fund();
    }

    // External

    // Public

    /* * @notice This function funds this contract
     * @dev This implements price feeds as our library
     * @event No events
     * @return No explicit returns
     */
    function fund() public payable {
        require(
            msg.value.getConversionRate(s_priceFeed) >= MINIMUM_USD,
            "You need to spend more ETH!"
        );
        funders.push(msg.sender);
        addressToAmountFunded[msg.sender] += msg.value;
    }

    function withdraw() public onlyOwner {
        for (uint256 holder = 0; holder < funders.length; holder++) {
            addressToAmountFunded[funders[holder]] = 0;
        }
        funders = new address[](0);

        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(success, "Transfer failed.");
    }

    // Internal
    // Private
    // View / pure
    function getPriceFeed() public view returns (address) {
        return priceFeed;
    }
}
